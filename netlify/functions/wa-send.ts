import type { Handler } from '@netlify/functions';

interface SendRequest {
  instanceId: string;
  apiTokenInstance: string;
  phone: string;
  message: string;
  apiHost?: string;
}

const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let body: SendRequest;
  try {
    body = JSON.parse(event.body ?? '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { instanceId, apiTokenInstance, phone, message } = body;
  if (!instanceId || !apiTokenInstance || !phone || !message) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing instanceId, apiTokenInstance, phone, or message' }),
    };
  }

  const phoneDigits = String(phone).replace(/\D/g, '');
  if (phoneDigits.length < 10) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid phone number' }) };
  }

  const apiHost = body.apiHost?.replace(/\/+$/, '') || 'https://api.green-api.com';
  const url = `${apiHost}/waInstance${instanceId}/sendMessage/${apiTokenInstance}`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chatId: `${phoneDigits}@c.us`,
        message,
      }),
    });
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
