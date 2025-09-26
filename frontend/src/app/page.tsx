'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import AppIcon from '@/components/AppIcon';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PlusCircle, List, Map, AlertTriangle, MapPin } from 'lucide-react';
import MetricsGrid from '@/components/MetricsGrid';
import ReportForm from '@/components/ReportForm';
import ReportsList from '@/components/ReportsList';
import MapView from '@/components/MapView';
import OfflineStatus from '@/components/OfflineStatus';
import AdminAccessButton from '@/components/AdminAccessButton';
import InstallPWA from '@/components/InstallPWA';
// import EnvironmentCheck from '@/components/EnvironmentCheck';
import { useReports } from '@/hooks/useReports';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { Report } from '@/types';

export default function Home() {
  // Only two visible tabs: reports list and map view
  const [activeTab, setActiveTab] = useState<'list' | 'map'>('list');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showForm, setShowForm] = useState(false);
  
  const { 
    reports, 
    loading, 
    error, 
    total, 
    refreshReports 
  } = useReports();

  // Initialize offline sync functionality
  useOfflineSync();

  const handleReportSubmit = () => {
    // Refresh reports list and switch to list view
    refreshReports();
    setActiveTab('list');
    setShowForm(false);
  };

  const handleReportClick = (report: Report) => {
    setSelectedReport(report);
    // Could open a modal or navigate to detail page
  };

  const getStatusCounts = () => {
    const counts = {
      total: reports.length,
      submitted: reports.filter(r => r.status === 'Submitted').length,
      inProgress: reports.filter(r => r.status === 'In Progress' || r.status === 'In Review').length,
      resolved: reports.filter(r => r.status === 'Resolved').length,
    };
    return counts;
  };

  const statusCounts = getStatusCounts();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AppIcon size={40} />
              <div>
                <h1 className="text-lg sm:text-xl font-semibold text-gray-900 tracking-tight">Fix My Barangay</h1>
                {/* Tagline intentionally hidden per request */}
                <p className="sr-only">Report local issues and help improve your community</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <AdminAccessButton />
              <InstallPWA />
              <Button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-1.5 px-2 sm:px-3"
                aria-label="Report Issue"
              >
                <PlusCircle className="h-4 w-4" />
                <span className="hidden xs:inline">Report Issue</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Quick Stats (shared component) */}
        <MetricsGrid data={statusCounts} className="mb-6 sm:mb-8" />

        <Dialog open={showForm} onOpenChange={(open) => setShowForm(open)}>
          <DialogContent className="max-h-[90vh] p-0">
            <ScrollArea className="max-h-[90vh] p-6">
              <DialogHeader>
                <DialogTitle>Submit New Report</DialogTitle>
                <DialogDescription>
                  Help us address issues in your barangay by providing details below.
                </DialogDescription>
              </DialogHeader>
              <div className="mt-4">
                <ReportForm 
                  onSubmitSuccess={handleReportSubmit}
                  onSubmitError={(error) => console.error('Form error:', error)}
                />
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={(value: string) => setActiveTab(value as 'list' | 'map')}>
          <TabsList className="mb-6 w-full flex">
            <TabsTrigger 
              value="list" 
              className="flex-1 flex items-center justify-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <List className="h-4 w-4" />
              <span>Reports ({total})</span>
            </TabsTrigger>
            <TabsTrigger 
              value="map" 
              className="flex-1 flex items-center justify-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <Map className="h-4 w-4" />
              <span>Map ({reports.length})</span>
            </TabsTrigger>
          </TabsList>

          {/* Reports List Tab */}
          <TabsContent value="list">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base sm:text-lg font-semibold tracking-tight">Community Reports</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      Browse & track local issues
                    </CardDescription>
                  </div>
                  <Badge variant="secondary">
                    {total} total reports
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <ReportsList 
                  onReportClick={handleReportClick}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Map View Tab */}
          <TabsContent value="map">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base sm:text-lg font-semibold tracking-tight">Reports Map</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      View geographic distribution
                    </CardDescription>
                  </div>
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {reports.length} locations
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <MapView
                  reports={reports}
                  onReportClick={handleReportClick}
                  className="h-96"
                  showUserLocation
                  interactive
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Selected Report Details (could be a modal) */}
        {selectedReport && (
          <Card className="mt-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base sm:text-lg font-semibold tracking-tight">Report Details</CardTitle>
                <Button 
                  variant="ghost" 
                  onClick={() => setSelectedReport(null)}
                >
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge>{selectedReport.category}</Badge>
                  <Badge variant="secondary">{selectedReport.status}</Badge>
                </div>
                
                <p className="text-sm">{selectedReport.description}</p>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium">Address:</p>
                    <p className="text-gray-600">
                      {selectedReport.address || 'No address provided'}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium">Submitted:</p>
                    <p className="text-gray-600">
                      {new Date(selectedReport.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {selectedReport.admin_notes && (
                  <div>
                    <p className="font-medium text-sm">Admin Notes:</p>
                    <p className="text-sm text-gray-600 mt-1">
                      {selectedReport.admin_notes}
                    </p>
                  </div>
                )}

                {selectedReport.photo_url && (
                  <div>
                    <p className="font-medium text-sm mb-2">Photo:</p>
                    <Image 
                      src={selectedReport.photo_url} 
                      alt="Report"
                      width={640}
                      height={384}
                      className="max-w-sm h-48 object-cover rounded-lg"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading Indicator */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Loading...</span>
          </div>
        )}
      </div>

      {/* Offline Status Component */}
      <OfflineStatus />
    </div>
  );
}
