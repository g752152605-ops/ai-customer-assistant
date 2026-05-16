export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  const API_KEY = env.API_KEY;
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

  const d1Token = env.CLOUDFLARE_API_TOKEN;
  const accountId = env.CLOUDFLARE_ACCOUNT_ID;
  const dbId = env.CLOUDFLARE_D1_DB_ID;
  const d1ApiBase = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${dbId}`;

  if (!d1Token) {
    return new Response(JSON.stringify({ error: 'D1 token not configured', token: d1Token }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // GET /api/kb - List all
  if (request.method === 'GET') {
    try {
      const response = await fetch(d1ApiBase + '/query', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${d1Token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sql: 'SELECT * FROM knowledge_base', params: [] })
      });
      const data = await response.json();
      const items = data.result?.[0]?.results || [];
      const formatted = items.map(item => ({
        ...item,
        chunks: JSON.parse(item.chunks || '[]')
      }));
      return new Response(JSON.stringify({ success: true, data: formatted }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  // POST /api/kb/delete?id=xxx - Delete entry (query param to avoid path routing issues)
  if (request.method === 'POST' && url.pathname === '/api/kb/delete') {
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

  // POST /api/kb - Add new entry OR delete (via ?action=delete&id=xxx)
  if (request.method === 'POST') {
    const action = url.searchParams.get('action');

    // Handle delete action
    if (action === 'delete') {
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

    // Handle add new entry
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
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  return new Response('Not found', { status: 404, headers: corsHeaders });
}
