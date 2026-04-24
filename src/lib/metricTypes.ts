/**
 * Unified Metric Type System
 *
 * Three distinct types of health metrics — NEVER mix under the same label.
 * Each has its own icon, color, and Vietnamese label.
 */

import { Stethoscope, Newspaper, Sparkles, type LucideIcon } from "lucide-react";

export type MetricType = "confirmed" | "news" | "ai";

export interface MetricTypeMeta {
  id: MetricType;
  icon: LucideIcon;
  /** Tailwind color tokens (text + bg + border) */
  colorClass: string;
  textClass: string;
  bgClass: string;
  borderClass: string;
  /** Hex/HSL for inline styles (charts, icons that need raw color) */
  hex: string;
  labelVi: string;
  labelEn: string;
  unitVi: string;
  unitEn: string;
  shortLabelVi: string;
  shortLabelEn: string;
  /** Tooltip explanation */
  descriptionVi: string;
  descriptionEn: string;
  /** Default source label */
  defaultSourceVi: string;
  defaultSourceEn: string;
}

export const METRIC_TYPES: Record<MetricType, MetricTypeMeta> = {
  confirmed: {
    id: "confirmed",
    icon: Stethoscope,
    colorClass: "text-blue-600",
    textClass: "text-blue-600 dark:text-blue-400",
    bgClass: "bg-blue-500/10",
    borderClass: "border-blue-500/30",
    hex: "hsl(217, 91%, 60%)",
    labelVi: "Ca xác nhận lâm sàng",
    labelEn: "Confirmed clinical cases",
    unitVi: "ca",
    unitEn: "cases",
    shortLabelVi: "ca xác nhận",
    shortLabelEn: "confirmed",
    descriptionVi:
      "Số ca bệnh đã được cơ sở y tế xác nhận và báo cáo chính thức. Dữ liệu từ Bộ Y tế và hệ thống giám sát dịch tễ.",
    descriptionEn:
      "Cases officially confirmed and reported by health facilities. Data from Ministry of Health and surveillance systems.",
    defaultSourceVi: "Bộ Y tế · HCDC",
    defaultSourceEn: "Ministry of Health · HCDC",
  },
  news: {
    id: "news",
    icon: Newspaper,
    colorClass: "text-amber-600",
    textClass: "text-amber-600 dark:text-amber-400",
    bgClass: "bg-amber-500/10",
    borderClass: "border-amber-500/30",
    hex: "hsl(38, 92%, 50%)",
    labelVi: "Tín hiệu từ tin tức / mạng xã hội",
    labelEn: "Signals from news / social media",
    unitVi: "tín hiệu",
    unitEn: "signals",
    shortLabelVi: "tín hiệu",
    shortLabelEn: "signals",
    descriptionVi:
      "Tín hiệu thô được trích xuất từ tin tức và mạng xã hội bằng AI. Chưa qua xác minh lâm sàng — chỉ dùng để cảnh báo sớm.",
    descriptionEn:
      "Raw signals extracted from news and social media by AI. Not clinically verified — for early warning only.",
    defaultSourceVi: "Tin tức + AI Gemini",
    defaultSourceEn: "News + AI Gemini",
  },
  ai: {
    id: "ai",
    icon: Sparkles,
    colorClass: "text-purple-600",
    textClass: "text-purple-600 dark:text-purple-400",
    bgClass: "bg-purple-500/10",
    borderClass: "border-purple-500/30",
    hex: "hsl(271, 81%, 56%)",
    labelVi: "Dự đoán AI",
    labelEn: "AI predictions",
    unitVi: "dự đoán",
    unitEn: "predictions",
    shortLabelVi: "dự đoán",
    shortLabelEn: "predictions",
    descriptionVi:
      "Số ca dự kiến do mô hình AI tính toán dựa trên xu hướng dịch tễ, môi trường và tin tức. Có biên độ sai số.",
    descriptionEn:
      "Predicted cases computed by AI based on epidemiological trends, environment, and news. Has error margin.",
    defaultSourceVi: "AI Gemini × Mô hình dịch tễ",
    defaultSourceEn: "AI Gemini × Epidemiological model",
  },
};

/** Format a number with Vietnamese thousand separator (300066 → "300.066") */
export function formatMetric(value: number, locale: string = "vi-VN"): string {
  return value.toLocaleString(locale);
}

/** Format timestamp as "HH:mm DD/MM" */
export function formatUpdateTime(date: Date | string | number, locale: string = "vi-VN"): string {
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
  const time = d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  const dm = d.toLocaleDateString(locale, { day: "2-digit", month: "2-digit" });
  return `${time} ${dm}`;
}
