export interface AlertClassification {
  category: string;
  icon: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  summary: string;
}

const VALID_ALERT_DISEASE_CODES = new Set([
  'dengue',
  'covid',
  'food_poisoning',
  'hand_foot_mouth',
  'measles',
  'influenza',
  'ari',
]);

export const DISEASE_CATEGORIES = new Set([
  'dengue',
  'covid',
  'food_poisoning',
  'hand_foot_mouth',
  'measles',
]);

export const getPrecisionLevel = (accuracy: number | null) => {
  if (typeof accuracy !== 'number') return 'low';
  if (accuracy <= 25) return 'high';
  if (accuracy <= 100) return 'medium';
  return 'low';
};

export const normalizeClassification = (
  value: Partial<AlertClassification> | null | undefined
): AlertClassification => {
  const safeSeverity: AlertClassification['severity'] =
    value?.severity === 'critical' ||
    value?.severity === 'high' ||
    value?.severity === 'medium' ||
    value?.severity === 'low'
      ? value.severity
      : 'medium';

  return {
    category: value?.category || 'unknown',
    icon: value?.icon || '⚠️',
    severity: safeSeverity,
    summary: value?.summary || '',
  };
};

export const getSyntheticCasesBySeverity = (severity: string) => {
  switch (severity) {
    case 'critical':
      return 45;
    case 'high':
      return 25;
    case 'medium':
      return 15;
    default:
      return 8;
  }
};

export const mapCategoryToDiseaseCode = (category: string) => {
  if (
    category === 'pollution' ||
    category === 'flood' ||
    category === 'animal_bite' ||
    category === 'unknown'
  ) {
    return 'ari';
  }

  if (!VALID_ALERT_DISEASE_CODES.has(category)) {
    return 'ari';
  }

  return category;
};
