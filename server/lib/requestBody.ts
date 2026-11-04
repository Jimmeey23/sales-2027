import express, { type RequestHandler } from 'express';
import { IMPORT_REQUEST_LIMIT_BYTES, IMPORT_TOO_LARGE_MESSAGE } from '../../src/lib/importLimits.js';

export const STANDARD_JSON_LIMIT_BYTES = 3 * 1024 * 1024;

const standardJson = express.json({ limit: STANDARD_JSON_LIMIT_BYTES });
const importJson = express.json({ limit: IMPORT_REQUEST_LIMIT_BYTES });

/**
 * Allow whole-plan/offer documents without relaxing every API's body limit.
 * express.json inflates gzip itself and applies the limit to the decoded body,
 * so a tiny compressed request cannot bypass the memory bound.
 */
export const jsonRequestBody: RequestHandler = (req, res, next) => {
  const isImport = req.method === 'POST' && /^\/api\/(plan|offers)\/import\/?$/i.test(req.path);
  const parser = isImport ? importJson : standardJson;
  parser(req, res, error => {
    if (error?.type === 'entity.too.large') {
      error.message = isImport
        ? IMPORT_TOO_LARGE_MESSAGE
        : 'This request is too large. The limit for this API is 3 MB.';
      error.code = isImport ? 'IMPORT_TOO_LARGE' : 'REQUEST_TOO_LARGE';
    }
    next(error);
  });
};
