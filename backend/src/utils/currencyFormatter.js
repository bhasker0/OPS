/**
 * Financial Formatting & Currency Precision Utility
 * Handles Indian INR & International rounding rules:
 * - NEAREST_RUPEE: Math.round() to integer value
 * - TRUNCATE: Truncates extra decimals without rounding
 * - HALF_UP: Standard financial rounding to N decimal places
 */

function formatFinancialAmount(amount, roundOffFormat = 'NEAREST_RUPEE', digitsAfterDecimal = 2) {
  const num = parseFloat(amount);
  if (isNaN(num)) return 0;

  const decimals = parseInt(digitsAfterDecimal) || 0;

  switch (roundOffFormat) {
    case 'NEAREST_RUPEE':
      return Math.round(num);

    case 'TRUNCATE': {
      const factor = Math.pow(10, decimals);
      return Math.trunc(num * factor) / factor;
    }

    case 'HALF_UP':
    default: {
      const factor = Math.pow(10, decimals);
      return Math.round(num * factor) / factor;
    }
  }
}

function formatCurrencyString(amount, currency = 'INR', roundOffFormat = 'NEAREST_RUPEE', digitsAfterDecimal = 2) {
  const formattedVal = formatFinancialAmount(amount, roundOffFormat, digitsAfterDecimal);
  if (currency === 'INR') {
    return `₹${formattedVal.toLocaleString('en-IN')}`;
  }
  return `${currency} ${formattedVal.toLocaleString()}`;
}

module.exports = {
  formatFinancialAmount,
  formatCurrencyString,
};
