'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ArrowLeft, 
  MapPin, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  MessageSquare,
  Camera,
  ExternalLink
} from 'lucide-react';
import { reportsApi } from '@/services/api';
import { Report } from '@/types';
import MapView from '@/components/MapView';
import { formatDistanceToNow, format } from 'date-fns';
import Image from 'next/image';

interface ReportDetailPageProps {
  params: {
    id: string;
  };
}

export default function ReportDetailPage({ params }: ReportDetailPageProps) {
  const router = useRouter();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const loadReport = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const reportData = await reportsApi.getReport(params.id);
      setReport(reportData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load report details');
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const getStatusColor = (status: string) => {
    const colors = {
      'Submitted': 'bg-blue-100 text-blue-800',
      'In Review': 'bg-yellow-100 text-yellow-800', 
      'In Progress': 'bg-orange-100 text-orange-800',
      'Resolved': 'bg-green-100 text-green-800',
      'Closed': 'bg-gray-100 text-gray-800'
    };
    return colors[status as keyof typeof colors] || colors['Submitted'];
  };

  const getStatusIcon = (status: string) => {
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

  const getCategoryColor = (category: string) => {
    const colors = {
      'Infrastructure': '#8B5CF6',
      'Sanitation': '#EF4444',
      'Safety': '#F59E0B',
      'Water': '#06B6D4',
      'Electrical': '#10B981'
    };
    return colors[category as keyof typeof colors] || '#8B5CF6';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Loading report details...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Button 
            variant="ghost" 
            onClick={() => router.back()}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {error || 'Report not found'}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button 
            variant="ghost" 
            onClick={() => router.back()}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Reports
          </Button>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => window.open(`https://maps.google.com/?q=${report.location.latitude},${report.location.longitude}`, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View on Google Maps
            </Button>
          </div>
        </div>

        {/* Main Report Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div 
                    className="w-4 h-4 rounded-full" 
                    style={{ backgroundColor: getCategoryColor(report.category) }}
                  />
                  <Badge variant="secondary">{report.category}</Badge>
                  <Badge className={getStatusColor(report.status)}>
                    <span className="flex items-center gap-1">
                      {getStatusIcon(report.status)}
                      {report.status}
                    </span>
                  </Badge>
                </div>
                <CardTitle className="text-xl mb-2">
                  {report.category} Issue Report
                </CardTitle>
                <CardDescription className="text-base">
                  Report ID: {report.id}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Description */}
            <div>
              <h3 className="font-medium text-sm text-gray-700 mb-2 flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Description
              </h3>
              <p className="text-gray-900 leading-relaxed">
                {report.description}
              </p>
            </div>

            {/* Photo */}
            {report.photo_url && (
              <div>
                <h3 className="font-medium text-sm text-gray-700 mb-2 flex items-center gap-2">
                  <Camera className="h-4 w-4" />
                  Photo
                </h3>
                <div className="rounded-lg overflow-hidden">
                  <Image 
                    src={report.photo_url}
                    alt="Report photo"
                    width={1024}
                    height={576}
                    className="w-full max-w-2xl h-auto object-cover"
                  />
                </div>
              </div>
            )}

            {/* Location Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium text-sm text-gray-700 mb-2 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Location Details
                </h3>
                <div className="space-y-2 text-sm">
                  {report.address && (
                    <div>
                      <span className="font-medium">Address:</span>
                      <p className="text-gray-600">{report.address}</p>
                    </div>
                  )}
                  <div>
                    <span className="font-medium">Coordinates:</span>
                    <p className="text-gray-600 font-mono">
                      {report.location.latitude.toFixed(6)}, {report.location.longitude.toFixed(6)}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-medium text-sm text-gray-700 mb-2 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Timeline
                </h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Submitted:</span>
                    <p className="text-gray-600">
                      {format(new Date(report.created_at), 'PPP')} 
                      <span className="text-xs ml-2 text-gray-500">
                        ({formatDistanceToNow(new Date(report.created_at), { addSuffix: true })})
                      </span>
                    </p>
                  </div>
                  
                  {report.updated_at !== report.created_at && (
                    <div>
                      <span className="font-medium">Last Updated:</span>
                      <p className="text-gray-600">
                        {format(new Date(report.updated_at), 'PPP')}
                        <span className="text-xs ml-2 text-gray-500">
                          ({formatDistanceToNow(new Date(report.updated_at), { addSuffix: true })})
                        </span>
                      </p>
                    </div>
                  )}

                  {report.resolved_at && (
                    <div>
                      <span className="font-medium">Resolved:</span>
                      <p className="text-gray-600">
                        {format(new Date(report.resolved_at), 'PPP')}
                        <span className="text-xs ml-2 text-gray-500">
                          ({formatDistanceToNow(new Date(report.resolved_at), { addSuffix: true })})
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Admin Notes */}
            {report.admin_notes && (
              <div>
                <h3 className="font-medium text-sm text-gray-700 mb-2 flex items-center gap-2">
                  Official Response
                </h3>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-gray-800">
                    {report.admin_notes}
                  </p>
                </div>
              </div>
            )}

            {/* Duplicate Reference */}
            {report.duplicate_of && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  This report has been marked as a duplicate of report{' '}
                  <button 
                    onClick={() => router.push(`/reports/${report.duplicate_of}`)}
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    {report.duplicate_of}
                  </button>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Location Map */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Report Location
            </CardTitle>
            <CardDescription>
              Interactive map showing the exact location of this report
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MapView
              reports={[report]}
              center={report.location}
              zoom={15}
              onReportClick={() => {}}
              className="h-full"
              interactive
            />
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-4 mt-6">
          <Button onClick={() => router.push('/')}>
            View All Reports
          </Button>
        </div>
      </div>
    </div>
  );
}