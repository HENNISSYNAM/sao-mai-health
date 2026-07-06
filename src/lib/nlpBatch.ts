import JSZip from "jszip";
import { saveAs } from "file-saver";
import { supabase } from "@/integrations/supabase/client";
import type { NlpEntity } from "@/components/shared/ClinicalNlpPanel";

export interface BatchItem {
  name: string;          // "1.txt"
  outName: string;       // "1.json"
  text: string;
  status: "pending" | "running" | "done" | "error";
  entities?: NlpEntity[];
  error?: string;
}

/** Extract .txt files from a zip. Accepts arbitrary folder nesting; keeps basename. */
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

/** Run one item through the edge function. */
export async function runOne(item: BatchItem): Promise<BatchItem> {
  try {
    const { data, error } = await supabase.functions.invoke("clinical-nlp", {
      body: { text: item.text, source: "batch" },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return { ...item, status: "done", entities: data?.entities ?? [] };
  } catch (e: any) {
    return { ...item, status: "error", error: e?.message || String(e) };
  }
}

/** Concurrency-limited runner with per-item callback. */
export async function runBatch(
  items: BatchItem[],
  concurrency: number,
  onUpdate: (idx: number, next: BatchItem) => void,
): Promise<void> {
  let cursor = 0;
  const workers: Promise<void>[] = [];
  for (let w = 0; w < concurrency; w++) {
    workers.push((async () => {
      while (true) {
        const idx = cursor++;
        if (idx >= items.length) return;
        onUpdate(idx, { ...items[idx], status: "running" });
        const next = await runOne(items[idx]);
        onUpdate(idx, next);
      }
    })());
  }
  await Promise.all(workers);
}

/** Package results as submission.zip and download. */
export async function packSubmission(items: BatchItem[], filename = "submission.zip") {
  const zip = new JSZip();
  for (const it of items) {
    if (it.status === "done" && it.entities) {
      zip.file(it.outName, JSON.stringify(it.entities, null, 2));
    }
  }
  const blob = await zip.generateAsync({ type: "blob" });
  saveAs(blob, filename);
}
