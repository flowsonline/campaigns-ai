
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  try {
    const host = process.env.SHOTSTACK_HOST || "https://api.shotstack.io/v1";
    const key = process.env.SHOTSTACK_API_KEY;
    if (!key) return res.status(500).json({ error: "Missing SHOTSTACK_API_KEY" });
    const { imageUrl, title="Ad", duration=10, size="1080x1080" } = req.body || {};
    const [w,h] = size.split("x").map(n=>parseInt(n,10));
    const payload = {
      timeline: { tracks: [{ clips: [{ asset:{ type:"image", src:imageUrl }, start:0, length:duration }] }] },
      output: { format: "mp4", size: { width: w, height: h } }
    };
    const r = await fetch(`${host}/edit/v1/render`, {
      method: "POST",
      headers: { "x-api-key": key, "Content-Type":"application/json" },
      body: JSON.stringify(payload)
    });
    if (!r.ok) return res.status(502).json({ error: "Shotstack error", details: await r.text() });
    const data = await r.json();
    res.json({ id: data?.response?.id || data?.id || null, status: "queued" });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}
