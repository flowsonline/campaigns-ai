
export default async function handler(req, res) {
  console.log("Shotstack webhook:", req.method, req.body || null);
  res.status(200).json({ ok: true });
}
