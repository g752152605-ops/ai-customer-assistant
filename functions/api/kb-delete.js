export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-api-key, anthropic-version, Authorization',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return new Response('Only POST allowed', { status: 405, headers: corsHeaders });
  }

  const d1Token = env.CLOUDFLARE_API_TOKEN;
  const accountId = '44a56411ac5c17ce7fe014be5103be8a';
  const dbId = 'd2ce9da1-3730-482b-ace0-5254f82be05b';
  const d1ApiBase = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${dbId}`;

  if (!d1Token) {
    return new Response(JSON.stringify({ error: 'D1 token not configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const id = url.searchParams.get('id');

  if (!id) {
    return new Response(JSON.stringify({ error: 'Missing ID' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const sql = `DELETE FROM knowledge_base WHERE id = ?`;
    const response = await fetch(d1ApiBase + '/query', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${d1Token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sql, params: [id] })
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.errors?.[0]?.message || 'Database error');
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}
