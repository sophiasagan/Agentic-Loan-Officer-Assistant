export type LoanType = 'auto' | 'personal' | 'heloc';

export interface LoanAnalysisRequest {
  member_id: string;
  loan_type: LoanType;
  loan_amount: number;
  term_months: number;
}

export interface LoanAnalysisResponse {
  member_id: string;
  loan_type: string;
  loan_amount: number;
  approved: boolean;
  churn_risk: string;        // "low" | "medium" | "high"
  dti_projected: number;     // decimal e.g. 0.36
  policy_violations: string[];
  conditions: string[];
  narrative: string;
  processing_steps: string[];
}

export interface HistoryRecord {
  id: number;
  member_id: string;
  loan_type: string;
  loan_amount: number;
  term_months: number;
  approved: boolean;
  churn_risk: string;
  dti_projected: number;
  policy_violations: string[];
  conditions: string[];
  narrative: string;
  processing_steps: string[];
  analyzed_at: string;
}

export interface LoanHistoryResponse {
  member_id: string;
  count: number;
  history: HistoryRecord[];
}
