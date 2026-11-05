// Vercel serverless proxy for Google Translate TTS.
// The browser page cannot call translate.google.com directly from an
// <audio> element (Google rejects embedded requests), so the page calls
// this same-origin endpoint instead: /api/tts?q=<text>&tl=my
// Returns audio/mpeg. No key needed. Keep q short (one chunk <= 200 chars).
export default async function handler(req, res) {
  const q = (req.query.q || "").toString().slice(0, 200);
  const tl = (req.query.tl || "my").toString().slice(0, 5);
  if (!q) {
    return res.status(400).json({ error: "missing q" });
  }
  const encoded = encodeURIComponent(q);
  const urls = [
    `https://translate.google.com/translate_tts?ie=UTF-8&q=${encoded}&tl=${tl}&client=tw-ob`,
    `https://translate.googleapis.com/translate_tts?ie=UTF-8&q=${encoded}&tl=${tl}&client=tw-ob`,
  ];
  for (const url of urls) {
    try {
      const r = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Linux; Android 13; Redmi Note 12) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36",
          Referer: "https://translate.google.com/",
        },
      });
      if (r.ok) {
        const buf = Buffer.from(await r.arrayBuffer());
        if (buf.length > 0) {
          res.setHeader("Content-Type", "audio/mpeg");
          res.setHeader("Cache-Control", "public, max-age=86400");
          return res.status(200).send(buf);
        }
      }
    } catch (e) {
      // try the next host
    }
  }
  return res.status(502).json({ error: "tts failed" });
}
