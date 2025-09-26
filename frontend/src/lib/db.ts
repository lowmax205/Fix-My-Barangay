// IndexedDB setup for offline storage
// This module provides a wrapper around IndexedDB for storing reports, categories, and sync queue

import { Report, Category, ReportFormData } from "@/types";

// Database configuration
const DB_NAME = "FixMyBarangayDB";
const DB_VERSION = 1;

// Object store names
const STORES = {
  REPORTS: "reports",
  CATEGORIES: "categories",
  OFFLINE_QUEUE: "offlineQueue",
  SYNC_STATUS: "syncStatus",
} as const;

// IndexedDB database instance
let db: IDBDatabase | null = null;

// Offline queue item interface
export interface OfflineQueueItem {
  id: string;
  type: "CREATE_REPORT" | "UPDATE_REPORT";
  data: ReportFormData | Partial<Report>;
  timestamp: number;
  retryCount: number;
  lastError?: string;
}

// Sync status interface
export interface SyncStatus {
  id: "last_sync";
  timestamp: number;
  success: boolean;
  pending_count: number;
}

// Initialize IndexedDB
export async function initDB(): Promise<IDBDatabase> {
  if (db) {
    return db;
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error("Failed to open IndexedDB:", request.error);
      reject(new Error("Failed to initialize IndexedDB"));
    };

    request.onsuccess = () => {
      db = request.result;
      console.log("✅ IndexedDB initialized successfully");
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      // Create reports store
      if (!database.objectStoreNames.contains(STORES.REPORTS)) {
        const reportsStore = database.createObjectStore(STORES.REPORTS, {
          keyPath: "id",
        });
        reportsStore.createIndex("category", "category", { unique: false });
        reportsStore.createIndex("status", "status", { unique: false });
        reportsStore.createIndex("created_at", "created_at", { unique: false });
        console.log("✅ Reports store created");
      }

      // Create categories store
      if (!database.objectStoreNames.contains(STORES.CATEGORIES)) {
        database.createObjectStore(STORES.CATEGORIES, {
          keyPath: "id",
        });
        console.log("✅ Categories store created");
      }

      // Create offline queue store
      if (!database.objectStoreNames.contains(STORES.OFFLINE_QUEUE)) {
        const queueStore = database.createObjectStore(STORES.OFFLINE_QUEUE, {
          keyPath: "id",
        });
        queueStore.createIndex("timestamp", "timestamp", { unique: false });
        queueStore.createIndex("type", "type", { unique: false });
        console.log("✅ Offline queue store created");
      }

      // Create sync status store
      if (!database.objectStoreNames.contains(STORES.SYNC_STATUS)) {
        database.createObjectStore(STORES.SYNC_STATUS, {
          keyPath: "id",
        });
        console.log("✅ Sync status store created");
      }
    };
  });
}

// Generic database operation wrapper
async function withDB<T>(
  operation: (db: IDBDatabase) => Promise<T>
): Promise<T> {
  const database = await initDB();
  return operation(database);
}

// Generic transaction wrapper
function withTransaction<T>(
  database: IDBDatabase,
  storeNames: string | string[],
  mode: IDBTransactionMode,
  operation: (stores: IDBObjectStore | IDBObjectStore[]) => Promise<T>
): Promise<T> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeNames, mode);

    transaction.onerror = () => {
      reject(new Error(`Transaction failed: ${transaction.error}`));
    };

    transaction.oncomplete = () => {
      // Transaction completed successfully
    };

    try {
      const stores = Array.isArray(storeNames)
        ? storeNames.map((name) => transaction.objectStore(name))
        : transaction.objectStore(storeNames);

      operation(stores).then(resolve).catch(reject);
    } catch (error) {
      reject(error);
    }
  });
}

