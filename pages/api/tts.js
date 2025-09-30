
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  try {
    const { text, voice = "alloy" } = req.body || {};
    const key = process.env.OPENAI_API_KEY;
    if (!key) return res.status(500).json({ error: "Missing OPENAI_API_KEY" });
    const r = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "gpt-4o-mini-tts", voice, input: text, format: "mp3" })
    });
    if (!r.ok) return res.status(502).json({ error: "OpenAI TTS error", details: await r.text() });
    const buf = Buffer.from(await r.arrayBuffer());
    const dataUrl = `data:audio/mpeg;base64,${buf.toString("base64")}`;
    res.json({ audioDataUrl: dataUrl });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}
