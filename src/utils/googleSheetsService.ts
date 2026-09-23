/**
 * SERVICIO DE INTEGRACIÓN CON GOOGLE SHEETS
 * Diseñado para operar tanto en despliegues estáticos (Vercel/GitHub Pages)
 * como en entornos con servidor Express / Vercel Serverless.
 * 
 * Gestiona lectura y registro de:
 * 1. Votantes (Censo)
 * 2. Candidatos
 * 3. Jurados de Votación
 * 4. Administradores / Supervisores
 * 5. Urna Cifrada (Votos)
 */

import { AdminMember, Candidate, JuradoMember, Student } from '../types/election';

export interface SheetsTestResult {
  success: boolean;
  message: string;
  count?: number;
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
      warning: 'La URL debe ser un Webhook de Google Apps Script (inicia con https://script.google.com/macros/s/...).'
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
 * Función genérica de LECTURA (GET) desde Google Sheets
 */
export async function readFromSheets(
  scriptUrl: string,
  action: 'getCensus' | 'getVoters' | 'getCandidates' | 'getJurados' | 'getAdmins' | 'getAllData' | 'health',
  additionalParams: Record<string, string> = {}
): Promise<SheetsTestResult> {
  const url = normalizeScriptUrl(scriptUrl);
  if (!url) {
    return { success: false, message: 'URL de Google Sheets no configurada.' };
  }

  // 1. Intento vía proxy del backend (Express en local o Vercel Serverless)
  try {
    const proxyRes = await fetch('/api/election/sheets-read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scriptUrl: url, action, ...additionalParams })
    });

    if (proxyRes.ok) {
      const contentType = proxyRes.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const json = await proxyRes.json();
        if (json.success && json.data) {
          return {
            success: true,
            message: `Lectura de ${action} exitosa vía servidor.`,
            count: json.data.count || (Array.isArray(json.data) ? json.data.length : undefined),
            data: json.data
          };
        }
      }
    }
  } catch {
    // Si falla el proxy, intentar directo desde el navegador
  }

  // 2. Intento directo desde el navegador (GET)
  try {
    const targetUrl = new URL(url);
    targetUrl.searchParams.set('action', action);
    targetUrl.searchParams.set('_t', Date.now().toString());
    Object.entries(additionalParams).forEach(([k, v]) => targetUrl.searchParams.set(k, v));

    const res = await fetch(targetUrl.toString(), {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'Accept': 'application/json, text/plain, */*'
      }
    });

    const text = await res.text();

    if (text.includes('accounts.google.com') || text.includes('ServiceLogin') || text.includes('<!DOCTYPE html>')) {
      return {
        success: false,
        message: 'Google Apps Script requiere inicio de sesión. El script no tiene acceso público.',
        diagnostic: 'En Apps Script: Implementar > Administrar implementaciones > Editar > "Quién tiene acceso" = "Cualquiera" (Anyone).'
      };
    }

    try {
      const data = JSON.parse(text);
      return {
        success: true,
        message: `Lectura directa de ${action} exitosa desde Google Sheets.`,
        count: data.count || (Array.isArray(data.items) ? data.items.length : undefined),
        data
      };
    } catch {
      return {
        success: true,
        message: `Respuesta recibida para ${action} (formato texto).`,
        data: { raw: text }
      };
    }
  } catch (err: any) {
    return {
      success: false,
      message: `Fallo al leer ${action} desde Google Apps Script.`,
      details: err.message || String(err),
      diagnostic: 'Verifique que la URL termine en /exec y que el despliegue esté autorizado para "Cualquiera".'
    };
  }
}

/**
 * Función genérica de ESCRITURA / REGISTRO (POST) en Google Sheets
 */
export async function writeToSheets(
  scriptUrl: string,
  payload: Record<string, any>
): Promise<SheetsTestResult> {
  const url = normalizeScriptUrl(scriptUrl);
  if (!url) {
    return { success: false, message: 'URL de Google Sheets no configurada.' };
  }

  // 1. Intento vía proxy del backend (Express en local o Vercel Serverless)
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
            message: json.data?.message || 'Registro guardado exitosamente en Google Sheets.',
            data: json.data
          };
        }
      }
    }
  } catch {
    // Si falla el proxy, proceder a petición directa
  }

  // 2. Intento directo desde el cliente:
  // Se usa 'text/plain;charset=utf-8' para que el navegador NO envíe OPTIONS (preflight CORS).
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
        message: json.message || 'Registro exitoso en Google Sheets.',
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
    // 3. Fallback de contingencia en modo 'no-cors'
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
        message: 'Paquete despachado hacia Google Sheets (modo seguro no-cors).',
        details: 'El navegador transmitió los datos al webhook.'
      };
    } catch (fallbackErr: any) {
      return {
        success: false,
        message: 'Error al registrar en Google Sheets.',
        details: fallbackErr.message || String(fallbackErr),
        diagnostic: 'Verifique que la URL de la Web App sea accesible y tenga permisos de "Cualquiera" (Anyone).'
      };
    }
  }
}

