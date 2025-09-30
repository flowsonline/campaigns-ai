import { useState, useEffect } from "react";

/**
 * FLOWS Media Studio v5.1 — Orion (guided)
 * Step 0 → 7: brand/description → options → compose → TTS → image → video → status → preview
 * Uses the API routes that are already included in your ZIP:
 *  - /api/compose, /api/tts, /api/render, /api/renderTemplate, /api/status
 */

const initial = {
  brand: "",
  website: "",
  description: "",
  industry: "",
  goal: "",
  tone: "confident",
  platform: "instagram",
  format: "square", // square | story | reel | wide
  audience: "",
  palette: "",
  includeVoice: false,
  logoUrl: "", // URL to logo or inspiration image (required here to keep it simple)
};

const formStyle = { display: "grid", gap: 12, maxWidth: 850 };
const row = { display: "grid", gap: 8 };
const btn = { padding: "10px 14px", borderRadius: 8, background: "#7C5CFF", color: "#fff", border: 0, cursor: "pointer" };
const subtle = { fontSize: 12, opacity: 0.8 };

export default function Orion() {
  const [step, setStep] = useState(0);
  const [f, setF] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // Compose results
  const [headline, setHeadline] = useState("");
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState([]);
  const [script, setScript] = useState("");

  // TTS
  const [audioUrl, setAudioUrl] = useState("");

  // Image (either user URL or replicated)
  const [imageUrl, setImageUrl] = useState("");
  const [imageStatus, setImageStatus] = useState("");

  // Video render
  const [renderId, setRenderId] = useState("");
  const [renderStatus, setRenderStatus] = useState("");
  const [videoUrl, setVideoUrl] = useState("");

  useEffect(() => {
    let t;
    if (renderId && !videoUrl) {
      const poll = async () => {
        try {
          const r = await fetch(`/api/status?id=${encodeURIComponent(renderId)}`);
          const j = await r.json();
          setRenderStatus(j.status || "");
          if (j.status === "done" && j.url) setVideoUrl(j.url);
        } catch (e) {}
      };
      poll();
      t = setInterval(poll, 4000);
    }
    return () => t && clearInterval(t);
  }, [renderId, videoUrl]);

  const next = () => setStep((s) => s + 1);
  const back = () => setStep((s) => Math.max(0, s - 1));
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));

  // --- Step actions ---
  const doCompose = async () => {
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product: f.brand,
          industry: f.industry,
          goal: f.goal,
          tone: f.tone,
          platform: `${f.platform} / ${f.format}`,
          notes: `Audience: ${f.audience}. Palette: ${f.palette}. Website: ${f.website}. Description: ${f.description}`,
        }),
      });
      const j = await r.json();
      if (j.error) throw new Error(j.error);
      setHeadline(j.headline || "");
      setCaption(j.caption || "");
      setHashtags(Array.isArray(j.hashtags) ? j.hashtags : []);
      setScript(j.script || "");
      next();
    } catch (e) {
      setErr(String(e.message || e));
    } finally { setBusy(false); }
  };

  const doTTS = async () => {
    if (!f.includeVoice || !script) return next();
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: script, voice: "alloy" }),
      });
      const j = await r.json();
      if (j.error) throw new Error(j.error);
      setAudioUrl(j.audioDataUrl || "");
      next();
    } catch (e) {
      setErr(String(e.message || e));
      // let them continue without voice if it fails
      next();
    } finally { setBusy(false); }
  };

  const doImage = async () => {
    // If user provided logo/inspiration URL, we can skip generation.
    if (f.logoUrl && /^https?:\/\//.test(f.logoUrl)) {
      setImageUrl(f.logoUrl);
      setImageStatus("provided");
      return next();
    }

    // Otherwise: generate with Replicate using a simple on-brand prompt
    setBusy(true); setErr(""); setImageStatus("generating");
    try {
      const prompt = `High-converting ad image for ${f.brand}. ${f.description}. Tone: ${f.tone}. Industry: ${f.industry}. Goal: ${f.goal}. Palette: ${f.palette}. Room for headline: "${headline}".`;
      const r = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const j = await r.json();
      if (j.error) throw new Error(j.error);
      if (!j.url) throw new Error("No image URL returned");
      setImageUrl(j.url);
      setImageStatus(j.status || "done");
      next();
    } catch (e) {
      setErr(String(e.message || e));
    } finally { setBusy(false); }
  };

  const doVideo = async () => {
    // pick template by format
    const map = { square: "square", story: "story", reel: "reel", wide: "wide" };
    const template = map[f.format] || "square";
    const duration = f.format === "square" ? 10 : f.format === "story" ? 8 : 15;

    setBusy(true); setErr(""); setRenderStatus("queueing"); setVideoUrl("");
    try {
      const r = await fetch("/api/renderTemplate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template,
          fields: {
            IMAGE_URL: imageUrl,
            HEADLINE: headline,
            SUBHEAD: caption?.slice(0, 80) || "",
            DURATION: duration,
          },
        }),
      });
      const j = await r.json();
      if (j.error) throw new Error(j.error);
      setRenderId(j.jobId || "");
      setRenderStatus("queued");
      next();
    } catch (e) {
      setErr(String(e.message || e));
    } finally { setBusy(false); }
  };

  // --- UI blocks ---
  const Stepper = () => (
    <div style={{fontSize:12,opacity:.7,marginBottom:8}}>Step {step} / 7</div>
  );

  const Step0 = () => (
    <div style={formStyle}>
      <h2>Start — Brand & Description</h2>
      <div style={row}>
        <label>Brand / Product *</label>
        <input value={f.brand} onChange={e=>set("brand",e.target.value)} placeholder="FLOWS" />
      </div>
      <div style={row}>
        <label>Website (optional)</label>
        <input value={f.website} onChange={e=>set("website",e.target.value)} placeholder="https://…" />
      </div>
      <div style={row}>
        <label>Please explain the motive of this post, your project, or business details. *</label>
        <textarea rows={5} value={f.description} onChange={e=>set("description",e.target.value)} />
      </div>
      <div>
        <button
          style={btn}
          onClick={() => {
            if (!f.brand || !f.description) return setErr("Please enter brand and description.");
            setErr(""); next();
          }}
        >Next</button>
      </div>
    </div>
  );

  const Step1 = () => (
    <div style={formStyle}>
      <h2>Tell Us</h2>
      <div style={row}><label>Industry</label><input value={f.industry} onChange={e=>set("industry",e.target.value)} placeholder="Skincare, Fitness, etc." /></div>
      <div style={row}><label>Goal</label><input value={f.goal} onChange={e=>set("goal",e.target.value)} placeholder="Drive sign-ups, Launch awareness, etc." /></div>
      <div style={row}><label>Tone</label><input value={f.tone} onChange={e=>set("tone",e.target.value)} placeholder="confident, playful, premium…" /></div>
      <div style={{display:"grid", gap:12, gridTemplateColumns:"1fr 1fr"}}>
        <div style={row}>
          <label>Platform</label>
          <select value={f.platform} onChange={e=>set("platform",e.target.value)}>
            <option value="instagram">Instagram</option>
            <option value="tiktok">TikTok</option>
            <option value="youtube">YouTube</option>
            <option value="facebook">Facebook</option>
          </select>
        </div>
        <div style={row}>
          <label>Format</label>
          <select value={f.format} onChange={e=>set("format",e.target.value)}>
            <option value="square">Instagram/Facebook Static (1:1)</option>
            <option value="reel">Reel (9:16)</option>
            <option value="story">Story (9:16)</option>
            <option value="wide">YouTube / Wide (16:9)</option>
          </select>
        </div>
      </div>
      <div style={row}><label>Audience</label><input value={f.audience} onChange={e=>set("audience",e.target.value)} /></div>
      <div style={row}><label>Palette</label><input value={f.palette} onChange={e=>set("palette",e.target.value)} placeholder="Primary: #000; Accent: #fff…" /></div>
      <div style={row}><label>Upload/Link Logo or Inspiration Image (required)</label><input value={f.logoUrl} onChange={e=>set("logoUrl",e.target.value)} placeholder="https://image…" /></div>
      <div><label><input type="checkbox" checked={f.includeVoice} onChange={e=>set("includeVoice",e.target.checked)} /> Include Voiceover</label></div>

      <div style={{display:"flex", gap:8}}>
        <button onClick={back}>Back</button>
        <button style={btn} onClick={()=>{
          if(!f.logoUrl || !/^https?:\/\//.test(f.logoUrl)) return setErr("Please paste a logo/inspiration image URL.");
          doCompose();
        }}>{busy ? "Thinking…" : "Generate copy"}</button>
      </div>
    </div>
  );

  const Step2 = () => (
    <div style={formStyle}>
      <h2>Copy drafted</h2>
      <div style={row}><label>Headline</label><input value={headline} onChange={e=>setHeadline(e.target.value)} /></div>
      <div style={row}><label>Caption</label><textarea rows={4} value={caption} onChange={e=>setCaption(e.target.value)} /></div>
      <div style={row}><label>Hashtags</label><input value={hashtags.join(" ")} onChange={e=>setHashtags(e.target.value.split(/\s+/g))} /></div>
      {f.includeVoice && (
        <div style={row}><label>Voiceover Script</label><textarea rows={3} value={script} onChange={e=>setScript(e.target.value)} /></div>
      )}
      <div style={{display:"flex", gap:8}}>
        <button onClick={back}>Back</button>
        <button style={btn} onClick={doTTS}>{busy ? "Generating voice…" : f.includeVoice ? "Generate voice" : "Continue"}</button>
      </div>
    </div>
  );

  const Step3 = () => (
    <div style={formStyle}>
      <h2>Voiceover</h2>
      {f.includeVoice ? (
        audioUrl ? <audio controls src={audioUrl} /> : <div>No audio yet (you can still continue)</div>
      ) : <div style={subtle}>Voiceover skipped</div>}
      <div style={{display:"flex", gap:8}}>
        <button onClick={back}>Back</button>
        <button style={btn} onClick={doImage}>{busy ? "Generating…" : "Generate / Use Image"}</button>
      </div>
    </div>
  );

  const Step4 = () => (
    <div style={formStyle}>
      <h2>Image</h2>
      {imageUrl ? <img alt="generated" src={imageUrl} style={{maxWidth:420, borderRadius:12}} /> : <div>No image yet.</div>}
      <div style={subtle}>Status: {imageStatus || "-"}</div>
      <div style={{display:"flex", gap:8}}>
        <button onClick={back}>Back</button>
        <button style={btn} onClick={doVideo}>{busy ? "Queueing…" : "Assemble Video"}</button>
      </div>
    </div>
  );

  const Step5 = () => (
    <div style={formStyle}>
      <h2>Video — Status</h2>
      <div>Render ID: {renderId || "-"}</div>
      <div>Status: {renderStatus || "-"}</div>
      {videoUrl ? <video controls src={videoUrl} style={{maxWidth:420, borderRadius:12, marginTop:12}} /> : null}
      <div style={{display:"flex", gap:8, marginTop:8}}>
        <button onClick={back}>Back</button>
        <button style={btn} onClick={()=> next()} disabled={!videoUrl}>Continue</button>
      </div>
    </div>
  );

  const Step6 = () => (
    <div style={formStyle}>
      <h2>Preview Your Post</h2>
      <div style={{border:"1px solid #222", borderRadius:12, padding:16}}>
        <h3>{headline}</h3>
        <p>{caption}</p>
        {hashtags?.length ? <div style={subtle}>{hashtags.map(h=>h.startsWith("#")?h:"#"+h).join(" ")}</div> : null}
        {videoUrl ? <video controls src={videoUrl} style={{width:"100%", marginTop:12, borderRadius:12}} /> : null}
      </div>
      <div style={{display:"flex", gap:8, marginTop:12}}>
        <a href={videoUrl} target="_blank" rel="noreferrer"><button>Open Video</button></a>
        <button onClick={()=>setStep(0)} style={btn}>Start new</button>
      </div>
    </div>
  );

  return (
    <div style={{padding:24, maxWidth:1000, margin:"0 auto"}}>
      <h1>Orion — AI Agent (v5.1)</h1>
      <Stepper />
      {err ? <div style={{background:"#2b0f0f", color:"#ffb3b3", padding:10, borderRadius:8, margin:"8px 0"}}>{String(err)}</div> : null}
      {step===0 && <Step0/>}
      {step===1 && <Step1/>}
      {step===2 && <Step2/>}
      {step===3 && <Step3/>}
      {step===4 && <Step4/>}
      {step===5 && <Step5/>}
      {step>=6 && <Step6/>}
    </div>
  );
}
