export interface Env {
  CLOUDFLARE_API_TOKEN?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const API_KEY = 'sk-33309df70b18ae1ae29d5ef2807f4f82fc9f8e2a';
    const API_BASE = 'https://mimimax.cn';
    const MODEL = 'MiniMax-M2.7-highspeed';

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-api-key, anthropic-version, Authorization',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);

    // Knowledge Base API endpoints
    if (url.pathname === '/kb' || url.pathname.startsWith('/kb/')) {
      return handleKBRequest(request, env, corsHeaders);
    }

    // Original chat endpoint
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
      const error = err as Error;
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};

// Knowledge Base handlers
async function handleKBRequest(request: Request, env: Env, corsHeaders: Record<string, string>) {
  const url = new URL(request.url);
  const d1Token = env.CLOUDFLARE_API_TOKEN;
  const accountId = '44a56411ac5c17ce7fe014be5103be8a';
  const dbId = 'd2ce9da1-3730-482b-ace0-5254f82be05b';
  const d1ApiBase = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${dbId}`;

  if (!d1Token) {
    return new Response(JSON.stringify({ error: 'D1 token not configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // GET /kb - List all
  if (request.method === 'GET') {
    try {
      const response = await fetch(`${d1ApiBase}/query?limit=1000`, {
        headers: { 'Authorization': `Bearer ${d1Token}` }
      });
      const data = await response.json();
      const items = data.result?.[0]?.results || [];
      const formatted = items.map((item: any) => ({
        ...item,
        chunks: JSON.parse(item.chunks || '[]')
      }));
      return new Response(JSON.stringify({ success: true, data: formatted }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: (err as Error).message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  // POST /kb - Add new entry
  if (request.method === 'POST') {
    try {
      const body = await request.json();
      const { title, content, chunks } = body;
      const id = Date.now().toString();
      const created_at = new Date().toISOString();

      if (!title || !content || !chunks) {
        return new Response(JSON.stringify({ error: 'Missing required fields: title, content, chunks' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const sql = `INSERT INTO knowledge_base (id, title, content, chunks, created_at) VALUES (?, ?, ?, ?, ?)`;
      const response = await fetch(d1ApiBase + '/query', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${d1Token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sql,
          params: [id, title, content, JSON.stringify(chunks), created_at]
        })
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.errors?.[0]?.message || 'Database error');
      }

      return new Response(JSON.stringify({ success: true, data: { id, title, content, chunks, created_at } }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: (err as Error).message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  // DELETE /kb/:id - Delete entry
  if (request.method === 'DELETE' && url.pathname.startsWith('/kb/')) {
    try {
      const id = url.pathname.split('/')[2];
      if (!id) {
        return new Response(JSON.stringify({ error: 'Missing ID' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

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
      return new Response(JSON.stringify({ error: (err as Error).message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  return new Response('Not found', { status: 404, headers: corsHeaders });
}