// =========================================================================
// MÉTODOS ESPECÍFICOS DE LECTURA (GET) PARA LAS 4 BASES DE DATOS
// =========================================================================

/**
 * Normaliza cualquier formato de documento (elimina puntos, comas, espacios y guiones)
 */
export function normalizeDocumentNumber(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return '';
  return String(val).replace(/[^a-zA-Z0-9]/g, '').toLowerCase().trim();
}

/** 1. Leer Votantes (Censo Estudiantil) */
export async function readCensusFromSheets(scriptUrl: string): Promise<SheetsTestResult> {
  return readFromSheets(scriptUrl, 'getVoters');
}

/** 1.1 Consultar un Votante específico en Google Sheets (Búsqueda en caliente) */
export async function lookupVoterInSheets(
  scriptUrl: string,
  documentNumber: string,
  docType?: string
): Promise<SheetsTestResult> {
  const cleanDoc = normalizeDocumentNumber(documentNumber);
  return readFromSheets(scriptUrl, 'getVoter' as any, {
    documentNumber: cleanDoc,
    rawDoc: documentNumber.trim(),
    docType: docType || ''
  });
}

/** 2. Leer Candidatos */
export async function readCandidatesFromSheets(scriptUrl: string): Promise<SheetsTestResult> {
  return readFromSheets(scriptUrl, 'getCandidates');
}

/** 3. Leer Jurados de Votación */
export async function readJuradosFromSheets(scriptUrl: string): Promise<SheetsTestResult> {
  return readFromSheets(scriptUrl, 'getJurados');
}

/** 4. Leer Administradores */
export async function readAdminsFromSheets(scriptUrl: string): Promise<SheetsTestResult> {
  return readFromSheets(scriptUrl, 'getAdmins');
}

/** 5. Leer Todas las Bases de Datos a la vez */
export async function readAllFromSheets(scriptUrl: string): Promise<SheetsTestResult> {
  return readFromSheets(scriptUrl, 'getAllData');
}

// =========================================================================
// MÉTODOS ESPECÍFICOS DE ESCRITURA / REGISTRO (POST) PARA LAS 4 BASES DE DATOS
// =========================================================================

/** Registrar un Voto individual (escribe en Urna y actualiza Votantes) */
export async function writeVoteToSheets(
  scriptUrl: string,
  payload: SheetsVotePayload | Record<string, any>
): Promise<SheetsTestResult> {
  return writeToSheets(scriptUrl, { action: 'castVote', ...payload });
}

/** Sincronizar o Registrar Base de Datos de Votantes */
export async function writeVotersToSheets(
  scriptUrl: string,
  students: Student[]
): Promise<SheetsTestResult> {
  return writeToSheets(scriptUrl, {
    action: 'syncVoters',
    students
  });
}

/** Sincronizar o Registrar Base de Datos de Candidatos */
export async function writeCandidatesToSheets(
  scriptUrl: string,
  candidates: Candidate[]
): Promise<SheetsTestResult> {
  return writeToSheets(scriptUrl, {
    action: 'syncCandidates',
    candidates
  });
}

/** Sincronizar o Registrar Base de Datos de Jurados */
export async function writeJuradosToSheets(
  scriptUrl: string,
  jurados: JuradoMember[]
): Promise<SheetsTestResult> {
  return writeToSheets(scriptUrl, {
    action: 'syncJurados',
    jurados
  });
}

/** Sincronizar o Registrar Base de Datos de Administradores */
export async function writeAdminsToSheets(
  scriptUrl: string,
  admins: AdminMember[]
): Promise<SheetsTestResult> {
  return writeToSheets(scriptUrl, {
    action: 'syncAdmins',
    admins
  });
}

/** Sincronizar TODAS las 4 bases de datos a la vez */
export async function writeAllToSheets(
  scriptUrl: string,
  data: {
    students: Student[];
    candidates: Candidate[];
    jurados: JuradoMember[];
    admins: AdminMember[];
  }
): Promise<SheetsTestResult> {
  return writeToSheets(scriptUrl, {
    action: 'syncAll',
    ...data
  });
}

/** Registrar Resultados y Escrutinio Oficial en Google Sheets */
export async function recordResultsToSheets(
  scriptUrl: string,
  data: {
    institution: string;
    daneCode: string;
    academicYear: string | number;
    timestamp?: string;
    summary: Record<string, any>;
    results: any[];
    stationBreakdown?: any[];
  }
): Promise<SheetsTestResult> {
  return writeToSheets(scriptUrl, {
    action: 'syncResults',
    ...data
  });
}
