// src/index.js

import { Router } from 'itty-router';
import { handleGetReports, handleCreateReport, handleUpdateReport, handleGetComments, handleCreateComment } from './handlers';
import { translations, languageNames } from './i18n';

// Static list of available marker icons in /public/icons/
const ICONS = [
    'local_police_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png',
    'siren_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png',
    'e911_emergency_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png',
    'radar_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png',
    'military_tech_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png',
    'footprint_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png',
    'destruction_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png',
    'skull_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png',
    'gate_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png',
    'door_open_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png',
    'fingerprint_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png',
    'location_searching_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png',
    'not_listed_location_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png',
    'target_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png',
    'domino_mask_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png',
    'nature_people_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png',
    'eco_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png',
    'front_loader_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png',
    'mic_alert_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png',
    'store_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png',
];

function handleGetIcons() {
    return new Response(JSON.stringify(ICONS), {
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' },
    });
}

export { LivestockReport } from './durable_objects';

const router = Router();

// Security headers applied to every HTML response
const SECURITY_HEADERS = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://unpkg.com",
        "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://unpkg.com https://fonts.bunny.net",
        "img-src 'self' data: blob: https://*.tile.openstreetmap.org https://server.arcgisonline.com https://*.basemaps.cartocdn.com https://*.tile.opentopomap.org https://media.pigmap.org https://unpkg.com https://cdn.jsdelivr.net",
        "connect-src 'self' wss: ws: https://nominatim.openstreetmap.org",
        "font-src 'self' https://cdn.jsdelivr.net https://fonts.bunny.net",
        "media-src 'self' https://media.pigmap.org",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
    ].join('; '),
};

// Build a proper ResponseInit — never spread a Response object.
function buildResponseInit(response, extraHeaders = {}) {
    const headers = new Headers(response.headers);
    for (const [k, v] of Object.entries(extraHeaders)) {
        headers.set(k, v);
    }
    return { status: response.status, statusText: response.statusText, headers };
}

// Add CORS + security headers without mutating immutable headers.
function withCors(response) {
    if (!response) {
        return new Response('Not found', { status: 404 });
    }
    const contentType = response.headers.get('Content-Type') || '';
    const isHtml = contentType.includes('text/html');
    const extra = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Magic-Code, X-Device-ID',
        ...(isHtml ? SECURITY_HEADERS : {}),
    };
    return new Response(response.body, buildResponseInit(response, extra));
}

// Wrap an error-prone handler and return 500 on failure.
function withErrorHandler(handler) {
    return async (...args) => {
        try {
            return await handler(...args);
        } catch (err) {
            console.error('Handler error:', err.message, err.stack);
            return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }
    };
}

// --- API Routes ---
router.get('/api/reports',              withErrorHandler((req, env) => handleGetReports(req, env)));
router.post('/api/reports',             withErrorHandler((req, env) => handleCreateReport(req, env)));
router.put('/api/reports/:id',          withErrorHandler((req, env) => handleUpdateReport(req, env)));
router.get('/api/reports/:id/comments', withErrorHandler((req, env) => handleGetComments(req, env)));
router.post('/api/reports/:id/comments',withErrorHandler((req, env) => handleCreateComment(req, env)));
router.get('/api/icons',                withErrorHandler((req, env) => handleGetIcons(req, env)));
router.get('/api/translations',         (_req) => new Response(JSON.stringify({ translations, languageNames }), {
    headers: { 'Content-Type': 'application/json' },
}));

// WebSocket upgrade — proxied to the Durable Object
router.get('/api/live', (request, env) => {
    const id = env.LIVESTOCK_REPORTS.idFromName('global-reports');
    const stub = env.LIVESTOCK_REPORTS.get(id);
    return stub.fetch(request);
});

// DO stats endpoint
router.get('/api/live/stats', (request, env) => {
    const id = env.LIVESTOCK_REPORTS.idFromName('global-reports');
    const stub = env.LIVESTOCK_REPORTS.get(id);
    return stub.fetch(new Request(new URL(request.url).origin + '/stats', request));
});

// --- Main Export ---
export default {
    async fetch(request, env, ctx) {
        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                status: 204,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Magic-Code, X-Device-ID',
                    'Access-Control-Max-Age': '86400',
                },
            });
        }

        // Global rate limiting via Cloudflare's built-in rate limiter binding
        if (env.RATE_LIMITER) {
            const key = request.headers.get('CF-Connecting-IP') || 'unknown';
            const { success } = await env.RATE_LIMITER.limit({ key });
            if (!success) {
                return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
                    status: 429,
                    headers: { 'Content-Type': 'application/json', 'Retry-After': '60' },
                });
            }
        }

        // Try API routes first
        let response = await router.handle(request, env, ctx);

        // Fall through to static assets
        if (!response) {
            try {
                response = await env.ASSETS.fetch(request);
            } catch (_e) {
                // Asset not found — serve index.html for SPA client-side routing
                try {
                    const indexReq = new Request(new URL('/index.html', request.url).toString());
                    const indexResponse = await env.ASSETS.fetch(indexReq);
                    response = new Response(indexResponse.body, {
                        status: 200,
                        statusText: 'OK',
                        headers: indexResponse.headers,
                    });
                } catch (_e2) {
                    response = new Response('Not Found', { status: 404 });
                }
            }
        }

        return withCors(response);
    },

    // Cron handler: runs every hour (0 * * * *) to clean up expired data.
    async scheduled(event, env, ctx) {
        ctx.waitUntil(runMaintenance(env));
    },
};

async function runMaintenance(env) {
    const now = Date.now();
    const nowIso = new Date(now).toISOString();

    try {
        // Delete edit tokens that have expired
        const tokenResult = await env.LIVESTOCK_DB.prepare(
            `DELETE FROM edit_tokens WHERE expires_at < ?`
        ).bind(now).run();
        console.log(`Cron: deleted ${tokenResult.meta?.changes ?? 0} expired edit tokens`);
    } catch (err) {
        console.error('Cron: failed to clean edit tokens:', err.message);
    }

    try {
        // Delete reports older than 30 days to keep the map fresh
        const cutoff = now - 30 * 24 * 60 * 60 * 1000;
        const reportResult = await env.LIVESTOCK_DB.prepare(
            `DELETE FROM reports WHERE timestamp < ?`
        ).bind(cutoff).run();
        console.log(`Cron: deleted ${reportResult.meta?.changes ?? 0} old reports`);
    } catch (err) {
        console.error('Cron: failed to clean old reports:', err.message);
    }
}
