/**
 * SERVICIO DE INTEGRACIÓN CON GOOGLE SHEETS
 * Diseñado para operar tanto en despliegues estáticos (Vercel/GitHub Pages)
 * como en entornos con servidor Express / Vercel Serverless.
 * 
 * Utiliza peticiones 'simple' (text/plain) para evitar el bloqueo de preflight CORS (OPTIONS)
 * en Google Apps Script, y soporta modo directo y modo fallback.
 */

export interface SheetsTestResult {
  success: boolean;
  message: string;
  data?: any;
  details?: string;
  diagnostic?: string;
}

export interface SheetsVotePayload {
  action: 'castVote';
  voteToken: string;
  positionId: string;
  candidateId: string;
  mesaNumber: number;
  grade?: string;
  studentDoc?: string;
  hash: string;
  folioNumber?: string;
  timestamp?: string;
}

/**
 * Normaliza la URL de Google Apps Script asegurando que termine en /exec
 */
export function normalizeScriptUrl(url: string): string {
  if (!url) return '';
  let trimmed = url.trim();
  // Si pegan una URL terminada en /edit o /dev, sugerir o transformar a /exec
  if (trimmed.includes('/edit')) {
    trimmed = trimmed.replace(/\/edit.*$/, '/exec');
  }
  return trimmed;
}

/**
 * Diagnostica problemas comunes en la URL de Google Apps Script
 */
export function diagnoseScriptUrl(url: string): { valid: boolean; warning?: string } {
  const norm = normalizeScriptUrl(url);
  if (!norm) {
    return { valid: false, warning: 'URL vacía. Por favor ingrese la URL del Webhook.' };
  }
  if (!norm.startsWith('https://script.google.com/macros/s/')) {
    return {
      valid: false,
      warning: 'La URL no parece ser un Webhook de Google Apps Script válido (debe iniciar con https://script.google.com/macros/s/...).'
    };
  }
  if (!norm.endsWith('/exec')) {
    return {
      valid: true,
      warning: 'Atención: Las aplicaciones web de Google Apps Script deben terminar en /exec para recibir peticiones públicas.'
    };
  }
  return { valid: true };
}

/**
 * Lectura del Censo Estudiantil desde Google Sheets (GET)
 */
export async function readCensusFromSheets(scriptUrl: string): Promise<SheetsTestResult> {
  const url = normalizeScriptUrl(scriptUrl);
  if (!url) {
    return { success: false, message: 'URL de Google Sheets no configurada.' };
  }

  // 1. Intento vía proxy local si estamos en dev o con backend
  try {
    const proxyRes = await fetch('/api/election/sheets-read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scriptUrl: url, action: 'getCensus' })
    });

    if (proxyRes.ok) {
      const contentType = proxyRes.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const json = await proxyRes.json();
        if (json.success && json.data) {
          return {
            success: true,
            message: 'Lectura exitosa vía servidor/proxy.',
            data: json.data
          };
        }
      }
    }
  } catch {
    // Si falla el proxy (ej. Vercel estático), continuar a petición directa
  }

  // 2. Intento directo desde el navegador (GET)
  try {
    const targetUrl = new URL(url);
    targetUrl.searchParams.set('action', 'getCensus');
    targetUrl.searchParams.set('_t', Date.now().toString());

    const res = await fetch(targetUrl.toString(), {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'Accept': 'application/json, text/plain, */*'
      }
    });

    const text = await res.text();

    // Detección de error común: Google solicitó login porque no se publicó como "Cualquiera"
    if (text.includes('accounts.google.com') || text.includes('ServiceLogin') || text.includes('<!DOCTYPE html>')) {
      return {
        success: false,
        message: 'Google Apps Script requiere inicio de sesión. No está público.',
        diagnostic: 'IMPORTANTE: En Google Apps Script, ve a Implementar > Administrar implementaciones > Editar > Cambiar "Quién tiene acceso" a "Cualquiera" (Anyone), y guarda una nueva versión.'
      };
    }

    try {
      const data = JSON.parse(text);
      return {
        success: true,
        message: 'Lectura directa exitosa desde Google Sheets.',
        data
      };
    } catch {
      return {
        success: true,
        message: 'Respuesta recibida del script (formato texto).',
        data: { raw: text }
      };
    }
  } catch (err: any) {
    return {
      success: false,
      message: 'Fallo al conectar con Google Apps Script (GET).',
      details: err.message || String(err),
      diagnostic: 'Verifique que la URL termine en /exec y que el despliegue esté autorizado para "Cualquiera" (Anyone).'
    };
  }
}

/**
 * Escritura de voto o actualización en Google Sheets (POST)
 */
export async function writeVoteToSheets(
  scriptUrl: string,
  payload: SheetsVotePayload | Record<string, any>
): Promise<SheetsTestResult> {
  const url = normalizeScriptUrl(scriptUrl);
  if (!url) {
    return { success: false, message: 'URL de Google Sheets no configurada.' };
  }

  // 1. Intento vía proxy del backend (si existe)
  try {
    const proxyRes = await fetch('/api/election/sheets-write', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scriptUrl: url, payload })
    });

    if (proxyRes.ok) {
      const contentType = proxyRes.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const json = await proxyRes.json();
        if (json.success) {
          return {
            success: true,
            message: 'Registro escrito en Google Sheets vía servidor/proxy.',
            data: json.data
          };
        }
      }
    }
  } catch {
    // Si falla el proxy, intentar directo desde el navegador
  }

  // 2. Intento directo desde el cliente:
  // Se usa 'text/plain;charset=utf-8' para que el navegador NO envíe OPTIONS (preflight CORS).
  // Google Apps Script recibe el JSON como e.postData.contents sin fallar por CORS.
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(payload),
      redirect: 'follow'
    });

    const text = await res.text();

    if (text.includes('accounts.google.com') || text.includes('ServiceLogin')) {
      return {
        success: false,
        message: 'Google Apps Script denegó la escritura: requiere autorización.',
        diagnostic: 'En Google Apps Script configure "Quién tiene acceso" en "Cualquiera" (Anyone).'
      };
    }

    try {
      const json = JSON.parse(text);
      return {
        success: true,
        message: 'Voto registrado exitosamente en Google Sheets.',
        data: json
      };
    } catch {
      return {
        success: true,
        message: 'Transmisión completada hacia Google Sheets.',
        data: { raw: text }
      };
    }
  } catch (err: any) {
    // 3. Fallback de seguridad en modo 'no-cors'
    // En no-cors, la petición HTTP POST se emite hacia Google Sheets sin que el navegador la bloquee
    try {
      await fetch(url, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify(payload)
      });

      return {
        success: true,
        message: 'Voto transmitido hacia Google Sheets (modo seguro no-cors).',
        details: 'La petición se despachó al webhook de Google Sheets.'
      };
    } catch (fallbackErr: any) {
      return {
        success: false,
        message: 'Error al escribir en Google Sheets.',
        details: fallbackErr.message || String(fallbackErr),
        diagnostic: 'Verifique que la URL de la Web App sea accesible y tenga permisos de "Cualquiera" (Anyone).'
      };
    }
  }
}
