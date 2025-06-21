// PigMap.org - Durable Objects for Real-time Updates

export class LivestockReport {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.storage = state.storage;
    this.sessions = new Map(); // WebSocket sessions
    
    // Initialize report storage if needed
    this.state.blockConcurrencyWhile(async () => {
      const storedReports = await this.storage.get('reports');
      if (!storedReports) {
        await this.storage.put('reports', []);
      }
    });
  }
  
  // Handle HTTP requests to the Durable Object
  async fetch(request) {
    const url = new URL(request.url);
    
    // WebSocket connection
    if (url.pathname === '/connect') {
      // Upgrade the request to a WebSocket connection
      if (request.headers.get('Upgrade') !== 'websocket') {
        return new Response('Expected WebSocket', { status: 400 });
      }
      
      // Create WebSocket pair
      const [client, server] = Object.values(new WebSocketPair());
      server.accept();
      
      // Generate a unique session ID
      const sessionId = crypto.randomUUID();
      this.sessions.set(sessionId, server);
      
      // Send initial data
      const reports = await this.storage.get('reports') || [];
      const comments = await this.storage.get('comments') || {};
      if (reports.length > 0) {
        server.send(JSON.stringify({ type: 'initial', reports, comments }));
      }
      
      // Set up event handlers
      server.addEventListener('message', async (event) => {
        // Handle incoming messages (if needed)
        try {
          const data = JSON.parse(event.data);
          // Process any client messages if needed
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
        }
      });
      
      // Handle connection close
      const closeHandler = () => {
        this.sessions.delete(sessionId);
      };
      
      server.addEventListener('close', closeHandler);
      server.addEventListener('error', closeHandler);
      
      // Return the WebSocket client
      return new Response(null, {
        status: 101,
        webSocket: client,
      });
    }
    
    // Broadcast a message to all connected clients
    if (url.pathname === '/broadcast') {
      const data = await request.json();
      
      // Store data differently based on type
      if (data.type === 'comment') {
        // It's a comment - store it with the report
        let comments = await this.storage.get('comments') || {};
        if (!comments[data.reportId]) {
          comments[data.reportId] = [];
        }
        comments[data.reportId].unshift({
          id: data.commentId,
          content: data.content,
          timestamp: data.timestamp,
          mediaUrl: data.mediaUrl
        });
        
        // Keep max 100 comments per report
        if (comments[data.reportId].length > 100) {
          comments[data.reportId] = comments[data.reportId].slice(0, 100);
        }
        
        await this.storage.put('comments', comments);
        
        // Broadcast comment to all connected WebSocket sessions
        const message = JSON.stringify({ 
          type: 'comment', 
          reportId: data.reportId,
          comment: {
            id: data.commentId,
            content: data.content,
            timestamp: data.timestamp,
            mediaUrl: data.mediaUrl
          }
        });
        
        this.sessions.forEach((session) => {
          try {
            session.send(message);
          } catch (error) {
            // Ignore errors - session will be cleaned up on next 'close' event
          }
        });
      } else {
        // It's a report update or new report
        let reports = await this.storage.get('reports') || [];
        
        // Check if it's an update to an existing report
        if (data.updated) {
          const index = reports.findIndex(r => r.id === data.id);
          if (index !== -1) {
            reports[index] = { ...reports[index], ...data };
          }
        } else {
          // New report
          reports.unshift(data);
          reports = reports.slice(0, 100); // Keep max 100
        }
        
        await this.storage.put('reports', reports);
        
        // Broadcast to all connected WebSocket sessions
        const message = JSON.stringify({ 
          type: data.updated ? 'update' : 'new', 
          report: data 
        });
        
        this.sessions.forEach((session) => {
          try {
            session.send(message);
          } catch (error) {
            // Ignore errors - session will be cleaned up on next 'close' event
          }
        });
      }
      
      return new Response('Broadcast sent', { status: 200 });
    }
    
    // Get recent reports
    if (url.pathname === '/reports') {
      const reports = await this.storage.get('reports') || [];
      return new Response(JSON.stringify(reports), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Get comments for a specific report
    if (url.pathname.startsWith('/comments/')) {
      const reportId = url.pathname.substring('/comments/'.length);
      const allComments = await this.storage.get('comments') || {};
      const reportComments = allComments[reportId] || [];
      
      return new Response(JSON.stringify(reportComments), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response('Not Found', { status: 404 });
  }
}
