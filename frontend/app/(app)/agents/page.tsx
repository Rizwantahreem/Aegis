"use client";

import { useState, useRef, useEffect } from "react";
import { Headphones, BarChart3, Mail, Send, Shield, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import type { AgentExecuteResponse } from "@/lib/types";

const agents = [
  {
    type: "customer_service",
    name: "Customer Service Agent",
    icon: Headphones,
    description: "Handles support tickets, order tracking, returns",
  },
  {
    type: "data_analyst",
    name: "Data Analyst Agent",
    icon: BarChart3,
    description: "Queries analytics data, generates reports",
  },
  {
    type: "email_assistant",
    name: "Email Assistant Agent",
    icon: Mail,
    description: "Drafts professional emails and responses",
  },
];

interface Message {
  role: "user" | "agent";
  content: string;
  response?: AgentExecuteResponse;
}

export default function AgentsPage() {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleStartSession = (agentType: string) => {
    setSelectedAgent(agentType);
    setSessionId(null);
    setMessages([]);
  };

  const handleSend = async () => {
    if (!prompt.trim() || !selectedAgent || loading) return;

    const userMessage: Message = { role: "user", content: prompt };
    setMessages((prev) => [...prev, userMessage]);
    setPrompt("");
    setLoading(true);

    try {
      const response = await api.executeAgent(selectedAgent, prompt, sessionId || undefined);
      if (!sessionId && response.session_id) {
        setSessionId(response.session_id);
      }
      const agentMessage: Message = {
        role: "agent",
        content: response.response || "No response",
        response,
      };
      setMessages((prev) => [...prev, agentMessage]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: "agent", content: `Error: ${err.message}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const selectedAgentInfo = agents.find((a) => a.type === selectedAgent);

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <h1 className="text-2xl font-bold text-white mb-6">Agent Console</h1>

      {/* Agent Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {agents.map((agent) => {
          const Icon = agent.icon;
          const isSelected = selectedAgent === agent.type;
          return (
            <div
              key={agent.type}
              className={`bg-gray-800 rounded-lg p-5 border ${
                isSelected ? "border-emerald-500" : "border-gray-700"
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <Icon className="w-6 h-6 text-emerald-400" />
                <h3 className="text-white font-semibold">{agent.name}</h3>
              </div>
              <p className="text-gray-400 text-sm mb-4">{agent.description}</p>
              <button
                onClick={() => handleStartSession(agent.type)}
                className="w-full py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-sm font-medium transition-colors"
              >
                Start Session
              </button>
            </div>
          );
        })}
      </div>

      {/* Chat Interface */}
      {selectedAgent && (
        <div className="bg-gray-800 rounded-lg border border-gray-700 flex flex-col h-[500px]">
          <div className="px-4 py-3 border-b border-gray-700 flex items-center gap-2">
            {selectedAgentInfo && <selectedAgentInfo.icon className="w-4 h-4 text-emerald-400" />}
            <span className="text-white text-sm font-medium">{selectedAgentInfo?.name}</span>
            <span className="text-gray-500 text-xs ml-auto">Session: {sessionId ? sessionId.slice(0, 8) : "Starting..."}</span>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] rounded-lg p-3 ${
                    msg.role === "user"
                      ? "bg-emerald-700 text-white"
                      : msg.response?.blocked
                      ? "bg-gray-900 border-2 border-red-500 text-white"
                      : "bg-gray-900 border border-emerald-600 text-white"
                  }`}
                >
                  {msg.role === "agent" && msg.response?.blocked && (
                    <div className="flex items-center gap-1 text-red-400 text-xs font-semibold mb-2">
                      <Shield className="w-3 h-3" /> BLOCKED
                    </div>
                  )}
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>

                  {/* Violations */}
                  {msg.response?.violations && msg.response.violations.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {msg.response.violations.map((v, vi) => (
                        <span
                          key={vi}
                          className="text-xs bg-red-900/50 text-red-300 px-2 py-0.5 rounded-full"
                        >
                          {v.policy_name || v.category}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Token/cost info */}
                  {msg.response && (
                    <div className="flex gap-3 mt-2 text-xs text-gray-500">
                      {msg.response.tokens_used != null && (
                        <span>{msg.response.tokens_used} tokens</span>
                      )}
                      {msg.response.cost_usd != null && (
                        <span>${msg.response.cost_usd.toFixed(4)}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-900 border border-gray-700 rounded-lg p-3">
                  <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-700 flex gap-2">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Type your message..."
              className="flex-1 bg-gray-800 border border-gray-700 rounded-md px-4 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-emerald-500"
            />
            <button
              onClick={handleSend}
              disabled={loading || !prompt.trim()}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-md transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
