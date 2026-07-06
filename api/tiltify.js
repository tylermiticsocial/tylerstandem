// Vercel serverless function — proxies Tiltify API calls
// Place this file at: api/tiltify.js in your GitHub repo

const CLIENT_ID = '72a22a92485369483dbef8795c36b2cafc400effa3f99186027f8fcbd99b0765';
const CLIENT_SECRET = '7be5d97c0075689e391a795a23ad62d29f73a1dcb774737c195de905ce58bf9a';
const TILTIFY_BASE = 'https://v5api.tiltify.com';

let cachedToken = null;
let tokenExpiry = 0;

async function getToken() {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;
  const res = await fetch(`${TILTIFY_BASE}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: 'client_credentials',
      scope: 'public'
    })
  });
  const data = await res.json();
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in - 300) * 1000; // refresh 5min early
  return cachedToken;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const path = req.query.path;
  if (!path) return res.status(400).json({ error: 'Missing path parameter' });
  if (!path.startsWith('/api/public/')) return res.status(400).json({ error: 'Only public API paths allowed' });

  try {
    const token = await getToken();
    const upstream = await fetch(`${TILTIFY_BASE}${path}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await upstream.json();
    if (upstream.ok) {
      // Cache at Vercel's edge so concurrent/repeat visitors don't each hit Tiltify
      res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=120');
    }
    res.status(upstream.status).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
