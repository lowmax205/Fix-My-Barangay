"use client";

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, Clock, Users, CheckCircle } from 'lucide-react';

export interface MetricsData {
  total: number | string;
  submitted: number | string; // new reports
  inProgress: number | string;
  resolved: number | string;
}

interface MetricsGridProps {
  data: MetricsData;
  loading?: boolean;
  className?: string;
}

// Shared metric card style consistent with home page compact refactor
export default function MetricsGrid({ data, loading = false, className = '' }: MetricsGridProps) {
  const items = [
    { label: 'Total', value: data.total, icon: AlertTriangle, color: 'text-blue-600' },
    { label: 'New', value: data.submitted, icon: Clock, color: 'text-yellow-600' },
    { label: 'In Prog', value: data.inProgress, icon: Users, color: 'text-orange-600' },
    { label: 'Resolved', value: data.resolved, icon: CheckCircle, color: 'text-green-600' },
  ];

  return (
    <div className={`grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 ${className}`}>
      {items.map(({ label, value, icon: Icon, color }) => (
        <Card key={label}>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="space-y-0.5">
                <p className="text-[11px] sm:text-xs font-medium text-gray-600 uppercase tracking-wide">{label}</p>
                <p className={`text-xl sm:text-2xl font-bold leading-tight ${color.replace('text-', 'text-')}`}>{loading ? '…' : value}</p>
              </div>
              <Icon className={`h-6 w-6 sm:h-8 sm:w-8 ${color}`} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
