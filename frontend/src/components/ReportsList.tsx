'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import AdvancedFilters from './AdvancedFilters';
import { 
  MapPin, 
  Clock, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  Loader2,
  AlertTriangle,
  CheckCircle,
  Eye
} from 'lucide-react';
import Image from 'next/image';
import { reportsApi, categoriesApi } from '@/services/api';
import { Report, Category, ReportFilters, ReportStatus } from '@/types';
import { formatDistanceToNow } from 'date-fns';

interface ReportsListProps {
  onReportClick?: (report: Report) => void;
  initialFilters?: ReportFilters;
}

export default function ReportsList({ onReportClick, initialFilters = {} }: ReportsListProps) {
  // State management
  const [reports, setReports] = useState<Report[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [filters, setFilters] = useState<ReportFilters>({
    limit: 10,
    offset: 0,
    ...initialFilters
  });
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  // Track explicit append vs replace behavior
  const [appendMode, setAppendMode] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Load initial data
  useEffect(() => {
    loadCategories();
    loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload reports when filters change
  useEffect(() => {
    loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  // Normalize filters after external clear to ensure offset & limit present
  useEffect(() => {
    if (!filters.limit || filters.limit <= 0 || filters.offset == null || filters.offset < 0) {
      setFilters(prev => ({
        ...prev,
        limit: prev.limit && prev.limit > 0 ? prev.limit : 10,
        offset: prev.offset && prev.offset > 0 ? prev.offset : 0,
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.limit, filters.offset]);

  const loadCategories = async () => {
    try {
      const response = await categoriesApi.getCategories();
      setCategories(response.categories);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  const loadReports = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await reportsApi.getReports(filters);

      if (filters.offset === 0 || !appendMode) {
        setReports(response.reports); // replace
      } else {
        setReports(prev => [...prev, ...response.reports]); // append
      }

      setTotal(response.total);
      setHasMore(response.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reports');
    } finally {
      setLoading(false);
      setAppendMode(false); // reset after fetch
    }
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      setAppendMode(true);
      setFilters(prev => ({
        ...prev,
        offset: (prev.offset || 0) + (prev.limit || 10)
      }));
    }
  };

  const handlePrevPage = () => {
    if (filters.offset && filters.offset > 0) {
      setAppendMode(false);
      setFilters(prev => ({
        ...prev,
        offset: Math.max(0, (prev.offset || 0) - (prev.limit || 10))
      }));
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  const handleNextPage = () => {
    if (hasMore) {
      setAppendMode(false);
      setFilters(prev => ({
        ...prev,
        offset: (prev.offset || 0) + (prev.limit || 10)
      }));
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  const getStatusColor = (status: ReportStatus) => {
    const colors = {
      'Submitted': 'bg-blue-100 text-blue-800',
      'In Review': 'bg-yellow-100 text-yellow-800', 
      'In Progress': 'bg-orange-100 text-orange-800',
      'Resolved': 'bg-green-100 text-green-800',
      'Closed': 'bg-gray-100 text-gray-800'
    };
    return colors[status] || colors['Submitted'];
  };

  const getCategoryColor = (categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category?.color || '#8B5CF6';
  };

  const getStatusIcon = (status: ReportStatus) => {
    switch (status) {
      case 'Resolved':
        return <CheckCircle className="h-4 w-4" />;
      case 'In Progress':
      case 'In Review':
        return <Clock className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const currentPage = Math.floor((filters.offset || 0) / (filters.limit || 10)) + 1;
  const totalPages = Math.ceil(total / (filters.limit || 10));

  if (loading && reports.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading reports...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold leading-tight">Community Reports</h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            <span className="sm:inline hidden">{total} total reports • Page {currentPage} of {totalPages}</span>
            <span className="inline sm:hidden">{total} reports • Pg {currentPage}/{totalPages}</span>
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            <span className="hidden xs:inline">Filters</span>
          </Button>
          <Button onClick={loadReports} disabled={loading}>
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Advanced Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <AdvancedFilters value={filters} onChange={setFilters} />
          </CardContent>
        </Card>
      )}

      {/* Error Message */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Reports List */}
      {reports.length === 0 && !loading ? (
        <Card>
          <CardContent className="py-8 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No Reports Found</h3>
            <p className="text-muted-foreground">
              No reports match your current filters. Try adjusting your search criteria.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {reports.map((report) => {
            const createdAgo = formatDistanceToNow(new Date(report.created_at), { addSuffix: true });
            return (
              <Card
                key={report.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => onReportClick?.(report)}
              >
                <CardContent className="p-3 sm:p-4">
                  <div className="flex flex-col gap-3 sm:gap-4">
                    {/* Top Row: Image + Main Info */}
                    <div className="flex items-stretch gap-3">
                      {report.photo_url && (
                        <div className="relative rounded-md overflow-hidden flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24 bg-muted">
                          <Image
                            src={report.photo_url}
                            alt="Report"
                            fill
                            sizes="80px"
                            className="object-cover"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0 flex flex-col">
                        <div className="flex items-start gap-2 flex-wrap">
                          <div
                            className="w-2.5 h-2.5 rounded-full mt-1.5"
                            style={{ backgroundColor: getCategoryColor(report.category) }}
                          />
                          <Badge variant="secondary" className="text-[10px] font-medium px-1.5 py-0">
                            <span className="hidden xs:inline">{report.category}</span>
                            <span className="inline xs:hidden truncate max-w-[60px]">{report.category.slice(0,6)}</span>
                          </Badge>
                          <Badge className={`text-[10px] font-medium px-1.5 py-0 ${getStatusColor(report.status)}`}>
                            <span className="flex items-center gap-0.5">
                              {getStatusIcon(report.status)}
                              <span className="hidden sm:inline">{report.status}</span>
                              <span className="inline sm:hidden">{report.status.split(' ').map(w=>w[0]).join('')}</span>
                            </span>
                          </Badge>
                          <span className="text-[10px] text-muted-foreground ml-auto whitespace-nowrap">
                            <span className="hidden sm:inline">{createdAgo}</span>
                            <span className="inline sm:hidden">{createdAgo.replace(/about |less than /gi,'').replace(/\b(minutes?|hours?|days?)\b/g,m=>m[0])}</span>
                          </span>
                          <Button variant="ghost" size="icon" className="h-6 w-6 ml-1" aria-label="View details">
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <p className="text-xs sm:text-sm mt-1 line-clamp-2 sm:line-clamp-3">
                          {report.description}
                        </p>
                      </div>
                    </div>
                    {/* Meta Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-[11px] sm:text-xs text-muted-foreground">
                      <div className="flex items-center gap-1 truncate">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate max-w-full sm:max-w-xs">
                          {report.address || `${report.location.latitude.toFixed(4)}, ${report.location.longitude.toFixed(4)}`}
                        </span>
                      </div>
                      {report.resolved_at && (
                        <div className="flex items-center gap-1 text-green-700 dark:text-green-500">
                          <CheckCircle className="h-3 w-3" />
                          <span className="truncate">Resolved {formatDistanceToNow(new Date(report.resolved_at), { addSuffix: true })}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevPage}
                  disabled={loading || (filters.offset || 0) === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden xs:inline">Previous</span>
                  <span className="inline xs:hidden">Prev</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={loading || !hasMore}
                >
                  <span className="hidden xs:inline">Next</span>
                  <span className="inline xs:hidden">Next</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground flex-1">
                <span className="hidden sm:inline">Showing {Math.min(total, ((filters.offset || 0) + (filters.limit || 10)))} of {total} reports</span>
                <span className="inline sm:hidden">{Math.min(total, ((filters.offset || 0) + (filters.limit || 10)))} / {total}</span>
              </div>
              {hasMore && (
                <Button
                  variant="outline"
                  onClick={handleLoadMore}
                  disabled={loading}
                  size="sm"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                  <span className="hidden sm:inline">Load More</span>
                  <span className="inline sm:hidden">More</span>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}