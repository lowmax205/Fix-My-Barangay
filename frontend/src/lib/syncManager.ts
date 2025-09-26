// import offlineQueue from './offlineQueue';ckground sync manager for PWA offline functionality
// Handles periodic sync, background processing, and network state management

import offlineQueue from "./offlineQueue";

// Sync configuration
const SYNC_CONFIG = {
  PERIODIC_SYNC_INTERVAL: 5 * 60 * 1000, // 5 minutes
  BACKGROUND_SYNC_TAG: "background-sync-reports",
  MAX_SYNC_ATTEMPTS: 5,
  SYNC_TIMEOUT: 30000, // 30 seconds
  NETWORK_CHECK_INTERVAL: 30 * 1000, // 30 seconds
};

// Sync status types
export interface SyncManagerStatus {
  isEnabled: boolean;
  lastSync?: number;
  nextSync?: number;
  isPending: boolean;
  networkStatus: "online" | "offline" | "checking";
  backgroundSyncSupported: boolean;
}

// Sync events
type SyncEventType =
  | "sync-started"
  | "sync-completed"
  | "sync-failed"
  | "network-changed"
  | "status-updated";
type SyncEventPayload = Record<string, unknown> | { status: string } | string | number | boolean | SyncManagerStatus | undefined;
type SyncEventCallback = (data?: SyncEventPayload) => void;

class SyncManager {
  private isEnabled = false;
  private periodicSyncInterval: NodeJS.Timeout | null = null;
  private networkCheckInterval: NodeJS.Timeout | null = null;
  private lastSyncTime?: number;
  private currentSyncPromise: Promise<void> | null = null;
  private eventListeners: Map<SyncEventType, SyncEventCallback[]> = new Map();
  private networkStatus: "online" | "offline" | "checking" = "checking";

  constructor() {
    // Initialize event listeners
    this.eventListeners.set("sync-started", []);
    this.eventListeners.set("sync-completed", []);
    this.eventListeners.set("sync-failed", []);
    this.eventListeners.set("network-changed", []);
    this.eventListeners.set("status-updated", []);

    // Initialize network monitoring
    this.initializeNetworkMonitoring();

    // Initialize background sync if supported
    this.initializeBackgroundSync();

    // Listen for service worker messages
    this.initializeServiceWorkerMessages();
  }

  // Initialize service worker message handling
  private initializeServiceWorkerMessages(): void {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    // Listen for messages from service worker
    navigator.serviceWorker.addEventListener("message", (event) => {
      console.log("📱 Message from service worker:", event.data);

      if (event.data.type === "SYNC_REPORTS") {
        // Service worker is requesting a sync
        this.handleServiceWorkerSyncRequest(event);
      }
    });
  }

  // Handle sync request from service worker
  private async handleServiceWorkerSyncRequest(
    event: MessageEvent
  ): Promise<void> {
    try {
      console.log("🔄 Processing service worker sync request...");

      // Perform the sync
      await this.performSync();

      // Respond to service worker if there's a message port
      if (event.ports && event.ports[0]) {
        event.ports[0].postMessage({
          success: true,
          timestamp: Date.now(),
        });
      }
    } catch (error) {
      console.error("❌ Service worker sync request failed:", error);

      // Respond with error
      if (event.ports && event.ports[0]) {
        event.ports[0].postMessage({
          success: false,
          error: error instanceof Error ? error.message : "Sync failed",
          timestamp: Date.now(),
        });
      }
    }
  }

  // Event handling
  on(event: SyncEventType, callback: SyncEventCallback): void {
    const listeners = this.eventListeners.get(event) || [];
    listeners.push(callback);
    this.eventListeners.set(event, listeners);
  }

  off(event: SyncEventType, callback: SyncEventCallback): void {
    const listeners = this.eventListeners.get(event) || [];
    const index = listeners.indexOf(callback);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  }

