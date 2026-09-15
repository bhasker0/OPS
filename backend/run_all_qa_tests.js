const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const backendDir = __dirname;
const testFiles = fs.readdirSync(backendDir)
  .filter(f => f.startsWith('test_') && f.endsWith('.js'))
  .sort();

console.log(`=======================================================`);
console.log(`🚀 EXECUTING MASTER OPS QA AUTOMATED TEST SUITE (${testFiles.length} SUITES)`);
console.log(`=======================================================\n`);

let passedCount = 0;
let failedCount = 0;
const results = [];

const env = {
  ...process.env,
  DATABASE_URL: "postgresql://postgres:postgres@127.0.0.1:5432/ops_db?schema=public",
  MONGO_URI: "mongodb://127.0.0.1:27017/ops_audit_db"
};

for (const testFile of testFiles) {
  process.stdout.write(`⏳ Running [${testFile}] ... `);
  const startTime = Date.now();
  try {
    const output = execSync(`node ${testFile}`, { env, cwd: backendDir, encoding: 'utf-8' });
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ PASSED (${duration}s)`);
    passedCount++;
    results.push({ file: testFile, status: 'PASSED', duration, output });
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`❌ FAILED (${duration}s)`);
    failedCount++;
    results.push({ file: testFile, status: 'FAILED', duration, error: error.stdout || error.stderr || error.message });
  }
}

console.log(`\n=======================================================`);
console.log(`📊 MASTER QA EXECUTION SUMMARY`);
console.log(`=======================================================`);
console.log(`Total Test Suites Executed: ${testFiles.length}`);
console.log(`Passed: ${passedCount}`);
console.log(`Failed: ${failedCount}`);
console.log(`Pass Rate: ${((passedCount / testFiles.length) * 100).toFixed(1)}%\n`);

if (failedCount > 0) {
  console.log(`🔴 FAILED TEST SUITES SUMMARY:`);
  results.filter(r => r.status === 'FAILED').forEach(r => {
    console.log(`\n--- [FAILED] ${r.file} ---`);
    console.log(r.error);
  });
  process.exit(1);
} else {
  console.log(`🎉 ALL ${testFiles.length} QA TEST SUITES PASSED WITH 100% OPERATIONAL INTEGRITY!`);
}
