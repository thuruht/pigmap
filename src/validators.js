// Validation and rate-limiting helpers for PigMap Cloudflare Worker
// These functions are written to run in the Worker runtime. They avoid
// storing raw IPs; rate-limiting keys are hashed with an optional salt.

export function isValidLatLon(lat, lon) {
  if (typeof lat !== 'number' || typeof lon !== 'number') return false;
  if (!isFinite(lat) || !isFinite(lon)) return false;
  if (lat < -90 || lat > 90) return false;
  if (lon < -180 || lon > 180) return false;
  return true;
}

export function validateReportPayload(report) {
  const allowedTypes = ['cow', 'horse', 'sheep', 'goat', 'other'];
  if (!report || typeof report !== 'object') return { ok: false, error: 'Invalid report object' };
  if (!report.type || typeof report.type !== 'string' || !allowedTypes.includes(report.type)) {
    return { ok: false, error: 'Invalid or missing type' };
  }
  const count = report.count === undefined ? 1 : Number(report.count);
  if (!Number.isInteger(count) || count < 1 || count > 1000) return { ok: false, error: 'Invalid count' };
  const lat = Number(report.latitude);
  const lon = Number(report.longitude);
  if (!isValidLatLon(lat, lon)) return { ok: false, error: 'Invalid coordinates' };
  if (report.comment && String(report.comment).length > 5000) return { ok: false, error: 'Comment too long' };
  return { ok: true, report: { ...report, count, latitude: lat, longitude: lon } };
}

export async function rateLimit(request, env, opts = {}) {
  const limit = opts.limit || 10; // default 10 requests
  const windowSeconds = opts.windowSeconds || 60; // per minute
  const keyPrefix = opts.keyPrefix || 'rl';

  // Best-effort identifier — prefer CF-Connecting-IP (we don't store it),
  // fall back to a generic anon id. We'll hash with optional salt.
  const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('x-forwarded-for') || 'anon';

  let id = ip;
  try {
    if (typeof crypto?.subtle?.digest === 'function') {
      const encoder = new TextEncoder();
      const salt = env?.RATE_LIMIT_SALT || '';
      const data = encoder.encode(ip + salt + keyPrefix);
      const digest = await crypto.subtle.digest('SHA-256', data);
      id = Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
    }
  } catch (e) {
    // Fallback to raw id if hashing isn't available
  }

  if (!env?.PIGMAP_RATE_LIMIT || typeof env.PIGMAP_RATE_LIMIT.get !== 'function') {
    // No KV bound — allow through but indicate unlimited
    return { allowed: true, remaining: Infinity };
  }

  const key = `${keyPrefix}:${id}`;
  const current = await env.PIGMAP_RATE_LIMIT.get(key);
  const count = current ? parseInt(current, 10) : 0;
  if (count >= limit) return { allowed: false, remaining: 0 };

  await env.PIGMAP_RATE_LIMIT.put(key, String(count + 1), { expirationTtl: windowSeconds });
  return { allowed: true, remaining: limit - (count + 1) };
}

export function isValidMediaSignature(buffer, mime) {
  if (!buffer || buffer.byteLength < 12) return false;
  const arr = new Uint8Array(buffer);
  // JPEG: FF D8 FF
  if (mime === 'image/jpeg' && arr[0] === 0xFF && arr[1] === 0xD8 && arr[2] === 0xFF) return true;
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (mime === 'image/png' && arr[0] === 0x89 && arr[1] === 0x50 && arr[2] === 0x4E && arr[3] === 0x47) return true;
  // GIF: GIF8
  if (mime === 'image/gif' && arr[0] === 0x47 && arr[1] === 0x49 && arr[2] === 0x46) return true;
  // WebP: RIFF....WEBP
  if (mime === 'image/webp' && arr[0] === 0x52 && arr[1] === 0x49 && arr[2] === 0x46 && arr[8] === 0x57 && arr[9] === 0x45) return true;
  return false;
}
