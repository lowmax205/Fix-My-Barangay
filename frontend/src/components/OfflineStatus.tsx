// Queue status component for displaying offline reports and sync status
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Wifi, 
  WifiOff, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  RefreshCw, 
  Trash2,
  EyeOff
} from 'lucide-react';
import offlineQueue, { QueueStatus, queueUtils } from '@/lib/offlineQueue';
import syncManager, { SyncManagerStatus, syncUtils } from '@/lib/syncManager';

export default function OfflineStatus() {
  const [queueStatus, setQueueStatus] = useState<QueueStatus>({ pending: 0, processing: false, errors: [] });
  const [syncStatus, setSyncStatus] = useState<SyncManagerStatus>({
    isEnabled: false,
    isPending: false,
    networkStatus: 'checking',
    backgroundSyncSupported: false
  });
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Update status on mount and set up listeners
  useEffect(() => {
    updateStatus();

    // Listen for queue updates
    const handleQueueUpdate = () => updateStatus();
    const handleSyncUpdate = () => updateStatus();
    const handleNetworkChange = () => updateStatus();

    offlineQueue.on('queue-updated', handleQueueUpdate);
    offlineQueue.on('sync-started', handleSyncUpdate);
    offlineQueue.on('sync-completed', handleSyncUpdate);
    offlineQueue.on('sync-failed', handleSyncUpdate);

    syncManager.on('status-updated', handleSyncUpdate);
    syncManager.on('network-changed', handleNetworkChange);

    return () => {
      offlineQueue.off('queue-updated', handleQueueUpdate);
      offlineQueue.off('sync-started', handleSyncUpdate);
      offlineQueue.off('sync-completed', handleSyncUpdate);
      offlineQueue.off('sync-failed', handleSyncUpdate);

      syncManager.off('status-updated', handleSyncUpdate);
      syncManager.off('network-changed', handleNetworkChange);
    };
  }, []);

  // Auto-show when there are pending items or errors
  useEffect(() => {
    if (queueStatus.pending > 0 || queueStatus.errors.length > 0 || syncStatus.networkStatus === 'offline') {
      setIsVisible(true);
    }
  }, [queueStatus, syncStatus.networkStatus]);

  const updateStatus = async () => {
    try {
      const [queue, sync] = await Promise.all([
        offlineQueue.getQueueStatus(),
        Promise.resolve(syncManager.getStatus())
      ]);
      
      setQueueStatus(queue);
      setSyncStatus(sync);
    } catch (error) {
      console.error('Failed to update offline status:', error);
    }
  };

  const handleForceSync = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      await syncManager.forceSync();
      await updateStatus();
    } catch (error) {
      console.error('Force sync failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearQueue = async () => {
    if (isLoading) return;
    
    const confirmed = window.confirm(
      'Are you sure you want to clear all pending reports? This cannot be undone.'
    );
    
    if (!confirmed) return;

    setIsLoading(true);
    try {
      await offlineQueue.clearQueue();
      await updateStatus();
    } catch (error) {
      console.error('Clear queue failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const shouldShow = isVisible && (
    queueStatus.pending > 0 || 
    queueStatus.errors.length > 0 || 
    syncStatus.networkStatus === 'offline' ||
    syncStatus.isPending
  );

  if (!shouldShow) {
    // Show minimized indicator if there are pending items
    if (queueStatus.pending > 0) {
      return (
        <div className="fixed bottom-4 right-4 z-50">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsVisible(true)}
            className="shadow-lg border-orange-200 bg-orange-50 hover:bg-orange-100"
          >
            <Clock className="h-4 w-4 mr-2 text-orange-600" />
            {queueStatus.pending} pending
          </Button>
        </div>
      );
    }
    return null;
  }

  const networkStatusColor = syncUtils.getSyncStatusColor(syncStatus);
  const statusText = queueUtils.formatQueueStatus(queueStatus);

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80">
      <Card className="shadow-lg border-l-4" style={{
        borderLeftColor: networkStatusColor === 'red' ? '#ef4444' : 
                         networkStatusColor === 'yellow' ? '#f59e0b' : 
                         networkStatusColor === 'green' ? '#10b981' : '#6b7280'
      }}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {syncStatus.networkStatus === 'offline' ? (
                <WifiOff className="h-4 w-4 text-red-500" />
              ) : syncStatus.isPending ? (
                <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
              ) : (
                <Wifi className="h-4 w-4 text-green-500" />
              )}
              <CardTitle className="text-sm">
                {syncStatus.networkStatus === 'offline' ? 'Offline Mode' : 
                 syncStatus.isPending ? 'Syncing' : 'Online'}
              </CardTitle>
            </div>
            <div className="flex items-center gap-1">
              {queueStatus.pending > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {queueStatus.pending}
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsVisible(false)}
                className="h-6 w-6 p-0"
              >
                <EyeOff className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <CardDescription className="text-xs">
            {statusText}
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-0">
          {/* Network Status */}
          <div className="space-y-3">
            {syncStatus.networkStatus === 'offline' && (
              <Alert>
                <WifiOff className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  You&apos;re currently offline. Reports will be saved and synced when reconnected.
                </AlertDescription>
              </Alert>
            )}

            {/* Queue Status */}
            {queueStatus.pending > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Pending Reports</span>
                  <Badge variant={queueStatus.processing ? "default" : "secondary"}>
                    {queueStatus.pending}
                  </Badge>
                </div>
                
                {queueStatus.processing && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    <span>Syncing reports...</span>
                  </div>
                )}
              </div>
            )}

            {/* Sync Errors */}
            {queueStatus.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  <div className="font-medium">Sync Errors ({queueStatus.errors.length})</div>
                  <div className="mt-1 space-y-1">
                    {queueStatus.errors.slice(0, 2).map((error, index) => (
                      <div key={index} className="text-xs opacity-90">
                        {error.length > 50 ? `${error.substring(0, 50)}...` : error}
                      </div>
                    ))}
                    {queueStatus.errors.length > 2 && (
                      <div className="text-xs opacity-75">
                        +{queueStatus.errors.length - 2} more errors
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Last Sync Time */}
            {syncStatus.lastSync && (
              <div className="text-xs text-muted-foreground">
                Last sync: {new Date(syncStatus.lastSync).toLocaleTimeString()}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              {syncStatus.networkStatus === 'online' && queueStatus.pending > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleForceSync}
                  disabled={isLoading || syncStatus.isPending}
                  className="flex-1"
                >
                  {isLoading || syncStatus.isPending ? (
                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3 w-3 mr-1" />
                  )}
                  Sync Now
                </Button>
              )}
              
              {queueStatus.pending > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleClearQueue}
                  disabled={isLoading}
                  className="flex-1"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              )}
            </div>

            {/* Background Sync Status */}
            {syncStatus.backgroundSyncSupported && (
              <div className="text-xs text-muted-foreground pt-2 border-t">
                <CheckCircle className="inline h-3 w-3 mr-1 text-green-500" />
                Background sync enabled
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Mini status indicator for showing when minimized
export function OfflineStatusIndicator() {
  const [queueStatus, setQueueStatus] = useState<QueueStatus>({ pending: 0, processing: false, errors: [] });

  useEffect(() => {
    const updateStatus = async () => {
      try {
        const status = await offlineQueue.getQueueStatus();
        setQueueStatus(status);
      } catch (error) {
        console.error('Failed to update queue status:', error);
      }
    };

    updateStatus();

    const handleQueueUpdate = () => updateStatus();
    offlineQueue.on('queue-updated', handleQueueUpdate);
    offlineQueue.on('sync-completed', handleQueueUpdate);

    return () => {
      offlineQueue.off('queue-updated', handleQueueUpdate);
      offlineQueue.off('sync-completed', handleQueueUpdate);
    };
  }, []);

  if (queueStatus.pending === 0) {
    return null;
  }

  return (
    <div className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs">
      <Clock className="h-3 w-3" />
      <span>{queueStatus.pending} pending</span>
    </div>
  );
}