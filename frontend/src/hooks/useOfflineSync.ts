// Hook for managing offline sync functionality
import { useEffect, useState } from "react";
import syncManager, { SyncManagerStatus } from "@/lib/syncManager";
import offlineQueue, { QueueStatus } from "@/lib/offlineQueue";

export function useOfflineSync() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncManagerStatus>({
    isEnabled: false,
    isPending: false,
    networkStatus: "checking",
    backgroundSyncSupported: false,
  });
  const [queueStatus, setQueueStatus] = useState<QueueStatus>({
    pending: 0,
    processing: false,
    errors: [],
  });

  // Initialize sync manager
  useEffect(() => {
    const initializeSync = async () => {
      try {
        console.log("🚀 Initializing offline sync...");

        // Start sync manager
        await syncManager.start();

        // Update initial status
        const [sync, queue] = await Promise.all([
          Promise.resolve(syncManager.getStatus()),
          offlineQueue.getQueueStatus(),
        ]);

        setSyncStatus(sync);
        setQueueStatus(queue);
        setIsInitialized(true);

        console.log("✅ Offline sync initialized");
      } catch (error) {
        console.error("❌ Failed to initialize sync:", error);
        setIsInitialized(true); // Still mark as initialized to prevent retries
      }
    };

    initializeSync();

    // Cleanup on unmount
    return () => {
      syncManager.stop();
    };
  }, []);

  // Listen for status updates
  useEffect(() => {
    if (!isInitialized) return;

    const handleSyncStatusUpdate = () => {
      // Always pull authoritative status from syncManager to avoid casting the payload
      try {
        const status = syncManager.getStatus();
        setSyncStatus(status);
      } catch (e) {
        console.error("Failed to retrieve sync status:", e);
      }
    };

    const handleQueueUpdate = async () => {
      try {
        const status = await offlineQueue.getQueueStatus();
        setQueueStatus(status);
      } catch (error) {
        console.error("Failed to update queue status:", error);
      }
    };

    // Listen to sync manager events
    syncManager.on("status-updated", handleSyncStatusUpdate);
    syncManager.on("network-changed", handleSyncStatusUpdate);
    syncManager.on("sync-started", handleSyncStatusUpdate);
    syncManager.on("sync-completed", handleSyncStatusUpdate);
    syncManager.on("sync-failed", handleSyncStatusUpdate);

    // Listen to queue events
    offlineQueue.on("queue-updated", handleQueueUpdate);
    offlineQueue.on("sync-started", handleQueueUpdate);
    offlineQueue.on("sync-completed", handleQueueUpdate);
    offlineQueue.on("sync-failed", handleQueueUpdate);

    return () => {
      syncManager.off("status-updated", handleSyncStatusUpdate);
      syncManager.off("network-changed", handleSyncStatusUpdate);
      syncManager.off("sync-started", handleSyncStatusUpdate);
      syncManager.off("sync-completed", handleSyncStatusUpdate);
      syncManager.off("sync-failed", handleSyncStatusUpdate);

      offlineQueue.off("queue-updated", handleQueueUpdate);
      offlineQueue.off("sync-started", handleQueueUpdate);
      offlineQueue.off("sync-completed", handleQueueUpdate);
      offlineQueue.off("sync-failed", handleQueueUpdate);
    };
  }, [isInitialized]);

  return {
    isInitialized,
    syncStatus,
    queueStatus,
    syncManager,
    offlineQueue,
  };
}
