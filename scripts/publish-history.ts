import 'dotenv/config';
import path from 'node:path';
import { publishHistory } from '../server/lib/history.js';

// Run after importing new Momence exports locally so the Vercel deployment sees them.
const source = process.env.DATABASE_PATH || path.resolve('p57-data/studio.db');
const result = await publishHistory(source);
console.log(`Published sales history to Supabase: ${(result.compressedBytes / 1048576).toFixed(1)} MB in ${result.parts} parts.`);
