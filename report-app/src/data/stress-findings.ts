// Shared between the landing page and the console Overview "Stress test" section.
// Source: docs/Stress_testing/WORLDMONITOR-STRESS-TEST-RESULTS.md (Phase B, live dynamic tests).
export type StressFinding = {
  id: string;
  tag: string;
  impact: string;
  stat1: [string, string];
  stat2: [string, string];
};

export const STRESS_FINDINGS: StressFinding[] = [
  {
    id: 'B12', tag: 'Novel · escalated',
    impact: "Feed headlines reach the severity classifier with zero prompt-injection sanitization, while every sibling AI endpoint has it. The same gap in the alert relay pushes a forged 'critical' classification straight to real Slack, Discord, and push subscribers: the strongest single result of the whole exercise.",
    stat1: ['50', 'headlines per batch'], stat2: ['0', 'sanitizer calls'],
  },
  {
    id: 'B02', tag: 'Novel',
    impact: 'A single hostile RSS response with 100,000 unclosed tags makes the real feed parser take 23.5 seconds on one synchronous call. Node is single-threaded, so that one bad feed freezes the whole serverless isolate, not just itself.',
    stat1: ['23.5s', 'one parse call'], stat2: ['O(n²)', 'confirmed blowup'],
  },
  {
    id: 'B01', tag: 'Novel',
    impact: "When Redis can't be reached, the rate limiter's fail-open decision alone costs 4.3 to 5 seconds per request instead of 15ms, up to 330x slower, across 187 routes with no endpoint-specific policy to catch it.",
    stat1: ['330x', 'latency multiplier'], stat2: ['187', 'routes exposed'],
  },
  {
    id: 'B14', tag: 'Novel',
    impact: 'The map layer never culls or clusters points at any scale tested. Past roughly 10-20 million injected points the renderer freezes solid with no catchable event: not a clean crash, an unrecoverable dead tab.',
    stat1: ['20M', 'points to freeze'], stat2: ['0', 'recoverable events'],
  },
  {
    id: 'B09', tag: 'Novel',
    impact: 'The Agent Skills importer shows a 200-character preview before Save, then silently saves up to 2,000 characters into the AI’s own context. A real attacker gets 1,800 characters of room nobody reads.',
    stat1: ['200', 'chars previewed'], stat2: ['2,000', 'chars saved'],
  },
  {
    id: 'B13', tag: 'Novel · quantifies B01',
    impact: 'Under a Redis outage, the system never transitions to 429/503 at all. It stays at 100% 200 OK and 100% amplification at every rate from 50 to 500 req/s, each one paying the fail-open latency tax B01 measured.',
    stat1: ['100%', 'requests admitted'], stat2: ['50-500', 'req/s tested'],
  },
];

export const STRESS_SUMMARY = {
  totalTasks: 29,
  staticTasks: 13,
  liveTasks: 16,
  liveHeld: 10,
  liveFindings: 6,
};
