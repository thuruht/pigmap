// PigMap.org - Cloudflare Worker
import { Router } from 'itty-router';
import { LivestockReport } from './durable_objects';
import { translations, languageNames } from './i18n';

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
    const report = JSON.parse(reportJson);
    
    // Basic validation
    if (!report.id || !report.type || !report.longitude || !report.latitude) {
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
      INSERT INTO reports (id, type, count, comment, longitude, latitude, timestamp, reporter_ip)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      report.id,
      report.type,
      report.count || 1,
      report.comment || '',
      report.longitude,
      report.latitude,
      report.timestamp,
      clientIP
    ).run();
    
    // Process media file if provided
    let mediaUrl = null;
    if (mediaFile) {
      // Generate a unique filename
      const fileExt = mediaFile.name.split('.').pop();
      const fileName = `${report.id}.${fileExt}`;
      
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
        report.id,
        mediaUrl,
        mediaFile.type
      ).run();
      
      // Add the media URL to the report
      report.imageUrl = mediaUrl;
    }
    
    // Update Durable Object for real-time updates
    const id = env.LIVESTOCK_REPORTS.idFromName('global');
    const obj = env.LIVESTOCK_REPORTS.get(id);
    const resp = await obj.fetch('https://internal/broadcast', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(report)
    });
    
    return new Response(JSON.stringify({ success: true, id: report.id }), {
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

// 404 for everything else
router.all('*', () => new Response('Not Found', { status: 404 }));

// Export worker handler
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const hostname = url.hostname;
    
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
      
      // Static assets - pass to static handler
      return env.ASSETS.fetch(request);
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
