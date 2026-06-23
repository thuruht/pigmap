// src/handlers.js

import { v4 as uuidv4 } from 'uuid';

const MAX_DESCRIPTION_LENGTH = 1000;
const MAX_COMMENT_LENGTH = 500;
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB
const ALLOWED_MIME_TYPES = new Set([
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/avif',
    'video/mp4', 'video/webm', 'video/quicktime',
    'audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/aac',
]);

function sanitizeHTML(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Strip EXIF/metadata from JPEG images.
async function stripJpegExif(blob) {
    const buf = await blob.arrayBuffer();
    const view = new DataView(buf);

    if (view.getUint16(0, false) !== 0xFFD8) return blob; // not a JPEG

    let offset = 2;
    const safe = [buf.slice(0, 2)]; // keep SOI marker
    while (offset < view.byteLength - 1) {
        const marker = view.getUint16(offset, false);
        if (marker === 0xFFDA) { // Start of Scan — rest is image data
            safe.push(buf.slice(offset));
            break;
        }
        const segLen = view.getUint16(offset + 2, false) + 2;
        // Skip APP1-APPF segments (contain EXIF, XMP, ICC, etc.)
        if (marker >= 0xFFE1 && marker <= 0xFFEF) {
            offset += segLen;
            continue;
        }
        safe.push(buf.slice(offset, offset + segLen));
        offset += segLen;
    }
    return new Blob(safe, { type: 'image/jpeg' });
}

async function processMediaFile(file) {
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
        throw new Error(`File type not allowed: ${file.type}`);
    }
    if (file.size > MAX_FILE_SIZE) {
        throw new Error(`File too large: ${file.size} bytes`);
    }
    if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
        const blob = new Blob([await file.arrayBuffer()], { type: file.type });
        return stripJpegExif(blob);
    }
    return file;
}

async function broadcastUpdate(env, data) {
    try {
        const id = env.LIVESTOCK_REPORTS.idFromName('global-reports');
        const stub = env.LIVESTOCK_REPORTS.get(id);
        await stub.fetch('https://internal.pigmap/broadcast', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
    } catch (err) {
        // Broadcast failure is non-fatal
        console.warn('Broadcast failed:', err.message);
    }
}

export async function handleGetReports(request, env) {
    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '100', 10), 200);

    const { results } = await env.LIVESTOCK_DB.prepare(
        `SELECT r.id, r.type, r.count, r.comment, r.longitude, r.latitude, r.timestamp, r.icon,
                m.url as mediaUrl, m.content_type as mediaType
         FROM reports r
         LEFT JOIN media m ON r.id = m.report_id
         ORDER BY r.timestamp DESC
         LIMIT ?`
    ).bind(limit).all();

    return new Response(JSON.stringify(results), {
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
    });
}

