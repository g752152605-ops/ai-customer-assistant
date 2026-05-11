export async function onRequest(context) {
  const { request, env } = context;

  const API_KEY = 'sk-33309df70b18ae1ae29d5ef2807f4f82fc9f8e2a';
  const API_BASE = 'https://mimimax.cn';
  const MODEL = 'MiniMax-M2.7-highspeed';

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-api-key, anthropic-version, Authorization',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return new Response('Only POST allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const body = await request.json();
    const { messages, system, max_tokens = 600, temperature = 0.7 } = body;

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
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}
