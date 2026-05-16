export interface Session {
  id: string;
  agent_name: string;
  agent_type: string;
  started_at: string;
  status: string;
  total_tokens: number;
  total_cost: number;
  violations_count: number;
}

export interface ConversationLog {
  id: string;
  session_id: string;
  timestamp: string;
  user_prompt: string;
  agent_response: string | null;
  tokens_used: number;
  cost_usd: number;
  policy_violations: PolicyViolation[];
  blocked: boolean;
}

export interface SecurityEvent {
  id: string;
  session_id: string | null;
  event_type: string;
  severity: "critical" | "warning" | "info";
  title: string;
  details: Record<string, unknown>;
  detected_at: string;
  resolved: boolean;
}

export interface PolicyViolation {
  policy_name: string;
  action: string;
  category: string;
  description: string;
  matched_text: string;
}

export interface Policy {
  id: string;
  name: string;
  description: string | null;
  pattern: string;
  action: string;
  category: string;
  enabled: boolean;
}

export interface DashboardMetrics {
  total_sessions: number;
  active_sessions: number;
  total_interactions: number;
  total_violations: number;
  total_cost: number;
  blocked_attacks: number;
  avg_response_time_ms: number;
  violation_rate: number;
  recent_events: SecurityEvent[];
  recent_logs: ConversationLog[];
}

export interface AgentExecuteResponse {
  session_id: string;
  response: string | null;
  blocked: boolean;
  violations: PolicyViolation[];
  tokens_used: number;
  cost_usd: number;
}

export interface TestResult {
  prompt: string;
  label: string;
  category: string;
  expected: string;
  actual: string;
  passed: boolean;
  violations: PolicyViolation[];
  response_preview: string;
}

export interface TestRunResult {
  session_id: string;
  total_tests: number;
  passed: number;
  failed: number;
  score: number;
  results: TestResult[];
}

export interface SSEEvent {
  type: "security_event" | "agent_activity" | "test_complete";
  data: Record<string, unknown>;
}
