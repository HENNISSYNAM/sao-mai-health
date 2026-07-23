import JSZip from "jszip";
import { saveAs } from "file-saver";
import { supabase } from "@/integrations/supabase/client";
import type { NlpEntity } from "@/components/shared/ClinicalNlpPanel";

export interface BatchItem {
  name: string;
  outName: string;
  text: string;
  status: "pending" | "running" | "done" | "error";
  entities?: NlpEntity[];
  error?: string;
  attempts?: number;
}

export interface RunOptions {
  verify?: boolean;     // false = fast mode, skip NIH lookup
  maxRetries?: number;  // per-item retry on 429/timeout
}

const LS_KEY = "clinical-nlp-batch-progress-v1";

/** Extract .txt files from a zip. */
export async function readZipAsTxtItems(file: File): Promise<BatchItem[]> {
  const zip = await JSZip.loadAsync(file);
  const items: BatchItem[] = [];
  const entries = Object.values(zip.files).filter((f) => !f.dir && /\.txt$/i.test(f.name));
  for (const entry of entries) {
    const text = await entry.async("string");
    const base = entry.name.split("/").pop() || entry.name;
    const outName = base.replace(/\.txt$/i, ".json");
    items.push({ name: base, outName, text, status: "pending" });
  }
  items.sort((a, b) => {
    const na = parseInt(a.name, 10);
    const nb = parseInt(b.name, 10);
    if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
    return a.name.localeCompare(b.name);
  });
  return items;
}

export async function readTxtFilesAsItems(files: File[]): Promise<BatchItem[]> {
  const items: BatchItem[] = [];
  for (const f of files) {
    const text = await f.text();
    const outName = f.name.replace(/\.txt$/i, ".json");
    items.push({ name: f.name, outName, text, status: "pending" });
  }
  return items;
}

function isRateLimitError(msg: string): boolean {
  return /429|rate limit|too many|thử lại sau/i.test(msg);
}

/** Run one item; returns updated item. */
export async function runOne(item: BatchItem, opts: RunOptions = {}): Promise<BatchItem> {
  const { verify = true } = opts;
  try {
    const { data, error } = await supabase.functions.invoke("clinical-nlp", {
      body: { text: item.text, source: "batch", verify },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return { ...item, status: "done", entities: data?.entities ?? [], error: undefined };
  } catch (e: any) {
    const msg = e?.message || String(e);
    return { ...item, status: "error", error: msg };
  }
}

/**
 * Adaptive concurrency runner:
 * - Starts at `concurrency`, halves on 429 bursts (min 1), doubles back on 20 consecutive successes.
 * - Per-item retry with exponential backoff on 429 / timeout.
 * - Persists progress to localStorage so users can resume after reload.
 */
export async function runBatch(
  items: BatchItem[],
  initialConcurrency: number,
  onUpdate: (idx: number, next: BatchItem) => void,
  opts: RunOptions = {},
): Promise<void> {
  const { maxRetries = 3, verify = true } = opts;
  let concurrency = Math.max(1, initialConcurrency);
  let cursor = 0;
  let consecutiveOk = 0;
  let recent429 = 0;

  const active = new Set<Promise<void>>();

  const runIdx = async (idx: number) => {
    let attempts = 0;
    let last: BatchItem = items[idx];
    onUpdate(idx, { ...last, status: "running", attempts: 0 });

    while (attempts <= maxRetries) {
      attempts++;
      const next = await runOne(items[idx], { verify });
      if (next.status === "done") {
        onUpdate(idx, { ...next, attempts });
        consecutiveOk++;
        if (consecutiveOk >= 20 && concurrency < initialConcurrency) {
          concurrency = Math.min(initialConcurrency, concurrency + 1);
          consecutiveOk = 0;
        }
        return;
      }
      // error
      const rate = isRateLimitError(next.error || "");
      if (rate) {
        recent429++;
        consecutiveOk = 0;
        // Adaptive backoff: shrink concurrency on burst
        if (recent429 >= 3 && concurrency > 1) {
          concurrency = Math.max(1, Math.floor(concurrency / 2));
          recent429 = 0;
        }
        if (attempts <= maxRetries) {
          const wait = Math.min(15000, 800 * Math.pow(2, attempts - 1)) + Math.random() * 400;
          onUpdate(idx, { ...next, status: "running", error: `429, retry ${attempts}/${maxRetries} in ${Math.round(wait)}ms`, attempts });
          await new Promise((r) => setTimeout(r, wait));
          continue;
        }
      }
      onUpdate(idx, { ...next, attempts });
      return;
    }
  };

  // Worker loop that respects dynamic `concurrency`
  const spawn = async () => {
    while (cursor < items.length) {
      // Wait if we're at the current cap
      while (active.size >= concurrency && active.size > 0) {
        await Promise.race(active);
      }
      if (cursor >= items.length) break;
      const idx = cursor++;
      if (items[idx].status === "done") continue; // resume support
      const p = runIdx(idx).finally(() => active.delete(p));
      active.add(p);
    }
    await Promise.all(active);
  };

  await spawn();
}

export interface PackOptions {
  /**
   * How the [start, end] char span is written:
   *  - false (default): end-EXCLUSIVE, i.e. [start, start+len) — Python-slice convention.
   *  - true: end-INCLUSIVE, i.e. [start, start+len-1] — the last character's index.
   * The problem statement ("vị trí ... kết thúc ... từ 0 đến n-1") is ambiguous; ship both
   * and pick whichever scores on the leaderboard. Entities are stored end-exclusive.
   */
  endInclusive?: boolean;
  filename?: string;
}

/**
 * Package results as submission.zip and download.
 * ALWAYS writes one .json per input file (empty [] for not-done items) so the archive
 * contains all N records — a missing file can fail the whole submission.
 */
export async function packSubmission(items: BatchItem[], opts: PackOptions = {}) {
  const { endInclusive = false, filename = "submission.zip" } = opts;
  const zip = new JSZip();
  for (const it of items) {
    const entities = it.status === "done" && it.entities ? it.entities : [];
    const out = endInclusive
      ? entities.map((e) => ({
          ...e,
          position: [e.position[0], Math.max(e.position[0], e.position[1] - 1)] as [number, number],
        }))
      : entities;
    zip.file(it.outName, JSON.stringify(out, null, 2));
  }
  const blob = await zip.generateAsync({ type: "blob" });
  saveAs(blob, filename);
}

// ---------------- Persistent progress (resume) ----------------

interface Snapshot {
  ts: number;
  items: Array<Pick<BatchItem, "name" | "outName" | "text" | "status" | "entities" | "error">>;
}

export function saveSnapshot(items: BatchItem[]) {
  try {
    const snap: Snapshot = {
      ts: Date.now(),
      items: items.map(({ name, outName, text, status, entities, error }) => ({
        name, outName, text,
        // reset running -> pending so next load can resume
        status: status === "running" ? "pending" : status,
        entities, error,
      })),
    };
    localStorage.setItem(LS_KEY, JSON.stringify(snap));
  } catch { /* ignore quota errors */ }
}

export function loadSnapshot(): BatchItem[] | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const snap: Snapshot = JSON.parse(raw);
    if (!Array.isArray(snap.items)) return null;
    return snap.items.map((i) => ({ ...i, status: i.status === "running" ? "pending" : i.status }));
  } catch { return null; }
}

export function clearSnapshot() {
  try { localStorage.removeItem(LS_KEY); } catch { /* */ }
}
