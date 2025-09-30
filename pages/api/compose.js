
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  try {
    const { product, industry, goal, tone, platform, needVoice, notes } = req.body || {};
    const key = process.env.OPENAI_API_KEY;
    if (!key) return res.status(500).json({ error: "Missing OPENAI_API_KEY" });
    const prompt = [
      { role: "system", content: "You are a social media copywriter. Return concise JSON with headline, caption and 8 hashtags. Keep brand-safe." },
      { role: "user", content: `Product: ${product}\nIndustry: ${industry}\nGoal: ${goal}\nTone: ${tone}\nPlatform: ${platform}\nNotes: ${notes}\nReturn JSON with keys: headline, caption, hashtags (array), script (optional voiceover up to 60 words).` }
    ];
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "gpt-4o-mini", messages: prompt, temperature: 0.7 })
    });
    if (!r.ok) return res.status(502).json({ error: "OpenAI error", details: await r.text() });
    const data = await r.json();
    let text = data?.choices?.[0]?.message?.content || "{}";
    try { text = JSON.parse(text); } catch {}
    res.json(text);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}
