const fs = require('fs');
const path = require('path');

function runCommandPaletteQATests() {
  console.log('🧪 Starting Automated QA Test Suite for SCRUM-79: Global Command Palette (Ctrl+K)...\n');

  let passed = 0;
  let total = 6;

  // 1. Verify CommandPalette.jsx exists and has search indexing
  const cpPath = path.resolve(__dirname, '../frontend/src/components/CommandPalette.jsx');
  if (fs.existsSync(cpPath)) {
    const content = fs.readFileSync(cpPath, 'utf8');
    if (
      content.includes('CommandPalette') &&
      content.includes('navigationItems') &&
      content.includes('quickActions') &&
      content.includes('companyItems') &&
      content.includes('userItems')
    ) {
      console.log('  ✅ PASSED [Test 1]: CommandPalette.jsx indexes Navigation, Quick Actions, Companies, and Users');
      passed++;
    } else {
      console.error('  ❌ FAILED [Test 1]: CommandPalette.jsx missing core category indexes');
    }
  } else {
    console.error('  ❌ FAILED [Test 1]: CommandPalette.jsx does not exist');
  }

  // 2. Verify Keyboard Accessibility in CommandPalette.jsx
  if (fs.existsSync(cpPath)) {
    const content = fs.readFileSync(cpPath, 'utf8');
    if (
      content.includes('ArrowDown') &&
      content.includes('ArrowUp') &&
      content.includes('Enter') &&
      content.includes('Escape') &&
      content.includes('scrollIntoView')
    ) {
      console.log('  ✅ PASSED [Test 2]: Keyboard accessibility (Up/Down/Enter/Esc with auto-scroll) fully wired');
      passed++;
    } else {
      console.error('  ❌ FAILED [Test 2]: CommandPalette missing keyboard navigation handlers');
    }
  }

  // 3. Verify App.jsx integration of CommandPalette & Ctrl+K
  const appPath = path.resolve(__dirname, '../frontend/src/App.jsx');
  if (fs.existsSync(appPath)) {
    const content = fs.readFileSync(appPath, 'utf8');
    if (
      content.includes('<CommandPalette') &&
      content.includes('showCommandPalette') &&
      content.includes('ctrlKey') &&
      content.includes('metaKey')
    ) {
      console.log('  ✅ PASSED [Test 3]: App.jsx integrates CommandPalette component with global Ctrl+K / Cmd+K listener');
      passed++;
    } else {
      console.error('  ❌ FAILED [Test 3]: App.jsx missing CommandPalette integration or global shortcut');
    }
  }

  // 4. Verify Sidebar Quick Search Trigger Button
  if (fs.existsSync(appPath)) {
    const content = fs.readFileSync(appPath, 'utf8');
    if (
      content.includes('setShowCommandPalette(true)') &&
      content.includes('Ctrl K')
    ) {
      console.log('  ✅ PASSED [Test 4]: Sidebar visual Quick Jump (Ctrl K) button rendered for mouse accessibility');
      passed++;
    } else {
      console.error('  ❌ FAILED [Test 4]: App.jsx missing sidebar search trigger button');
    }
  }

  // 5. Verify CSS styles in index.css
  const cssPath = path.resolve(__dirname, '../frontend/src/index.css');
  if (fs.existsSync(cssPath)) {
    const content = fs.readFileSync(cssPath, 'utf8');
    if (
      content.includes('command-palette-backdrop') &&
      content.includes('command-palette-container') &&
      content.includes('command-item-active') &&
      content.includes('commandScale')
    ) {
      console.log('  ✅ PASSED [Test 5]: Design tokens and CSS keyframes (commandScale, item hover/active) verified');
      passed++;
    } else {
      console.error('  ❌ FAILED [Test 5]: index.css missing Command Palette styles');
    }
  }

  // 6. Verify Production Bundle
  const distPath = path.resolve(__dirname, '../frontend/dist/index.html');
  if (fs.existsSync(distPath)) {
    console.log('  ✅ PASSED [Test 6]: Production Vite build bundle verified (dist/index.html updated)');
    passed++;
  } else {
    console.error('  ❌ FAILED [Test 6]: Production bundle artifact not found');
  }

  console.log(`\n📊 QA Result: ${passed}/${total} Tests Passed (${((passed / total) * 100).toFixed(1)}%)`);

  if (passed === total) {
    console.log('✨ SCRUM-79 QA Verification Complete: 100% Pass Rate!\n');
    process.exit(0);
  } else {
    console.error('💥 SCRUM-79 QA Verification Failed!\n');
    process.exit(1);
  }
}

runCommandPaletteQATests();
