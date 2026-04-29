import type { Handler } from '@netlify/functions';

const FALLBACK_HTML = (code: string) => `<!doctype html>
<html lang="it">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Codice ${code}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, system-ui, sans-serif; background: #f9fafb; color: #111; display: flex; min-height: 100vh; align-items: center; justify-content: center; margin: 0; padding: 1rem; }
    .card { background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 2rem; max-width: 28rem; text-align: center; box-shadow: 0 1px 2px rgba(0,0,0,.05); }
    .code { display: inline-block; background: #0EA5A4; color: white; font-family: ui-monospace, monospace; font-weight: bold; padding: 0.5rem 1rem; border-radius: 6px; letter-spacing: 0.1em; margin: 1rem 0; }
    h1 { font-size: 1.25rem; margin: 0 0 0.5rem; }
    p { color: #6b7280; font-size: 0.9rem; line-height: 1.5; }
    a { color: #0EA5A4; font-weight: bold; text-decoration: none; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Il tuo codice promo</h1>
    <div class="code">${code}</div>
    <p>Mostra questo codice al venditore per usufruire della promozione.</p>
    <p style="margin-top: 1.5rem; font-size: 0.75rem;">Powered by <a href="https://campaigncenter.netlify.app/">DR7 Campaign Center</a></p>
  </div>
</body>
</html>`;

const handler: Handler = async (event) => {
  // Path comes in as /c/{code} but Netlify rewrites it to /.netlify/functions/track-click/{code}
  // The {code} can also arrive as a query parameter `code` if invoked directly.
  const rawPath = event.path || '';
  const segments = rawPath.split('/').filter(Boolean);
  const code = (
    event.queryStringParameters?.code
    ?? segments[segments.length - 1]
    ?? ''
  ).trim().toUpperCase();

  if (!code || code === 'TRACK-CLICK') {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'text/plain' },
      body: 'Missing code',
    };
  }

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  let targetUrl: string | null = null;
  let campaignId: string | null = null;

  if (supabaseUrl && serviceKey) {
    try {
      const r = await fetch(
        `${supabaseUrl}/rest/v1/campaign_recipients?select=id,campaign_id,campaigns(target_url,name)&code=eq.${encodeURIComponent(code)}&limit=1`,
        {
          headers: {
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
          },
        }
      );
      if (r.ok) {
        const rows = await r.json();
        if (rows[0]) {
          campaignId = rows[0].campaign_id;
          targetUrl = rows[0].campaigns?.target_url ?? null;
          await fetch(`${supabaseUrl}/rest/v1/rpc/log_click`, {
            method: 'POST',
            headers: {
              apikey: serviceKey,
              Authorization: `Bearer ${serviceKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              p_recipient_id: rows[0].id,
              p_user_agent: event.headers?.['user-agent'] ?? null,
              p_referrer: event.headers?.referer ?? null,
            }),
          }).catch(() => {});
        }
      }
    } catch {
      // best-effort, ignore
    }
  }

  if (!targetUrl) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
      body: FALLBACK_HTML(code),
    };
  }

  const url = new URL(targetUrl);
  url.searchParams.set('ref', code);
  url.searchParams.set('utm_source', 'campaign');
  url.searchParams.set('utm_medium', 'whatsapp');
  if (campaignId) url.searchParams.set('utm_campaign', campaignId);

  return {
    statusCode: 302,
    headers: {
      Location: url.toString(),
      'Cache-Control': 'no-store',
    },
    body: '',
  };
};

export { handler };
