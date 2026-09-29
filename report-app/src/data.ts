import raw from './data/assessment-data.json';
import type { AssessmentData, Finding } from './types';

export const data = raw as unknown as AssessmentData;

export const REPO_URL = 'https://github.com/ArushJain-697/SIH-2026';
export const WORKFLOW_URL = `${REPO_URL}/actions/workflows/assess.yml`;
export const TARGET_URL = 'https://github.com/koala73/worldmonitor';

export const findingById = (id: string): Finding | undefined =>
  data.findings.find((f) => f.id === id);

export const reproduced = data.findings.filter(
  (f) => f.status === 'REPRODUCED-KNOWN' || f.status === 'CONFIRMED-NOVEL',
);

export const pinnedCommit =
  data.findings.find((f) => f.lab_commit)?.lab_commit?.slice(0, 12) ?? 'unknown';
