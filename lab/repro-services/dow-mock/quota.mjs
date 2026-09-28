/**
 * Per-caller quota state for the Denial-of-Wallet reproduction harness.
 * Shared shape between vulnerable.mjs and patched.mjs so the only
 * behavioral difference is WHEN a refund is permitted, not the bookkeeping.
 */
export function makeQuotaStore(dailyBudget) {
  const used = new Map(); // callerId -> count

  return {
    dailyBudget,
    remaining(callerId) {
      return dailyBudget - (used.get(callerId) || 0);
    },
    reserve(callerId) {
      const current = used.get(callerId) || 0;
      used.set(callerId, current + 1);
      return dailyBudget - (current + 1);
    },
    refund(callerId) {
      const current = used.get(callerId) || 0;
      const next = Math.max(0, current - 1);
      used.set(callerId, next);
      return dailyBudget - next;
    },
    snapshot(callerId) {
      return { callerId, used: used.get(callerId) || 0, dailyBudget, remaining: this.remaining(callerId) };
    },
  };
}
