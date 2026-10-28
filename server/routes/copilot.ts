import { stringify } from 'csv-stringify/sync';
import { db, audit } from '../db.js';
import { permission, canAccessStudio } from '../lib/auth.js';
import { renewalReport } from '../lib/renewals.js';
import { aiCopilot, copilotCapability, deterministicCopilot } from '../lib/copilot.js';
import { answerQuestion, engineCapability, warmCopilot } from '../lib/copilot/engine.js';
import { cacheStats, invalidateCopilotCache } from '../lib/copilot/context.js';
import { asyncRoute, bodyError, id, studioFilter } from '../http.js';
import { persistOffer } from './offers.js';
import type { Express } from 'express';

export default function registerCopilotRoutes(app: Express) {
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
