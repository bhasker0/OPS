const http = require('http');

const API_BASE = 'http://localhost:5000/api';

function request(method, path) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_BASE + path);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.end();
  });
}

async function runAnalyticsDashboardQA() {
  console.log('?? Starting SCRUM-19 Analytics Overview & Metric Cards Dashboard QA Suite...\n');
  let passed = 0;
  let total = 5;

  // Test 1: GET /api/stats endpoint verification
  try {
    const statsRes = await request('GET', '/stats');

    if (
      statsRes.status === 200 &&
      statsRes.data.success &&
      statsRes.data.data.totalCompanies >= 1 &&
      statsRes.data.data.activeCompanies >= 1 &&
      statsRes.data.data.totalUsers >= 1 &&
      statsRes.data.data.totalTransactions >= 1 &&
      statsRes.data.data.totalVolumeFormatted.includes('?')
    ) {
      console.log(`  ? PASSED [Test 1]: GET /api/stats returned full operational metrics (Tenants: ${statsRes.data.data.activeCompanies}/${statsRes.data.data.totalCompanies}, Revenue: ${statsRes.data.data.totalVolumeFormatted})`);
      passed++;
    } else {
      console.error('  ? FAILED [Test 1]: GET /api/stats failed', statsRes);
    }
  } catch (err) {
    console.error('  ? FAILED [Test 1] Exception:', err.message);
  }

  // Test 2: GET /api/stats/global endpoint verification
  try {
    const globalRes = await request('GET', '/stats/global');

    if (
      globalRes.status === 200 &&
      globalRes.data.success &&
      globalRes.data.data.totalCompanies >= 1 &&
      globalRes.data.data.totalVolumeFormatted.includes('?') &&
      globalRes.data.data.systemStatus === 'ALL_SYSTEMS_OPERATIONAL'
    ) {
      console.log(`  ? PASSED [Test 2]: GET /api/stats/global returned executive aggregates (Volume: ${globalRes.data.data.totalVolumeFormatted}, Status: ${globalRes.data.data.systemStatus})`);
      passed++;
    } else {
      console.error('  ? FAILED [Test 2]: GET /api/stats/global failed', globalRes);
    }
  } catch (err) {
    console.error('  ? FAILED [Test 2] Exception:', err.message);
  }

  // Test 3: System Health & Multi-Database Uptime
  try {
    const healthRes = await request('GET', '/stats');

    if (
      healthRes.status === 200 &&
      healthRes.data.data.systemHealth &&
      healthRes.data.data.systemHealth.postgres === 'HEALTHY' &&
      healthRes.data.data.systemHealth.mongo === 'HEALTHY' &&
      healthRes.data.data.systemHealth.uptimePercent >= 99
    ) {
      console.log(`  ? PASSED [Test 3]: System Health verified: PostgreSQL (${healthRes.data.data.systemHealth.postgres}), MongoDB (${healthRes.data.data.systemHealth.mongo}), Uptime: ${healthRes.data.data.systemHealth.uptimePercent}%`);
      passed++;
    } else {
      console.error('  ? FAILED [Test 3]: System health verification failed', healthRes);
    }
  } catch (err) {
    console.error('  ? FAILED [Test 3] Exception:', err.message);
  }

  // Test 4: Recent Transactions & Activity Snapshots
  try {
    const activityRes = await request('GET', '/stats');

    if (
      activityRes.status === 200 &&
      Array.isArray(activityRes.data.data.recentTransactions) &&
      activityRes.data.data.recentTransactions.length >= 1
    ) {
      console.log(`  ? PASSED [Test 4]: Recent financial ledger snapshot returned ${activityRes.data.data.recentTransactions.length} entries with company identity`);
      passed++;
    } else {
      console.error('  ? FAILED [Test 4]: Recent activity snapshot failed', activityRes);
    }
  } catch (err) {
    console.error('  ? FAILED [Test 4] Exception:', err.message);
  }

  // Test 5: Single Company Stats (GET /api/stats/company/:id)
  try {
    const compStatsRes = await request('GET', '/stats/company/11111111-1111-1111-1111-111111111111');

    if (
      compStatsRes.status === 200 &&
      compStatsRes.data.success &&
      compStatsRes.data.data.totalVolumeFormatted.includes('?')
    ) {
      console.log(`  ? PASSED [Test 5]: GET /api/stats/company/:id returned scoped metrics (${compStatsRes.data.data.totalVolumeFormatted})`);
      passed++;
    } else {
      console.error('  ? FAILED [Test 5]: Company stats failed', compStatsRes);
    }
  } catch (err) {
    console.error('  ? FAILED [Test 5] Exception:', err.message);
  }

  console.log(`\n?? ANALYTICS DASHBOARD QA RESULTS: ${passed}/${total} Tests Passed.`);
  if (passed === total) {
    console.log('?? SCRUM-19 ANALYTICS OVERVIEW & METRIC CARDS DASHBOARD VALIDATION PASSED 100%!');
  } else {
    process.exit(1);
  }
}

runAnalyticsDashboardQA();
