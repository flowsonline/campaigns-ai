import { useState } from "react";

/**
 * FLOWS Media Studio v5.1 — Studio (manual)
 * Quick controls to hit APIs directly.
 */

const btn = { padding:"10px 14px", borderRadius:8, background:"#7C5CFF", color:"#fff", border:0, cursor:"pointer" };
const row = { display:"grid", gap:8, marginBottom:12, maxWidth:900 };

export default function Studio() {
  const [prompt, setPrompt] = useState("High-converting ad photo of a sleek skincare serum on marble, rim light, room for headline.");
  const [imageUrl, setImageUrl] = useState("");

  const [brand, setBrand] = useState("FLOWS");
  const [industry, setIndustry] = useState("Skincare");
  const [goal, setGoal] = useState("Launch awareness");
  const [tone, setTone] = useState("confident");
  const [platform, setPlatform] = useState("instagram / square");

  const [headline, setHeadline] = useState("");
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState([]);
  const [script, setScript] = useState("");

  const [audioUrl, setAudioUrl] = useState("");
  const [renderId, setRenderId] = useState("");
  const [status, setStatus] = useState("");
  const [videoUrl, setVideoUrl] = useState("");

  const [template, setTemplate] = useState("square"); // square | story | reel | wide

  const compose = async () => {
    const r = await fetch("/api/compose", {
      method:"POST", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ product:brand, industry, goal, tone, platform, notes:"Studio manual compose" })
    });
    const j = await r.json();
    setHeadline(j.headline||"");
    setCaption(j.caption||"");
    setHashtags(Array.isArray(j.hashtags)?j.hashtags:[]);
    setScript(j.script||"");
  };

  const tts = async () => {
    const r = await fetch("/api/tts", {
      method:"POST", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ text: script || `${headline}. ${caption}` })
    });
    const j = await r.json();
    setAudioUrl(j.audioDataUrl||"");
  };

  const renderImage = async () => {
    const r = await fetch("/api/render", {
      method:"POST", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ prompt })
    });
    const j = await r.json();
    setImageUrl(j.url||"");
  };

  const renderTemplate = async () => {
    const duration = template==="square" ? 10 : template==="story" ? 8 : 15;
    const r = await fetch("/api/renderTemplate", {
      method:"POST", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({
        template, fields: {
          IMAGE_URL: imageUrl,
          HEADLINE: headline,
          SUBHEAD: caption?.slice(0, 80)||"",
          DURATION: duration
        }
      })
    });
    const j = await r.json();
    setRenderId(j.jobId||"");
    setStatus("queued");
  };

  const poll = async () => {
    if (!renderId) return;
    const r = await fetch(`/api/status?id=${encodeURIComponent(renderId)}`);
    const j = await r.json();
    setStatus(j.status||"-");
    if (j.status==="done" && j.url) setVideoUrl(j.url);
  };

  return (
    <div style={{padding:24, maxWidth:1000, margin:"0 auto"}}>
      <h1>Studio — Manual (v5.1)</h1>

      <section style={{marginTop:8}}>
        <h3>1) Compose</h3>
        <div style={row}>
          <input value={brand} onChange={(e)=>setBrand(e.target.value)} placeholder="Brand" />
          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:8}}>
            <input value={industry} onChange={(e)=>setIndustry(e.target.value)} placeholder="Industry" />
            <input value={goal} onChange={(e)=>setGoal(e.target.value)} placeholder="Goal" />
          </div>
          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:8}}>
            <input value={tone} onChange={(e)=>setTone(e.target.value)} placeholder="Tone" />
            <input value={platform} onChange={(e)=>setPlatform(e.target.value)} placeholder="Platform / Format" />
          </div>
          <button style={btn} onClick={compose}>Generate Copy</button>
          <input value={headline} onChange={(e)=>setHeadline(e.target.value)} placeholder="Headline" />
          <textarea rows={3} value={caption} onChange={(e)=>setCaption(e.target.value)} placeholder="Caption" />
          <input value={hashtags.join(" ")} onChange={(e)=>setHashtags(e.target.value.split(/\s+/g))} placeholder="#tags" />
          <textarea rows={2} value={script} onChange={(e)=>setScript(e.target.value)} placeholder="Optional VO script" />
        </div>
      </section>

      <section>
        <h3>2) Voiceover (optional)</h3>
        <div style={row}>
          <button style={btn} onClick={tts}>Generate TTS</button>
          {audioUrl ? <audio controls src={audioUrl} /> : <div style={{opacity:.7}}>No audio yet</div>}
        </div>
      </section>

      <section>
        <h3>3) Image</h3>
        <div style={row}>
          <textarea rows={3} value={prompt} onChange={(e)=>setPrompt(e.target.value)} />
          <button style={btn} onClick={renderImage}>Generate Image</button>
          <div style={{display:"grid", gap:8}}>
            <label>Image URL (override)</label>
            <input value={imageUrl} onChange={(e)=>setImageUrl(e.target.value)} placeholder="https://…" />
          </div>
          {imageUrl ? <img alt="img" src={imageUrl} style={{maxWidth:420, borderRadius:12}} /> : null}
        </div>
      </section>

      <section>
        <h3>4) Assemble Video</h3>
        <div style={row}>
          <div>
            <label>Template &nbsp;</label>
            <select value={template} onChange={(e)=>setTemplate(e.target.value)}>
              <option value="square">Square (10s)</option>
              <option value="story">Story (8s)</option>
              <option value="reel">Reel (15s)</option>
              <option value="wide">Wide (15s)</option>
            </select>
          </div>
          <button style={btn} onClick={renderTemplate}>Render via Template</button>
          <div>Job ID: {renderId || "-"}</div>
          <div>Status: {status || "-"}</div>
          <button onClick={poll}>Poll</button>
          {videoUrl ? <video controls src={videoUrl} style={{maxWidth:600, borderRadius:12}} /> : null}
        </div>
      </section>
    </div>
  );
}
