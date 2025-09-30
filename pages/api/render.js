// pages/api/renderVideo.js
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { title, imageUrl, audioUrl, format } = req.body;
    // format: 'square' | 'reel' | 'wide'

    const HOST = process.env.SHOTSTACK_HOST || 'https://api.shotstack.io';
    const API_KEY = process.env.SHOTSTACK_API_KEY;
    const url = `${HOST}/edit/v1/render`; // <-- correct order

    // Minimal timeline using image + optional audio + text overlay
    const resolution = format === 'reel' ? 'sd-vertical' : format === 'wide' ? 'sd' : 'sd-square';
    const duration = format === 'reel' ? 15 : format === 'wide' ? 15 : 10;

    const timeline = {
      background: '#000000',
      tracks: [
        // image
        {
          clips: [
            {
              asset: { type: 'image', src: imageUrl },
              start: 0,
              length: duration,
              fit: 'cover'
            }
          ]
        },
        // headline overlay
        {
          clips: [
            {
              asset: {
                type: 'title',
                text: title || '',
                style: 'chunk',
                color: '#ffffff'
              },
              start: 0.5,
              length: Math.max(3, Math.min(6, duration - 1)),
              position: 'center'
            }
          ]
        },
        // audio (optional)
        ...(audioUrl ? [{
          clips: [
            {
              asset: { type: 'audio', src: audioUrl },
              start: 0,
              length: duration
            }
          ]
        }] : [])
      ]
    };

    const payload = {
      timeline,
      output: { format: 'mp4', resolution },
      storage: { destination: { type: 'shotstack' } }
    };

    const r = await fetch(url, {
      method: 'POST',
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await r.json();
    if (!r.ok) return res.status(502).json({ error: 'Shotstack error', details: data });

    return res.status(200).json(data); // {id, status, ...}
  } catch (e) {
    return res.status(500).json({ error: 'Server error', details: String(e) });
  }
}
