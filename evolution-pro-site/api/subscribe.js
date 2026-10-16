// Serverless (Vercel) — iscrizione al report del Blog Videocorsi via Systeme.io
// La API key sta in una env var lato server (SYSTEME_API_KEY): mai nel repo pubblico.
// Crea il contatto e gli assegna il tag "source_blog_report" (→ automazione Systeme che invia il report).

const API = 'https://api.systeme.io/api';
const TAG_ID = 2172025; // source_blog_report
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const key = process.env.SYSTEME_API_KEY;
  if (!key) return res.status(500).json({ error: 'not_configured' });

  // Vercel (ESM Node) di norma popola req.body per Content-Type application/json.
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  let email = (body && body.email) || '';
  email = String(email).trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'invalid_email' });

  const headers = { 'X-API-Key': key, 'Content-Type': 'application/json' };

  try {
    const cr = await fetch(`${API}/contacts`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ email, locale: 'it' }),
    });

    // Se il contatto è nuovo otteniamo l'id e lo tagghiamo.
    // Se è già esistente Systeme risponde comunque (client error): trattiamo come già iscritto.
    if (cr.ok) {
      const data = await cr.json().catch(() => ({}));
      if (data && data.id) {
        await fetch(`${API}/contacts/${data.id}/tags`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ tagId: TAG_ID }),
        }).catch(() => {});
      }
    }
    // Non esponiamo dettagli: per l'utente l'iscrizione è andata a buon fine.
    return res.status(200).json({ ok: true });
  } catch (e) {
    // Errore di rete verso Systeme: chiediamo di riprovare.
    return res.status(502).json({ error: 'upstream' });
  }
}
