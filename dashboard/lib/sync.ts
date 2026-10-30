import { 
  getDB, 
  getPendingOutbox, 
  removeOutboxItem, 
  cacheWords, 
  cacheParallelPairs, 
  cacheAudioItems, 
  cacheSeasonsData, 
  setLocalSmartHomeDevice 
} from "./db";

export type ConnectionState = "connected" | "disconnected" | "syncing";

class ThithoSyncEngine extends EventTarget {
  private status: ConnectionState = "disconnected";
  private isChecking: boolean = false;
  private timer: any = null;
  private pendingOutboxCount: number = 0;

  constructor() {
    super();
  }

  public getStatus(): ConnectionState {
    return this.status;
  }

  public getPendingCount(): number {
    return this.pendingOutboxCount;
  }

  public start() {
    if (typeof window === "undefined") return;
    if (this.timer) return;

    // Run immediate check then interval
    this.checkHealthAndSync();
    this.timer = setInterval(() => {
      this.checkHealthAndSync();
    }, 4000);
  }

  public stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  public async checkHealthAndSync(): Promise<boolean> {
    if (this.isChecking) return this.status === "connected";
    this.isChecking = true;

    try {
      const res = await fetch("/api/bridge/health", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        this.setStatus("connected");

        // Pre-warm local cache on initial connection if needed
        await this.preWarmLocalCache();

        // Process any queued actions in outbox
        await this.flushOutbox();
        this.isChecking = false;
        return true;
      } else {
        this.setStatus("disconnected");
      }
    } catch (err) {
      this.setStatus("disconnected");
    } finally {
      this.isChecking = false;
      this.updateOutboxCount();
    }
    return false;
  }

  private setStatus(newStatus: ConnectionState) {
    if (this.status !== newStatus) {
      this.status = newStatus;
      this.dispatchEvent(new CustomEvent("statusChange", { detail: { status: this.status } }));
    }
  }

  private async updateOutboxCount() {
    try {
      const items = await getPendingOutbox();
      this.pendingOutboxCount = items.length;
      this.dispatchEvent(new CustomEvent("outboxChange", { detail: { count: this.pendingOutboxCount } }));
    } catch (e) {
      // Ignore in SSR
    }
  }

  private async flushOutbox() {
    try {
      const pending = await getPendingOutbox();
      if (pending.length === 0) return;

      this.setStatus("syncing");
      for (const item of pending) {
        try {
          if (item.type === "SMARTHOME_COMMAND") {
            await fetch("/api/bridge/edge/smarthome", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(item.payload),
            });
          } else if (item.type === "TRANSLATE") {
            await fetch("/api/bridge/translate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(item.payload),
            });
          }
          if (item.id) {
            await removeOutboxItem(item.id);
          }
        } catch (e) {
          // Keep in queue for next flush
          break;
        }
      }
      this.setStatus("connected");
      this.updateOutboxCount();
    } catch (e) {
      console.warn("Outbox flush warning:", e);
    }
  }

  private async preWarmLocalCache() {
    try {
      // 1. Pre-warm Dictionary
      const dictRes = await fetch("/api/bridge/dictionary?q=&limit=100");
      if (dictRes.ok) {
        const dictData = await dictRes.json();
        if (dictData.results && dictData.results.length > 0) {
          await cacheWords(dictData.results);
        }
      }

      // 2. Pre-warm Parallel Corpus
      const parallelRes = await fetch("/api/bridge/parallel?limit=100");
      if (parallelRes.ok) {
        const pData = await parallelRes.json();
        if (pData.results && pData.results.length > 0) {
          await cacheParallelPairs(pData.results);
        }
      }

      // 3. Pre-warm Audio Corpus
      const audioRes = await fetch("/api/bridge/audio?limit=50");
      if (audioRes.ok) {
        const aData = await audioRes.json();
        if (aData.results && aData.results.length > 0) {
          await cacheAudioItems(aData.results);
        }
      }

      // 4. Pre-warm Agricultural Seasons
      const seasonsRes = await fetch("/api/bridge/edge/agriculture/seasons");
      if (seasonsRes.ok) {
        const sData = await seasonsRes.json();
        await cacheSeasonsData(sData);
      }

      // 5. Pre-warm Smart Home Device States
      const shRes = await fetch("/api/bridge/edge/smarthome/devices");
      if (shRes.ok) {
        const devData = await shRes.json();
        for (const [key, val] of Object.entries(devData)) {
          const v = val as any;
          await setLocalSmartHomeDevice(key, v.state || "ACTIVE", v);
        }
      }
    } catch (e) {
      // Offline fallback will continue
    }
  }
}

export const syncEngine = new ThithoSyncEngine();
