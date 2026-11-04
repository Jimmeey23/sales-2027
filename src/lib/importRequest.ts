import { api, ApiError } from '../api.js';
import {
  IMPORT_COMPRESSION_THRESHOLD_BYTES,
  IMPORT_REQUEST_LIMIT_BYTES,
  IMPORT_TOO_LARGE_MESSAGE,
  IMPORT_UPLOAD_LIMIT_BYTES,
} from './importLimits.js';

function checkImportSize(bytes: number) {
  if (bytes > IMPORT_REQUEST_LIMIT_BYTES) {
    throw new ApiError(IMPORT_TOO_LARGE_MESSAGE, 413, { code: 'IMPORT_TOO_LARGE' });
  }
}

/** Check before reading a file into memory; pasted input is checked in postImport. */
export async function readImportFile(file: Pick<File, 'size' | 'text'>): Promise<string> {
  checkImportSize(file.size);
  return file.text();
}

/**
 * Both preview and commit must use the same transport. Gzip keeps large JSON/CSV
 * documents below the hosting limit without splitting or partially applying a
 * plan. Express inflates Content-Encoding: gzip before validating the JSON.
 */
export async function postImport<T = any>(
  path: '/plan/import' | '/offers/import',
  payload: Record<string, unknown>,
): Promise<T> {
  const json = JSON.stringify(payload);
  const source = new Blob([json], { type: 'application/json' });
  checkImportSize(source.size);

  const headers = new Headers({ 'Content-Type': 'application/json' });
  let body: string | Blob = json;
  let uploadBytes = source.size;
  let compressionWorked = false;

  if (source.size >= IMPORT_COMPRESSION_THRESHOLD_BYTES && typeof CompressionStream !== 'undefined') {
    try {
      const gzip = await new Response(source.stream().pipeThrough(new CompressionStream('gzip'))).blob();
      compressionWorked = true;
      if (gzip.size < source.size) {
        body = gzip;
        uploadBytes = gzip.size;
        headers.set('Content-Encoding', 'gzip');
      }
    } catch {
      // A browser without working streaming compression can still send small
      // documents normally, but must never fall back to an oversized upload.
    }
  }

  if (uploadBytes > IMPORT_UPLOAD_LIMIT_BYTES) {
    const message = compressionWorked
      ? 'This import is too large to upload even after compression. Split the document into smaller imports and try again.'
      : 'This large import needs browser compression to upload. Use an up-to-date browser or split the document into smaller imports.';
    throw new ApiError(message, 413, { code: 'IMPORT_UPLOAD_TOO_LARGE' });
  }

  return api<T>(path, { method: 'POST', headers, body });
}
