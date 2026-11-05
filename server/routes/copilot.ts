import { stringify } from 'csv-stringify/sync';
import { db, audit } from '../db.js';
import { permission, canAccessStudio } from '../lib/auth.js';
import { renewalReport } from '../lib/renewals.js';
import { aiCopilot, copilotCapability, deterministicCopilot } from '../lib/copilot.js';
import { answerQuestion, engineCapability, warmCopilot } from '../lib/copilot/engine.js';
import { cacheStats, invalidateCopilotCache } from '../lib/copilot/context.js';
import { asyncRoute, bodyError, id, studioFilter } from '../http.js';
import { persistOffer } from './offers.js';
import { AUDIT_BRIEF, runAgent } from '../lib/copilotAgent.js';
import { auditYear } from '../lib/planAudit.js';
import { replaceSuggestions } from '../lib/replaceSuggest.js';
import { aiEdits, claudeConfigured, ruleEdits, type OfferEditInput } from '../lib/offerEditCopilot.js';
import type { Express } from 'express';

export default function registerCopilotRoutes(app: Express) {
  // AI picks for replacing one offer: best bank alternates plus fresh drafts when the bank is thin.
  app.post(
    '/api/copilot/replace-suggestions',
    asyncRoute(async (req: any, res: any) => {
      const offerId = Number(req.body.offerId);
      const row = db.prepare('SELECT studio_id FROM offers WHERE id=?').get(offerId) as any;
      if (!row || (row.studio_id && !canAccessStudio(req.user, row.studio_id))) throw bodyError('Offer not found.', 404);
      if (!claudeConfigured()) throw bodyError('AI suggestions need ANTHROPIC_API_KEY on the server.', 503);
      try {
        res.json(
          await replaceSuggestions({
            offerId,
            candidateIds: (Array.isArray(req.body.candidateIds) ? req.body.candidateIds : []).map(Number).filter((v: number) => v > 0),
            month: Number(req.body.month) || 1,
            year: Number(req.body.year) || new Date().getFullYear(),
            theme: req.body.theme ? String(req.body.theme).slice(0, 200) : null,
          }),
        );
      } catch (error: any) {
        if (error?.status === 404) throw error;
        throw bodyError(`AI suggestions failed: ${[401, 403].includes(Number(error?.status)) ? 'API key rejected' : error.message}`, 502);
      }
    }),
  );
  // The app-wide copilot. Reads with tools, returns proposed actions; nothing is saved here.
  app.post(
    '/api/copilot/agent',
    asyncRoute(async (req: any, res: any) => {
      const message = String(req.body.message || '').trim();
      if (!message || message.length > 4000) throw bodyError('Messages must contain 1–4000 characters.');
      if (!claudeConfigured())
        throw bodyError('Copilot needs ANTHROPIC_API_KEY in the server .env to make changes.', 503);
      const history = (Array.isArray(req.body.history) ? req.body.history : [])
        .slice(-10)
        .map((h: any) => ({ role: String(h.role), content: String(h.content || '').slice(0, 4000) }));
      const s = req.body.scope || {};
      const scope = {
        path: s.path ? String(s.path).slice(0, 200) : null,
        studioId: Number(s.studioId) || null,
        year: Number(s.year) || null,
        month: Number(s.month) || null,
      };
      try {
        const audit = req.body.mode === 'audit';
      const state = req.body.state && typeof req.body.state === 'object' ? req.body.state : null;
      if (state && (!Array.isArray(state.messages) || JSON.stringify(state).length > 3_500_000))
        throw bodyError('Copilot state is invalid; start a new question.');
      // The deterministic findings are computed once, on the first round.
      const findings =
        !state && audit && scope.studioId && canAccessStudio(req.user, scope.studioId)
          ? auditYear(scope.studioId, scope.year || new Date().getFullYear())
          : null;
      const result = await runAgent({
        message,
        history,
        scope,
        user: req.user,
        system: audit ? AUDIT_BRIEF : undefined,
        maxSteps: audit ? 20 : 12,
        state,
        budgetMs: 25_000,
      });
      res.json({ ...result, audit: findings });
      } catch (error: any) {
        // Provider errors must not reach the browser as the app's own 401/403 (that reads as "signed out").
        const status = Number(error?.status);
        const why =
          status === 401 || status === 403
            ? 'the ANTHROPIC_API_KEY in .env was rejected by Anthropic — check the key'
            : status === 429
              ? 'Anthropic rate limit reached — try again in a minute'
              : error?.message || 'unknown error';
        throw bodyError(`Copilot could not reach Claude: ${why}.`, 502);
      }
    }),
  );
  // Chat edits to one offer or a whole month's offers. Proposes changes only; nothing is saved here.
  app.post(
    '/api/copilot/offer-edit',
    permission('offer_edit'),
    asyncRoute(async (req: any, res: any) => {
      const message = String(req.body.message || '').trim();
      if (!message || message.length > 2000) throw bodyError('Messages must contain 1–2000 characters.');
      const ids: number[] = (Array.isArray(req.body.offerIds) ? req.body.offerIds : [])
        .map((v: any) => Number(v))
        .filter((v: number) => Number.isInteger(v) && v > 0)
        .slice(0, 30);
      if (!ids.length) throw bodyError('Choose at least one offer to edit.');
      const rows = db
        .prepare(`SELECT * FROM offers WHERE id IN (${ids.map(() => '?').join(',')})`)
        .all(...ids) as any[];
      const offers: OfferEditInput[] = rows
        .filter(r => !r.studio_id || canAccessStudio(req.user, r.studio_id))
        .map(r => {
          let pricing: any = {};
          try {
            pricing = JSON.parse(r.provenance || '{}').pricing || {};
          } catch {}
          return {
            id: r.id,
            name: r.name,
            headline: r.headline,
            benefit: r.benefit,
            customer_copy: r.customer_copy,
            audience: r.audience,
            cta: r.cta,
            redemption_conditions: r.redemption_conditions,
            validity_start: r.validity_start,
            validity_end: r.validity_end,
            target_purchases: r.target_purchases,
            expected_asp: r.expected_asp,
            effective_discount: r.effective_discount,
            product: pricing.product ?? null,
            discount: typeof pricing.discount === 'number' ? pricing.discount : null,
            approval_status: r.approval_status,
            objective: r.objective,
            offer_type: r.offer_type,
            rationale: r.rationale ? String(r.rationale).slice(0, 800) : null,
            list_price: typeof pricing.customListPrice === 'number' ? pricing.customListPrice : null,
          };
        });
      if (!offers.length) throw bodyError('Offer not found.', 404);
      const history = (Array.isArray(req.body.history) ? req.body.history : [])
        .slice(-8)
        .map((h: any) => ({ role: String(h.role), content: String(h.content || '').slice(0, 2000) }));
      const studioRow = rows.find(r => r.studio_id)?.studio_id
        ? (db.prepare('SELECT name, max_discount_percent FROM studios WHERE id=?').get(rows.find(r => r.studio_id).studio_id) as any)
        : null;
      const context = {
        month: Number(req.body.month) || null,
        year: Number(req.body.year) || null,
        studio: studioRow?.name || (req.body.studio ? String(req.body.studio).slice(0, 80) : null),
        theme: req.body.theme ? String(req.body.theme).slice(0, 200) : null,
        objective: req.body.objective ? String(req.body.objective).slice(0, 1000) : null,
        target: Number(req.body.target) || null,
        maxDiscountPercent: studioRow?.max_discount_percent != null ? Number(studioRow.max_discount_percent) : null,
      };
      if (!claudeConfigured()) return res.json(ruleEdits(message, offers));
      try {
        res.json(await aiEdits(message, offers, history, context));
      } catch (error: any) {
        const fallback = ruleEdits(message, offers);
        const why = [401, 403].includes(Number(error?.status)) ? 'the Anthropic API key was rejected' : error.message;
        res.json({ ...fallback, reply: `Claude was unavailable (${why}). ${fallback.reply}` });
      }
    }),
  );
  app.get('/api/renewals/report', (req, res) => {
    const studioId = studioFilter(req, req.query.studio ? id(req.query.studio) : undefined);
    const now = new Date(),
      defaultMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 1)).toISOString().slice(0, 7);
    const rate =
      req.query.conversionRate === undefined || req.query.conversionRate === ''
        ? null
        : Number(req.query.conversionRate);
    res.json(
      renewalReport(
        String(req.query.month || defaultMonth),
        studioId,
        rate,
        req.query.valueBasis === 'list' ? 'list' : 'paid',
      ),
    );
  });
  app.get('/api/copilot/capability', (_req, res) => {
    warmCopilot();
    res.json({ ...copilotCapability(), engineInfo: engineCapability(), cache: cacheStats() });
  });
  app.get('/api/copilot/conversations', (req, res) => {
    const rows = db
      .prepare(
        `SELECT c.*,s.name studio,(SELECT content FROM copilot_messages m WHERE m.conversation_id=c.id ORDER BY m.id DESC LIMIT 1) last_message
    FROM copilot_conversations c LEFT JOIN studios s ON s.id=c.studio_id WHERE c.user_id=? ORDER BY c.updated_at DESC`,
      )
      .all(req.user!.id) as any[];
    res.json({ rows: rows.filter(row => !row.studio_id || canAccessStudio(req.user!, row.studio_id)) });
  });
  app.post('/api/copilot/conversations', (req, res) => {
    const studioId = req.body.studioId ? studioFilter(req, id(req.body.studioId)) : null;
    const title =
      String(req.body.title || 'New commercial conversation')
        .trim()
        .slice(0, 120) || 'New commercial conversation';
    const result = db
      .prepare('INSERT INTO copilot_conversations(user_id,studio_id,title,mode) VALUES (?,?,?,?)')
      .run(req.user!.id, studioId, title, process.env.OPENAI_API_KEY ? 'provider_available' : 'deterministic');
    audit({
      userId: req.user!.id,
      action: 'create',
      entityType: 'copilot_conversation',
      entityId: result.lastInsertRowid,
      studioId,
    });
    res.status(201).json(db.prepare('SELECT * FROM copilot_conversations WHERE id=?').get(result.lastInsertRowid));
  });
  function copilotConversation(req: any, conversationId: number) {
    const conversation = db
      .prepare('SELECT * FROM copilot_conversations WHERE id=? AND user_id=?')
      .get(conversationId, req.user.id) as any;
    if (!conversation || (conversation.studio_id && !canAccessStudio(req.user, conversation.studio_id)))
      throw bodyError('Conversation not found.', 404);
    return conversation;
  }
  app.get('/api/copilot/conversations/:id', (req, res) => {
    const conversation = copilotConversation(req, id(req.params.id));
    const messages = db
      .prepare('SELECT * FROM copilot_messages WHERE conversation_id=? ORDER BY id')
      .all(conversation.id) as any[];
    res.json({
      ...conversation,
      messages: messages.map(message => ({ ...message, attachments: JSON.parse(message.attachments || '{}') })),
    });
  });
  app.delete('/api/copilot/conversations/:id', (req, res) => {
    const conversation = copilotConversation(req, id(req.params.id));
    db.prepare('DELETE FROM copilot_conversations WHERE id=?').run(conversation.id);
    audit({
      userId: req.user!.id,
      action: 'delete',
      entityType: 'copilot_conversation',
      entityId: conversation.id,
      studioId: conversation.studio_id,
    });
    res.json({ ok: true });
  });
  app.post(
    '/api/copilot/conversations/:id/messages',
    asyncRoute(async (req: any, res: any) => {
      const conversation = copilotConversation(req, id(req.params.id)),
        message = String(req.body.message || '').trim();
      if (!message || message.length > 4000) throw bodyError('Copilot messages must contain 1–4000 characters.');
      const studioId = req.body.studioId ? studioFilter(req, id(req.body.studioId)) : conversation.studio_id;
      const history = (
        db
          .prepare('SELECT * FROM copilot_messages WHERE conversation_id=? ORDER BY id DESC LIMIT 12')
          .all(conversation.id) as any[]
      )
        .reverse()
        .map(item => ({ ...item, attachments: JSON.parse(item.attachments || '{}') }));
      // Engine v2 answers deterministically from the database; the legacy planner stays as a fallback.
      let answer: any = null,
        engineMeta: any = null;
      try {
        const result = answerQuestion({ message, studioId, history });
        answer = result.answer;
        engineMeta = result.meta;
      } catch (error: any) {
        if (error?.status) throw error;
        answer = await deterministicCopilot(message, studioId, history);
      }
      const resolvedStudioId =
        answer.attachments?.studioId ||
        answer.attachments?.concept?.studioId ||
        answer.attachments?.plan?.studioId ||
        answer.attachments?.report?.studioId ||
        studioId;
      if (resolvedStudioId && !canAccessStudio(req.user, resolvedStudioId))
        throw bodyError('The resolved studio is outside your access scope.', 403);
      const requestedMode = ['auto', 'deterministic', 'ai'].includes(req.body.mode) ? req.body.mode : 'auto';
      if (requestedMode === 'ai' && !process.env.OPENAI_API_KEY)
        throw bodyError(
          'AI provider is not configured. Choose Deterministic Copilot; no AI response has been fabricated.',
          503,
        );
      // AI answers every question when configured; the deterministic answer is passed in as validated facts.
      const matched = !['unrecognised', 'studio_required', 'help', 'explain', 'navigation'].includes(
        answer.attachments?.type,
      );
      const deterministicAnswer = answer;
      if (process.env.OPENAI_API_KEY && requestedMode !== 'deterministic') {
        try {
          answer = await aiCopilot(message, resolvedStudioId, history, matched ? deterministicAnswer : null);
        } catch (error: any) {
          if (requestedMode === 'ai') throw error;
          answer = {
            ...deterministicAnswer,
            content: `${deterministicAnswer.content}\n\n(AI was unavailable: ${error.message})`,
          };
        }
      }
      let savedOffer: any = null;
      if (answer.saveOffer) {
        if (!req.user.permissions.includes('offer_create'))
          answer.content += '\nDraft was not saved: your role lacks offer-create permission.';
        else {
          savedOffer = persistOffer(
            {
              ...answer.saveOffer,
              generationSource: answer.mode === 'deterministic' ? 'copilot_deterministic' : 'copilot_ai_concept',
              dataMode: 'scenario',
            },
            req.user,
          );
          answer.attachments = {
            ...answer.attachments,
            savedOfferId: savedOffer.id,
            savedOfferUid: savedOffer.offer_uid,
          };
          invalidateCopilotCache();
          answer.content = answer.content
            .replace(
              'This concept is ready to save as a draft; it will not be approved or published automatically.',
              `Saved as draft #${savedOffer.id} (${savedOffer.offer_uid}). Approval and publishing remain separate.`,
            )
            .replace('The previous', `Saved the previous`)
            .replace(
              'concept is ready to save as a draft. Policy and financial validation will run again; no approval or publishing will occur.',
              `concept as draft #${savedOffer.id}; no approval or publishing occurred.`,
            );
        }
      }
      delete answer.saveOffer;
      const title = conversation.title === 'New commercial conversation' ? message.slice(0, 80) : conversation.title;
      const persist = db.transaction(() => {
        db.prepare(
          'INSERT INTO copilot_messages(conversation_id,role,content,attachments,mode) VALUES (?,?,?,?,?)',
        ).run(conversation.id, 'user', message, '{}', 'user');
        const inserted = db
          .prepare('INSERT INTO copilot_messages(conversation_id,role,content,attachments,mode) VALUES (?,?,?,?,?)')
          .run(conversation.id, 'assistant', answer.content, JSON.stringify(answer.attachments), answer.mode);
        db.prepare(
          'UPDATE copilot_conversations SET title=?,studio_id=?,mode=?,updated_at=CURRENT_TIMESTAMP WHERE id=?',
        ).run(title, resolvedStudioId, answer.mode, conversation.id);
        return Number(inserted.lastInsertRowid);
      });
      const assistantId = persist();
      audit({
        userId: req.user!.id,
        action: 'message',
        entityType: 'copilot_conversation',
        entityId: conversation.id,
        studioId: resolvedStudioId,
        after: {
          mode: answer.mode,
          savedOfferId: savedOffer?.id || null,
          assistantMessageId: assistantId,
          intent: engineMeta?.intent ?? answer.attachments?.intent?.id ?? null,
          engineMs: engineMeta?.timings?.total ?? null,
        },
      });
      res
        .status(201)
        .json({
          conversationId: conversation.id,
          message: {
            id: assistantId,
            role: 'assistant',
            content: answer.content,
            attachments: answer.attachments,
            mode: answer.mode,
          },
          savedOffer,
          meta: engineMeta,
        });
    }),
  );
}
