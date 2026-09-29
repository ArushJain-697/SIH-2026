export type FindingStatus =
  | 'REPRODUCED-KNOWN'
  | 'CONFIRMED-NOVEL'
  | 'CANDIDATE-UNCONFIRMED'
  | 'VERIFIED-SECURE';

export type CoverageVerdict = 'FINDING' | 'CANDIDATE' | 'VERIFIED_SECURE' | 'NOT_TESTED';

export interface Severity {
  cvss31_vector?: string;
  cvss31_score?: number;
  cvss40_vector?: string;
  epss?: number | null;
}

export interface Finding {
  id: string;
  dir: string;
  title: string;
  status: FindingStatus;
  component: string;
  trust_boundary: number;
  severity?: Severity;
  epss_note?: string;
  tags?: { cwe?: string[]; wstg?: string; owasp_api?: string };
  lab_commit?: string;
  reproduce_script?: string;
  control_tested?: string | null;
  description: string;
  preconditions?: string;
  business_impact: string;
  remediation: string;
  remediation_patch?: string;
  references?: { ghsa?: string | null; external?: string[] };
  evidence_summary?: Record<string, string | number | boolean>;
  scope_areas: number[];
  markdown: string | null;
  evidence_files: string[];
  has_remediation_patch: boolean;
  remediation_patch_diff: string | null;
}

export interface CoverageCell {
  area_number: number;
  label: string;
  verdict: CoverageVerdict;
  finding_ids: string[];
}

export interface Advisory {
  id: string;
  severity: string;
  title: string;
  class: string;
  cwe?: string[];
  owasp_api?: string;
  platform: string;
  published?: string;
  demo_candidate?: boolean;
}

export interface RegressionResult {
  advisory: string;
  pass: boolean;
  detail: string;
}

export interface InventoryStats {
  total_endpoints: number;
  gateway_routes: number;
  non_get_gateway_routes: number;
  non_get_gateway_routes_uncovered: number;
  premium_gated_endpoints: number;
}

export interface AssessmentData {
  generated_at: string;
  summary: {
    total_findings: number;
    status_counts: Partial<Record<FindingStatus, number>>;
    scope_areas_with_evidence: number;
    total_scope_areas: number;
  };
  coverage_matrix: Record<string, CoverageCell>;
  scope_area_labels: (string | null)[];
  findings: Finding[];
  register: {
    verified_on: string;
    count_published: number;
    count_draft: number;
    advisories: Advisory[];
    external_researcher_credits: { researcher: string; year: number; findings: string[] }[];
  };
  proof_spine_markdown: string | null;
  regression_results: RegressionResult[];
  inventory: InventoryStats | null;
}
