import { useEffect, useState } from "react";

const BASE_BLOCK = 184_392;
const startTs = Date.now();

export function useBlockHeight() {
  const [height, setHeight] = useState(BASE_BLOCK + Math.floor((Date.now() - startTs) / 6000));
  useEffect(() => {
    const id = setInterval(() => {
      setHeight(BASE_BLOCK + Math.floor((Date.now() - startTs) / 6000));
    }, 6000);
    return () => clearInterval(id);
  }, []);
  return height;
}

export async function sha256Hex(input: string): Promise<string> {
  const enc = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function mockTxHash(payload: unknown): Promise<string> {
  const h = await sha256Hex(JSON.stringify(payload) + crypto.randomUUID());
  return "0x" + h.slice(0, 64);
}

export async function mockIpfsHash(payload: unknown): Promise<string> {
  const h = await sha256Hex(JSON.stringify(payload));
  // CIDv0-style mock prefix
  return "Qm" + h.slice(0, 44);
}

export function shortHash(hash: string, head = 6, tail = 4): string {
  if (!hash) return "";
  if (hash.length <= head + tail + 3) return hash;
  return `${hash.slice(0, head)}…${hash.slice(-tail)}`;
}

export function formatVND(amount: number): string {
  return new Intl.NumberFormat("vi-VN").format(amount) + " ₫";
}

export function formatHTC(amount: number): string {
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(amount) + " HTC";
}
