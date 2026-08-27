const {
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
} = require('./src/utils/currencyFormatter');

function runFinancialFormatterQA() {
  console.log('?? Starting SCRUM-13 Financial Formatting & Currency Precision QA Suite...\n');
  let passed = 0;
  let total = 10;

  // Test 1: Acceptance Criteria: 154200.5 formatted as en-IN INR
  const acInput = 154200.5;
  const acFormatted = formatIndianCurrency(acInput);
  if (acFormatted === '?1,54,200.50') {
    console.log(`  ? PASSED [Test 1]: Given 154200.5, formatIndianCurrency produced exact AC output "${acFormatted}"`);
    passed++;
  } else {
    console.error(`  ? FAILED [Test 1]: Expected "?1,54,200.50", got "${acFormatted}"`);
  }

  // Test 2: Large Values in Indian Crores & Lakhs
  const croreVal = 105000000;
  const croreFormatted = formatIndianCurrency(croreVal);
  if (croreFormatted === '?10,50,00,000.00') {
    console.log(`  ? PASSED [Test 2]: Large Crores value 10,50,00,000 formatted correctly: "${croreFormatted}"`);
    passed++;
  } else {
    console.error(`  ? FAILED [Test 2]: Expected "?10,50,00,000.00", got "${croreFormatted}"`);
  }

  // Test 3: Negative Amounts and Zero Values
  const negVal = -1500.25;
  const zeroVal = 0;
  const negFormatted = formatIndianCurrency(negVal);
  const zeroFormatted = formatIndianCurrency(zeroVal);
  if (negFormatted === '-?1,500.25' && zeroFormatted === '?0.00') {
    console.log(`  ? PASSED [Test 3]: Negative ("${negFormatted}") and zero ("${zeroFormatted}") formatted accurately`);
    passed++;
  } else {
    console.error(`  ? FAILED [Test 3]: Negative/Zero formatting failed`, { negFormatted, zeroFormatted });
  }

  // Test 4: Custom Options (no symbol, custom symbol)
  const noSym = formatIndianCurrency(154200.5, 2, { includeSymbol: false });
  const usdSym = formatIndianCurrency(154200.5, 2, { symbol: '$' });
  if (noSym === '1,54,200.50' && usdSym === '$1,54,200.50') {
    console.log(`  ? PASSED [Test 4]: Custom symbol options verified (noSymbol: "${noSym}", customSymbol: "${usdSym}")`);
    passed++;
  } else {
    console.error(`  ? FAILED [Test 4]: Custom symbol options failed`, { noSym, usdSym });
  }

  // Test 5: Rounding Mode NEAREST_RUPEE
  const roundDown = applyRoundOff(100.49, 'NEAREST_RUPEE');
  const roundUp = applyRoundOff(100.50, 'NEAREST_RUPEE');
  if (roundDown === 100 && roundUp === 101) {
    console.log(`  ? PASSED [Test 5]: NEAREST_RUPEE rounding verified (100.49 -> ${roundDown}, 100.50 -> ${roundUp})`);
    passed++;
  } else {
    console.error(`  ? FAILED [Test 5]: NEAREST_RUPEE rounding failed`, { roundDown, roundUp });
  }

  // Test 6: Rounding Modes (TWO_DECIMALS, TRUNCATE, CEILING)
  const twoDec = applyRoundOff(123.456, 'TWO_DECIMALS', 2);
  const trunc = applyRoundOff(123.459, 'TRUNCATE', 2);
  const ceil = applyRoundOff(123.451, 'CEILING', 2);
  if (twoDec === 123.46 && trunc === 123.45 && ceil === 123.46) {
    console.log(`  ? PASSED [Test 6]: Two Decimals (${twoDec}), Truncate (${trunc}), Ceiling (${ceil}) rounding verified`);
    passed++;
  } else {
    console.error(`  ? FAILED [Test 6]: Precision rounding failed`, { twoDec, trunc, ceil });
  }

  // Test 7: Safe Decimal Arithmetic (Eliminates 0.1 + 0.2 floating point bug)
  const addBug = 0.1 + 0.2; // 0.30000000000000004
  const safeSum = safeDecimalAdd(0.1, 0.2, 2);
  const safeSub = safeDecimalSubtract(0.3, 0.1, 2);
  const safeMul = safeDecimalMultiply(19.99, 100, 2);
  if (safeSum === 0.3 && safeSub === 0.2 && safeMul === 1999) {
    console.log(`  ? PASSED [Test 7]: Safe Decimal Arithmetic eliminated floating point quirks (0.1 + 0.2 = ${safeSum}, 19.99 * 100 = ${safeMul})`);
    passed++;
  } else {
    console.error(`  ? FAILED [Test 7]: Decimal arithmetic failed`, { safeSum, safeSub, safeMul });
  }

  // Test 8: Amount to Indian Words
  const words1 = amountToIndianWords(154200.50);
  const words2 = amountToIndianWords(10000000);
  const wordsZero = amountToIndianWords(0);
  if (
    words1 === 'One Lakh Fifty-Four Thousand Two Hundred Rupees and Fifty Paise Only' &&
    words2 === 'One Crore Rupees Only' &&
    wordsZero === 'Zero Rupees Only'
  ) {
    console.log(`  ? PASSED [Test 8]: Indian Accounting Words Converter verified:\n     • 154200.50 -> "${words1}"\n     • 10000000 -> "${words2}"`);
    passed++;
  } else {
    console.error(`  ? FAILED [Test 8]: Words conversion failed`, { words1, words2, wordsZero });
  }

  // Test 9: Indian Number String Parser
  const parsed1 = parseIndianNumber('?1,54,200.50');
  const parsed2 = parseIndianNumber('10,50,00,000');
  if (parsed1 === 154200.5 && parsed2 === 105000000) {
    console.log(`  ? PASSED [Test 9]: parseIndianNumber parsed "?1,54,200.50" to ${parsed1} and "10,50,00,000" to ${parsed2}`);
    passed++;
  } else {
    console.error(`  ? FAILED [Test 9]: parseIndianNumber failed`, { parsed1, parsed2 });
  }

  // Test 10: Legacy Compatibility Utilities
  const legacyAmt = formatFinancialAmount(154200.5, 'NEAREST_RUPEE');
  const legacyStr = formatCurrencyString(154200.5, 'INR', 'NEAREST_RUPEE');
  if (legacyAmt === 154201 && legacyStr.includes('1,54,201')) {
    console.log(`  ? PASSED [Test 10]: Legacy compatibility functions formatFinancialAmount & formatCurrencyString verified`);
    passed++;
  } else {
    console.error(`  ? FAILED [Test 10]: Legacy functions failed`, { legacyAmt, legacyStr });
  }

  console.log(`\n?? FINANCIAL FORMATTING QA RESULTS: ${passed}/${total} Tests Passed.`);
  if (passed === total) {
    console.log('?? SCRUM-13 FINANCIAL FORMATTING & CURRENCY PRECISION UTILITY VALIDATION PASSED 100%!');
  } else {
    process.exit(1);
  }
}

runFinancialFormatterQA();
