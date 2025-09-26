// import { ReportFormData } from '@/types';ffline queue management for report submissions
// This module handles queuing reports when offline and managing submission retries

import { ReportFormData } from "@/types";
import { offlineQueueDB, syncStatusDB, OfflineQueueItem } from "./db";
import { reportsApi } from "@/services/api";

// Queue configuration
const QUEUE_CONFIG = {
  MAX_RETRIES: 3,
  RETRY_DELAYS: [1000, 5000, 15000], // 1s, 5s, 15s
  MAX_QUEUE_SIZE: 100,
};

// Queue status interface
export interface QueueStatus {
  pending: number;
  processing: boolean;
  lastSync?: number;
  errors: string[];
}

// Queue event listeners
type QueueEventType =
  | "queue-updated"
  | "sync-started"
  | "sync-completed"
  | "sync-failed"
  | "item-synced"
  | "item-failed";
type QueueEventPayload = Record<string, unknown> | string | number | undefined;
type QueueEventCallback = (data?: QueueEventPayload) => void;

class OfflineQueueManager {
  private isProcessing = false;
  private eventListeners: Map<QueueEventType, QueueEventCallback[]> = new Map();
  private syncTimeoutId: NodeJS.Timeout | null = null;

  constructor() {
    // Initialize event listeners map
    this.eventListeners.set("queue-updated", []);
    this.eventListeners.set("sync-started", []);
    this.eventListeners.set("sync-completed", []);
    this.eventListeners.set("sync-failed", []);
    this.eventListeners.set("item-synced", []);
    this.eventListeners.set("item-failed", []);

    // Auto-sync when coming online
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => {
        console.log("🌐 Network connection restored");
        this.processQueue();
      });

