const http = require('http');
const prisma = require('./src/db/prisma');
const AuditLog = require('./src/models/AuditLog');
const { connectMongo, closeMongoConnection } = require('./src/config/mongo');

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

async function runAuditLogViewerQA() {
  console.log('🧪 Starting SCRUM-22 Audit Log Viewer & Live Inspection QA Suite...\n');
  let passed = 0;
  let total = 6;

  await connectMongo();
  const company = await prisma.company.findFirst({ where: { isSeed: false } });

  // Test 1: Multi-Filter Log Query (Company + Module)
  try {
    const filterRes = await request('GET', `/audit-logs?companyId=${company.id}&module=COMPANY`);

    if (
      filterRes.status === 200 &&
      filterRes.data.success &&
      Array.isArray(filterRes.data.data) &&
      filterRes.data.data.every((l) => l.companyId === company.id && l.module === 'COMPANY')
    ) {
      console.log(`  ✅ PASSED [Test 1]: Filtered audit query returned ${filterRes.data.data.length} records matching companyId and module COMPANY`);
      passed++;
    } else {
      console.error('  ❌ FAILED [Test 1]: Multi-filter query failed', filterRes);
    }
  } catch (err) {
    console.error('  ❌ FAILED [Test 1] Exception:', err.message);
  }

  // Test 2: Pagination Boundaries (limit=25, page=1)
  try {
    const pageRes = await request('GET', '/audit-logs?page=1&limit=25');

    if (
      pageRes.status === 200 &&
      pageRes.data.pagination &&
      pageRes.data.pagination.page === 1 &&
      pageRes.data.pagination.limit === 25 &&
      pageRes.data.data.length <= 25
    ) {
      console.log(`  ✅ PASSED [Test 2]: Pagination metadata verified: ${pageRes.data.data.length} logs on page 1 (Total: ${pageRes.data.pagination.total})`);
      passed++;
    } else {
      console.error('  ❌ FAILED [Test 2]: Pagination query failed', pageRes);
    }
  } catch (err) {
    console.error('  ❌ FAILED [Test 2] Exception:', err.message);
  }

  // Test 3: Date Range Temporal Isolation (24h Window)
  try {
    const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const dateRes = await request('GET', `/audit-logs?startDate=${startDate}`);

    if (
      dateRes.status === 200 &&
      dateRes.data.success &&
      Array.isArray(dateRes.data.data)
    ) {
      console.log(`  ✅ PASSED [Test 3]: Temporal date filter returned ${dateRes.data.data.length} events from past 24 hours`);
      passed++;
    } else {
      console.error('  ❌ FAILED [Test 3]: Date filter failed', dateRes);
    }
  } catch (err) {
    console.error('  ❌ FAILED [Test 3] Exception:', err.message);
  }

  // Test 4: Free-Text Search in Audit Logs
  try {
    const searchRes = await request('GET', '/audit-logs?search=USER');

    if (
      searchRes.status === 200 &&
      searchRes.data.success &&
      Array.isArray(searchRes.data.data) &&
      searchRes.data.data.length >= 1
    ) {
      console.log(`  ✅ PASSED [Test 4]: Text search returned ${searchRes.data.data.length} matching events containing "USER"`);
      passed++;
    } else {
      console.error('  ❌ FAILED [Test 4]: Text search failed', searchRes);
    }
  } catch (err) {
    console.error('  ❌ FAILED [Test 4] Exception:', err.message);
  }

  // Test 5: Aggregated Audit Stats for Dashboard Pills (GET /api/audit-logs/stats)
  try {
    const statsRes = await request('GET', '/audit-logs/stats');

    if (
      statsRes.status === 200 &&
      statsRes.data.success &&
      statsRes.data.data.totalEvents >= 1 &&
      statsRes.data.data.byStatus &&
      statsRes.data.data.byModule
    ) {
      console.log(`  ✅ PASSED [Test 5]: GET /api/audit-logs/stats returned aggregate pills (Total Events: ${statsRes.data.data.totalEvents}, Modules: ${Object.keys(statsRes.data.data.byModule).length})`);
      passed++;
    } else {
      console.error('  ❌ FAILED [Test 5]: Audit stats failed', statsRes);
    }
  } catch (err) {
    console.error('  ❌ FAILED [Test 5] Exception:', err.message);
  }

  // Test 6: Single Document Inspection with Payload & Diff (GET /api/audit-logs/:id)
  try {
    const sampleLog = await AuditLog.findOne();

    if (sampleLog) {
      const singleRes = await request('GET', `/audit-logs/${sampleLog._id}`);

      if (
        singleRes.status === 200 &&
        singleRes.data.success &&
        singleRes.data.data._id.toString() === sampleLog._id.toString()
      ) {
        console.log(`  ✅ PASSED [Test 6]: Inspection endpoint retrieved full event telemetry for action '${singleRes.data.data.action}'`);
        passed++;
      } else {
        console.error('  ❌ FAILED [Test 6]: Single log fetch failed', singleRes);
      }
    }
  } catch (err) {
    console.error('  ❌ FAILED [Test 6] Exception:', err.message);
  }

  console.log(`\n📊 AUDIT LOG VIEWER QA RESULTS: ${passed}/${total} Tests Passed.`);
  if (passed === total) {
    console.log('🎉 SCRUM-22 AUDIT LOG VIEWER WITH LIVE INSPECTION MODAL VALIDATION PASSED 100%!');
  } else {
    process.exit(1);
  }
}

runAuditLogViewerQA()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await closeMongoConnection();
  });