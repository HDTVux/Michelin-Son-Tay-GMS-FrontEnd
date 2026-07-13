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
    return { value: normalized, error: `${fieldLabel} không hợp lệ. Mẫu đúng: xx + ký tự + xxxxx (VD: 29A12345).` };
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

/**
 * Validate a non-negative number (>= 0).
 * If not required, empty input returns success with value: null.
 *
 * @param {unknown} value
 * @param {{ fieldLabel?: string, required?: boolean, integer?: boolean }} [options]
 * @returns {{ value: number|null, error: string }}
 */
export function validateNonNegativeNumber(
  value,
  { fieldLabel = 'Giá trị', required = false, integer = false } = {}
) {
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
  if (n < 0) {
    return { value: n, error: `${fieldLabel} không được nhỏ hơn 0.` };
  }
  if (integer && !Number.isInteger(n)) {
    return { value: n, error: `${fieldLabel} phải là số nguyên.` };
  }

  return { value: n, error: '' };
}

/**
 * Validate percent input (e.g., tax rate) within a range.
 *
 * @param {unknown} value
 * @param {{ fieldLabel?: string, required?: boolean, min?: number, max?: number, maxDecimals?: number }} [options]
 * @returns {{ value: number|null, error: string }}
 */
export function validatePercentNumber(
  value,
  { fieldLabel = 'Phần trăm', required = true, min = 0, max = 100, maxDecimals = 2 } = {}
) {
  let raw = '';
  if (typeof value === 'number') raw = String(value);
  else if (typeof value === 'string') raw = value.trim();
  if (!raw) {
    return required ? { value: null, error: `${fieldLabel} là bắt buộc.` } : { value: null, error: '' };
  }

  const normalized = raw.replace(',', '.');
  const formatError = validatePercentFormat(normalized, fieldLabel);
  if (formatError) return { value: null, error: formatError };

  const n = Number(normalized);
  if (!Number.isFinite(n)) return { value: null, error: `${fieldLabel} không hợp lệ.` };

  const rangeError = validateNumberRange(n, { min, max, fieldLabel });
  if (rangeError) return { value: n, error: rangeError };

  const decimalsError = validateMaxDecimals(normalized, { maxDecimals, fieldLabel });
  if (decimalsError) return { value: n, error: decimalsError };

  return { value: n, error: '' };
}

function validatePercentFormat(normalized, fieldLabel) {
  // Accept digits with optional decimal part
  if (!/^\d+(?:\.\d+)?$/.test(normalized)) return `${fieldLabel} không hợp lệ.`;
  return '';
}

function validateNumberRange(n, { min, max, fieldLabel }) {
  const hasMin = typeof min === 'number' && Number.isFinite(min);
  const hasMax = typeof max === 'number' && Number.isFinite(max);
  if (hasMin && hasMax && (n < min || n > max)) return `${fieldLabel} phải từ ${min} đến ${max}.`;
  if (hasMin && !hasMax && n < min) return `${fieldLabel} phải từ ${min}.`;
  if (!hasMin && hasMax && n > max) return `${fieldLabel} không được lớn hơn ${max}.`;
  return '';
}

function validateMaxDecimals(normalized, { maxDecimals, fieldLabel }) {
  if (typeof maxDecimals !== 'number' || maxDecimals < 0) return '';
  const parts = normalized.split('.');
  const decimals = parts.length > 1 ? parts[1] : '';
  if (decimals.length <= maxDecimals) return '';
  return `${fieldLabel} tối đa ${maxDecimals} chữ số thập phân.`;
}

/**
 * Domain helpers for Tax Rules.
 */
export function validateTaxName(value, { required = true, maxLength = 255 } = {}) {
  return validateTextInput(value, {
    fieldLabel: 'Tên thuế',
    required,
    trim: true,
    maxLength,
  });
}

export function validateTaxRatePercent(value, { required = true } = {}) {
  return validatePercentNumber(value, {
    fieldLabel: 'Thuế suất',
    required,
    min: 0,
    max: 100,
    maxDecimals: 2,
  });
}

/**
 * Validate year-like input: digits only and exact number of digits.
 *
 * @param {unknown} value
 * @param {{ fieldLabel?: string, required?: boolean, digits?: number, min?: number, max?: number }} [options]
 * @returns {{ value: number|null, error: string }}
 */
export function validateFixedDigitsYear(
  value,
  { fieldLabel = 'Năm sản xuất', required = true, digits = 4, min = 1900, max = 9999 } = {}
) {
  const normalized = normalizeTextInput(value, { trim: true });

  if (!normalized) {
    return required ? { value: null, error: `${fieldLabel} là bắt buộc.` } : { value: null, error: '' };
  }

  if (!/^\d+$/.test(normalized)) {
    return { value: null, error: `${fieldLabel} chỉ được chứa chữ số.` };
  }

  if (normalized.length !== digits) {
    return { value: null, error: `${fieldLabel} phải có đúng ${digits} chữ số.` };
  }

  const year = Number(normalized);
  if (!Number.isInteger(year)) {
    return { value: null, error: `${fieldLabel} không hợp lệ.` };
  }
  if (year < min || year > max) {
    return { value: year, error: `${fieldLabel} phải trong khoảng ${min}-${max}.` };
  }

  return { value: year, error: '' };
}

/**
 * Helper to parse number, handling comma as decimal separator.
 *
 * @param {unknown} value
 * @returns {number}
 */
export function readNumber(value) {
  let stringValue = '';
  if (typeof value === 'number') {
    stringValue = String(value);
  } else if (typeof value === 'string') {
    stringValue = value ?? '';
  }
  const num = Number(stringValue.trim().replaceAll(',', ''));
  return Number.isFinite(num) ? num : Number.NaN;
}

