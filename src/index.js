// src/index.js (Corrected)

import { Toucan } from 'toucan-js';
import { Router } from 'itty-router';
import { handleGetReports, handleCreateReport, handleUpdateReport, handleGetComments, handleCreateComment } from './handlers';
import { translations, languageNames } from './i18n';

// Export the Durable Object class so Wrangler can recognize it
export { LivestockReport } from './durable_objects';

const router = Router();

// Middleware for error handling
const withErrorHandler = (request, env, ctx) => async (handler) => {
    try {
        return await handler();
    } catch (err) {
        console.error("Caught error:", err.stack);
        // Optionally add Sentry or other error tracking here
        return new Response('Internal Server Error', { status: 500 });
    }
};

// Middleware for adding CORS headers
const withCors = (response) => {
    if (!response) {
      // In case of a fall-through where no response is generated
      return new Response('Not found', { status: 404 });
    }
    const headers = new Headers(response.headers);
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return new Response(response.body, { ...response, headers });
};

// --- API Routes ---
// The router will only handle requests prefixed with /api
router.get('/api/reports', (request, env, ctx) => withErrorHandler(request, env, ctx)(() => handleGetReports(request, env)));
router.post('/api/reports', (request, env, ctx) => withErrorHandler(request, env, ctx)(() => handleCreateReport(request, env)));
router.put('/api/reports/:id', (request, env, ctx) => withErrorHandler(request, env, ctx)(() => handleUpdateReport(request, env)));
router.get('/api/reports/:id/comments', (request, env, ctx) => withErrorHandler(request, env, ctx)(() => handleGetComments(request, env)));
router.post('/api/reports/:id/comments', (request, env, ctx) => withErrorHandler(request, env, ctx)(() => handleCreateComment(request, env)));
router.get('/api/translations', (request, env) => new Response(JSON.stringify({ translations, languageNames })));

// Real-time WebSocket connection route
router.get('/api/live', (request, env) => {
    const id = env.LIVESTOCK_REPORTS.idFromName('global-reports');
    const durableObject = env.LIVESTOCK_REPORTS.get(id);
    return durableObject.fetch(request);
});

// --- Main Fetch Handler ---
export default {
    async fetch(request, env, ctx) {
        if (request.method === 'OPTIONS') {
            return withCors(new Response(null, { status: 204 }));
        }

        const { success } = await env.RATE_LIMITER.limit({ key: request.headers.get('CF-Connecting-IP') });
        if (!success) {
            return withCors(new Response('Rate limit exceeded', { status: 429 }));
        }

        // Try to match an API route first.
        let response = await router.handle(request, env, ctx);

        // If no API route was matched, it's a request for a static asset.
        // Let the ASSETS service (configured by [site] in wrangler.toml) handle it.
        if (!response) {
            try {
                response = await env.ASSETS.fetch(request);
            } catch (e) {
                // If the asset is not found, serve the SPA's index.html.
                // This allows client-side routing to work correctly.
                const notFoundResponse = await env.ASSETS.fetch(new Request(new URL(request.url).origin + '/index.html'));
                response = new Response(notFoundResponse.body, { ...notFoundResponse, status: 200 });
            }
        }

        return withCors(response);
    }
};