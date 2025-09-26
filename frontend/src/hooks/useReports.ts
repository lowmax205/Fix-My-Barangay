import { useState, useEffect, useCallback } from "react";
import { Report, ReportFilters, Category } from "@/types";
import { reportsApi, categoriesApi } from "@/services/api";

interface UseReportsReturn {
  reports: Report[];
  categories: Category[];
  loading: boolean;
  error: string | null;
  filters: ReportFilters;
  total: number;
  hasMore: boolean;
  setFilters: (filters: ReportFilters) => void;
  refreshReports: () => void;
  loadMore: () => void;
}

export function useReports(
  initialFilters: ReportFilters = {}
): UseReportsReturn {
  const [reports, setReports] = useState<Report[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ReportFilters>({
    limit: 20,
    offset: 0,
    ...initialFilters,
  });
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const loadReports = useCallback(
    async (resetList = false): Promise<void> => {
      try {
        setLoading(true);
        setError(null);

        const currentFilters = resetList ? { ...filters, offset: 0 } : filters;
        const response = await reportsApi.getReports(currentFilters);

        if (resetList || currentFilters.offset === 0) {
          setReports(response.reports);
        } else {
          setReports((prev) => [...prev, ...response.reports]);
        }

        setTotal(response.total);
        setHasMore(response.hasMore);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load reports");
      } finally {
        setLoading(false);
      }
    },
    [filters]
  );

  const loadCategories = async () => {
    try {
      const response = await categoriesApi.getCategories();
      setCategories(response.categories);
      console.log(
        "Categories loaded successfully:",
        response.categories.length
      );
    } catch (err) {
      console.error("Failed to load categories:", err);
      // The API service now includes fallback data, so this should still work
      // But we can set an empty array as a final fallback
      setCategories([]);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadReports(true);
  }, [loadReports]);

  const handleSetFilters = (newFilters: ReportFilters) => {
    setFilters((prev) => ({
      ...prev,
      ...newFilters,
      offset: 0, // Reset to first page when filters change
    }));
  };

  const refreshReports = () => {
    loadReports(true);
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      setFilters((prev) => ({
        ...prev,
        offset: (prev.offset || 0) + (prev.limit || 20),
      }));
    }
  };

  return {
    reports,
    categories,
    loading,
    error,
    filters,
    total,
    hasMore,
    setFilters: handleSetFilters,
    refreshReports,
    loadMore,
  };
}
