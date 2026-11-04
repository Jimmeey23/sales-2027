// The import limit is on the decoded JSON request, not its gzip size. Keep it
// shared so the browser and the API reject the same oversized documents.
export const IMPORT_REQUEST_LIMIT_BYTES = 25 * 1024 * 1024;
export const IMPORT_REQUEST_LIMIT_LABEL = '25 MB';
export const IMPORT_TOO_LARGE_MESSAGE =
  `This import is too large. The limit is ${IMPORT_REQUEST_LIMIT_LABEL} before compression. ` +
  'Split the document into smaller imports and try again.';

// Leave headroom below the hosted function's request cap. Increasing Express's
// decoded limit alone cannot make a large request pass the hosting layer.
export const IMPORT_UPLOAD_LIMIT_BYTES = 4 * 1024 * 1024;
export const IMPORT_COMPRESSION_THRESHOLD_BYTES = 256 * 1024;
