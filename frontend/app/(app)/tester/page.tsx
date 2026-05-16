"use client";

import { useState } from "react";
import { FlaskConical, ChevronDown, ChevronRight, Loader2, CheckCircle2, XCircle, Shield } from "lucide-react";
import { api } from "@/lib/api";
import type { TestRunResult, TestResult } from "@/lib/types";

const AGENTS = [
  { value: "customer_service", label: "Customer Service Agent" },
  { value: "data_analyst", label: "Data Analyst Agent" },
  { value: "email_assistant", label: "Email Assistant Agent" },
];

const CATEGORIES = [
  { value: "all", label: "All Categories" },
  { value: "prompt_injection", label: "Prompt Injection" },
  { value: "pii_detection", label: "PII Detection" },
  { value: "dangerous_commands", label: "Dangerous Commands" },
  { value: "safe_prompts", label: "Safe Prompts" },
];

const categoryColor: Record<string, string> = {
  injection: "bg-red-500/20 text-red-400 border-red-500/30",
  prompt_injection: "bg-red-500/20 text-red-400 border-red-500/30",
  pii: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  pii_detection: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  command: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  dangerous_commands: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  safe: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  safe_prompts: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
};

function getCategoryStyle(category: string) {
  const key = category.toLowerCase().replace(/\s+/g, "_");
  return categoryColor[key] || "bg-slate-500/20 text-slate-400 border-slate-500/30";
}

function scoreColor(score: number) {
  if (score >= 80) return "text-emerald-400";
  if (score >= 50) return "text-amber-400";
  return "text-red-400";
}

function scoreRing(score: number) {
  if (score >= 80) return "stroke-emerald-500";
  if (score >= 50) return "stroke-amber-500";
  return "stroke-red-500";
}

function scoreGlow(score: number) {
  if (score >= 80) return "drop-shadow-[0_0_24px_rgba(16,185,129,0.45)]";
  if (score >= 50) return "drop-shadow-[0_0_24px_rgba(245,158,11,0.45)]";
  return "drop-shadow-[0_0_24px_rgba(239,68,68,0.45)]";
}

function ScoreCircle({ score }: { score: number }) {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;

  return (
    <div className={`relative inline-flex items-center justify-center ${scoreGlow(score)}`}>
      <svg width="140" height="140" className="-rotate-90">
        <circle cx="70" cy="70" r={r} fill="none" stroke="currentColor" strokeWidth="8" className="text-slate-800" />
        <circle
          cx="70"
          cy="70"
          r={r}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          className={`${scoreRing(score)} transition-all duration-1000 ease-out`}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={`text-3xl font-bold ${scoreColor(score)}`}>{Math.round(score)}%</span>
        <span className="text-[10px] uppercase tracking-widest text-slate-500">Score</span>
      </div>
    </div>
  );
}

