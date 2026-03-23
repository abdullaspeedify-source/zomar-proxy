const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if(req.method === 'OPTIONS') return res.status(204).end();
  if(req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const keys = [
    process.env.GROQ_KEY_1,
    process.env.GROQ_KEY_2
  ].filter(Boolean);

  if(!keys.length) return res.status(500).json({ error: { message: 'No keys configured' } });

  for(const key of keys) {
    let groqRes, text;
    try {
      groqRes = await fetch(GROQ_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`,
        },
        body: JSON.stringify(req.body),
      });
      text = await groqRes.text();
    } catch(e) { continue; }

    let parsed;
    try { parsed = JSON.parse(text); } catch(e) { parsed = null; }
    const errorMsg = (parsed?.error?.message || '').toLowerCase();

    const skip = groqRes.status === 401 || groqRes.status === 403 ||
      errorMsg.includes('forbidden') || errorMsg.includes('invalid api key') ||
      errorMsg.includes('rate limit') || errorMsg.includes('quota') ||
      errorMsg.includes('exceeded') || groqRes.status === 429;

    if(skip) continue;

    return res.status(groqRes.status).send(text);
  }

  res.status(503).json({ error: { message: 'Service temporarily unavailable' } });
}
