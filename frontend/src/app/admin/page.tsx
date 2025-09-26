'use client';

import React from 'react';
import { useUser, SignedIn, SignedOut } from '@clerk/nextjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  FileText, 
  BarChart3, 
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';
import MetricsGrid, { MetricsData } from '@/components/MetricsGrid';
import { reportsApi } from '@/services/api';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import RecentActivity from '@/components/RecentActivity';

const isClerkConfigured = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

function AdminDashboard() {
  const { user, isLoaded } = useUser();
  const [metrics, setMetrics] = useState<MetricsData>({
    total: '…',
    submitted: '…',
    inProgress: '…',
    resolved: '…',
  });
  const [loadingMetrics, setLoadingMetrics] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoadingMetrics(true);
        // Fetch a large batch; backend should paginate, but we assume cap is safe
        const response = await reportsApi.getReports({ limit: 500, offset: 0 });
        const all = response.reports;
        const computed: MetricsData = {
          total: response.total ?? all.length,
          submitted: all.filter(r => r.status === 'Submitted').length,
          inProgress: all.filter(r => r.status === 'In Progress' || r.status === 'In Review').length,
          resolved: all.filter(r => r.status === 'Resolved').length,
        };
        setMetrics(computed);
      } catch (e) {
        // Fallback values
        setMetrics({ total: '0', submitted: '0', inProgress: '0', resolved: '0' });
      } finally {
        setLoadingMetrics(false);
      }
    };
    load();
  }, []);

  if (!isLoaded) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back{user?.firstName ? `, ${user.firstName}` : ''}!
          </h1>
          <p className="text-gray-600 mt-1">
            Manage civic reports and monitor community engagement
          </p>
        </div>
      </div>

      {/* Quick Stats (shared) */}
  <MetricsGrid data={metrics} loading={loadingMetrics} />

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Manage Reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              View, review, and update the status of community reports
            </p>
            <Button asChild className="w-full">
              <Link href="/admin/reports">View All Reports</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Analytics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Monitor trends and generate insights from report data
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link href="/admin/analytics">View Analytics</Link>
            </Button>
          </CardContent>
        </Card>

      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <RecentActivity />
      </Card>
    </div>
  );
}

export default function AdminPage() {
  if (!isClerkConfigured) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Authentication is not configured. The admin dashboard requires Clerk authentication to be set up.
          </AlertDescription>
        </Alert>
        <AdminDashboard />
      </div>
    );
  }

  return (
    <>
      <SignedIn>
        <AdminDashboard />
      </SignedIn>
      <SignedOut>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-6">Please sign in to access the admin dashboard.</p>
          <Button asChild>
            <Link href="/admin/sign-in">Sign In</Link>
          </Button>
        </div>
      </SignedOut>
    </>
  );
}