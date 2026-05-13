import { createClient } from '@vercel/edge-config';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const client = createClient(process.env.EDGE_CONFIG);

  if (req.method === 'GET') {
    try {
      const settings = await client.get('tandem_settings') || {};
      const videos = await client.get('tandem_videos') || [];
      return res.status(200).json({ settings, videos });
    } catch (e) {
      return res.status(200).json({ settings: {}, videos: [] });
    }
  }

  if (req.method === 'POST') {
    try {
      const { key, value } = req.body;
      // Use Vercel Edge Config API to update
      const edgeConfigId = process.env.EDGE_CONFIG.split('/').pop().split('?')[0];
      const token = process.env.VERCEL_TOKEN;

      await fetch(`https://api.vercel.com/v1/edge-config/${edgeConfigId}/items`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: [{ operation: 'upsert', key, value }]
        })
      });

      return res.status(200).json({ ok: true });
    } catch (e) {
      console.error('Settings write error:', e);
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
