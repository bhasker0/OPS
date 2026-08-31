/**
 * Financial Formatting & Currency Precision Utility
 * Compliant with Indian Financial Accounting Standards (en-IN)
 * Handles Indian Lakhs/Crores grouping, Precision Decimal Math, Rounding Rules, and Words Conversion.
 */

// Safe Decimal Arithmetic to eliminate JS IEEE 754 floating point quirks (0.1 + 0.2 != 0.3)
function safeRound(num, decimals = 2) {
  const n = Number(num);
  if (isNaN(n)) return 0;
  const factor = Math.pow(10, decimals);
  return Math.round((n + Number.EPSILON) * factor) / factor;
}

function safeDecimalAdd(a, b, decimals = 4) {
  const numA = Number(a) || 0;
  const numB = Number(b) || 0;
  return safeRound(numA + numB, decimals);
}

function safeDecimalSubtract(a, b, decimals = 4) {
  const numA = Number(a) || 0;
  const numB = Number(b) || 0;
  return safeRound(numA - numB, decimals);
}

function safeDecimalMultiply(a, b, decimals = 4) {
  const numA = Number(a) || 0;
  const numB = Number(b) || 0;
  return safeRound(numA * numB, decimals);
}

function safeDecimalDivide(a, b, decimals = 4) {
  const numA = Number(a) || 0;
  const numB = Number(b) || 0;
  if (numB === 0) return 0;
  return safeRound(numA / numB, decimals);
}

/**
 * Apply rounding mode rules
 * @param {number|string} amount
 * @param {string} roundOffFormat 'NEAREST_RUPEE' | 'TWO_DECIMALS' | 'TRUNCATE' | 'HALF_UP' | 'CEILING' | 'FLOOR' | 'NONE'
 * @param {number} digitsAfterDecimal
 */
function applyRoundOff(amount, roundOffFormat = 'TWO_DECIMALS', digitsAfterDecimal = 2) {
  const num = parseFloat(amount);
  if (isNaN(num)) return 0;

  const decimals = parseInt(digitsAfterDecimal) >= 0 ? parseInt(digitsAfterDecimal) : 2;

  switch (roundOffFormat) {
    case 'NEAREST_RUPEE':
      return Math.round(num);

    case 'TRUNCATE':
    case 'FLOOR': {
      const factor = Math.pow(10, decimals);
      return Math.floor(safeDecimalMultiply(num, factor, 8)) / factor;
    }

    case 'CEILING': {
      const factor = Math.pow(10, decimals);
      return Math.ceil(safeDecimalMultiply(num, factor, 8)) / factor;
    }

    case 'NONE':
      return num;

    case 'HALF_UP':
    case 'TWO_DECIMALS':
    default:
      return safeRound(num, decimals);
  }
}

/**
 * Format numeric value in Indian Currency (en-IN)
 * e.g. 154200.5 => "?1,54,200.50"
 */
function formatIndianCurrency(amount, digits = 2, options = {}) {
  const { symbol = '\u20B9', includeSymbol = true, fallback = '\u20B90.00' } = options;

  if (amount === null || amount === undefined || isNaN(parseFloat(amount))) {
    return fallback;
  }

  const num = parseFloat(amount);
  const isNegative = num < 0;
  const absNum = Math.abs(num);

  const rounded = applyRoundOff(absNum, 'TWO_DECIMALS', digits);

  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(rounded);

  const prefix = isNegative ? '-' : '';
  const sym = includeSymbol ? (symbol ? symbol : '') : '';

  return `${prefix}${sym}${formatted}`;
}

/**
 * Legacy compatibility alias for existing code
 */
function formatFinancialAmount(amount, roundOffFormat = 'NEAREST_RUPEE', digitsAfterDecimal = 2) {
  return applyRoundOff(amount, roundOffFormat, digitsAfterDecimal);
}

function formatCurrencyString(amount, currency = 'INR', roundOffFormat = 'NEAREST_RUPEE', digitsAfterDecimal = 2) {
  const formattedVal = applyRoundOff(amount, roundOffFormat, digitsAfterDecimal);
  if (currency === 'INR') {
    return formatIndianCurrency(formattedVal, digitsAfterDecimal);
  }
  return `${currency} ${formattedVal.toLocaleString()}`;
}

/**
 * Parse Indian formatted string (e.g. "₹ 1,54,200.50" or "1,54,200") to numeric float
 */
function parseIndianNumber(str) {
  if (typeof str === 'number') return str;
  if (!str) return 0;
  const clean = String(str)
    .replace(/[\u20B9₹\s,]/g, '')
    .trim();
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Convert numerical Rupee amount to Indian Accounting Words
 * e.g. 154200.50 => "One Lakh Fifty-Four Thousand Two Hundred Rupees and Fifty Paise Only"
 */
const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function convertUnderThousand(num) {
  let str = '';
  if (num >= 100) {
    str += ONES[Math.floor(num / 100)] + ' Hundred ';
    num %= 100;
  }
  if (num >= 20) {
    str += TENS[Math.floor(num / 10)] + (num % 10 !== 0 ? '-' + ONES[num % 10] : '') + ' ';
  } else if (num > 0) {
    str += ONES[num] + ' ';
  }
  return str.trim();
}

function amountToIndianWords(amount) {
  const num = parseFloat(amount);
  if (isNaN(num)) return 'Zero Rupees Only';
  if (num === 0) return 'Zero Rupees Only';

  const isNegative = num < 0;
  const absNum = Math.abs(num);

  const rupees = Math.floor(absNum);
  const paise = Math.round((absNum - rupees) * 100);

  let words = '';

  const crores = Math.floor(rupees / 10000000);
  let remainder = rupees % 10000000;

  const lakhs = Math.floor(remainder / 100000);
  remainder %= 100000;

  const thousands = Math.floor(remainder / 1000);
  remainder %= 1000;

  const hundreds = remainder;

  if (crores > 0) {
    words += convertUnderThousand(crores) + ' Crore ';
  }
  if (lakhs > 0) {
    words += convertUnderThousand(lakhs) + ' Lakh ';
  }
  if (thousands > 0) {
    words += convertUnderThousand(thousands) + ' Thousand ';
  }
  if (hundreds > 0) {
    words += convertUnderThousand(hundreds) + ' ';
  }

  words = words.trim();
  if (!words) words = 'Zero';

  let result = (isNegative ? 'Minus ' : '') + words + ' Rupees';

  if (paise > 0) {
    result += ' and ' + convertUnderThousand(paise) + ' Paise';
  }

  result += ' Only';
  return result.replace(/\s+/g, ' ').trim();
}

module.exports = {
  safeRound,
  safeDecimalAdd,
  safeDecimalSubtract,
  safeDecimalMultiply,
  safeDecimalDivide,
  applyRoundOff,
  formatIndianCurrency,
  formatFinancialAmount,
  formatCurrencyString,
  parseIndianNumber,
  amountToIndianWords,
};
