// Generic planning defaults. Themes, offers and activations come from the database only.

// Default offer objective per month, used to pre-fill the offer generator's objective picker.
export const MONTH_OBJECTIVES = [
  'acquisition',
  'referral',
  'reactivation',
  'anniversary',
  'retention',
  'retention',
  'retention',
  'annual_membership',
  'reactivation',
  'revenue_gap',
  'annual_membership',
  'retention',
];

export interface ActionItem {
  text: string;
  owner: string;
  week: number;
  done: boolean;
}
