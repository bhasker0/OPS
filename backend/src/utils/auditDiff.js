/**
 * Entity Mutation History & Change-Delta Tracking Utility
 * Computes deep attribute-level diffs with sensitive credential masking.
 */

const DEFAULT_IGNORED_KEYS = ['createdAt', 'updatedAt'];
const SENSITIVE_KEY_REGEX = /password|secret|token|api[_-]?key|auth/i;
const MASKED_PLACEHOLDER = '********';

/**
 * Check if a key is sensitive
 */
function isSensitiveKey(key, customMasked = []) {
  if (customMasked.includes(key)) return true;
  return SENSITIVE_KEY_REGEX.test(key);
}

/**
 * Deep equality checker for primitives, arrays, and plain objects
 */
function isEqual(a, b) {
  if (a === b) return true;
  if (a === null || a === undefined || b === null || b === undefined) return a === b;
  if (typeof a !== typeof b) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!isEqual(a[i], b[i])) return false;
    }
    return true;
  }

  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    for (const key of keysA) {
      if (!isEqual(a[key], b[key])) return false;
    }
    return true;
  }

  return false;
}

/**
 * Calculate field-level delta between pre-update and post-update entity states
 * @param {Object} beforeObj - State before mutation
 * @param {Object} afterObj - State after mutation
 * @param {Object} options - Configuration options (ignoreKeys, maskSensitive)
 * @returns {Object|null} Delta map { [field]: { old: val, new: val } } or null if identical
 */
function calculateDelta(beforeObj = {}, afterObj = {}, options = {}) {
  if (!beforeObj && !afterObj) return null;
  const before = beforeObj || {};
  const after = afterObj || {};

  const {
    ignoreKeys = DEFAULT_IGNORED_KEYS,
    customMasked = [],
    maskSensitive = true,
  } = options;

  const delta = {};
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

  for (const key of allKeys) {
    if (ignoreKeys.includes(key)) continue;

    const oldVal = before[key];
    const newVal = after[key];

    if (!isEqual(oldVal, newVal)) {
      const isSensitive = maskSensitive && isSensitiveKey(key, customMasked);

      const oldFormatted = oldVal !== undefined ? (isSensitive && oldVal !== null ? MASKED_PLACEHOLDER : oldVal) : null;
      const newFormatted = newVal !== undefined ? (isSensitive && newVal !== null ? MASKED_PLACEHOLDER : newVal) : null;

      delta[key] = {
        old: oldFormatted,
        new: newFormatted,
        // Legacy compatibility properties
        from: oldFormatted,
        to: newFormatted,
      };
    }
  }

  return Object.keys(delta).length > 0 ? delta : null;
}

/**
 * Legacy compatibility alias for existing auditLogger calls
 */
function computeDiff(beforeObj = {}, afterObj = {}, options = {}) {
  return calculateDelta(beforeObj, afterObj, options);
}

module.exports = {
  calculateDelta,
  computeDiff,
  isEqual,
  MASKED_PLACEHOLDER,
};
