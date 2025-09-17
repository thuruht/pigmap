// src/index.js

import { Toucan } from 'toucan-js';
import { Router } from 'itty-router';
import { handleGetReports, handleCreateReport, handleUpdateReport, handleGetComments, handleCreateComment } from './handlers';
import { translations, languageNames } from './i18n';

// Export the Durable Object class so Wrangler can recognize it
export { LivestockReport } from './durable_objects';

const router = Router();

// Middleware for error handling and Sentry integration
const withErrorHandler = (request, env, ctx) => async (handler) => {
    // Uncomment and add SENTRY_DSN secret if you use Sentry
    // const sentry = new Toucan({
    //     dsn: env.SENTRY_DSN,
    //     context: ctx,
    //     request,
    // });
    try {
        return await handler();
    } catch (err) {
        // sentry.captureException(err);
        console.error("Caught error:", err.stack);
        return new Response('Internal Server Error', { status: 500 });
    }
};

// Middleware for adding CORS headers
const withCors = (response) => {
    const headers = new Headers(response.headers);
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return new Response(response.body, { ...response, headers });
};

// API Routes
router.get('/api/reports', (request, env, ctx) => withErrorHandler(request, env, ctx)(() => handleGetReports(request, env)));
router.post('/api/reports', (request, env, ctx) => withErrorHandler(request, env, ctx)(() => handleCreateReport(request, env)));
router.put('/api/reports/:id', (request, env, ctx) => withErrorHandler(request, env, ctx)(() => handleUpdateReport(request, env)));
router.get('/api/reports/:id/comments', (request, env, ctx) => withErrorHandler(request, env, ctx)(() => handleGetComments(request, env)));
router.post('/api/reports/:id/comments', (request, env, ctx) => withErrorHandler(request, env, ctx)(() => handleCreateComment(request, env)));

// Translations endpoint
router.get('/api/translations', (request, env) => {
    return new Response(JSON.stringify({ translations, languageNames }));
});

// Real-time WebSocket connection route
router.get('/api/live', (request, env) => {
    const id = env.LIVESTOCK_REPORTS.idFromName('global-reports');
    const durableObject = env.LIVESTOCK_REPORTS.get(id);
    return durableObject.fetch(request);
});

// Catch-all for other requests, serves static assets from the `site` binding
router.all('*', (request, env) => {
    try {
        return env.ASSETS.fetch(request);
    } catch (e) {
        // This handles cases where the asset isn't found, especially for SPA routing.
        // It fetches the index.html content to allow the client-side router to take over.
        return env.ASSETS.fetch(new Request(new URL(request.url).origin + '/index.html'));
    }
});

export default {
    async fetch(request, env, ctx) {
        // Handle CORS preflight requests
        if (request.method === 'OPTIONS') {
            return withCors(new Response(null, { status: 204 }));
        }

        // Apply rate limiting
        const { success } = await env.RATE_LIMITER.limit({ key: request.headers.get('CF-Connecting-IP') });
        if (!success) {
            return withCors(new Response('Rate limit exceeded', { status: 429 }));
        }
        
        const response = await router.handle(request, env, ctx);
        return withCors(response);
    }
};
