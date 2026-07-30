/**
 * Validates if a string is a valid UTC date timestamp string.
 * Example of valid formats: 2026-01-10T00:00:00Z or 2026-01-10T00:00:00.000Z
 */
function isValidUtcString(dateStr) {
  if (typeof dateStr !== 'string') return false;
  const utcRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|([+-]\d{2}:\d{2}))$/i;
  if (!utcRegex.test(dateStr)) return false;
  return !isNaN(Date.parse(dateStr));
}

module.exports = {
  isValidUtcString
};
