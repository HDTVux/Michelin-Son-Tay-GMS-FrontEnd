export function normalizeTextInput(value, { trim = true } = {}) {
  const raw = value == null ? '' : String(value);
  return trim ? raw.trim() : raw;
}

/**
 * Generic reusable text validator.
 * Rules: trim, empty check (required), max length.
 *
 * @param {unknown} value
 * @param {{
 *  fieldLabel?: string,
 *  required?: boolean,
 *  trim?: boolean,
 *  maxLength?: number,
 * }} [options]
 * @returns {{ value: string, error: string }}
 */
export function validateTextInput(
  value,
  { fieldLabel = 'Giá trị', required = false, trim = true, maxLength = 255 } = {}
) {
  const normalized = normalizeTextInput(value, { trim });

  if (required && !normalized) {
    return { value: normalized, error: `${fieldLabel} là bắt buộc.` };
  }

  if (typeof maxLength === 'number' && maxLength >= 0 && normalized.length > maxLength) {
    return { value: normalized, error: `${fieldLabel} tối đa ${maxLength} ký tự.` };
  }

  return { value: normalized, error: '' };
}

/**
 * Validate license plate with pattern: xx-<char>-xxxxx (x is digit 0-9).
 * Example: 29-A-12345
 *
 * @param {unknown} value
 * @param {{ fieldLabel?: string, required?: boolean }} [options]
 * @returns {{ value: string, error: string }}
 */
export function validateLicensePlateStrict(value, { fieldLabel = 'Biển số xe', required = true } = {}) {
  const normalized = normalizeTextInput(value, { trim: true }).toUpperCase().replaceAll(/\s+/g, '');

  if (required && !normalized) {
    return { value: normalized, error: `${fieldLabel} là bắt buộc.` };
  }

  if (!normalized) {
    return { value: normalized, error: '' };
  }

  const ok = /^\d{2}[A-Z]\d{5}$/.test(normalized);
  if (!ok) {
    return { value: normalized, error: `${fieldLabel} không hợp lệ. Mẫu đúng: xx-ký tự-xxxxx (VD: 29-A-12345).` };
  }

  return { value: normalized, error: '' };
}

/**
 * Validate a positive number (optionally integer).
 * If not required, empty input returns success with value: null.
 *
 * @param {unknown} value
 * @param {{ fieldLabel?: string, required?: boolean, integer?: boolean }} [options]
 * @returns {{ value: number|null, error: string }}
 */
export function validatePositiveNumber(value, { fieldLabel = 'Giá trị', required = false, integer = true } = {}) {
  let raw = '';
  if (typeof value === 'number') raw = String(value);
  else if (typeof value === 'string') raw = value.trim();

  if (!raw) {
    return required ? { value: null, error: `${fieldLabel} là bắt buộc.` } : { value: null, error: '' };
  }

  const n = Number(raw);
  if (!Number.isFinite(n)) {
    return { value: null, error: `${fieldLabel} không hợp lệ.` };
  }
  if (n <= 0) {
    return { value: n, error: `${fieldLabel} phải là số dương.` };
  }
  if (integer && !Number.isInteger(n)) {
    return { value: n, error: `${fieldLabel} phải là số nguyên dương.` };
  }
  return { value: n, error: '' };
}
