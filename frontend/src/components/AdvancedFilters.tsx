
import React, { useState, useEffect } from 'react';
import { Category, ReportCategory, ReportStatus, ReportFilters } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { categoriesApi } from '@/services/api';

interface AdvancedFiltersProps {
  value: ReportFilters;
  onChange: (filters: ReportFilters) => void;
}

export default function AdvancedFilters({ value, onChange }: AdvancedFiltersProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [localFilters, setLocalFilters] = useState<ReportFilters>(value);

  useEffect(() => {
    setLocalFilters(value);
  }, [value]);

  useEffect(() => {
    categoriesApi.getCategories().then(res => setCategories(res.categories));
  }, []);

  const handleChange = <K extends keyof ReportFilters>(key: K, val: ReportFilters[K]) => {
    const updated = { ...localFilters, [key]: val };
    setLocalFilters(updated);
    onChange(updated);
  };

  const handleClear = () => {
    const reset: ReportFilters = { limit: value.limit || 10, offset: 0 };
    setLocalFilters(reset);
    onChange(reset);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Category */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Category</label>
        <Select value={localFilters.category || 'all'} onValueChange={v => handleChange('category', v === 'all' ? undefined : v as ReportCategory)}>
          <SelectTrigger><SelectValue placeholder="All categories" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(cat => (
              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {/* Status */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Status</label>
        <Select value={localFilters.status || 'all'} onValueChange={v => handleChange('status', v === 'all' ? undefined : v as ReportStatus)}>
          <SelectTrigger><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="Submitted">Submitted</SelectItem>
            <SelectItem value="In Review">In Review</SelectItem>
            <SelectItem value="In Progress">In Progress</SelectItem>
            <SelectItem value="Resolved">Resolved</SelectItem>
            <SelectItem value="Closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {/* Items per page */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Per Page</label>
        <Select value={localFilters.limit?.toString() || '10'} onValueChange={v => handleChange('limit', parseInt(v))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="5">5 items</SelectItem>
            <SelectItem value="10">10 items</SelectItem>
            <SelectItem value="20">20 items</SelectItem>
            <SelectItem value="50">50 items</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {/* Clear Filters */}
      <div className="space-y-2">
        <label className="text-sm font-medium">&nbsp;</label>
        <Button variant="outline" className="w-full" onClick={handleClear}>Clear Filters</Button>
      </div>
    </div>
  );
}
