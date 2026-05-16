"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import type { SecurityEvent } from "@/lib/types";

const SEVERITIES = ["all", "critical", "warning", "info"] as const;
type SeverityFilter = (typeof SEVERITIES)[number];

const SEVERITY_STYLES: Record<string, { badge: string; dot: string }> = {
  critical: {
    badge: "bg-red-900/60 text-red-300 border border-red-700",
    dot: "bg-red-500",
  },
  warning: {
    badge: "bg-amber-900/60 text-amber-300 border border-amber-700",
    dot: "bg-amber-500",
  },
  info: {
    badge: "bg-blue-900/60 text-blue-300 border border-blue-700",
    dot: "bg-blue-500",
  },
};

function relativeTime(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function SecurityEventsPage() {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [filter, setFilter] = useState<SeverityFilter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchEvents = useCallback(async () => {
    try {
      const severity = filter === "all" ? undefined : filter;
      const data = await api.getSecurityEvents(severity);
      setEvents(data);
    } catch {
      // silently fail, keep stale data
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    setLoading(true);
    fetchEvents();
    const interval = setInterval(fetchEvents, 10000);
    return () => clearInterval(interval);
  }, [fetchEvents]);

  const criticalCount = events.filter((e) => e.severity === "critical").length;
  const warningCount = events.filter((e) => e.severity === "warning").length;

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <svg
            className="w-7 h-7 text-blue-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
          Security Events
        </h1>
        <p className="text-gray-400 mt-1">
          Real-time threat detection and policy enforcement
        </p>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Events", value: events.length, color: "text-gray-100" },
          { label: "Critical", value: criticalCount, color: "text-red-400" },
          { label: "Warning", value: warningCount, color: "text-amber-400" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-gray-800 border border-gray-700 rounded-lg p-4"
          >
            <p className="text-sm text-gray-400">{stat.label}</p>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="flex gap-2">
        {SEVERITIES.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${
              filter === s
                ? "bg-blue-600 text-white"
                : "bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Events List */}
      {loading ? (
        <div className="text-center text-gray-500 py-16">Loading...</div>
      ) : events.length === 0 ? (
        <div className="text-center py-20 space-y-3">
          <svg
            className="w-12 h-12 mx-auto text-gray-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
          <p className="text-gray-500 text-lg">No security events yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => {
            const style = SEVERITY_STYLES[event.severity] ?? SEVERITY_STYLES.info;
            const isExpanded = expandedId === event.id;

            return (
              <div
                key={event.id}
                className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden"
              >
                <button
                  onClick={() => setExpandedId(isExpanded ? null : event.id)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-750 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${style.badge}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                      {event.severity}
                    </span>
                    <span className="text-sm text-gray-400 shrink-0">
                      {event.event_type}
                    </span>
                    <span className="font-medium truncate">{event.title}</span>
                  </div>
                  <div className="flex items-center gap-4 shrink-0 ml-4">
                    {(event.details as any)?.agent_name && (
                      <span className="text-sm text-gray-400">
                        {(event.details as any).agent_name}
                      </span>
                    )}
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {relativeTime(event.detected_at)}
                    </span>
                    <svg
                      className={`w-4 h-4 text-gray-500 transition-transform ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-gray-700 p-4">
                    <pre className="text-sm text-gray-300 bg-gray-900 rounded p-3 overflow-auto max-h-64">
                      {JSON.stringify(event.details, null, 2)}
                    </pre>
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
