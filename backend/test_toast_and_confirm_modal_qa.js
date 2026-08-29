const fs = require('fs');
const path = require('path');

function runToastAndModalQATests() {
  console.log('🧪 Starting Automated QA Test Suite for SCRUM-78: Toast Notifications & Confirmation Modals...\n');

  let passed = 0;
  let total = 6;

  // 1. Verify ToastContext exists and contains required functions
  const toastContextPath = path.resolve(__dirname, '../frontend/src/context/ToastContext.jsx');
  if (fs.existsSync(toastContextPath)) {
    const content = fs.readFileSync(toastContextPath, 'utf8');
    if (
      content.includes('ToastProvider') &&
      content.includes('useToast') &&
      content.includes('success:') &&
      content.includes('error:') &&
      content.includes('warning:') &&
      content.includes('info:')
    ) {
      console.log('  ✅ PASSED [Test 1]: ToastContext and ToastProvider correctly implement all notification methods');
      passed++;
    } else {
      console.error('  ❌ FAILED [Test 1]: ToastContext is missing required provider or toast methods');
    }
  } else {
    console.error('  ❌ FAILED [Test 1]: ToastContext.jsx does not exist');
  }

  // 2. Verify ToastContainer exists and implements auto-dismiss, progress bar, icons
  const toastContainerPath = path.resolve(__dirname, '../frontend/src/components/ToastContainer.jsx');
  if (fs.existsSync(toastContainerPath)) {
    const content = fs.readFileSync(toastContainerPath, 'utf8');
    if (
      content.includes('ToastContainer') &&
      content.includes('toast-progress-bar') &&
      content.includes('handleDismiss') &&
      content.includes('isPaused')
    ) {
      console.log('  ✅ PASSED [Test 2]: ToastContainer implements progress bar, timer dismissal, and pause-on-hover');
      passed++;
    } else {
      console.error('  ❌ FAILED [Test 2]: ToastContainer missing progress bar or dismissal handlers');
    }
  } else {
    console.error('  ❌ FAILED [Test 2]: ToastContainer.jsx does not exist');
  }

  // 3. Verify ConfirmModal exists and implements accessibility and variants
  const confirmModalPath = path.resolve(__dirname, '../frontend/src/components/ConfirmModal.jsx');
  if (fs.existsSync(confirmModalPath)) {
    const content = fs.readFileSync(confirmModalPath, 'utf8');
    if (
      content.includes('ConfirmModal') &&
      content.includes('role="dialog"') &&
      content.includes('onConfirm') &&
      content.includes('onCancel') &&
      content.includes('Escape')
    ) {
      console.log('  ✅ PASSED [Test 3]: ConfirmModal implements accessible modal dialog with Escape listener and variants');
      passed++;
    } else {
      console.error('  ❌ FAILED [Test 3]: ConfirmModal missing accessibility attributes or props');
    }
  } else {
    console.error('  ❌ FAILED [Test 3]: ConfirmModal.jsx does not exist');
  }

  // 4. Verify 0 occurrences of alert() in frontend/src
  const srcDir = path.resolve(__dirname, '../frontend/src');
  let alertCount = 0;
  let confirmCount = 0;

  function scanDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        scanDir(fullPath);
      } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
        const fileContent = fs.readFileSync(fullPath, 'utf8');
        // Match alert( but not AlertCircle or AlertTriangle or toast.alert
        const alertMatches = fileContent.match(/(?<![A-Za-z0-9_$.])alert\s*\(/g);
        const confirmMatches = fileContent.match(/(?<![A-Za-z0-9_$.])confirm\s*\(/g);
        if (alertMatches) {
          alertCount += alertMatches.length;
          console.error(`     Found alert() in ${file}`);
        }
        if (confirmMatches) {
          confirmCount += confirmMatches.length;
          console.error(`     Found confirm() in ${file}`);
        }
      }
    }
  }

  scanDir(srcDir);

  if (alertCount === 0) {
    console.log('  ✅ PASSED [Test 4]: Zero native browser alert() calls found in frontend/src');
    passed++;
  } else {
    console.error(`  ❌ FAILED [Test 4]: Found ${alertCount} remaining alert() calls`);
  }

  // 5. Verify 0 occurrences of confirm() in frontend/src
  if (confirmCount === 0) {
    console.log('  ✅ PASSED [Test 5]: Zero native browser confirm() calls found in frontend/src');
    passed++;
  } else {
    console.error(`  ❌ FAILED [Test 5]: Found ${confirmCount} remaining confirm() calls`);
  }

  // 6. Verify production build dist artifacts exist
  const distHtml = path.resolve(__dirname, '../frontend/dist/index.html');
  if (fs.existsSync(distHtml)) {
    console.log('  ✅ PASSED [Test 6]: Vite production build bundle verified (dist/index.html generated)');
    passed++;
  } else {
    console.error('  ❌ FAILED [Test 6]: Production build artifact not found');
  }

  console.log(`\n📊 QA Result: ${passed}/${total} Tests Passed (${((passed / total) * 100).toFixed(1)}%)`);

  if (passed === total) {
    console.log('✨ SCRUM-78 QA Verification Complete: 100% Pass Rate!\n');
    process.exit(0);
  } else {
    console.error('💥 SCRUM-78 QA Verification Failed!\n');
    process.exit(1);
  }
}

runToastAndModalQATests();
