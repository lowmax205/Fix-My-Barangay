"use client";
import React, { useEffect, useState } from 'react';
import { Report, ReportStatus } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type AdminReport = Report;

const STATUS_OPTIONS: ReportStatus[] = [
  'Submitted', 'In Review', 'In Progress', 'Resolved', 'Closed'
];

export default function AdminReportsPage() {
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchReports = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/reports`);
      if (!res.ok) throw new Error('Failed to fetch reports');
      const data = await res.json();
      setReports(data.data.reports || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReports(); }, []);

  const updateStatus = async (id: string, status: ReportStatus): Promise<void> => {
    try {
      setUpdating(id);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/reports/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error('Failed to update status');
      await fetchReports();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Reports</h1>
        <Button variant="outline" onClick={fetchReports} disabled={loading}>Refresh</Button>
      </div>
      {error && <div className="text-sm text-red-600">{error}</div>}
      {loading && <div className="text-sm text-muted-foreground">Loading reports...</div>}
      <div className="grid gap-4 md:grid-cols-2">
        {reports.map(r => (
          <Card key={r.id}>
            <CardHeader>
              <CardTitle className="text-base flex justify-between items-center">
                <span>{r.category}</span>
                <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>{r.description}</p>
              <p className="text-xs text-muted-foreground">{r.location.latitude.toFixed(5)}, {r.location.longitude.toFixed(5)}</p>
              <div className="flex items-center gap-2">
                <Select value={r.status} onValueChange={(val) => updateStatus(r.id, val as ReportStatus)}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" variant="secondary" disabled={updating === r.id} onClick={() => updateStatus(r.id, r.status)}>
                  {updating === r.id ? 'Updating...' : 'Apply'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {reports.length === 0 && !loading && (
        <div className="text-sm text-muted-foreground">No reports found.</div>
      )}
    </div>
  );
}
