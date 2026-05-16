"use client";

import { useEffect, useState, useRef } from "react";
import {
  Shield,
  Activity,
  MessageSquare,
  ShieldAlert,
  DollarSign,
  AlertTriangle,
  Radio,
  Clock,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { api, createSSEStream } from "@/lib/api";
import type { DashboardMetrics, SecurityEvent } from "@/lib/types";

interface ActivityItem {
  id: string;
  timestamp: string;
  message: string;
  type: "info" | "warning" | "critical";
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const eventSourceRef = useRef<(() => void) | null>(null);

  // Fetch metrics
  const fetchMetrics = async () => {
    try {
      const data = await api.getDashboardMetrics();
      setMetrics(data);
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch metrics:", err);
      setLoading(false);
    }
  };

  // Fetch recent security events
  const fetchEvents = async () => {
    try {
      const data = await api.getSecurityEvents(undefined, 10);
      setEvents(data);
    } catch (err) {
      console.error("Failed to fetch events:", err);
    }
  };

  useEffect(() => {
    fetchMetrics();
    fetchEvents();

    const interval = setInterval(() => {
      fetchMetrics();
      fetchEvents();
    }, 5000);

    // SSE stream for real-time activity
    try {
      const cleanup = createSSEStream((event: any) => {
        if (event.type === "agent_activity") {
          const d = event.data;
          setActivity((prev) => [{
            id: d.session_id + Date.now(),
            timestamp: d.timestamp,
            message: `${d.agent_name}: "${d.prompt_preview}"${d.blocked ? " [BLOCKED]" : ""}`,
            type: (d.blocked ? "critical" : d.violations > 0 ? "warning" : "info") as "critical" | "warning" | "info",
          }, ...prev].slice(0, 50));
        } else if (event.type === "security_event") {
          fetchEvents();
        }
      });
      eventSourceRef.current = cleanup;
    } catch (err) {
      console.error("SSE connection failed:", err);
    }

    return () => {
      clearInterval(interval);
      if (eventSourceRef.current) {
        eventSourceRef.current();
      }
    };
  }, []);

  const metricCards = [
    {
      label: "Total Sessions",
      value: metrics?.total_sessions ?? 0,
      icon: Shield,
      color: "blue",
      gradient: "from-blue-500/20 to-blue-600/5",
      border: "border-blue-500/30",
      text: "text-blue-400",
    },
    {
      label: "Active Sessions",
      value: metrics?.active_sessions ?? 0,
      icon: Activity,
      color: "emerald",
      gradient: "from-emerald-500/20 to-emerald-600/5",
      border: "border-emerald-500/30",
      text: "text-emerald-400",
    },
    {
      label: "Total Interactions",
      value: metrics?.total_interactions ?? 0,
      icon: MessageSquare,
      color: "purple",
      gradient: "from-purple-500/20 to-purple-600/5",
      border: "border-purple-500/30",
      text: "text-purple-400",
    },
    {
      label: "Blocked Attacks",
      value: metrics?.blocked_attacks ?? 0,
      icon: ShieldAlert,
      color: "red",
      gradient: "from-red-500/20 to-red-600/5",
      border: "border-red-500/30",
      text: "text-red-400",
    },
    {
      label: "Total Cost ($)",
      value: metrics?.total_cost?.toFixed(2) ?? "0.00",
      icon: DollarSign,
      color: "amber",
      gradient: "from-amber-500/20 to-amber-600/5",
      border: "border-amber-500/30",
      text: "text-amber-400",
    },
    {
      label: "Violation Rate (%)",
      value: metrics?.violation_rate?.toFixed(1) ?? "0.0",
      icon: AlertTriangle,
      color: "rose",
      gradient: "from-rose-500/20 to-rose-600/5",
      border: "border-rose-500/30",
      text: "text-rose-400",
    },
  ];

  const violationChartData = metrics?.recent_events
    ? Object.entries(
        metrics.recent_events.reduce((acc: Record<string, number>, e) => {
          acc[e.event_type] = (acc[e.event_type] || 0) + 1;
          return acc;
        }, {})
      ).map(([name, count]) => ({ name, count }))
    : [];

  const chartColors = [
    "#ef4444",
    "#f59e0b",
    "#8b5cf6",
    "#06b6d4",
    "#10b981",
    "#ec4899",
  ];

  const getEventSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "text-red-400 bg-red-500/10 border-red-500/30";
      case "high":
        return "text-amber-400 bg-amber-500/10 border-amber-500/30";
      case "medium":
        return "text-yellow-400 bg-yellow-500/10 border-yellow-500/30";
      default:
        return "text-gray-400 bg-gray-500/10 border-gray-500/30";
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case "critical":
        return "text-red-400";
      case "warning":
        return "text-amber-400";
      default:
        return "text-cyan-400";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Shield className="w-7 h-7 text-emerald-400" />
            AgentGuard Dashboard
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Real-time AI agent security monitoring
          </p>
        </div>
        <div className="flex items-center gap-2 text-emerald-400 text-sm">
          <Radio className="w-4 h-4 animate-pulse" />
          <span>Live</span>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {metricCards.map((card) => (
          <div
            key={card.label}
            className={`bg-gray-800 rounded-xl border border-gray-700 ${card.border} p-4 bg-gradient-to-br ${card.gradient} transition-all hover:scale-[1.02]`}
          >
            <div className="flex items-center justify-between mb-2">
              <card.icon className={`w-5 h-5 ${card.text}`} />
            </div>
            <p className="text-2xl font-bold text-white">{card.value}</p>
            <p className="text-xs text-gray-400 mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Feed - Left */}
        <div className="lg:col-span-1 bg-gray-800 rounded-xl border border-gray-700 p-5">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-cyan-400" />
            Real-Time Activity
          </h2>
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-700">
            {activity.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">
                Waiting for activity...
              </p>
            ) : (
              activity.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 p-2 rounded-lg bg-gray-900/50 border border-gray-700/50"
                >
                  <div
                    className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                      item.type === "critical"
                        ? "bg-red-400"
                        : item.type === "warning"
                        ? "bg-amber-400"
                        : "bg-cyan-400"
                    }`}
                  />
                  <div className="min-w-0">
                    <p
                      className={`text-sm ${getActivityColor(item.type)} truncate`}
                    >
                      {item.message}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Side */}
        <div className="lg:col-span-2 space-y-6">
          {/* Violations Chart */}
          {violationChartData.length > 0 && (
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
              <h2 className="text-lg font-semibold text-white mb-4">
                Violations by Type
              </h2>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={violationChartData}>
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "#9ca3af", fontSize: 12 }}
                    axisLine={{ stroke: "#374151" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#9ca3af", fontSize: 12 }}
                    axisLine={{ stroke: "#374151" }}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1f2937",
                      border: "1px solid #374151",
                      borderRadius: "8px",
                      color: "#fff",
                    }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {violationChartData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={chartColors[index % chartColors.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Security Events */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
              <ShieldAlert className="w-5 h-5 text-red-400" />
              Recent Security Events
            </h2>
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
              {events.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-8">
                  No security events detected
                </p>
              ) : (
                events.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-gray-900/50 border border-gray-700/50"
                  >
                    <div
                      className={`px-2 py-0.5 rounded text-xs font-medium border ${getEventSeverityColor(
                        event.severity
                      )}`}
                    >
                      {event.severity}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-white font-medium">
                        {event.title}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">
                        {event.event_type}
                      </p>
                      <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        {new Date(event.detected_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
