/**
 * Frontend Financial Formatting & Currency Precision Utility
 * Compliant with Indian Financial Accounting Standards (en-IN)
 */

export function safeRound(num, decimals = 2) {
  const n = Number(num);
  if (isNaN(n)) return 0;
  const factor = Math.pow(10, decimals);
  return Math.round((n + Number.EPSILON) * factor) / factor;
}

export function safeDecimalAdd(a, b, decimals = 4) {
  const numA = Number(a) || 0;
  const numB = Number(b) || 0;
  return safeRound(numA + numB, decimals);
}

export function safeDecimalSubtract(a, b, decimals = 4) {
  const numA = Number(a) || 0;
  const numB = Number(b) || 0;
  return safeRound(numA - numB, decimals);
}

export function safeDecimalMultiply(a, b, decimals = 4) {
  const numA = Number(a) || 0;
  const numB = Number(b) || 0;
  return safeRound(numA * numB, decimals);
}

export function safeDecimalDivide(a, b, decimals = 4) {
  const numA = Number(a) || 0;
  const numB = Number(b) || 0;
  if (numB === 0) return 0;
  return safeRound(numA / numB, decimals);
}

export function applyRoundOff(amount, roundOffFormat = 'TWO_DECIMALS', digitsAfterDecimal = 2) {
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

export function formatIndianCurrency(amount, digits = 2, options = {}) {
  const { symbol = '?', includeSymbol = true, fallback = '?0.00' } = options;

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

export function parseIndianNumber(str) {
  if (typeof str === 'number') return str;
  if (!str) return 0;
  const clean = String(str)
    .replace(/[?\s,]/g, '')
    .trim();
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? 0 : parsed;
}

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

export function amountToIndianWords(amount) {
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
