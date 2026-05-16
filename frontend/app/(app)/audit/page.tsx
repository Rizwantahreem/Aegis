"use client";

import { useState, useEffect, useCallback } from "react";
import { ScrollText, Search, Shield, ShieldAlert, ChevronDown, ChevronRight } from "lucide-react";
import { api } from "@/lib/api";
import type { ConversationLog } from "@/lib/types";

function truncate(str: string, max: number) {
  if (!str) return "";
  return str.length > max ? str.slice(0, max) + "…" : str;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export default function AuditLogsPage() {
  const [search, setSearch] = useState("");
  const [blockedOnly, setBlockedOnly] = useState(false);
  const [logs, setLogs] = useState<ConversationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const debouncedSearch = useDebounce(search, 300);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getAuditLogs(debouncedSearch, blockedOnly);
      setLogs(data);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, blockedOnly]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <ScrollText className="h-7 w-7 text-indigo-400" />
          <h1 className="text-2xl font-bold tracking-tight">Audit Logs</h1>
        </div>
        <p className="mt-1 text-sm text-gray-400">
          Complete conversation history with policy enforcement decisions
        </p>
      </div>

      {/* Search & Filter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search prompts, responses…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-700 bg-gray-900 py-2 pl-10 pr-4 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <button
          onClick={() => setBlockedOnly(!blockedOnly)}
          className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
            blockedOnly
              ? "border-red-500 bg-red-500/20 text-red-300"
              : "border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-600"
          }`}
        >
          Blocked Only
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="py-20 text-center text-gray-500">Loading…</div>
      ) : logs.length === 0 ? (
        <div className="py-20 text-center text-gray-500">No audit logs yet</div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-800">
          {/* Column headers */}
          <div className="grid grid-cols-[180px_1fr_1fr_80px_90px_90px_90px] gap-2 border-b border-gray-800 bg-gray-900/60 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
            <span>Timestamp</span>
            <span>Prompt</span>
            <span>Response</span>
            <span>Tokens</span>
            <span>Cost</span>
            <span>Status</span>
            <span>Violations</span>
          </div>

          {logs.map((log) => {
            const isExpanded = expandedId === log.id;
            const isBlocked = log.blocked;

            return (
              <div key={log.id} className="border-b border-gray-800 last:border-b-0">
                {/* Row */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : log.id)}
                  className="grid w-full grid-cols-[180px_1fr_1fr_80px_90px_90px_90px] gap-2 px-4 py-3 text-left text-sm hover:bg-gray-900/40 transition-colors items-center"
                >
                  <span className="text-xs text-gray-400">
                    {isExpanded ? (
                      <ChevronDown className="mr-1 inline h-3 w-3" />
                    ) : (
                      <ChevronRight className="mr-1 inline h-3 w-3" />
                    )}
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                  <span className="truncate text-gray-300">
                    {truncate(log.user_prompt, 80)}
                  </span>
                  <span className="truncate text-gray-400">
                    {truncate(log.agent_response || "", 80)}
                  </span>
                  <span className="text-gray-400">{log.tokens_used ?? "—"}</span>
                  <span className="text-gray-400">
                    {log.cost_usd != null ? `$${log.cost_usd.toFixed(4)}` : "—"}
                  </span>
                  <span>
                    {isBlocked ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-medium text-red-400">
                        <ShieldAlert className="h-3 w-3" /> Blocked
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-500/20 px-2 py-0.5 text-xs font-medium text-green-400">
                        <Shield className="h-3 w-3" /> Safe
                      </span>
                    )}
                  </span>
                  <span className="text-gray-400">
                    {log.policy_violations?.length ?? 0}
                  </span>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-gray-800 bg-gray-900/30 px-6 py-4 space-y-4">
                    <div>
                      <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Full Prompt
                      </h4>
                      <pre className="whitespace-pre-wrap rounded-lg bg-gray-950 p-3 font-mono text-sm text-gray-300 border border-gray-800">
                        {log.user_prompt}
                      </pre>
                    </div>
                    <div>
                      <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Full Response
                      </h4>
                      <pre className="whitespace-pre-wrap rounded-lg bg-gray-950 p-3 font-mono text-sm text-gray-300 border border-gray-800">
                        {log.agent_response}
                      </pre>
                    </div>
                    {log.policy_violations && log.policy_violations.length > 0 && (
                      <div>
                        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                          Policy Violations
                        </h4>
                        <div className="space-y-2">
                          {log.policy_violations.map((v, i) => (
                            <div
                              key={i}
                              className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm"
                            >
                              <span className="font-semibold text-red-400">
                                {v.policy_name ?? `Violation ${i + 1}`}
                              </span>
                              {v.description && (
                                <p className="mt-1 text-gray-400">{v.description}</p>
                              )}
                              {v.action && (
                                <span className="mt-1 inline-block rounded bg-red-500/20 px-2 py-0.5 text-xs text-red-300">
                                  {v.action}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