export async function handleCreateReport(request, env) {
    const formData = await request.formData();
    const reportJson = formData.get('report');
    const mediaFile = formData.get('media');

    if (!reportJson) {
        return new Response(JSON.stringify({ error: 'Missing report data' }), {
            status: 400, headers: { 'Content-Type': 'application/json' },
        });
    }

    let reportData;
    try {
        reportData = JSON.parse(reportJson);
    } catch (_e) {
        return new Response(JSON.stringify({ error: 'Invalid JSON in report field' }), {
            status: 400, headers: { 'Content-Type': 'application/json' },
        });
    }

    // Validate required fields — use Number.isFinite so lon=0/lat=0 are accepted
    const lon = parseFloat(reportData.longitude);
    const lat = parseFloat(reportData.latitude);
    if (!reportData.type || !Number.isFinite(lon) || !Number.isFinite(lat)) {
        return new Response(JSON.stringify({ error: 'Missing required fields: type, longitude, latitude' }), {
            status: 400, headers: { 'Content-Type': 'application/json' },
        });
    }

    const reportId = uuidv4();
    const editToken = uuidv4();
    const tokenExpiry = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days

    const comment = sanitizeHTML((reportData.comment || reportData.description || '').substring(0, MAX_DESCRIPTION_LENGTH));
    const count = Math.max(1, parseInt(reportData.count || 1, 10));

    await env.LIVESTOCK_DB.batch([
        env.LIVESTOCK_DB.prepare(
            `INSERT INTO edit_tokens (token, report_id, expires_at) VALUES (?, ?, ?)`
        ).bind(editToken, reportId, tokenExpiry),
        env.LIVESTOCK_DB.prepare(
            `INSERT INTO reports (id, type, count, comment, longitude, latitude, timestamp, icon) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
            reportId,
            sanitizeHTML(reportData.type),
            count,
            comment,
            lon,
            lat,
            Date.now(),
            sanitizeHTML(reportData.icon || 'local_police_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png')
        ),
    ]);

    let mediaUrl = null;
    if (mediaFile && mediaFile.size > 0) {
        try {
            const processed = await processMediaFile(mediaFile);
            const ext = (mediaFile.name || 'file').split('.').pop().toLowerCase().replace(/[^a-z0-9]/g, '');
            const fileName = `${reportId}.${ext}`;
            await env.LIVESTOCK_MEDIA.put(fileName, processed, {
                httpMetadata: { contentType: mediaFile.type, cacheControl: 'public, max-age=31536000' },
            });
            mediaUrl = `https://media.pigmap.org/${fileName}`;
            await env.LIVESTOCK_DB.prepare(
                `INSERT INTO media (report_id, url, content_type) VALUES (?, ?, ?)`
            ).bind(reportId, mediaUrl, mediaFile.type).run();
        } catch (err) {
            console.error('Media upload failed:', err.message);
            // Non-fatal: report is saved, media is dropped
        }
    }

    await broadcastUpdate(env, {
        type: 'new_report',
        payload: { ...reportData, id: reportId, timestamp: Date.now(), mediaUrl, comment, count },
    });

    return new Response(JSON.stringify({
        success: true,
        id: reportId,
        editToken,
        message: 'Save this token — it is the only way to edit your report.',
    }), { status: 201, headers: { 'Content-Type': 'application/json' } });
}

export async function handleUpdateReport(request, env) {
    const { id } = request.params;
    let body;
    try {
        body = await request.json();
    } catch (_e) {
        return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
            status: 400, headers: { 'Content-Type': 'application/json' },
        });
    }

    const { report: reportData, editToken } = body;
    if (!editToken) {
        return new Response(JSON.stringify({ error: 'Edit token required' }), {
            status: 401, headers: { 'Content-Type': 'application/json' },
        });
    }

    if (!reportData || typeof reportData !== 'object') {
        return new Response(JSON.stringify({ error: 'Missing report data' }), {
            status: 400, headers: { 'Content-Type': 'application/json' },
        });
    }

    const tokenRow = await env.LIVESTOCK_DB.prepare(
        `SELECT report_id FROM edit_tokens WHERE token = ? AND report_id = ? AND expires_at > ?`
    ).bind(editToken, id, Date.now()).first();

    if (!tokenRow) {
        return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
            status: 403, headers: { 'Content-Type': 'application/json' },
        });
    }

    await env.LIVESTOCK_DB.prepare(
        `UPDATE reports SET type = ?, comment = ? WHERE id = ?`
    ).bind(
        sanitizeHTML(reportData.type),
        sanitizeHTML((reportData.comment || reportData.description || '').substring(0, MAX_DESCRIPTION_LENGTH)),
        id
    ).run();

    const updated = await env.LIVESTOCK_DB.prepare(
        `SELECT r.*, m.url as mediaUrl FROM reports r LEFT JOIN media m ON r.id = m.report_id WHERE r.id = ?`
    ).bind(id).first();

    await broadcastUpdate(env, { type: 'update_report', payload: updated });

    return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' },
    });
}

export async function handleGetComments(request, env) {
    const { id } = request.params;
    const { results } = await env.LIVESTOCK_DB.prepare(
        `SELECT id, content, timestamp FROM comments WHERE report_id = ? ORDER BY timestamp DESC LIMIT 100`
    ).bind(id).all();
    return new Response(JSON.stringify(results), {
        headers: { 'Content-Type': 'application/json' },
    });
}

export async function handleCreateComment(request, env) {
    const { id: reportId } = request.params;
    let body;
    try {
        body = await request.json();
    } catch (_e) {
        return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
            status: 400, headers: { 'Content-Type': 'application/json' },
        });
    }

    const { content } = body;
    if (!content || typeof content !== 'string') {
        return new Response(JSON.stringify({ error: 'Comment content required' }), {
            status: 400, headers: { 'Content-Type': 'application/json' },
        });
    }

    const sanitized = sanitizeHTML(content.substring(0, MAX_COMMENT_LENGTH));
    const commentId = uuidv4();
    const timestamp = Date.now();

    await env.LIVESTOCK_DB.prepare(
        `INSERT INTO comments (id, report_id, content, timestamp) VALUES (?, ?, ?, ?)`
    ).bind(commentId, reportId, sanitized, timestamp).run();

    await broadcastUpdate(env, {
        type: 'new_comment',
        payload: { reportId, id: commentId, content: sanitized, timestamp },
    });

    return new Response(JSON.stringify({ success: true, id: commentId }), {
        status: 201, headers: { 'Content-Type': 'application/json' },
    });
}
