/**
 * Seed data for the BOLA reproduction harness — two synthetic test users,
 * per docs/ROE.md's "two seeded test users only" rule. Nothing here is real
 * user data; both accounts and both sessions are fabricated for this lab.
 */
export const USERS = {
  'user-free-001': { tier: 'free', sessionToken: 'valid-free-001' },
  'user-pro-002': { tier: 'pro', sessionToken: 'valid-pro-002' },
};

export const ALERT_RULES = [
  { id: 'rule-001', ownerId: 'user-free-001', enabled: true, label: 'Watch: Convoy movement, sector 7' },
  { id: 'rule-002', ownerId: 'user-free-001', enabled: false, label: 'Watch: Port congestion index' },
  { id: 'rule-003', ownerId: 'user-pro-002', enabled: true, label: 'Watch: Sanctioned-entity mention (private list)' },
  { id: 'rule-004', ownerId: 'user-pro-002', enabled: true, label: 'Watch: Executive travel itinerary keyword' },
];

export function isValidSession(userId, token) {
  const u = USERS[userId];
  return Boolean(u && token && u.sessionToken === token);
}