/**
 * Validate supplier name for warehouse stock entry.
 *
 * @param {unknown} value
 * @param {{ maxLength?: number }} [options]
 * @returns {{ valid: boolean, error: string }}
 */
export function validateSupplierName(value, { maxLength = 100 } = {}) {
  let stringValue = '';
  if (typeof value === 'string') {
    stringValue = value ?? '';
  } else if (typeof value === 'number') {
    stringValue = String(value);
  }
  const trimmed = stringValue.trim();
  if (!trimmed) return { valid: false, error: 'Nhà cung cấp không được để trống' };
  if (trimmed.length > maxLength) {
    return { valid: false, error: `Nhà cung cấp tối đa ${maxLength} ký tự` };
  }
  return { valid: true, error: '' };
}

/**
 * Validate notes field for warehouse stock entry.
 *
 * @param {unknown} value
 * @param {{ maxLength?: number }} [options]
 * @returns {{ valid: boolean, error: string }}
 */
export function validateNotes(value, { maxLength = 500 } = {}) {
  let stringValue = '';
  if (typeof value === 'string') {
    stringValue = value ?? '';
  } else if (typeof value === 'number') {
    stringValue = String(value);
  }
  const trimmed = stringValue.trim();
  if (trimmed.length > maxLength) {
    return { valid: false, error: `Ghi chú tối đa ${maxLength} ký tự` };
  }
  return { valid: true, error: '' };
}

/**
 * Validate quantity for warehouse stock entry.
 *
 * @param {unknown} value
 * @param {{ maxValue?: number }} [options]
 * @returns {{ valid: boolean, error: string }}
 */
export function validateWarehouseQuantity(value, { maxValue = 999999 } = {}) {
  const num = readNumber(value);
  if (!Number.isFinite(num) || num <= 0) {
    return { valid: false, error: 'Số lượng phải > 0' };
  }
  if (num > maxValue) {
    return { valid: false, error: `Số lượng tối đa ${maxValue}` };
  }
  if (!Number.isInteger(num)) {
    return { valid: false, error: 'Số lượng phải là số nguyên' };
  }
  return { valid: true, error: '' };
}

/**
 * Validate import price for warehouse stock entry.
 *
 * @param {unknown} value
 * @param {{ maxValue?: number }} [options]
 * @returns {{ valid: boolean, error: string }}
 */
export function validateWarehouseImportPrice(value, { maxValue = 999999999 } = {}) {
  const num = readNumber(value);
  if (!Number.isFinite(num) || num < 0) {
    return { valid: false, error: 'Giá nhập phải >= 0' };
  }
  if (num > maxValue) {
    return { valid: false, error: `Giá nhập tối đa ${maxValue}` };
  }
  return { valid: true, error: '' };
}

/**
 * Validate markup multiplier for warehouse stock entry.
 *
 * @param {unknown} value
 * @param {{ maxValue?: number }} [options]
 * @returns {{ valid: boolean, error: string }}
 */
export function validateWarehouseMarkupMultiplier(value, { maxValue = 999.99 } = {}) {
  if (value === '' || value === null || value === undefined) {
    return { valid: true, error: '' };
  }
  const num = readNumber(value);
  if (!Number.isFinite(num) || num < 0) {
    return { valid: false, error: 'Mức lợi nhuận phải >= 0' };
  }
  if (num > maxValue) {
    return { valid: false, error: `Mức lợi nhuận tối đa ${maxValue}` };
  }
  return { valid: true, error: '' };
}

/**
 * Validate estimate/row quantity (used in advisor/estimate rows).
 * Ensures integer, >0 and within allowed max.
 */
export function validateEstimateQuantity(value, { required = true, maxValue = 999999 } = {}) {
  const num = readNumber(value);
  if (!Number.isFinite(num)) {
    return { valid: !required, error: required ? 'Số lượng không hợp lệ' : '' };
  }
  if (num <= 0) return { valid: false, error: 'Số lượng phải > 0' };
  if (!Number.isInteger(num)) return { valid: false, error: 'Số lượng phải là số nguyên' };
  if (num > maxValue) return { valid: false, error: `Số lượng tối đa ${maxValue}` };
  return { valid: true, error: '' };
}

/**
 * Validate estimate/row unit price.
 * Allows decimals (default 2) and enforces non-negative and max value.
 */
export function validateEstimateUnitPrice(
  value,
  { required = false, maxValue = 999999999, maxDecimals = 2 } = {},
) {
  const raw = typeof value === 'string' ? value.replaceAll(',', '.') : String(value);
  if (!raw || raw === '.') return required ? { valid: false, error: 'Đơn giá là bắt buộc' } : { valid: true, error: '' };
  // basic numeric format check
  if (!/^\d+(?:\.\d+)?$/.test(raw)) return { valid: false, error: 'Đơn giá không hợp lệ' };
  const parts = raw.split('.');
  const decimals = parts.length > 1 ? parts[1] : '';
  if (decimals.length > maxDecimals) return { valid: false, error: `Đơn giá tối đa ${maxDecimals} chữ số thập phân` };
  const num = Number(raw);
  if (!Number.isFinite(num)) return { valid: false, error: 'Đơn giá không hợp lệ' };
  if (num < 0) return { valid: false, error: 'Đơn giá phải >= 0' };
  if (num > maxValue) return { valid: false, error: `Đơn giá tối đa ${maxValue}` };
  return { valid: true, error: '' };
}
