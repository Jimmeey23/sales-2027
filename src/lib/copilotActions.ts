import { api } from '../api';

/* What the copilot proposes, and how each proposal is saved through the app's normal routes.
   Approved offers can be changed only after the planner agrees; the change reopens the offer,
   so it is approved again straight after, as the planner's consent covers it. */

export type CopilotAction =
  | { kind: 'update_offer'; studioId: number; year: number; month: number; offerId: number; offerName: string; approved: boolean; changes: Record<string, any>; why: string; allLocations: boolean }
  | { kind: 'add_offer'; studioId: number; year: number; month: number; offerId: number; offerName: string; why: string; allLocations: boolean }
  | { kind: 'remove_offer'; studioId: number; year: number; month: number; offerId: number; offerName: string; approved: boolean; why: string; allLocations: boolean }
  | { kind: 'delete_offer'; studioId: number; year: number; month: number; offerId: number; offerName: string; approved: boolean; why: string; allLocations: boolean }
  | { kind: 'create_offer'; studioId: number; year: number; month: number; fields: Record<string, any>; why: string; allLocations: boolean }
  | { kind: 'update_plan'; studioId: number; year: number; month: number; changes: Record<string, any>; why: string };

export const needsConsent = (a: CopilotAction) => 'approved' in a && a.approved;

export function consentText(actions: CopilotAction[]) {
  const names = [...new Set(actions.filter(needsConsent).map((a: any) => a.offerName))];
  if (!names.length) return null;
  return `${names.length === 1 ? `“${names[0]}” is` : `${names.length} offers are`} already approved${
    names.length > 1 ? ` (${names.slice(0, 4).join(', ')}${names.length > 4 ? '…' : ''})` : ''
  }.\n\nApply the copilot's changes to approved offers anyway? They will be re-approved with the new terms.`;
}

const offersRoute = (a: { studioId: number; year: number; month: number }) =>
  `/studio-plans/${a.studioId}/${a.year}/${a.month}/offers`;

/** Saves one action. Returns a note for anything that did not fully land. */
export async function applyAction(a: CopilotAction): Promise<string | null> {
  const solo = 'allLocations' in a ? !a.allLocations : true;
  switch (a.kind) {
    case 'update_offer': {
      await api(offersRoute(a), { method: 'POST', body: JSON.stringify({ op: 'update', offerId: a.offerId, edit: a.changes, solo }) });
      if (a.approved) {
        try {
          await api(`/offers/${a.offerId}/action`, { method: 'POST', body: JSON.stringify({ action: 'approve' }) });
        } catch (e: any) {
          return `“${a.offerName}” was updated but is waiting for re-approval (${e.message}).`;
        }
      }
      return null;
    }
    case 'add_offer':
      await api(offersRoute(a), { method: 'POST', body: JSON.stringify({ op: 'add', offerId: a.offerId, solo }) });
      return null;
    case 'remove_offer':
      await api(offersRoute(a), { method: 'POST', body: JSON.stringify({ op: 'remove', offerId: a.offerId, solo }) });
      return null;
    case 'delete_offer':
      await api(offersRoute(a), { method: 'POST', body: JSON.stringify({ op: 'delete', offerId: a.offerId, solo }) });
      return null;
    case 'create_offer':
      await api(offersRoute(a), { method: 'POST', body: JSON.stringify({ op: 'create', edit: a.fields, solo }) });
      return null;
    case 'update_plan':
      await api(`/studio-plans/${a.studioId}/${a.year}/${a.month}`, { method: 'PUT', body: JSON.stringify(a.changes) });
      return null;
  }
}

/** Tells every loaded view to refresh after the copilot changed data. */
export const announceChange = () => window.dispatchEvent(new Event('p57:data-changed'));

/* The page the planner is on: views that know their studio and month publish it here, so the
   copilot defaults to what is on screen. */
export type CopilotScope = { studioId?: number | null; year?: number | null; month?: number | null; label?: string | null };
let scope: CopilotScope = {};
const listeners = new Set<() => void>();
export const getCopilotScope = () => scope;
export function setCopilotScope(next: CopilotScope) {
  scope = next;
  listeners.forEach(l => l());
}
export function subscribeCopilotScope(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function describeAction(a: CopilotAction): string {
  const when = `${MONTHS[a.month - 1]} ${a.year}`;
  switch (a.kind) {
    case 'update_offer':
      return `Edit “${a.offerName}” · ${when}`;
    case 'add_offer':
      return `Add “${a.offerName}” to ${when}`;
    case 'remove_offer':
      return `Remove “${a.offerName}” from ${when}`;
    case 'delete_offer':
      return `Delete “${a.offerName}”`;
    case 'create_offer':
      return `New offer “${a.fields.name}” · ${when}`;
    case 'update_plan':
      return `Rewrite ${when} plan`;
  }
}
