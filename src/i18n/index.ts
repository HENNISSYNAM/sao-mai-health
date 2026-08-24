import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import vi from './locales/vi.json';
import zhHK from './locales/zh-HK.json';

export const resources = {
  en:    { translation: en },
  vi:    { translation: vi },
  'zh-HK': { translation: zhHK },
  // Aliases so zh, zh-TW, zh-HK browser tags all resolve to Traditional Chinese
  zh:    { translation: zhHK },
  'zh-TW': { translation: zhHK },
  'zh-Hant': { translation: zhHK },
} as const;

export const supportedLanguages = [
  // HK-first priority: Traditional Chinese first in the list
  { code: 'zh-HK', name: '繁體中文', flag: '🇭🇰', nativeName: '廣東話' },
  { code: 'en',    name: 'English',   flag: '🇬🇧' },
  { code: 'vi',    name: 'Tiếng Việt', flag: '🇻🇳' },
] as const;

/**
 * Detect the best language for the current user.
 * Priority: zh-HK / zh-TW / zh → 'zh-HK'
 *           en                  → 'en'
 *           vi                  → 'vi'
 *           else                → 'en'  (fallback)
 */
function detectBestLanguage(): string {
  // 1. Check explicit user choice stored in localStorage
  const stored = localStorage.getItem('i18nextLng');
  if (stored && ['zh-HK', 'zh', 'zh-TW', 'zh-Hant', 'en', 'vi'].includes(stored)) {
    return stored.startsWith('zh') ? 'zh-HK' : stored;
  }

  // 2. Check browser language preference (ordered list)
  const langs = navigator.languages ?? [navigator.language ?? 'en'];
  for (const lang of langs) {
    const l = lang.toLowerCase();
    if (l.startsWith('zh')) return 'zh-HK';
    if (l.startsWith('vi')) return 'vi';
    if (l.startsWith('en')) return 'en';
  }

  return 'en';
}

const initialLanguage = detectBestLanguage();

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    lng: initialLanguage,       // set resolved language immediately
    fallbackLng: 'en',
    defaultNS: 'translation',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
  });

/**
 * Switch language and persist choice.
 * Normalises any zh-* variant to 'zh-HK'.
 */
export function setLanguage(code: string) {
  const resolved = code.startsWith('zh') ? 'zh-HK' : code;
  localStorage.setItem('i18nextLng', resolved);
  i18n.changeLanguage(resolved);
}

export default i18n;

// ── Locale formatting utilities ─────────────────────────────────────────────

export const getLocaleConfig = (language: string) => {
  const configs: Record<string, {
    locale: string;
    dateFormat: string;
    currency: string;
    measurementSystem: 'metric' | 'imperial';
  }> = {
    'zh-HK': {
      locale: 'zh-HK',
      dateFormat: 'dd/MM/yyyy',
      currency: 'HKD',
      measurementSystem: 'metric',
    },
    zh: {
      locale: 'zh-HK',
      dateFormat: 'dd/MM/yyyy',
      currency: 'HKD',
      measurementSystem: 'metric',
    },
    en: {
      locale: 'en-HK',   // Hong Kong English conventions
      dateFormat: 'dd/MM/yyyy',
      currency: 'HKD',
      measurementSystem: 'metric',
    },
    vi: {
      locale: 'vi-VN',
      dateFormat: 'dd/MM/yyyy',
      currency: 'VND',
      measurementSystem: 'metric',
    },
  };
  return configs[language] ?? configs.en;
};

export const formatDate = (date: Date | string, language: string): string => {
  const config = getLocaleConfig(language);
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(config.locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

export const formatDateTime = (date: Date | string, language: string): string => {
  const config = getLocaleConfig(language);
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString(config.locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatNumber = (value: number, language: string): string => {
  const config = getLocaleConfig(language);
  return value.toLocaleString(config.locale);
};

export const formatCurrency = (value: number, language: string): string => {
  const config = getLocaleConfig(language);
  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: config.currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export const formatTemperature = (celsius: number, language: string): string => {
  return `${celsius.toFixed(1)}°C`;
};
