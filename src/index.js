// PigMap.org - Cloudflare Worker
import { Router } from 'itty-router';
import { LivestockReport } from './durable_objects';
import { translations, languageNames } from './i18n';
import { v4 as uuidv4 } from 'uuid';

// Helper to determine MIME type
function getMimeType(path) {
  // Extract the file extension
  const extension = path.split('.').pop().toLowerCase();
  
  const mimeTypes = {
    'html': 'text/html',
    'css': 'text/css',
    'js': 'application/javascript',
    'mjs': 'application/javascript',
    'json': 'application/json',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'svg': 'image/svg+xml',
    'ico': 'image/x-icon',
    'woff': 'font/woff',
    'woff2': 'font/woff2',
    'ttf': 'font/ttf',
    'otf': 'font/otf',
    'eot': 'application/vnd.ms-fontobject',
    'map': 'application/json'
  };
  
  return mimeTypes[extension] || 'application/octet-stream';
}

// Create router
const router = Router();

// WebSocket connections by client ID
const clients = new Map();

// Handle API routes for translations
router.get('/api/translations/:lang', async (request, env) => {
  const { lang } = request.params;
  
  // Check if language is supported
  if (!translations[lang]) {
    return new Response(JSON.stringify({ error: 'Language not supported' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  return new Response(JSON.stringify(translations[lang]), {
    headers: { 'Content-Type': 'application/json' }
  });
});

// Get available languages
router.get('/api/translations', async (request, env) => {
  // Get recommended languages for the region if available
  const region = request.region;
  let languageList = Object.keys(translations);
  
  if (region && region.recommendedLanguages && region.recommendedLanguages.length > 0) {
    // Sort languages to prioritize recommended ones for this region
    languageList.sort((a, b) => {
      const aIsRecommended = region.recommendedLanguages.includes(a);
      const bIsRecommended = region.recommendedLanguages.includes(b);
      
      if (aIsRecommended && !bIsRecommended) return -1;
      if (!aIsRecommended && bIsRecommended) return 1;
      return 0;
    });
  }
  
  return new Response(JSON.stringify({
    languages: languageList.map(code => ({
      code,
      name: languageNames[code],
      recommended: region?.recommendedLanguages?.includes(code) || false
    }))
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
});

// Get region information
router.get('/api/region', async (request, env) => {
  const region = request.region || {
    id: 'default',
    name: 'Default',
    center: { lat: 39.8283, lon: -98.5795 }, // Center of US
    zoom: 4,
    defaultLanguage: 'en'
  };
  
  return new Response(JSON.stringify(region), {
    headers: { 'Content-Type': 'application/json' }
  });
});

// Handle API routes for reports
router.get('/api/reports', async (request, env) => {
  // Get client's location to sort reports by proximity
  const clientIP = request.headers.get('CF-Connecting-IP');
  const geoData = request.cf ? {
    latitude: request.cf.latitude,
    longitude: request.cf.longitude,
    country: request.cf.country
  } : null;
  
  // Query D1 database for reports
  let limit = 100; // Default limit
  const urlParams = new URL(request.url).searchParams;
  if (urlParams.has('limit')) {
    limit = parseInt(urlParams.get('limit'), 10);
    limit = Math.min(Math.max(1, limit), 500); // Between 1 and 500
  }
  
  try {
    // Create the query
    let query = `
      SELECT r.*, m.url as imageUrl
      FROM reports r
      LEFT JOIN media m ON r.id = m.report_id
      WHERE r.timestamp > datetime('now', '-48 hour')
    `;
    
    // If we have location data, order by distance
    if (geoData && geoData.latitude && geoData.longitude) {
      query += `
        ORDER BY (
          (r.latitude - ${geoData.latitude}) * (r.latitude - ${geoData.latitude}) + 
          (r.longitude - ${geoData.longitude}) * (r.longitude - ${geoData.longitude})
        ) ASC
      `;
    } else {
      query += ` ORDER BY r.timestamp DESC`;
    }
    
    query += ` LIMIT ${limit}`;
    
    // Execute the query
    const result = await env.LIVESTOCK_DB.prepare(query).all();
    
    return new Response(JSON.stringify(result.results), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Database error:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch reports' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

router.post('/api/reports', async (request, env) => {
  // Check if this is a multipart form
  const contentType = request.headers.get('Content-Type') || '';
  
  if (!contentType.includes('multipart/form-data')) {
    return new Response(JSON.stringify({ error: 'Expected multipart form data' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  try {
    // Parse form data
    const formData = await request.formData();
    const reportJson = formData.get('report');
    const mediaFile = formData.get('media');
    
    if (!reportJson) {
      return new Response(JSON.stringify({ error: 'Missing report data' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Parse report data
    const reportData = JSON.parse(reportJson);
    const reportId = uuidv4(); // Generate a unique ID for the report
    
    // Generate an edit token that will be returned to the user
    const editToken = uuidv4();
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30); // Token valid for 30 days
    
    // Store the edit token in the database
    await env.LIVESTOCK_DB.prepare(`
      INSERT INTO edit_tokens (token, report_id, expires_at)
      VALUES (?, ?, ?)
    `).bind(editToken, reportId, expiryDate.getTime()).run();
    
    // Basic validation
    if (!reportData.type || !reportData.longitude || !reportData.latitude) {
      return new Response(JSON.stringify({ error: 'Invalid report data' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Get client IP and country
    const clientIP = request.headers.get('CF-Connecting-IP');
    const clientCountry = request.cf ? request.cf.country : null;
    
    // Only allow reports from the US (configurable via KV)
    const allowedCountries = await env.PIGMAP_CONFIG.get('allowed_countries');
    const allowedCountriesArray = allowedCountries ? JSON.parse(allowedCountries) : ['US'];
    
    if (clientCountry && !allowedCountriesArray.includes(clientCountry)) {
      return new Response(JSON.stringify({ error: 'Reports are only allowed from specific countries' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Store in D1 database
    await env.LIVESTOCK_DB.prepare(`
      INSERT INTO reports (id, type, count, comment, longitude, latitude, timestamp, reporter_ip, icon)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      reportId,
      reportData.type,
      reportData.count || 1,
      reportData.comment || '',
      reportData.longitude,
      reportData.latitude,
      reportData.timestamp,
      clientIP,
      reportData.icon || 'local_police_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png'
    ).run();
    
    // Process media file if provided
    let mediaUrl = null;
    if (mediaFile) {
      // Generate a unique filename
      const fileExt = mediaFile.name.split('.').pop();
      const fileName = `${reportId}.${fileExt}`;
      
      // Upload to R2
      await env.LIVESTOCK_MEDIA.put(fileName, mediaFile.stream(), {
        httpMetadata: {
          contentType: mediaFile.type,
        }
      });
      
      // Generate the public URL
      mediaUrl = `https://media.pigmap.org/${fileName}`;
      
      // Store media reference in D1
      await env.LIVESTOCK_DB.prepare(`
        INSERT INTO media (report_id, url, content_type)
        VALUES (?, ?, ?)
      `).bind(
        reportId,
        mediaUrl,
        mediaFile.type
      ).run();
      
      // Add the media URL to the report
      reportData.imageUrl = mediaUrl;
    }
    
    // Update Durable Object for real-time updates
    const id = env.LIVESTOCK_REPORTS.idFromName('global');
    const obj = env.LIVESTOCK_REPORTS.get(id);
    const resp = await obj.fetch('https://internal/broadcast', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...reportData,
        id: reportId,
        imageUrl: mediaUrl
      })
    });
    
    return new Response(JSON.stringify({ 
      success: true, 
      id: reportId, 
      editToken,
      message: "Save this edit token to make changes to your report later. This is the only time you'll see it!"
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error processing report:', error);
    return new Response(JSON.stringify({ error: 'Failed to process report' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

// Add endpoint for editing reports with magic link token
router.put('/api/reports/:id', async (request, env) => {
  try {
    // Parse the request
    const { id } = request.params;
    const contentType = request.headers.get('Content-Type') || '';
    let reportData, editToken;
    
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      reportData = JSON.parse(formData.get('report'));
      editToken = formData.get('editToken');
    } else {
      const data = await request.json();
      reportData = data.report;
      editToken = data.editToken;
    }
    
    if (!editToken) {
      return new Response(JSON.stringify({ error: 'Edit token is required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Verify the edit token
    const tokenResult = await env.LIVESTOCK_DB.prepare(`
      SELECT report_id, expires_at FROM edit_tokens 
      WHERE token = ? AND report_id = ? AND expires_at > ?
    `).bind(editToken, id, Date.now()).first();
    
    if (!tokenResult) {
      return new Response(JSON.stringify({ error: 'Invalid or expired edit token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Update the report
    await env.LIVESTOCK_DB.prepare(`
      UPDATE reports 
      SET type = ?, count = ?, comment = ?
      WHERE id = ?
    `).bind(
      reportData.type,
      reportData.count || 1,
      reportData.comment || '',
      id
    ).run();
    
    // Update Durable Object for real-time updates
    const durableId = env.LIVESTOCK_REPORTS.idFromName('global');
    const obj = env.LIVESTOCK_REPORTS.get(durableId);
    await obj.fetch('https://internal/broadcast', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...reportData,
        id,
        updated: true
      })
    });
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error updating report:', error);
    return new Response(JSON.stringify({ error: 'Failed to update report' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

// Add endpoint for anonymous comments
router.post('/api/reports/:id/comments', async (request, env) => {
  try {
    const { id } = request.params;
    const contentType = request.headers.get('Content-Type') || '';
    
    if (!contentType.includes('multipart/form-data')) {
      return new Response(JSON.stringify({ error: 'Expected multipart form data' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Parse form data
    const formData = await request.formData();
    const commentJson = formData.get('comment');
    const mediaFile = formData.get('media');
    
    if (!commentJson) {
      return new Response(JSON.stringify({ error: 'Missing comment data' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Verify report exists
    const reportExists = await env.LIVESTOCK_DB.prepare(`
      SELECT id FROM reports WHERE id = ?
    `).bind(id).first();
    
    if (!reportExists) {
      return new Response(JSON.stringify({ error: 'Report not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Parse comment data
    const commentData = JSON.parse(commentJson);
    const commentId = uuidv4();
    const timestamp = Date.now();
    const clientIP = request.headers.get('CF-Connecting-IP');
    
    // Store comment in database
    await env.LIVESTOCK_DB.prepare(`
      INSERT INTO comments (id, report_id, content, timestamp, commenter_ip)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      commentId,
      id,
      commentData.content,
      timestamp,
      clientIP
    ).run();
    
    // Process media file if provided
    let mediaUrl = null;
    if (mediaFile) {
      // Generate a unique filename
      const fileExt = mediaFile.name.split('.').pop();
      const fileName = `comment_${commentId}.${fileExt}`;
      
      // Upload to R2
      await env.LIVESTOCK_MEDIA.put(fileName, mediaFile.stream(), {
        httpMetadata: {
          contentType: mediaFile.type,
        }
      });
      
      // Generate the public URL
      mediaUrl = `https://media.pigmap.org/${fileName}`;
      
      // Store media reference in D1
      await env.LIVESTOCK_DB.prepare(`
        INSERT INTO comment_media (comment_id, url, content_type)
        VALUES (?, ?, ?)
      `).bind(
        commentId,
        mediaUrl,
        mediaFile.type
      ).run();
    }
    
    // Update Durable Object for real-time updates
    const durableId = env.LIVESTOCK_REPORTS.idFromName('global');
    const obj = env.LIVESTOCK_REPORTS.get(durableId);
    await obj.fetch('https://internal/broadcast', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'comment',
        reportId: id,
        commentId,
        content: commentData.content,
        timestamp,
        mediaUrl
      })
    });
    
    return new Response(JSON.stringify({ 
      success: true, 
      id: commentId,
      timestamp,
      mediaUrl
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    return new Response(JSON.stringify({ error: 'Failed to add comment' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

// Get comments for a report
router.get('/api/reports/:id/comments', async (request, env) => {
  try {
    const { id } = request.params;
    
    // Get comments from database
    const comments = await env.LIVESTOCK_DB.prepare(`
      SELECT c.id, c.content, c.timestamp, cm.url as media_url, cm.content_type as media_type
      FROM comments c
      LEFT JOIN comment_media cm ON c.id = cm.comment_id
      WHERE c.report_id = ?
      ORDER BY c.timestamp DESC
    `).bind(id).all();
    
    return new Response(JSON.stringify(comments.results), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching comments:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch comments' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

// WebSocket endpoint for real-time updates
router.get('/api/live', async (request, env) => {
  // Forward directly to the Durable Object for WebSocket handling
  const id = env.LIVESTOCK_REPORTS.idFromName('global');
  const obj = env.LIVESTOCK_REPORTS.get(id);
  
  // Connect to the Durable Object's /connect endpoint
  return await obj.fetch(new Request('https://internal/connect', {
    method: 'GET',
    headers: request.headers
  }));
});

// Add endpoint to list available icons
router.get('/api/icons', async (request, env) => {
  // We'll generate this list dynamically from the filesystem
  // For Cloudflare Workers, we need to hardcode this list since we can't access the filesystem directly
  const icons = [
    'abc_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png',
    'all_inclusive_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png',
    'apparel_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png',
    'auto_stories_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png',
    'book_5_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png',
    'books_movies_and_music_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png',
    'camera_roll_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png',
    'candle_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png',
    'copyright_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png',
    'crown_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png',
    'curtains_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png',
    'destruction_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png',
    'domino_mask_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png',
    'door_open_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png',
    'e911_emergency_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png',
    'eco_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png',
    'egg_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png',
    'emoji_nature_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png',
    'fertile_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png',
    'fingerprint_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png',
    'footprint_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png',
    'fort_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png',
    'frame_person_mic_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png',
    'front_loader_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png',
    'gate_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png',
    'hot_tub_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png',
    'ink_highlighter_move_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png',
    'kitchen_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png',
    'laundry_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png',
    'library_books_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png',
    'library_music_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png',
    'local_florist_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png',
    'local_police_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png',
    'location_searching_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png',
    'looks_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png',
    'mic_alert_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png',
    'military_tech_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png',
    'mindfulness_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png',
    'mode_heat_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png',
    'moped_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png',
    'movie_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png',
    'music_cast_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png',
    'music_note_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png',
    'nature_people_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png',
    'newsstand_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png',
    'nights_stay_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png',
    'not_listed_location_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png',
    'personal_bag_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png',
    'photo_prints_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png',
    'podcasts_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png',
    'psychology_alt_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png',
    'radar_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png',
    'radio_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png',
    'rainy_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png',
    'remember_me_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png',
    'rib_cage_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png',
    'science_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png',
    'sentiment_calm_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png',
    'sentiment_extremely_dissatisfied_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png',
    'sentiment_very_dissatisfied_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png',
    'siren_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png',
    'skull_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png',
    'sports_kabaddi_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png',
    'stock_media_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png',
    'store_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png',
    'storefront_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png',
    'styler_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png',
    'target_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png',
    'theater_comedy_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png',
    'today_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png',
    'transition_fade_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png',
    'video_library_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png',
    'voicemail_2_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png',
    'volume_up_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png',
    'wall_art_128dp_BFF4CD_FILL0_wght400_GRAD0_opsz48.png'
  ];
  
  return new Response(JSON.stringify(icons), {
    headers: { 'Content-Type': 'application/json' }
  });
});

// 404 for everything else
router.all('*', () => new Response('Not Found', { status: 404 }));

// Custom fetch handler that ensures proper content types
async function fetchWithContentType(url, overrideContentType = null) {
  const response = await fetch(url);
  const contentType = overrideContentType || getMimeType(url);
  
  // Create a new response with the appropriate content type
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: {
      ...Object.fromEntries(response.headers.entries()),
      'Content-Type': contentType
    }
  });
}

// Export worker handler
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const hostname = url.hostname;
    const path = url.pathname;
    
    // Check if this is a Kansas City specific domain
    const isKansasCity = hostname === 'kc.pigmap.org' || 
                       hostname === 'kcmo.pigmap.org' || 
                       hostname === 'kansascity.pigmap.org';
    
    // Set Kansas City region info in the request (for use in handlers)
    if (isKansasCity) {
      // Store region info in request object for use in handlers
      request.region = {
        id: 'kansascity',
        name: 'Kansas City',
        state: 'MO',
        center: { lat: 39.0997, lon: -94.5786 }, // KC coordinates
        zoom: 10, // Default zoom level for KC
        defaultLanguage: 'en', // Default language for KC region
        // Recommended languages for KC based on demographics
        recommendedLanguages: ['en', 'es', 'vi', 'ar', 'sw', 'fr', 'ne', 'kar', 'my', 'so', 'ku', 'ur']
      };
    }
    
    // For custom domain handling - both main domain and KC subdomains
    if (hostname === 'pigmap.org' || 
        hostname === 'www.pigmap.org' ||
        isKansasCity) {
      
      // API requests
      if (url.pathname.startsWith('/api/')) {
        return router.handle(request, env);
      }
      
      // For static assets, use the modern Assets binding approach
      try {
        let localPath = url.pathname;
        
        // Default to index.html for the root path
        if (localPath === "/") {
          localPath = "/index.html";
        }

        // Get the appropriate content type
        const contentType = getMimeType(localPath);
        
        // Fetch the asset using the ASSETS binding
        let response = await env.ASSETS.fetch(request);
        
        // If the response was successful, return it with the correct content type
        if (response.status === 200) {
          // Create a new response with the correct content type
          return new Response(response.body, {
            status: 200,
            headers: {
              'Content-Type': contentType,
              'Cache-Control': 'public, max-age=3600'
            }
          });
        }
        
        // If it's a 404 and we're requesting a HTML file, serve index.html (SPA behavior)
        if (response.status === 404 && !localPath.includes('.')) {
          let indexResponse = await env.ASSETS.fetch(new URL('/index.html', request.url));
          return new Response(indexResponse.body, {
            status: 200,
            headers: {
              'Content-Type': 'text/html',
              'Cache-Control': 'public, max-age=3600'
            }
          });
        }
        
        return response;
      } catch (assetError) {
        console.error('ASSETS binding error:', assetError);
        // Continue to fallbacks
      }
      
      try {
        // Legacy fallback: __STATIC_CONTENT directly if available
        if (env.__STATIC_CONTENT && typeof env.__STATIC_CONTENT.fetch === 'function') {
          try {
            const staticResponse = await env.__STATIC_CONTENT.fetch(request);
            const isJsFile = path.endsWith('.js') || path.endsWith('.mjs');
            
            // If successful and a JavaScript file, ensure proper content type
            if (staticResponse.status === 200 && isJsFile) {
              return new Response(staticResponse.body, {
                status: 200,
                headers: {
                  ...Object.fromEntries(staticResponse.headers.entries()),
                  'Content-Type': 'application/javascript'
                }
              });
            }
            
            return staticResponse;
          } catch (staticError) {
            console.error('__STATIC_CONTENT error:', staticError);
            // Continue to fallbacks
          }
        }
        
        // Last resort: Fallback to external CDN for common static files
        
        // Handle index.html
        if (path === "/" || path === "/index.html") {
          return fetchWithContentType("https://pigmap-static.pages.dev/index.html", "text/html");
        }
        
        // Handle main.js
        if (path === "/main.js") {
          return fetchWithContentType("https://pigmap-static.pages.dev/main.js", "application/javascript");
        }
        
        // Handle icons - fetch from CDN
        if (path.startsWith("/icons/")) {
          return fetchWithContentType(`https://pigmap-static.pages.dev${path}`);
        }
        
        // Handle lib directory (local dependencies)
        if (path.startsWith("/lib/")) {
          // Force JavaScript MIME type for all JS files in lib
          const mimeType = path.endsWith('.css') ? 'text/css' : 'application/javascript';
          return fetchWithContentType(`https://pigmap-static.pages.dev${path}`, mimeType);
        }
        
        // 404 for other static paths
        return new Response("Not Found", { status: 404 });
      } catch (e) {
        console.error('Error serving static content:', e);
        return new Response('Server Error', { status: 500 });
      }
    }
    
    // Media subdomain - serve from R2
    if (hostname === 'media.pigmap.org') {
      const url = new URL(request.url);
      const objectKey = url.pathname.substring(1); // Remove leading slash
      
      const object = await env.LIVESTOCK_MEDIA.get(objectKey);
      
      if (!object) {
        return new Response('Not Found', { status: 404 });
      }
      
      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set('etag', object.httpEtag);
      
      return new Response(object.body, {
        headers,
      });
    }
    
    // Return 404 for unknown domains
    return new Response('Not Found', { status: 404 });
  },
};

// Export Durable Object directly in index.js
export { LivestockReport };