      window.addEventListener("offline", () => {
        console.log("📱 Network connection lost - switching to offline mode");
      });
    }
  }

  // Event handling
  on(event: QueueEventType, callback: QueueEventCallback): void {
    const listeners = this.eventListeners.get(event) || [];
    listeners.push(callback);
    this.eventListeners.set(event, listeners);
  }

  off(event: QueueEventType, callback: QueueEventCallback): void {
    const listeners = this.eventListeners.get(event) || [];
    const index = listeners.indexOf(callback);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  }

  private emit(event: QueueEventType, data?: QueueEventPayload): void {
    const listeners = this.eventListeners.get(event) || [];
    listeners.forEach((callback) => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in queue event listener for ${event}:`, error);
      }
    });
  }

  // Check if online
  private isOnline(): boolean {
    return typeof navigator !== "undefined" ? navigator.onLine : true;
  }

  // Add report to offline queue
  async addToQueue(reportData: ReportFormData): Promise<string> {
    try {
      // Check queue size limit
      const currentItems = await offlineQueueDB.getQueueItems();
      if (currentItems.length >= QUEUE_CONFIG.MAX_QUEUE_SIZE) {
        throw new Error(
          `Queue is full (max ${QUEUE_CONFIG.MAX_QUEUE_SIZE} items)`
        );
      }

      // Add to queue
      const queueId = await offlineQueueDB.addToQueue({
        type: "CREATE_REPORT",
        data: reportData,
      });

      console.log(`📝 Report queued for offline submission: ${queueId}`);

      // Update sync status
      await this.updateSyncStatus();

      // Emit event
      this.emit("queue-updated", {
        action: "added",
        queueId,
        total: currentItems.length + 1,
      });

      // Try to process queue if online
      if (this.isOnline()) {
        this.scheduleProcessing();
      }

      return queueId;
    } catch (error) {
      console.error("Failed to add report to queue:", error);
      throw error;
    }
  }

  // Get queue status
  async getQueueStatus(): Promise<QueueStatus> {
    try {
      const queueItems = await offlineQueueDB.getQueueItems();
      const syncStatus = await syncStatusDB.getSyncStatus();

      const errors = queueItems
        .filter((item) => item.lastError)
        .map((item) => item.lastError!)
        .slice(0, 5); // Limit to 5 most recent errors

      return {
        pending: queueItems.length,
        processing: this.isProcessing,
        lastSync: syncStatus?.timestamp,
        errors,
      };
    } catch (error) {
      console.error("Failed to get queue status:", error);
      return {
        pending: 0,
        processing: false,
        errors: ["Failed to get queue status"],
      };
    }
  }

  // Get pending queue items
  async getPendingItems(): Promise<OfflineQueueItem[]> {
    try {
      return await offlineQueueDB.getQueueItems();
    } catch (error) {
      console.error("Failed to get pending items:", error);
      return [];
    }
  }

  // Remove item from queue
  async removeFromQueue(queueId: string): Promise<void> {
    try {
      await offlineQueueDB.removeFromQueue(queueId);
      await this.updateSyncStatus();

      const status = await this.getQueueStatus();
      this.emit("queue-updated", {
        action: "removed",
        queueId,
        total: status.pending,
      });

      console.log(`🗑️ Removed item from queue: ${queueId}`);
    } catch (error) {
      console.error("Failed to remove item from queue:", error);
      throw error;
    }
  }

  // Clear all queue items
  async clearQueue(): Promise<void> {
    try {
      await offlineQueueDB.clearQueue();
      await this.updateSyncStatus();

      this.emit("queue-updated", { action: "cleared", total: 0 });

      console.log("🧹 Queue cleared");
    } catch (error) {
      console.error("Failed to clear queue:", error);
      throw error;
    }
  }

  // Schedule queue processing with delay
  private scheduleProcessing(delay = 1000): void {
    if (this.syncTimeoutId) {
      clearTimeout(this.syncTimeoutId);
    }

    this.syncTimeoutId = setTimeout(() => {
      this.processQueue();
    }, delay);
  }

  // Process all items in the queue
  async processQueue(): Promise<void> {
    if (this.isProcessing || !this.isOnline()) {
      return;
    }

    try {
      this.isProcessing = true;
      this.emit("sync-started");

      const queueItems = await offlineQueueDB.getQueueItems();

      if (queueItems.length === 0) {
        this.isProcessing = false;
        return;
      }

      console.log(`🔄 Processing ${queueItems.length} queued items...`);

      let successCount = 0;
      let failureCount = 0;
      const errors: string[] = [];

      // Process items one by one
      for (const item of queueItems) {
        try {
          await this.processQueueItem(item);
          successCount++;
          this.emit("item-synced", { queueId: item.id });
        } catch (error) {
          failureCount++;
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          errors.push(`${item.id}: ${errorMessage}`);
          this.emit("item-failed", { queueId: item.id, error: errorMessage });

          // Update retry count and error
          await offlineQueueDB.updateQueueItem(
            item.id,
            item.retryCount + 1,
            errorMessage
          );
        }
      }

      // Update sync status
      await this.updateSyncStatus();

      if (errors.length === 0) {
        console.log(
          `✅ Queue processing completed: ${successCount} items synced`
        );
        this.emit("sync-completed", { successCount, failureCount: 0 });
      } else {
        console.log(
          `⚠️ Queue processing completed with errors: ${successCount} synced, ${failureCount} failed`
        );
        this.emit("sync-failed", { successCount, failureCount, errors });
      }
    } catch (error) {
      console.error("Queue processing failed:", error);
      this.emit("sync-failed", {
        error: error instanceof Error ? error.message : "Processing failed",
      });
    } finally {
      this.isProcessing = false;
    }
  }

  // Process a single queue item
  private async processQueueItem(item: OfflineQueueItem): Promise<void> {
    // Check retry limit
    if (item.retryCount >= QUEUE_CONFIG.MAX_RETRIES) {
      console.warn(
        `⚠️ Max retries exceeded for item ${item.id}, removing from queue`
      );
      await offlineQueueDB.removeFromQueue(item.id);
      throw new Error("Max retries exceeded");
    }

    try {
      if (item.type === "CREATE_REPORT") {
        // Submit report to API
        const reportData = item.data as ReportFormData;

        const submissionData = {
          category: reportData.category,
          description: reportData.description,
          location: reportData.location!,
          address: reportData.address,
        };

        const report = await reportsApi.submitReport(submissionData);

        console.log(`✅ Report submitted successfully: ${report.id}`);

        // Remove from queue on success
        await offlineQueueDB.removeFromQueue(item.id);
      } else {
        throw new Error(`Unsupported queue item type: ${item.type}`);
      }
    } catch (error) {
      console.error(`❌ Failed to process queue item ${item.id}:`, error);
      throw error;
    }
  }

  // Update sync status in database
  private async updateSyncStatus(): Promise<void> {
    try {
      const queueItems = await offlineQueueDB.getQueueItems();

      await syncStatusDB.updateSyncStatus({
        timestamp: Date.now(),
        success: queueItems.length === 0,
        pending_count: queueItems.length,
      });
    } catch (error) {
      console.error("Failed to update sync status:", error);
    }
  }

  // Force sync (manual trigger)
  async forceSync(): Promise<void> {
    if (!this.isOnline()) {
      throw new Error("Cannot sync while offline");
    }

    if (this.isProcessing) {
      throw new Error("Sync already in progress");
    }

    await this.processQueue();
  }

  // Retry failed items
  async retryFailedItems(): Promise<void> {
    try {
      const queueItems = await offlineQueueDB.getQueueItems();
      const failedItems = queueItems.filter(
        (item) => item.lastError && item.retryCount < QUEUE_CONFIG.MAX_RETRIES
      );

      if (failedItems.length === 0) {
        console.log("No failed items to retry");
        return;
      }

      console.log(`🔄 Retrying ${failedItems.length} failed items...`);

      for (const item of failedItems) {
        // Reset error and process
        await offlineQueueDB.updateQueueItem(
          item.id,
          item.retryCount,
          undefined
        );
      }

      // Process queue
      await this.processQueue();
    } catch (error) {
      console.error("Failed to retry items:", error);
      throw error;
    }
  }

  // Get retry delay for an item
  private getRetryDelay(retryCount: number): number {
    return QUEUE_CONFIG.RETRY_DELAYS[
      Math.min(retryCount, QUEUE_CONFIG.RETRY_DELAYS.length - 1)
    ];
  }
}

// Create singleton instance
const offlineQueue = new OfflineQueueManager();

// Export queue instance and utilities
export default offlineQueue;

export { OfflineQueueManager, QUEUE_CONFIG };

// Utility functions
export const queueUtils = {
  // Check if we should queue a request (offline or API error)
  shouldQueue(): boolean {
    return !navigator.onLine;
  },

  // Get human-readable queue status
  formatQueueStatus(status: QueueStatus): string {
    if (status.pending === 0) {
      return "All reports synced";
    }

    if (status.processing) {
      return `Syncing ${status.pending} reports...`;
    }

    if (status.errors.length > 0) {
      return `${status.pending} reports pending (${status.errors.length} errors)`;
    }

    return `${status.pending} reports pending sync`;
  },
};
