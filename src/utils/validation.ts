/**
 * Clinical Input Validation Utilities
 */

// Field ranges: { normal threshold, absolute max }
// Values above normal show red (abnormal), values above absolute are blocked
export const FIELD_RANGES = {
  pd: { normal: 10, absolute: 99 },
  rec: { normal: 10, absolute: 99 },
  cal: { normal: 10, absolute: 99 },
  mo: { normal: 3, absolute: 3 }, // Miller's Classification: 0-3 only
  ktw: { normal: 5, absolute: 20 },
  furcation: { normal: 3, absolute: 3 },
} as const;

// Mobility valid values (Miller's Classification)
export const MOBILITY_VALID_VALUES = [0, 1, 2, 3];

type FieldKey = keyof typeof FIELD_RANGES;

export const getFieldKey = (fieldName: string): FieldKey | null => {
  const name = fieldName.toLowerCase();
  if (name === "pd") return "pd";
  if (name === "rec" || name === "recession") return "rec";
  if (name === "cal") return "cal";
  if (name === "mo" || name === "mobility") return "mo";
  if (name === "ktw" || name === "keratinized") return "ktw";
  if (name === "fur" || name === "furcation") return "furcation";
  return null;
};

export const filterNumericInput = (value: string, allowNegative = false): string => {
  if (!value) return "";
  let result = "";
  let hasNegative = false;

  for (let i = 0; i < value.length; i++) {
    const char = value[i];
    if (allowNegative && char === "-" && !hasNegative && i === 0) {
      result += char;
      hasNegative = true;
    } else if (/^[0-9]$/.test(char)) {
      result += char;
    }
  }

  // Strip leading zeros for multi-digit numbers, keeping single "0" or "-0".
  while (result.startsWith("0") && result.length > 1) {
    result = result.substring(1);
  }
  while (result.startsWith("-0") && result.length > 2) {
    result = "-" + result.substring(2);
  }

  return result;
};

export const isAbnormalValue = (value: string, fieldName: string): boolean => {
  const fieldKey = getFieldKey(fieldName);
  if (!fieldKey) return false;

  const num = parseInt(value) || 0;
  const range = FIELD_RANGES[fieldKey];
  return num > range.normal && num <= range.absolute;
};

export const exceedsAbsoluteLimit = (value: string, fieldName: string): boolean => {
  const fieldKey = getFieldKey(fieldName);
  if (!fieldKey) return false;

  const num = parseInt(value) || 0;
  return num > FIELD_RANGES[fieldKey].absolute;
};

export const getFieldDisplayName = (fieldName: string): string => {
  const name = fieldName.toLowerCase();
  if (name === "pd") return "PD";
  if (name === "rec" || name === "recession") return "REC";
  if (name === "cal") return "CAL";
  if (name === "mo" || name === "mobility") return "Mobility";
  if (name === "ktw" || name === "keratinized") return "KTW";
  return fieldName.toUpperCase();
};
