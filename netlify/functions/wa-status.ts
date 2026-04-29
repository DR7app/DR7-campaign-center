import type { Handler } from '@netlify/functions';

const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let body: { instanceId?: string; apiTokenInstance?: string; apiHost?: string };
  try {
    body = JSON.parse(event.body ?? '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { instanceId, apiTokenInstance } = body;
  if (!instanceId || !apiTokenInstance) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing credentials' }) };
  }

  const apiHost = body.apiHost?.replace(/\/+$/, '') || 'https://api.green-api.com';
  const url = `${apiHost}/waInstance${instanceId}/getStateInstance/${apiTokenInstance}`;

  try {
    const res = await fetch(url, { method: 'GET' });
    const text = await res.text();
    let data: unknown;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }
    return {
      statusCode: res.status,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    };
  } catch (err: any) {
    return {
      statusCode: 502,
      body: JSON.stringify({ error: 'Upstream call failed', detail: err?.message ?? String(err) }),
    };
  }
};

export { handler };
