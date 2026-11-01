/* What SQLite will actually accept as a parameter.

   better-sqlite3 binds numbers, strings, bigints, buffers and null — nothing else. A boolean
   or an object reaches it as a `TypeError: SQLite3 can only bind numbers, strings, bigints,
   buffers, and null` at the .run() call, several layers below the code that produced the value,
   and with no clue as to which column was at fault. That is a hard message to act on and an
   easy bug to ship: a plan export writes `runAds: true`, and importing that file back used to
   fail every single row.

   So values are converted where the row is built, and this is the last guard before binding:
   booleans become 0/1 (SQLite's own way of writing a flag), dates become ISO strings, and
   anything still unsupported is refused with the column's name in the message. */

const isBindable = (value: unknown) =>
  value === null ||
  typeof value === 'number' ||
  typeof value === 'string' ||
  typeof value === 'bigint' ||
  Buffer.isBuffer(value) ||
  value instanceof Uint8Array;

/** One value, in the shape SQLite will take. Throws for objects and arrays. */
export function bindable(value: unknown): number | string | bigint | Buffer | Uint8Array | null {
  if (value === undefined || value === null) return null;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (value instanceof Date) return value.toISOString();
  if (isBindable(value)) return value as any;
  throw new Error(`cannot be stored as-is (${Array.isArray(value) ? 'list' : typeof value})`);
}

/** A row of values, in the shape SQLite will take. Names the first column that cannot be. */
export function bindableRow<T extends Record<string, unknown>>(row: T): T {
  const out: Record<string, unknown> = {};
  for (const [column, value] of Object.entries(row)) {
    try {
      out[column] = bindable(value);
    } catch (error: any) {
      throw new Error(`Offer field “${column}” ${error.message}.`);
    }
  }
  return out as T;
}