function ResultRow({ result }: { result: TestResult }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-slate-800/60 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-800/40 transition-colors"
      >
        <span className="text-slate-500">
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </span>
        <span className="flex-1 text-sm font-medium text-slate-200 truncate">{result.label}</span>
        <span className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${getCategoryStyle(result.category)}`}>
          {result.category}
        </span>
        <span className="text-xs text-slate-500 w-20 text-center">{result.expected}</span>
        <span className="text-xs text-slate-500 w-20 text-center">{result.actual}</span>
        {result.passed ? (
          <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
        ) : (
          <XCircle size={18} className="text-red-400 shrink-0" />
        )}
      </button>

      {open && (
        <div className="px-4 pb-4 pl-12 space-y-3 animate-in slide-in-from-top-1 duration-200">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-slate-600 mb-1">Prompt</p>
            <pre className="text-xs text-slate-400 bg-slate-900/60 rounded-lg p-3 whitespace-pre-wrap border border-slate-800">{result.prompt}</pre>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-slate-600 mb-1">Response Preview</p>
            <pre className="text-xs text-slate-400 bg-slate-900/60 rounded-lg p-3 whitespace-pre-wrap border border-slate-800">{result.response_preview || "—"}</pre>
          </div>
          {result.violations.length > 0 && (
            <div>
              <p className="text-[11px] uppercase tracking-wider text-slate-600 mb-1">Violations ({result.violations.length})</p>
              <div className="space-y-1.5">
                {result.violations.map((v, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs bg-red-500/5 border border-red-500/20 rounded-lg p-2">
                    <Shield size={14} className="text-red-400 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-semibold text-red-400">{v.policy_name}</span>
                      <span className="text-slate-500"> · {v.category} · {v.action}</span>
                      <p className="text-slate-400 mt-0.5">{v.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function TesterPage() {
  const [agent, setAgent] = useState("customer_service");
  const [selectedCats, setSelectedCats] = useState<string[]>(["all"]);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<TestRunResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggleCategory = (val: string) => {
    if (val === "all") {
      setSelectedCats(["all"]);
      return;
    }
    let next = selectedCats.filter((c) => c !== "all");
    if (next.includes(val)) {
      next = next.filter((c) => c !== val);
    } else {
      next.push(val);
    }
    if (next.length === 0) next = ["all"];
    setSelectedCats(next);
  };

  const runSuite = async () => {
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const data = await api.runTests(agent, selectedCats);
      setResult(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Test run failed");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="min-h-screen p-6 space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/20">
            <FlaskConical size={28} className="text-red-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Agent Tester</h1>
            <p className="text-sm text-slate-500">Red-team your agents with adversarial test suites</p>
          </div>
        </div>
        <span className="px-3 py-1 text-xs font-bold uppercase tracking-widest rounded-full bg-red-500/15 text-red-400 border border-red-500/30 animate-pulse">
          Red Team Mode
        </span>
      </div>

      {/* Config Panel */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 backdrop-blur-sm p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Agent selector */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 mb-2">Target Agent</label>
            <select
              value={agent}
              onChange={(e) => setAgent(e.target.value)}
              className="w-full rounded-xl bg-slate-800 border border-slate-700 text-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/40 transition"
            >
              {AGENTS.map((a) => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </select>
          </div>

          {/* Categories */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 mb-2">Test Categories</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => {
                const active = selectedCats.includes(cat.value);
                return (
                  <button
                    key={cat.value}
                    onClick={() => toggleCategory(cat.value)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                      active
                        ? "bg-red-500/20 border-red-500/40 text-red-300"
                        : "bg-slate-800 border-slate-700 text-slate-500 hover:border-slate-600"
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <button
          onClick={runSuite}
          disabled={running}
          className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-all bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30"
        >
          {running ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 size={16} className="animate-spin" />
              Running tests…
            </span>
          ) : (
            "Run Test Suite"
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-6 animate-in fade-in duration-500">
          {/* Overview */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 backdrop-blur-sm p-6">
            <div className="flex items-center gap-8 flex-wrap">
              <ScoreCircle score={result.score} />

              <div className="flex gap-8">
                <div className="text-center">
                  <p className="text-3xl font-bold text-emerald-400">{result.passed}</p>
                  <p className="text-[11px] uppercase tracking-wider text-slate-500">Passed</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-red-400">{result.failed}</p>
                  <p className="text-[11px] uppercase tracking-wider text-slate-500">Failed</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-slate-300">{result.total_tests}</p>
                  <p className="text-[11px] uppercase tracking-wider text-slate-500">Total</p>
                </div>
              </div>
            </div>
          </div>

          {/* Results Table */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 backdrop-blur-sm overflow-hidden">
            {/* Table header */}
            <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-800/50 text-[11px] uppercase tracking-wider text-slate-500 font-medium border-b border-slate-800">
              <span className="w-4" />
              <span className="flex-1">Test</span>
              <span className="w-24 text-center">Category</span>
              <span className="w-20 text-center">Expected</span>
              <span className="w-20 text-center">Actual</span>
              <span className="w-5" />
            </div>

            {result.results.map((r, i) => (
              <ResultRow key={i} result={r} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
