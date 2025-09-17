// src/handlers.js

import { v4 as uuidv4 } from 'uuid';

// Anonymously broadcasts a message through the Durable Object.
async function broadcastUpdate(env, data) {
    const id = env.LIVESTOCK_REPORTS.idFromName('global-reports');
    const durableObject = env.LIVESTOCK_REPORTS.get(id);
    // Use a non-public URL for internal DO communication
    await durableObject.fetch('https://internal.pigmap/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
}

// Handler to get the latest reports
export async function handleGetReports(request, env) {
    const { results } = await env.LIVESTOCK_DB.prepare(
        `SELECT r.id, r.type, r.description, r.longitude, r.latitude, r.timestamp, r.icon, m.url as mediaUrl
         FROM reports r
         LEFT JOIN media m ON r.id = m.report_id
         ORDER BY r.timestamp DESC
         LIMIT 100`
    ).all();
    return new Response(JSON.stringify(results), { headers: { 'Content-Type': 'application/json' } });
}

// Handler to create a new report
export async function handleCreateReport(request, env) {
    const formData = await request.formData();
    const reportJson = formData.get('report');
    const mediaFile = formData.get('media');

    if (!reportJson) {
        return new Response(JSON.stringify({ error: 'Missing report data' }), { status: 400 });
    }

    const reportData = JSON.parse(reportJson);
    const reportId = uuidv4();
    const editToken = uuidv4();
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 7); // Token valid for 7 days

    await env.LIVESTOCK_DB.batch([
      env.LIVESTOCK_DB.prepare(`INSERT INTO edit_tokens (token, report_id, expires_at) VALUES (?, ?, ?)`).bind(editToken, reportId, expiryDate.getTime()),
      env.LIVESTOCK_DB.prepare(`INSERT INTO reports (id, type, description, longitude, latitude, timestamp, icon) VALUES (?, ?, ?, ?, ?, ?, ?)`).bind(
        reportId,
        reportData.type,
        reportData.description || '',
        reportData.longitude,
        reportData.latitude,
        Date.now(),
        reportData.icon || 'default_icon.png'
      )
    ]);

    let mediaUrl = null;
    if (mediaFile && mediaFile.size > 0) {
        // SECURITY NOTE: It is CRITICAL to strip EXIF and other metadata from uploads.
        // Using Cloudflare Images (with metadata stripping enabled) is the recommended approach.
        // If using R2 directly, you are responsible for cleaning the files.
        const fileExt = mediaFile.name.split('.').pop();
        const fileName = `${reportId}.${fileExt}`;
        await env.LIVESTOCK_MEDIA.put(fileName, mediaFile.stream(), {
            httpMetadata: { contentType: mediaFile.type }
        });
        mediaUrl = `https://media.pigmap.org/${fileName}`;

        await env.LIVESTOCK_DB.prepare(
            `INSERT INTO media (report_id, url, content_type) VALUES (?, ?, ?)`
        ).bind(reportId, mediaUrl, mediaFile.type).run();
    }

    const broadcastData = { type: 'new_report', payload: { ...reportData, id: reportId, timestamp: Date.now(), mediaUrl } };
    await broadcastUpdate(env, broadcastData);

    return new Response(JSON.stringify({
        success: true,
        id: reportId,
        editToken,
        message: "Keep this token to edit your report. This is the only time you will see it!"
    }), { status: 201, headers: { 'Content-Type': 'application/json' } });
}

// Handler to update an existing report
export async function handleUpdateReport(request, env) {
    const { id } = request.params;
    const { report: reportData, editToken } = await request.json();

    if (!editToken) return new Response(JSON.stringify({ error: 'Edit token required' }), { status: 401 });
    const tokenResult = await env.LIVESTOCK_DB.prepare(`SELECT report_id FROM edit_tokens WHERE token = ? AND report_id = ? AND expires_at > ?`).bind(editToken, id, Date.now()).first();
    if (!tokenResult) return new Response(JSON.stringify({ error: 'Invalid or expired token' }), { status: 403 });

    await env.LIVESTOCK_DB.prepare(`UPDATE reports SET type = ?, description = ? WHERE id = ?`).bind(reportData.type, reportData.description, id).run();
    const updatedReport = await env.LIVESTOCK_DB.prepare(`SELECT r.*, m.url as mediaUrl FROM reports r LEFT JOIN media m ON r.id = m.report_id WHERE r.id = ?`).bind(id).first();
    await broadcastUpdate(env, { type: 'update_report', payload: updatedReport });

    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
}

// Handler to get comments for a report
export async function handleGetComments(request, env) {
    const { id } = request.params;
    const { results } = await env.LIVESTOCK_DB.prepare(`SELECT id, content, timestamp, media_url as mediaUrl FROM comments WHERE report_id = ? ORDER BY timestamp DESC`).bind(id).all();
    return new Response(JSON.stringify(results), { headers: { 'Content-Type': 'application/json' } });
}

// Handler to create a new comment
export async function handleCreateComment(request, env) {
    const { id: reportId } = request.params;
    const { content } = await request.json();
    const commentId = uuidv4();
    const timestamp = Date.now();

    await env.LIVESTOCK_DB.prepare(`INSERT INTO comments (id, report_id, content, timestamp) VALUES (?, ?, ?, ?)`).bind(commentId, reportId, content, timestamp).run();
    const broadcastData = { type: 'new_comment', payload: { reportId, id: commentId, content, timestamp } };
    await broadcastUpdate(env, broadcastData);

    return new Response(JSON.stringify({ success: true, id: commentId }), { status: 201, headers: { 'Content-Type': 'application/json' } });
}
