export const BULLSEYE_ADMIN_EMAILS = [
  'james@bullseyesb.com',
  'gavin@realworth.ai',
  'gavin@whynotus.ai',
  'g@whynotus.ai',
];

export const BULLSEYE_STORES = [
  { id: 'philly', name: 'Philadelphia, PA' },
  { id: 'delaware', name: 'Delaware' },
  { id: 'pennsylvania', name: 'Pennsylvania' },
];

export function isBullseyeAdmin(email: string | undefined | null): boolean {
  if (!email) return false;
  return BULLSEYE_ADMIN_EMAILS.includes(email.toLowerCase());
}
