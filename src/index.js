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

// Endpoint to serve the list of available icons
router.get('/api/icons', (request, env) => {
    const iconList = [
        "abc_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png", "all_inclusive_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png",
        "apparel_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png", "auto_stories_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png",
        "book_5_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png", "books_movies_and_music_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png",
        "camera_roll_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png", "candle_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png",
        "copyright_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png", "crown_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png",
        "curtains_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png", "destruction_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png",
        "domino_mask_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png", "door_open_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png",
        "e911_emergency_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png", "eco_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png",
        "egg_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png", "emoji_nature_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png",
        "fertile_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png", "fingerprint_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png",
        "footprint_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png", "fort_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png",
        "frame_person_mic_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png", "front_loader_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png",
        "gate_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png", "hot_tub_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png",
        "ink_highlighter_move_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png", "kitchen_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png",
        "laundry_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png", "library_books_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png",
        "library_music_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png", "local_florist_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png",
        "local_police_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png", "location_searching_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png",
        "looks_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png", "mic_alert_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png",
        "military_tech_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png", "mindfulness_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png",
        "mode_heat_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png", "moped_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png",
        "movie_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png", "music_cast_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png",
        "music_note_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png", "nature_people_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png",
        "newsstand_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png", "nights_stay_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png",
        "not_listed_location_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png", "personal_bag_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png",
        "photo_prints_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png", "podcasts_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png",
        "psychology_alt_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png", "radar_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png",
        "radio_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png", "rainy_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png",
        "remember_me_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png", "rib_cage_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png",
        "science_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png", "sentiment_calm_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png",
        "sentiment_extremely_dissatisfied_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png", "sentiment_very_dissatisfied_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png",
        "siren_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png", "skull_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png",
        "sports_kabaddi_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png", "stock_media_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png",
        "store_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png", "storefront_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png",
        "styler_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png", "target_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png",
        "theater_comedy_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png", "today_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png",
        "transition_fade_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png", "video_library_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png",
        "voicemail_2_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png", "volume_up_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png",
        "wall_art_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png"
    ];
    const uniqueIcons = [...new Set(iconList)];
    return new Response(JSON.stringify(uniqueIcons), { headers: { 'Content-Type': 'application/json' } });
});

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