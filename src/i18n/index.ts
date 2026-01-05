import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import vi from './locales/vi.json';

export const resources = {
  en: { translation: en },
  vi: { translation: vi }
} as const;

export const supportedLanguages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' }
] as const;

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    defaultNS: 'translation',
    interpolation: {
      escapeValue: false
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage']
    }
  });

export default i18n;

// Locale formatting utilities
export const getLocaleConfig = (language: string) => {
  const configs: Record<string, {
    locale: string;
    dateFormat: string;
    currency: string;
    measurementSystem: 'metric' | 'imperial';
  }> = {
    en: {
      locale: 'en-US',
      dateFormat: 'MM/dd/yyyy',
      currency: 'USD',
      measurementSystem: 'imperial'
    },
    vi: {
      locale: 'vi-VN',
      dateFormat: 'dd/MM/yyyy',
      currency: 'VND',
      measurementSystem: 'metric'
    }
  };
  return configs[language] || configs.en;
};

export const formatDate = (date: Date | string, language: string): string => {
  const config = getLocaleConfig(language);
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(config.locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
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
    minute: '2-digit'
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
    maximumFractionDigits: 0
  }).format(value);
};

export const formatTemperature = (celsius: number, language: string): string => {
  const config = getLocaleConfig(language);
  if (config.measurementSystem === 'imperial') {
    const fahrenheit = (celsius * 9/5) + 32;
    return `${fahrenheit.toFixed(1)}°F`;
  }
  return `${celsius.toFixed(1)}°C`;
};
