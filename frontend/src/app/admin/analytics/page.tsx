"use client";
import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { reportsApi } from "@/services/api";
import { Category, Report, ReportsResponse } from "@/types";
import { categoriesApi } from "@/services/api";
import { Badge } from "@/components/ui/badge";

// Fetch all pages utility (clamps per backend, continues until no more results or safety cap)
async function fetchAllReports(): Promise<Report[]> {
  const pageSizeRequested = 500; // request large; backend may clamp
  let offset = 0;
  let collected: Report[] = [];
  for (let i = 0; i < 20; i++) { // safety cap 20 pages
    const res: ReportsResponse = await reportsApi.getReports({ limit: pageSizeRequested, offset });
    collected = collected.concat(res.reports);
    if (!res.hasMore) break;
    offset += res.limit; // use applied limit
  }
  return collected;
}

export default function AnalyticsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError("");
      try {
        const [catRes, allReports] = await Promise.all([
          categoriesApi.getCategories(),
          fetchAllReports(),
        ]);
        setCategories(catRes.categories);
        setReports(allReports);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load analytics data");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Compute stats
  const total = reports.length;
  const byCategory: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  reports.forEach(r => {
    byCategory[r.category] = (byCategory[r.category] || 0) + 1;
    byStatus[r.status] = (byStatus[r.status] || 0) + 1;
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Report Analytics</h1>
      {loading && <div>Loading analytics...</div>}
      {error && <div className="text-red-600">{error}</div>}
      {!loading && !error && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader><CardTitle>Total Reports</CardTitle></CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{total}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>By Category</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {categories.map(cat => (
                    <Badge key={cat.id} style={{ backgroundColor: cat.color, color: '#fff' }}>
                      {cat.name}: {byCategory[cat.id] || 0}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>By Status</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(byStatus).map(([status, count]) => (
                    <Badge key={status}>{status}: {count}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
