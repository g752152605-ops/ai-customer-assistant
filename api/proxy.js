module.exports = async (req, res) => {
  const API_KEY = 'sk-33309df70b18ae1ae29d5ef2807f4f82fc9f8e2a';
  const API_BASE = 'https://mimimax.cn';
  const MODEL = 'MiniMax-M2.7-highspeed';

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key, anthropic-version, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Only POST allowed' });
    return;
  }

  try {
    const { messages, system, max_tokens = 600, temperature = 0.7 } = req.body;

    const response = await fetch(`${API_BASE}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({ model: MODEL, max_tokens, temperature, system, messages })
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