// Reports operations
export const reportsDB = {
  // Store multiple reports (from API sync)
  async storeReports(reports: Report[]): Promise<void> {
    return withDB(async (database) => {
      return withTransaction(
        database,
        STORES.REPORTS,
        "readwrite",
        async (store) => {
          const objectStore = store as IDBObjectStore;

          for (const report of reports) {
            await new Promise<void>((resolve, reject) => {
              const request = objectStore.put(report);
              request.onsuccess = () => resolve();
              request.onerror = () => reject(request.error);
            });
          }
        }
      );
    });
  },

  // Get all reports with optional filtering
  async getReports(filter?: {
    category?: string;
    status?: string;
    limit?: number;
  }): Promise<Report[]> {
    return withDB(async (database) => {
      return withTransaction(
        database,
        STORES.REPORTS,
        "readonly",
        async (store) => {
          const objectStore = store as IDBObjectStore;

          return new Promise<Report[]>((resolve, reject) => {
            const request = objectStore.getAll();

            request.onsuccess = () => {
              let reports = request.result as Report[];

              // Apply filters
              if (filter?.category) {
                reports = reports.filter((r) => r.category === filter.category);
              }
              if (filter?.status) {
                reports = reports.filter((r) => r.status === filter.status);
              }

              // Sort by created_at descending
              reports.sort(
                (a, b) =>
                  new Date(b.created_at).getTime() -
                  new Date(a.created_at).getTime()
              );

              // Apply limit
              if (filter?.limit) {
                reports = reports.slice(0, filter.limit);
              }

              resolve(reports);
            };

            request.onerror = () => reject(request.error);
          });
        }
      );
    });
  },

  // Get single report by ID
  async getReport(id: string): Promise<Report | null> {
    return withDB(async (database) => {
      return withTransaction(
        database,
        STORES.REPORTS,
        "readonly",
        async (store) => {
          const objectStore = store as IDBObjectStore;

          return new Promise<Report | null>((resolve, reject) => {
            const request = objectStore.get(id);

            request.onsuccess = () => {
              resolve(request.result || null);
            };

            request.onerror = () => reject(request.error);
          });
        }
      );
    });
  },

  // Clear all reports
  async clearReports(): Promise<void> {
    return withDB(async (database) => {
      return withTransaction(
        database,
        STORES.REPORTS,
        "readwrite",
        async (store) => {
          const objectStore = store as IDBObjectStore;

          return new Promise<void>((resolve, reject) => {
            const request = objectStore.clear();
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
          });
        }
      );
    });
  },
};

// Categories operations
export const categoriesDB = {
  // Store categories
  async storeCategories(categories: Category[]): Promise<void> {
    return withDB(async (database) => {
      return withTransaction(
        database,
        STORES.CATEGORIES,
        "readwrite",
        async (store) => {
          const objectStore = store as IDBObjectStore;

          for (const category of categories) {
            await new Promise<void>((resolve, reject) => {
              const request = objectStore.put(category);
              request.onsuccess = () => resolve();
              request.onerror = () => reject(request.error);
            });
          }
        }
      );
    });
  },

  // Get all categories
  async getCategories(): Promise<Category[]> {
    return withDB(async (database) => {
      return withTransaction(
        database,
        STORES.CATEGORIES,
        "readonly",
        async (store) => {
          const objectStore = store as IDBObjectStore;

          return new Promise<Category[]>((resolve, reject) => {
            const request = objectStore.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
          });
        }
      );
    });
  },
};

