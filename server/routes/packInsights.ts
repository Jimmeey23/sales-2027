import type { Express } from 'express';
import { db } from '../db.js';
import { id, studioFilter } from '../http.js';
import { PACK_STUDIOS, packInsights, packNameFor } from '../lib/packInsights.js';

// Insights and target summaries from the 2027 Sales Plan Pack, for the selected studio
// (?studio=<id>) or every planning studio when none is selected.
export default function registerPackInsightsRoutes(app: Express) {
  app.get('/api/pack-insights', (req, res) => {
    const requested = studioFilter(req, req.query.studio ? id(req.query.studio) : undefined);
    let names = PACK_STUDIOS;
    let note: string | null = null;
    if (requested) {
      const { name, studioName } = packNameFor(requested);
      names = name ? [name] : [];
      if (!name)
        note = `The 2027 pack has no performance history document for ${studioName ?? 'this location'}. Pick Kemps Corner, Bandra, Kenkere House or Pop-up.`;
      else if (studioName !== name) note = `${studioName} is covered by the ${name} documents in the pack.`;
    }
    const data = packInsights(names);
    if (!data) return res.json({ source: null, studios: [], available: PACK_STUDIOS, note: 'Pack insights have not been generated. Run scripts/pack-insights-to-json.py.' });
    res.json({ ...data, available: PACK_STUDIOS, note, scope: requested ? (db.prepare('SELECT name FROM studios WHERE id=?').get(requested) as any)?.name : 'All locations' });
  });
}
