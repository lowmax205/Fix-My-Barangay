"use client";

import React, { useEffect, useState } from "react";
import { reportsApi } from "@/services/api";
import { ReportStatus } from "@/types";
import { CardContent } from "@/components/ui/card";
import { Loader2, Clock, CheckCircle2, AlertCircle, FileText, ListChecks } from "lucide-react";
import Link from "next/link";

interface ActivityItem {
  id: string;
  status: ReportStatus;
  category: string;
  description: string;
  created_at: string;
  updated_at: string;
}

// Map statuses to styling and icon
const statusMeta: Record<ReportStatus, { label: string; color: string; icon: React.ElementType; description: string; }> = {
  Submitted: {
    label: "Submitted",
    color: "bg-blue-100 text-blue-700 border-blue-200",
    icon: FileText,
    description: "Report was submitted",
  },
  "In Review": {
    label: "In Review",
    color: "bg-yellow-100 text-yellow-700 border-yellow-200",
    icon: Clock,
    description: "Report is being reviewed",
  },
  "In Progress": {
    label: "In Progress",
    color: "bg-indigo-100 text-indigo-700 border-indigo-200",
    icon: ListChecks,
    description: "Work has started",
  },
  Resolved: {
    label: "Resolved",
    color: "bg-green-100 text-green-700 border-green-200",
    icon: CheckCircle2,
    description: "Issue was resolved",
  },
  Closed: {
    label: "Closed",
    color: "bg-gray-200 text-gray-700 border-gray-300",
    icon: AlertCircle,
    description: "Report was closed",
  },
};

function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return "Yesterday";
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

export const RecentActivity: React.FC = () => {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        // Reuse reports endpoint; get latest 10 reports
        const data = await reportsApi.getReports({ limit: 10, offset: 0 });
        if (cancelled) return;
        // Each report entry itself is an activity item representing current status; we can also show creation separately if status changed
        const mapped: ActivityItem[] = data.reports.map(r => ({
          id: r.id,
          status: r.status,
          category: r.category,
          description: r.description,
          created_at: r.created_at,
          updated_at: r.updated_at,
        }));
        setItems(mapped);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load activity');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    // Auto refresh every 60s
    const interval = setInterval(load, 60000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  if (loading) {
    return (
      <CardContent>
        <div className="flex items-center justify-center py-12 text-gray-500">
          <Loader2 className="h-6 w-6 mr-2 animate-spin" /> Loading activity...
        </div>
      </CardContent>
    );
  }

  if (error) {
    return (
      <CardContent>
        <div className="text-center py-8">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      </CardContent>
    );
  }

  if (!items.length) {
    return (
      <CardContent>
        <div className="text-center py-8 text-gray-500">
          <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No recent activity</p>
          <p className="text-sm">Reports will appear here as they are submitted</p>
        </div>
      </CardContent>
    );
  }

  return (
    <CardContent>
      <ul className="space-y-4">
        {items.map((item) => {
          const meta = statusMeta[item.status];
          const Icon = meta.icon;
          return (
            <li key={item.id} className="flex gap-4">
              <div className={`h-10 w-10 flex items-center justify-center rounded-lg border text-sm font-medium shrink-0 ${meta.color}`}> 
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-gray-900 truncate">
                    {meta.label} · {item.category}
                  </p>
                  <span className="text-xs text-gray-500 ml-2 whitespace-nowrap">{formatRelativeTime(item.updated_at || item.created_at)}</span>
                </div>
                <p className="text-sm text-gray-600 line-clamp-2">{item.description}</p>
                <div className="mt-1">
                  <Link href={`/reports/${item.id}`} className="text-xs text-blue-600 hover:underline">View report</Link>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </CardContent>
  );
};

export default RecentActivity;
