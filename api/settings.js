export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const ecId = 'ecfg_7qdbufqclebxlbrn8yfxmgu5zvjy';
  const ecToken = 'a696f2b4-5a5e-43f8-875f-c274de702515';
  const VERCEL_TOKEN = process.env.VERCEL_TOKEN || '';

  if (req.method === 'GET') {
    const key = req.query.key;
    if (key) {
      try {
        const r = await fetch(`https://edge-config.vercel.com/${ecId}/item/${encodeURIComponent(key)}`, {
          headers: { Authorization: `Bearer ${ecToken}` }
        });
        const value = r.ok ? await r.json() : null;
        return res.status(200).json({ value });
      } catch(e) {
        return res.status(200).json({ value: null, error: e.message });
      }
    }
    try {
      const [sr, vr] = await Promise.all([
        fetch(`https://edge-config.vercel.com/${ecId}/item/tandem_settings`, {
          headers: { Authorization: `Bearer ${ecToken}` }
        }),
        fetch(`https://edge-config.vercel.com/${ecId}/item/tandem_videos`, {
          headers: { Authorization: `Bearer ${ecToken}` }
        })
      ]);
      const settings = sr.ok ? await sr.json() : {};
      const videos = vr.ok ? await vr.json() : [];
      return res.status(200).json({ settings: settings||{}, videos: videos||[] });
    } catch(e) {
      return res.status(200).json({ settings: {}, videos: [], error: e.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { key, value } = req.body;
      const r = await fetch(`https://api.vercel.com/v1/edge-config/${ecId}/items`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${VERCEL_TOKEN}`,
          'Content-Type': 'application/json'
        },
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
