// Simple client-side mock for /api/* endpoints.
// Provides translations (from /i18n/*.json) and demo implementations for reports/comments using localStorage.
(function(){
  const originalFetch = window.fetch.bind(window);

  // simple uuid
  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function loadReports() {
    try { return JSON.parse(localStorage.getItem('pigmap:reports') || '[]'); } catch(e){ return []; }
  }
  function saveReports(reports){ localStorage.setItem('pigmap:reports', JSON.stringify(reports)); }

  function loadComments() {
    try { return JSON.parse(localStorage.getItem('pigmap:comments') || '{}'); } catch(e){ return {}; }
  }
  function saveComments(comments){ localStorage.setItem('pigmap:comments', JSON.stringify(comments)); }

  async function fileToDataUrl(file) {
    return await new Promise((resolve, reject) => {
      if (!file) return resolve(null);
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  window.fetch = async function(input, init){
    try {
      const request = (typeof input === 'string') ? new Request(input, init) : input;
      const url = new URL(request.url, window.location.href);
      const path = url.pathname;
      const method = (request.method || 'GET').toUpperCase();

      // Translations list
      if (path === '/api/translations' && method === 'GET') {
        const langs = [
          { code: 'en', name: 'English' },
          { code: 'es', name: 'Español' },
          { code: 'fr', name: 'Français' }
        ];
        return new Response(JSON.stringify({ languages: langs }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }

      // Single language
      let m;
      if ((m = path.match(/^\/api\/translations\/(\w{2})$/)) && method === 'GET') {
        const lang = m[1];
        try {
          const resp = await originalFetch(`/i18n/${lang}.json`);
          if (!resp.ok) return resp;
          const text = await resp.text();
          return new Response(text, { status: 200, headers: { 'Content-Type': 'application/json' } });
        } catch (e) {
          return new Response(JSON.stringify({}), { status: 404, headers: { 'Content-Type': 'application/json' } });
        }
      }

      // Reports API
      if (path === '/api/reports') {
        if (method === 'GET') {
          const reports = loadReports();
          return new Response(JSON.stringify({ success: true, reports }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }

        if (method === 'POST') {
          // handle form data
          const form = await request.formData();
          const reportJson = form.get('report');
          let report = {};
          try { report = JSON.parse(reportJson); } catch(e) { /* ignore */ }

          report.id = report.id || uid();
          report.timestamp = report.timestamp || Date.now();

          // handle media if present
          const mediaFile = form.get('media');
          if (mediaFile && mediaFile.size) {
            try {
              const dataUrl = await fileToDataUrl(mediaFile);
              report.imageUrl = dataUrl;
            } catch(e) {
              report.imageUrl = null;
            }
          }

          const reports = loadReports();
          reports.unshift(report);
          saveReports(reports);

          return new Response(JSON.stringify({ success: true, id: report.id, imageUrl: report.imageUrl || null }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
      }

      // Comments API
      if ((m = path.match(/^\/api\/comments\/(.+)$/)) && method === 'GET') {
        const reportId = decodeURIComponent(m[1]);
        const comments = loadComments();
        return new Response(JSON.stringify({ success: true, comments: comments[reportId] || [] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }

      if (path === '/api/comments' && method === 'POST') {
        const form = await request.formData();
        let reportId = form.get('reportId') || form.get('report_id') || null;
        let commentText = form.get('comment');
        // some callers send comment as JSON string under 'comment'
        try {
          const maybe = JSON.parse(commentText || 'null');
          if (maybe && typeof maybe === 'object' && maybe.content) commentText = maybe.content;
        } catch(e) { }

        if (!reportId) {
          // try JSON body
          try { const body = await request.json(); reportId = body.reportId || body.report_id || null; } catch(e) {}
        }

        if (!reportId) {
          return new Response(JSON.stringify({ success: false, error: 'Missing reportId' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }

        const comments = loadComments();
        comments[reportId] = comments[reportId] || [];
        const newComment = { id: uid(), timestamp: Date.now(), text: commentText || '' };

        const mediaFile = form.get('media');
        if (mediaFile && mediaFile.size) {
          try { newComment.imageUrl = await fileToDataUrl(mediaFile); } catch(e) { newComment.imageUrl = null; }
        }

        comments[reportId].unshift(newComment);
        saveComments(comments);

        return new Response(JSON.stringify({ success: true, comment: newComment }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }

      // Fallback to original fetch
      return originalFetch(request);
    } catch (err) {
      return originalFetch(input, init);
    }
  };
})();
