import type { Express } from 'express';
import { bodyError, id, studioFilter } from '../http.js';
import { audit } from '../db.js';
import {
  actionPlan,
  auditMonth,
  enhanceCopy,
  monthFacts,
  offerNames,
  sentimentOf,
  writingGoals,
} from '../lib/studioAi.js';

/* Studio intelligence endpoints.

   All five are deterministic and read the plan's own numbers, so the drawer can be
   used on a laptop with no provider key. Nothing here writes to the plan: the UI
   copies the result into the field the user is already editing. */
export default function registerStudioAiRoutes(app: Express) {
  const scopeOf = (req: any) => {
    const body = req.body || {};
    const year = Number(body.year);
    const month = Number(body.month);
    if (!Number.isInteger(year) || year < 2020 || year > 2100) throw bodyError('A plan year is required.');
    if (!Number.isInteger(month) || month < 1 || month > 12) throw bodyError('A plan month is required.');
    const studioId = body.studioId ? studioFilter(req, id(body.studioId)) : studioFilter(req, undefined);
    return { studioId, year, month };
  };

  const capability = () => ({
    mode: 'deterministic' as const,
    label: 'Studio heuristics · computed from this plan',
    providerConfigured: Boolean(process.env.OPENAI_API_KEY),
  });

  app.post('/api/studio-ai/review', (req, res) => {
    const scope = scopeOf(req);
    const facts = monthFacts(scope);
    const written = [facts.theme, facts.objective, facts.strategy, facts.notes, ...facts.offers.map(o => o.name)]
      .filter(Boolean)
      .join(' ');
    const result = auditMonth(facts);
    const sentiment = sentimentOf(written);
    audit({
      userId: req.user!.id,
      action: 'ai_review',
      entityType: 'monthly_plan',
      entityId: `${scope.year}-${scope.month}`,
      studioId: scope.studioId,
      after: { score: result.score, findings: result.findings.length },
    });
    res.json({ ...capability(), facts, sentiment, ...result });
  });

  app.post('/api/studio-ai/copy', (req, res) => {
    const scope = scopeOf(req);
    const text = String(req.body?.text || '').trim();
    if (!text) throw bodyError('Write something first — the enhancer works on your sentence, not a blank field.');
    if (text.length > 4000) throw bodyError('Keep the passage under 4000 characters.');
    const facts = monthFacts(scope);
    res.json({
      ...capability(),
      ...enhanceCopy({ text, kind: req.body?.kind, tone: req.body?.tone, facts }),
    });
  });

  app.post('/api/studio-ai/names', (req, res) => {
    const scope = scopeOf(req);
    const facts = monthFacts(scope);
    res.json({
      ...capability(),
      ...offerNames({
        seed: `${scope.year}-${scope.month}-${req.body?.seed || req.body?.kind || ''}`,
        audience: req.body?.audience,
        kind: req.body?.kind,
        theme: req.body?.theme || facts.theme,
        month: scope.month,
      }),
    });
  });

  app.post('/api/studio-ai/action-plan', (req, res) => {
    const scope = scopeOf(req);
    res.json({ ...capability(), ...actionPlan(monthFacts(scope)) });
  });

  app.post('/api/studio-ai/goals', (req, res) => {
    const scope = scopeOf(req);
    res.json({ ...capability(), ...writingGoals(monthFacts(scope)) });
  });
}