  private emit(event: SyncEventType, data?: SyncEventPayload): void {
    const listeners = this.eventListeners.get(event) || [];
    listeners.forEach((callback) => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in sync event listener for ${event}:`, error);
      }
    });
  }

  // Initialize network state monitoring
  private initializeNetworkMonitoring(): void {
    if (typeof window === "undefined") return;

    // Set initial network status
    this.networkStatus = navigator.onLine ? "online" : "offline";

    // Listen for network events
    window.addEventListener("online", () => {
      console.log("🌐 Network connection restored");
      this.networkStatus = "online";
      this.emit("network-changed", { status: "online" });
      this.handleNetworkReconnect();
    });

    window.addEventListener("offline", () => {
      console.log("📱 Network connection lost");
      this.networkStatus = "offline";
      this.emit("network-changed", { status: "offline" });
    });

    // Periodic network connectivity check
    this.startNetworkChecking();
  }

  // Initialize background sync (Service Worker)
  private async initializeBackgroundSync(): Promise<void> {
    if (!this.isBackgroundSyncSupported()) {
      console.log("📱 Background sync not supported, using periodic sync only");
      return;
    }

    try {
      // Register background sync
      if ("serviceWorker" in navigator) {
        const registration = await navigator.serviceWorker.ready;

        if ("sync" in registration) {
          console.log("📱 Background sync initialized");

          // Register sync event
          const registrationAny = registration as unknown as { sync?: { register: (tag: string) => Promise<void> } };
          await registrationAny.sync?.register(
            SYNC_CONFIG.BACKGROUND_SYNC_TAG
          );
        }
      }
    } catch (error) {
      console.error("Failed to initialize background sync:", error);
    }
  }

  // Check if background sync is supported
  private isBackgroundSyncSupported(): boolean {
    return (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "sync" in window.ServiceWorkerRegistration.prototype
    );
  }

  // Start the sync manager
  async start(): Promise<void> {
    if (this.isEnabled) {
      console.log("📱 Sync manager already running");
      return;
    }

    try {
      this.isEnabled = true;
      console.log("🚀 Starting sync manager...");

      // Start periodic sync
      this.startPeriodicSync();

      // Initial sync if online
      if (this.networkStatus === "online") {
        await this.performSync();
      }

      console.log("✅ Sync manager started");
      this.emitStatusUpdate();
    } catch (error) {
      console.error("Failed to start sync manager:", error);
      this.isEnabled = false;
      throw error;
    }
  }

  // Stop the sync manager
  stop(): void {
    if (!this.isEnabled) {
      return;
    }

    console.log("🛑 Stopping sync manager...");

    this.isEnabled = false;

    // Clear intervals
    if (this.periodicSyncInterval) {
      clearInterval(this.periodicSyncInterval);
      this.periodicSyncInterval = null;
    }

    if (this.networkCheckInterval) {
      clearInterval(this.networkCheckInterval);
      this.networkCheckInterval = null;
    }

    console.log("✅ Sync manager stopped");
    this.emitStatusUpdate();
  }

  // Start periodic sync
  private startPeriodicSync(): void {
    if (this.periodicSyncInterval) {
      clearInterval(this.periodicSyncInterval);
    }

    this.periodicSyncInterval = setInterval(async () => {
      if (this.isEnabled && this.networkStatus === "online") {
        try {
          await this.performSync();
        } catch (error) {
          console.error("Periodic sync failed:", error);
        }
      }
    }, SYNC_CONFIG.PERIODIC_SYNC_INTERVAL);

    console.log(
      `⏰ Periodic sync started (${
        SYNC_CONFIG.PERIODIC_SYNC_INTERVAL / 1000
      }s interval)`
    );
  }

  // Start network connectivity checking
  private startNetworkChecking(): void {
    if (this.networkCheckInterval) {
      clearInterval(this.networkCheckInterval);
    }

    this.networkCheckInterval = setInterval(async () => {
      await this.checkNetworkConnectivity();
    }, SYNC_CONFIG.NETWORK_CHECK_INTERVAL);
  }

  // Check actual network connectivity
  private async checkNetworkConnectivity(): Promise<void> {
    if (!navigator.onLine) {
      if (this.networkStatus !== "offline") {
        this.networkStatus = "offline";
        this.emit("network-changed", { status: "offline" });
      }
      return;
    }

    try {
      this.networkStatus = "checking";

      // Try to reach the API with a quick test
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/health`, {
        method: "HEAD",
        signal: controller.signal,
        cache: "no-cache",
      });

      clearTimeout(timeoutId);

      // Network is working, set to online
      this.networkStatus = "online";
      this.emit("network-changed", { status: "online" });
    } catch {
      // Network failed, set to offline
      this.networkStatus = "offline";
      this.emit("network-changed", { status: "offline" });
    }
  }

  // Handle network reconnection
  private async handleNetworkReconnect(): Promise<void> {
    if (!this.isEnabled) return;

    // Delay to allow network to stabilize
    setTimeout(async () => {
      try {
        await this.performSync();
      } catch (error) {
        console.error("Reconnect sync failed:", error);
      }
    }, 2000);
  }

  // Perform sync operation
  private async performSync(): Promise<void> {
    if (this.currentSyncPromise) {
      console.log("🔄 Sync already in progress, waiting...");
      return this.currentSyncPromise;
    }

    if (this.networkStatus === "offline") {
      throw new Error("Cannot sync while offline");
    }

    this.currentSyncPromise = this.executeSyncOperation();

    try {
      await this.currentSyncPromise;
    } finally {
      this.currentSyncPromise = null;
    }
  }

  // Execute the actual sync operation
  private async executeSyncOperation(): Promise<void> {
    const syncStartTime = Date.now();

    try {
      console.log("🔄 Starting sync operation...");
      this.emit("sync-started");

      // Get queue status
      const queueStatus = await offlineQueue.getQueueStatus();

      if (queueStatus.pending === 0) {
        console.log("✅ No items to sync");
        this.lastSyncTime = syncStartTime;
        this.emit("sync-completed", { itemsSynced: 0, duration: 0 });
        this.emitStatusUpdate();
        return;
      }

      // Process the queue with timeout
      const syncPromise = offlineQueue.processQueue();
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error("Sync timeout")),
          SYNC_CONFIG.SYNC_TIMEOUT
        );
      });

      await Promise.race([syncPromise, timeoutPromise]);

      // Get final status
      const finalStatus = await offlineQueue.getQueueStatus();
      const itemsSynced = queueStatus.pending - finalStatus.pending;
      const duration = Date.now() - syncStartTime;

      this.lastSyncTime = syncStartTime;

      if (finalStatus.errors.length > 0) {
        console.log(
          `⚠️ Sync completed with errors: ${itemsSynced} synced, ${finalStatus.errors.length} errors`
        );
        this.emit("sync-failed", {
          itemsSynced,
          errors: finalStatus.errors,
          duration,
        });
      } else {
        console.log(
          `✅ Sync completed successfully: ${itemsSynced} items synced in ${duration}ms`
        );
        this.emit("sync-completed", { itemsSynced, duration });
      }
    } catch (error) {
      console.error("Sync operation failed:", error);
      this.emit("sync-failed", {
        error: error instanceof Error ? error.message : "Unknown error",
        duration: Date.now() - syncStartTime,
      });
      throw error;
    } finally {
      this.emitStatusUpdate();
    }
  }

  // Get sync manager status
  getStatus(): SyncManagerStatus {
    return {
      isEnabled: this.isEnabled,
      lastSync: this.lastSyncTime,
      nextSync: this.getNextSyncTime(),
      isPending: this.currentSyncPromise !== null,
      networkStatus: this.networkStatus,
      backgroundSyncSupported: this.isBackgroundSyncSupported(),
    };
  }

  // Get next sync time
  private getNextSyncTime(): number | undefined {
    if (!this.isEnabled || !this.lastSyncTime) {
      return undefined;
    }
    return this.lastSyncTime + SYNC_CONFIG.PERIODIC_SYNC_INTERVAL;
  }

  // Force manual sync
  async forceSync(): Promise<void> {
    if (!this.isEnabled) {
      throw new Error("Sync manager is not enabled");
    }

    if (this.networkStatus === "offline") {
      throw new Error("Cannot sync while offline");
    }

    await this.performSync();
  }

  // Trigger background sync (if supported)
  async triggerBackgroundSync(): Promise<void> {
    if (!this.isBackgroundSyncSupported()) {
      console.log(
        "Background sync not supported, falling back to immediate sync"
      );
      await this.forceSync();
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      if ("sync" in registration) {
        const registrationAny = registration as unknown as { sync?: { register: (tag: string) => Promise<void> } };
        await registrationAny.sync?.register(
          SYNC_CONFIG.BACKGROUND_SYNC_TAG
        );
        console.log("📱 Background sync triggered");
      }
    } catch (error) {
      console.error("Failed to trigger background sync:", error);
      // Fallback to immediate sync
      await this.forceSync();
    }
  }

  // Emit status update event
  private emitStatusUpdate(): void {
    this.emit("status-updated", this.getStatus());
  }

  // Get network status
  getNetworkStatus(): "online" | "offline" | "checking" {
    return this.networkStatus;
  }

  // Check if sync is needed
  async isSyncNeeded(): Promise<boolean> {
    try {
      const queueStatus = await offlineQueue.getQueueStatus();
      return queueStatus.pending > 0;
    } catch (error) {
      console.error("Failed to check sync status:", error);
      return false;
    }
  }
}

// Create singleton instance
const syncManager = new SyncManager();

// Export manager and utilities
export default syncManager;

export { SyncManager, SYNC_CONFIG };

// Utility functions
export const syncUtils = {
  // Format sync status for display
  formatSyncStatus(status: SyncManagerStatus): string {
    if (!status.isEnabled) {
      return "Sync disabled";
    }

    if (status.isPending) {
      return "Syncing...";
    }

    if (status.networkStatus === "offline") {
      return "Offline";
    }

    if (status.lastSync) {
      const timeSince = Date.now() - status.lastSync;
      const minutes = Math.floor(timeSince / 60000);

      if (minutes < 1) {
        return "Just synced";
      } else if (minutes < 60) {
        return `Synced ${minutes}m ago`;
      } else {
        const hours = Math.floor(minutes / 60);
        return `Synced ${hours}h ago`;
      }
    }

    return "Ready to sync";
  },

  // Get sync status color
  getSyncStatusColor(
    status: SyncManagerStatus
  ): "green" | "yellow" | "red" | "gray" {
    if (!status.isEnabled) return "gray";
    if (status.isPending) return "yellow";
    if (status.networkStatus === "offline") return "red";
    return "green";
  },
};
