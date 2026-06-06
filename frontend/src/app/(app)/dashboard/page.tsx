"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

type DashboardStats = {
  workspaces_count: number;
  sessions_count: number;
  runs_today: number;
  runs_total: number;
  recent_activity: Array<{
    type: string;
    status: string;
    workspace_name: string;
    runner_type: string;
    prompt_preview: string;
    created_at: string;
  }>;
};

type ServiceHealth = {
  service: string;
  status: string;
  latency_ms: number | null;
};

type SystemHealth = {
  services: ServiceHealth[];
};

function MetricCard({ 
  title, 
  value, 
  subtitle, 
  icon,
  loading 
}: { 
  title: string; 
  value: number | string; 
  subtitle?: string;
  icon: string;
  loading?: boolean;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-zinc-900">
            {loading ? (
              <span className="inline-block w-12 h-8 bg-zinc-200 animate-pulse rounded" />
            ) : (
              value
            )}
          </p>
          {subtitle && (
            <p className="mt-1 text-xs text-zinc-500">{subtitle}</p>
          )}
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors = {
    healthy: "bg-green-100 text-green-700",
    unhealthy: "bg-red-100 text-red-700",
    unreachable: "bg-zinc-100 text-zinc-600",
    completed: "bg-green-100 text-green-700",
    running: "bg-blue-100 text-blue-700",
    error: "bg-red-100 text-red-700",
  };
  const color = colors[status as keyof typeof colors] || "bg-zinc-100 text-zinc-600";
  
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${color}`}>
      {status}
    </span>
  );
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, healthRes] = await Promise.all([
        fetch("/api/stats/dashboard"),
        fetch("/api/health/services")
      ]);
      
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
      
      if (healthRes.ok) {
        const healthData = await healthRes.json();
        setHealth(healthData);
      }
    } catch (e) {
      console.error("Failed to fetch dashboard data:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Welcome back! Here&apos;s your workspace overview.
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Workspaces"
          value={stats?.workspaces_count ?? 0}
          icon="📦"
          loading={loading}
        />
        <MetricCard
          title="Sessions"
          value={stats?.sessions_count ?? 0}
          icon="💬"
          loading={loading}
        />
        <MetricCard
          title="Runs Today"
          value={stats?.runs_today ?? 0}
          icon="⚡"
          loading={loading}
        />
        <MetricCard
          title="Total Runs"
          value={stats?.runs_total ?? 0}
          icon="📊"
          loading={loading}
        />
      </div>

      {/* Two Column Layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <div className="rounded-lg border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-200 px-5 py-4">
            <h2 className="text-sm font-semibold text-zinc-900">Recent Activity</h2>
          </div>
          <div className="divide-y divide-zinc-100">
            {loading ? (
              <div className="p-5 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-zinc-200 rounded-full animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-zinc-200 rounded animate-pulse w-3/4" />
                      <div className="h-3 bg-zinc-200 rounded animate-pulse w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : stats?.recent_activity && stats.recent_activity.length > 0 ? (
              stats.recent_activity.slice(0, 5).map((activity, idx) => (
                <div key={idx} className="px-5 py-3 hover:bg-zinc-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 w-2 h-2 rounded-full ${
                        activity.status === "completed" ? "bg-green-500" :
                        activity.status === "running" ? "bg-blue-500" :
                        "bg-red-500"
                      }`} />
                      <div>
                        <p className="text-sm font-medium text-zinc-900">
                          Run {activity.status} - {activity.workspace_name}
                        </p>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          {activity.runner_type} • {activity.prompt_preview}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-zinc-400">
                      {formatRelativeTime(activity.created_at)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-5 text-center text-sm text-zinc-500">
                No recent activity. Start by running a prompt in Agents or Chat.
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-6">
          <div className="rounded-lg border border-zinc-200 bg-white shadow-sm">
            <div className="border-b border-zinc-200 px-5 py-4">
              <h2 className="text-sm font-semibold text-zinc-900">Quick Actions</h2>
            </div>
            <div className="p-5 grid grid-cols-2 gap-3">
              <Link
                href="/codex"
                className="flex items-center gap-3 rounded-lg border border-zinc-200 p-4 hover:bg-zinc-50 hover:border-zinc-300 transition-colors"
              >
                <span className="text-xl">📁</span>
                <div>
                  <p className="text-sm font-medium text-zinc-900">Import Project</p>
                  <p className="text-xs text-zinc-500">Add a new workspace</p>
                </div>
              </Link>
              <Link
                href="/chat"
                className="flex items-center gap-3 rounded-lg border border-zinc-200 p-4 hover:bg-zinc-50 hover:border-zinc-300 transition-colors"
              >
                <span className="text-xl">💬</span>
                <div>
                  <p className="text-sm font-medium text-zinc-900">Start Chat</p>
                  <p className="text-xs text-zinc-500">Open chat interface</p>
                </div>
              </Link>
              <Link
                href="/codex"
                className="flex items-center gap-3 rounded-lg border border-zinc-200 p-4 hover:bg-zinc-50 hover:border-zinc-300 transition-colors"
              >
                <span className="text-xl">⚡</span>
                <div>
                  <p className="text-sm font-medium text-zinc-900">Run Agent</p>
                  <p className="text-xs text-zinc-500">Execute AI prompts</p>
                </div>
              </Link>
              <Link
                href="/projects"
                className="flex items-center gap-3 rounded-lg border border-zinc-200 p-4 hover:bg-zinc-50 hover:border-zinc-300 transition-colors"
              >
                <span className="text-xl">📦</span>
                <div>
                  <p className="text-sm font-medium text-zinc-900">View Projects</p>
                  <p className="text-xs text-zinc-500">Manage workspaces</p>
                </div>
              </Link>
            </div>
          </div>

          {/* System Status */}
          <div className="rounded-lg border border-zinc-200 bg-white shadow-sm">
            <div className="border-b border-zinc-200 px-5 py-4">
              <h2 className="text-sm font-semibold text-zinc-900">System Status</h2>
            </div>
            <div className="p-5">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="h-4 bg-zinc-200 rounded animate-pulse w-24" />
                      <div className="h-5 bg-zinc-200 rounded animate-pulse w-16" />
                    </div>
                  ))}
                </div>
              ) : health?.services ? (
                <div className="space-y-3">
                  {health.services.map((service) => (
                    <div key={service.service} className="flex items-center justify-between">
                      <span className="text-sm text-zinc-700 capitalize">
                        {service.service.replace(/_/g, " ")}
                      </span>
                      <div className="flex items-center gap-2">
                        {service.latency_ms !== null && (
                          <span className="text-xs text-zinc-400">{service.latency_ms}ms</span>
                        )}
                        <StatusBadge status={service.status} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-zinc-500">Unable to fetch system status</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
