
export default async function handler(req, res) {
  try {
    const id = req.query.id;
    const host = process.env.SHOTSTACK_HOST || "https://api.shotstack.io/v1";
    const key = process.env.SHOTSTACK_API_KEY;
    if (!key) return res.status(500).json({ error: "Missing SHOTSTACK_API_KEY" });
    const r = await fetch(`${host}/edit/v1/render/${id}`, { headers: { "x-api-key": key } });
    if (!r.ok) return res.status(502).json({ error: "Shotstack status error", details: await r.text() });
    const data = await r.json();
    res.json({ status: data?.response?.status || data?.status || "unknown", url: data?.response?.url || null });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}
