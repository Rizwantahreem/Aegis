import type {
  DashboardMetrics,
  Session,
  ConversationLog,
  SecurityEvent,
  AgentExecuteResponse,
  TestRunResult,
  Policy,
} from "./types";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Request failed");
  }
  return res.json();
}

export const api = {
  // Dashboard
  getDashboardMetrics: () => request<DashboardMetrics>("/api/metrics/dashboard"),

  // Agents
  executeAgent: (agent_type: string, prompt: string, session_id?: string) =>
    request<AgentExecuteResponse>("/api/agents/execute", {
      method: "POST",
      body: JSON.stringify({ agent_type, prompt, session_id }),
    }),

  getSessions: (limit = 50) => request<Session[]>(`/api/agents/sessions?limit=${limit}`),
  getSessionLogs: (id: string) => request<ConversationLog[]>(`/api/agents/sessions/${id}/logs`),

  // Security
  getSecurityEvents: (severity?: string, limit = 100) => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (severity) params.set("severity", severity);
    return request<SecurityEvent[]>(`/api/security/events?${params}`);
  },

  // Audit
  getAuditLogs: (search?: string, blockedOnly = false, limit = 100) => {
    const params = new URLSearchParams({ limit: String(limit), blocked_only: String(blockedOnly) });
    if (search) params.set("search", search);
    return request<ConversationLog[]>(`/api/audit/logs?${params}`);
  },

  // Tester
  runTests: (agent_type = "customer_service", categories = ["all"]) =>
    request<TestRunResult>("/api/tester/run", {
      method: "POST",
      body: JSON.stringify({ agent_type, test_categories: categories }),
    }),

  // Policies
  getPolicies: () => request<Policy[]>("/api/policies"),
};

// SSE stream
export function createSSEStream(onEvent: (event: { type: string; data: Record<string, unknown> }) => void) {
  const source = new EventSource(`${API}/api/metrics/stream`);
  source.onmessage = (e) => {
    try {
      const parsed = JSON.parse(e.data);
      onEvent(parsed);
    } catch {
      // ignore parse errors
    }
  };
  source.onerror = () => {
    // Auto-reconnect is built into EventSource
  };
  return () => source.close();
}
