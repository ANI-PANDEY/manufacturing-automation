/**
 * Precision Currency Math Utility
 * Prevents floating-point precision issues (e.g., 0.1 + 0.2 = 0.30000000000000004)
 */
const round2 = (val) => {
  const num = Number(val) || 0;
  return Math.round((num + Number.EPSILON) * 100) / 100;
};

module.exports = {
  round2,
};
