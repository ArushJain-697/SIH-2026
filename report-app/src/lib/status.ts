import type { CoverageVerdict, FindingStatus } from '../types';

type Tone = 'red' | 'yellow' | 'green' | 'neutral';

export interface StatusMeta {
  label: string;
  tone: Tone;
  dot: string;
}

export function statusMeta(status: FindingStatus): StatusMeta {
  switch (status) {
    case 'REPRODUCED-KNOWN':
      return { label: 'Reproduced', tone: 'red', dot: 'var(--color-primary-500)' };
    case 'CONFIRMED-NOVEL':
      return { label: 'Novel', tone: 'red', dot: 'var(--color-primary-500)' };
    case 'CANDIDATE-UNCONFIRMED':
      return { label: 'Candidate', tone: 'yellow', dot: 'var(--color-secondary-500)' };
    case 'VERIFIED-SECURE':
      return { label: 'Verified secure', tone: 'green', dot: 'var(--color-accent-500)' };
  }
}

export function verdictMeta(verdict: CoverageVerdict): StatusMeta {
  switch (verdict) {
    case 'FINDING':
      return { label: 'Finding', tone: 'red', dot: 'var(--color-primary-500)' };
    case 'CANDIDATE':
      return { label: 'Candidate', tone: 'yellow', dot: 'var(--color-secondary-500)' };
    case 'VERIFIED_SECURE':
      return { label: 'Verified secure', tone: 'green', dot: 'var(--color-accent-500)' };
    case 'NOT_TESTED':
      return { label: 'Not tested', tone: 'neutral', dot: 'var(--color-neutral-400)' };
  }
}
