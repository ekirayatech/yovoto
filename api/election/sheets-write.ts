// Vercel Serverless Function: Proxy para escritura en Google Sheets
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { scriptUrl, payload } = req.body || {};
  if (!scriptUrl) {
    return res.status(400).json({ success: false, error: 'URL del webhook no proporcionada' });
  }

  try {
    const response = await fetch(scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      redirect: 'follow'
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text, status: 'SUCCESS' };
    }

    return res.status(200).json({ success: true, data });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Error al escribir en Google Sheets' });
  }
}
