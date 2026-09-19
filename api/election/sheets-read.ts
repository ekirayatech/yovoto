// Vercel Serverless Function: Proxy para lectura de Google Sheets
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { scriptUrl, action, ...otherParams } = req.body || {};
  if (!scriptUrl) {
    return res.status(400).json({ success: false, error: 'URL del webhook no proporcionada' });
  }

  try {
    const targetUrl = new URL(scriptUrl);
    targetUrl.searchParams.set('action', action || 'getCensus');
    targetUrl.searchParams.set('_t', Date.now().toString());

    Object.entries(otherParams).forEach(([k, v]) => {
      if (v !== undefined && v !== null) {
        targetUrl.searchParams.set(k, String(v));
      }
    });

    const response = await fetch(targetUrl.toString(), {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      redirect: 'follow'
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    return res.status(200).json({ success: true, data });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Error al contactar Google Sheets' });
  }
}