// Offline queue operations
export const offlineQueueDB = {
  // Add item to offline queue
  async addToQueue(
    item: Omit<OfflineQueueItem, "id" | "timestamp" | "retryCount">
  ): Promise<string> {
    const queueItem: OfflineQueueItem = {
      ...item,
      id: `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retryCount: 0,
    };

    return withDB(async (database) => {
      return withTransaction(
        database,
        STORES.OFFLINE_QUEUE,
        "readwrite",
        async (store) => {
          const objectStore = store as IDBObjectStore;

          return new Promise<string>((resolve, reject) => {
            const request = objectStore.add(queueItem);
            request.onsuccess = () => resolve(queueItem.id);
            request.onerror = () => reject(request.error);
          });
        }
      );
    });
  },

  // Get all queue items
  async getQueueItems(): Promise<OfflineQueueItem[]> {
    return withDB(async (database) => {
      return withTransaction(
        database,
        STORES.OFFLINE_QUEUE,
        "readonly",
        async (store) => {
          const objectStore = store as IDBObjectStore;

          return new Promise<OfflineQueueItem[]>((resolve, reject) => {
            const request = objectStore.getAll();

            request.onsuccess = () => {
              const items = request.result as OfflineQueueItem[];
              // Sort by timestamp ascending (oldest first)
              items.sort((a, b) => a.timestamp - b.timestamp);
              resolve(items);
            };

            request.onerror = () => reject(request.error);
          });
        }
      );
    });
  },

  // Remove item from queue
  async removeFromQueue(id: string): Promise<void> {
    return withDB(async (database) => {
      return withTransaction(
        database,
        STORES.OFFLINE_QUEUE,
        "readwrite",
        async (store) => {
          const objectStore = store as IDBObjectStore;

          return new Promise<void>((resolve, reject) => {
            const request = objectStore.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
          });
        }
      );
    });
  },

  // Update retry count and error for queue item
  async updateQueueItem(
    id: string,
    retryCount: number,
    lastError?: string
  ): Promise<void> {
    return withDB(async (database) => {
      return withTransaction(
        database,
        STORES.OFFLINE_QUEUE,
        "readwrite",
        async (store) => {
          const objectStore = store as IDBObjectStore;

          return new Promise<void>((resolve, reject) => {
            const getRequest = objectStore.get(id);

            getRequest.onsuccess = () => {
              const item = getRequest.result as OfflineQueueItem;
              if (item) {
                item.retryCount = retryCount;
                if (lastError) {
                  item.lastError = lastError;
                }

                const updateRequest = objectStore.put(item);
                updateRequest.onsuccess = () => resolve();
                updateRequest.onerror = () => reject(updateRequest.error);
              } else {
                reject(new Error(`Queue item ${id} not found`));
              }
            };

            getRequest.onerror = () => reject(getRequest.error);
          });
        }
      );
    });
  },

  // Clear all queue items
  async clearQueue(): Promise<void> {
    return withDB(async (database) => {
      return withTransaction(
        database,
        STORES.OFFLINE_QUEUE,
        "readwrite",
        async (store) => {
          const objectStore = store as IDBObjectStore;

          return new Promise<void>((resolve, reject) => {
            const request = objectStore.clear();
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
          });
        }
      );
    });
  },
};

// Sync status operations
export const syncStatusDB = {
  // Update sync status
  async updateSyncStatus(status: Omit<SyncStatus, "id">): Promise<void> {
    const syncStatus: SyncStatus = {
      id: "last_sync",
      ...status,
    };

    return withDB(async (database) => {
      return withTransaction(
        database,
        STORES.SYNC_STATUS,
        "readwrite",
        async (store) => {
          const objectStore = store as IDBObjectStore;

          return new Promise<void>((resolve, reject) => {
            const request = objectStore.put(syncStatus);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
          });
        }
      );
    });
  },

  // Get sync status
  async getSyncStatus(): Promise<SyncStatus | null> {
    return withDB(async (database) => {
      return withTransaction(
        database,
        STORES.SYNC_STATUS,
        "readonly",
        async (store) => {
          const objectStore = store as IDBObjectStore;

          return new Promise<SyncStatus | null>((resolve, reject) => {
            const request = objectStore.get("last_sync");
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
          });
        }
      );
    });
  },
};

// Utility functions
export const dbUtils = {
  // Check if IndexedDB is supported
  isSupported(): boolean {
    return typeof indexedDB !== "undefined";
  },

  // Get database size estimate (if supported)
  async getStorageEstimate(): Promise<{
    quota?: number;
    usage?: number;
  } | null> {
    if ("storage" in navigator && "estimate" in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        return {
          quota: estimate.quota,
          usage: estimate.usage,
        };
      } catch (error) {
        console.warn("Failed to get storage estimate:", error);
      }
    }
    return null;
  },

  // Clear all data
  async clearAllData(): Promise<void> {
    await Promise.all([reportsDB.clearReports(), offlineQueueDB.clearQueue()]);
    console.log("✅ All offline data cleared");
  },
};

// Initialize database on module load (in browser environment)
if (typeof window !== "undefined" && dbUtils.isSupported()) {
  initDB().catch(console.error);
}

const dbModule = {
  initDB,
  reportsDB,
  categoriesDB,
  offlineQueueDB,
  syncStatusDB,
  dbUtils,
};

export default dbModule;
