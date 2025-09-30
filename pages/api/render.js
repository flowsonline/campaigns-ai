
async function startPrediction(token, model, input) {
  const r = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ version: model, input })
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
async function getPrediction(token, id) {
  const r = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
    headers: { "Authorization": `Bearer ${token}` }
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  try {
    const token = process.env.REPLICATE_API_TOKEN;
    if (!token) return res.status(500).json({ error: "Missing REPLICATE_API_TOKEN" });
    const { prompt } = req.body || {};
    // Default to FLUX.1.1 Pro if you don't supply a version hash via env
    const model = process.env.REP_MODEL_VERSION || "7d1459e9e8b9e1c5b8a4d0f8b42d8a4b1c2a9f0d5c7e5bd3c4a7d4f0f1a2b3c4";
    const pred = await startPrediction(token, model, { prompt, guidance: 3, width: 1024, height: 1024 });
    let p = pred;
    const started = Date.now();
    while (!["succeeded","failed","canceled"].includes(p.status)) {
      if (Date.now()-started>60000) break;
      await new Promise(r=>setTimeout(r, 2000));
      p = await getPrediction(token, pred.id);
    }
    const url = p?.output?.[0] || p?.output || null;
    res.json({ url, status: p.status, id: p.id });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}
