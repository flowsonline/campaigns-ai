
import fs from "fs";
import path from "path";

function substitute(obj, fields) {
  const s = JSON.stringify(obj);
  const out = s.replace(/\{\{(\w+)\}\}/g, (_, k) => fields[k] ?? "");
  return JSON.parse(out);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  try {
    const { template = "reel", fields = {} } = req.body || {};
    const host = process.env.SHOTSTACK_HOST || "https://api.shotstack.io/v1";
    const key = process.env.SHOTSTACK_API_KEY;
    if (!key) return res.status(500).json({ error: "Missing SHOTSTACK_API_KEY" });

    const file = path.join(process.cwd(), "templates", `${template}.json`);
    const raw = JSON.parse(fs.readFileSync(file, "utf8"));
    const payload = substitute(raw, fields);

    const r = await fetch(`${host}/edit/${"v1"}/render`, {
      method: "POST",
      headers: { "x-api-key": key, "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!r.ok) return res.status(502).json({ error: "Shotstack error", details: await r.text() });
    const data = await r.json();
    res.json({ status: "queued", template, duration: String(fields.DURATION||""), jobId: data?.response?.id || data?.id || null });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}
