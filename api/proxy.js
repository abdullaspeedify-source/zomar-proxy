export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if(req.method === 'OPTIONS') return res.status(204).end();
  if(req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
  const keys = [process.env.GROQ_KEY_1, process.env.GROQ_KEY_2].filter(Boolean);

  if(!keys.length) return res.status(500).json({ error: { message: 'No keys configured' } });

  for(const key of keys) {
    let groqRes, text;
    try {
      groqRes = await fetch(GROQ_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
        body: JSON.stringify(req.body),
      });
      text = await groqRes.text();
    } catch(e) { continue; }

    let parsed;
    try { parsed = JSON.parse(text); } catch(e) { parsed = null; }
    const errorMsg = (parsed?.error?.message || '').toLowerCase();

    const skip = [401,403,429].includes(groqRes.status) ||
      errorMsg.includes('forbidden') || errorMsg.includes('invalid api key') ||
      errorMsg.includes('rate limit') || errorMsg.includes('quota') ||
      errorMsg.includes('exceeded') || errorMsg.includes('too many');

    if(skip) continue;

    res.setHeader('Content-Type', 'application/json');
    return res.status(groqRes.status).send(text);
  }

  res.status(503).json({ error: { message: 'Service temporarily unavailable' } });
}
