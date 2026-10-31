import type { Express } from 'express';
import { db } from '../db.js';
import { sendCached } from '../lib/httpCache.js';
import { canAccessStudio } from '../lib/auth.js';
import { planEconomics } from '../lib/planEconomics.js';
import { studioScopeIds } from '../lib/studios.js';
import { planOffers } from './offers.js';
import { planCampaigns } from './campaigns.js';
import { studioPlanDetail } from './studioPlans.js';

// The year plan asks six different endpoints for the same six things about every location:
// its detail, its economics, its offers, its campaigns. That used to be 50+ requests on one
// screen (and each location's detail twice, because two components wanted it). This answers
// the whole screen once, in the same shapes those endpoints already return, so every caller
// below the hook is unchanged.
export default function registerPlanBundleRoutes(app: Express) {
  app.get('/api/plan/bundle', (req, res) => {
    const year = Number(req.query.year || 2027);
    const requested = String(req.query.studios || '')
      .split(',')
      .map(Number)
      .filter(n => Number.isInteger(n) && n > 0);
    // Only locations this account may read are built; the browser never names a studio the
    // session could not otherwise open.
    const ids = [...new Set(requested)].filter(sid => canAccessStudio(req.user!, sid));
    // Keyed by everything that shapes the body — the year and the studios this account may
    // read — so a restricted session never receives another session's locations.
    sendCached(res, `plan-bundle:${year}:${ids.join(',')}`, () => {
      const scopeIds = [...new Set(ids.flatMap(sid => studioScopeIds(db, sid)))];
      return {
        year,
        studios: ids.map(sid => ({
          id: sid,
          detail: studioPlanDetail(sid, year, req.user!.id),
          economics: planEconomics(sid, year),
        })),
        offers: planOffers(scopeIds, year),
        campaigns: planCampaigns(scopeIds, year),
      };
    });
  });
}
