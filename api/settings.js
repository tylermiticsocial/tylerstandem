export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const EDGE_CONFIG = process.env.EDGE_CONFIG;
  const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
  const ecId = EDGE_CONFIG?.match(/ecfg_[a-z0-9]+/i)?.[0];

  if (!ecId || !VERCEL_TOKEN) {
    return res.status(500).json({ error: 'Missing env vars', hasEc: !!ecId, hasToken: !!VERCEL_TOKEN });
  }

  if (req.method === 'GET') {
    try {
      const [sr, vr] = await Promise.all([
        fetch(`https://edge-config.vercel.com/${ecId}/item/tandem_settings?version=1`, {
          headers: { Authorization: `Bearer ${VERCEL_TOKEN}` }
        }),
        fetch(`https://edge-config.vercel.com/${ecId}/item/tandem_videos?version=1`, {
          headers: { Authorization: `Bearer ${VERCEL_TOKEN}` }
        })
      ]);
      const settings = sr.ok ? await sr.json() : {};
      const videos = vr.ok ? await vr.json() : [];
      return res.status(200).json({ settings: settings||{}, videos: videos||[] });
    } catch(e) {
      return res.status(200).json({ settings: {}, videos: [] });
    }
  }

  if (req.method === 'POST') {
    try {
      const { key, value } = req.body;
      const r = await fetch(`https://api.vercel.com/v1/edge-config/${ecId}/items`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${VERCEL_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: [{ operation: 'upsert', key, value }] })
      });
      const result = await r.json();
      return res.status(r.ok ? 200 : 400).json(result);
    } catch(e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
