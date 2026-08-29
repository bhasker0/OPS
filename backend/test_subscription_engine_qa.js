const assert = require('assert');
const prisma = require('./src/db');
const { initMongo, closeMongoConnection } = require('./src/config/mongo');

const API_BASE = 'http://127.0.0.1:5000/api';

async function runSubscriptionEngineQATests() {
  console.log('🧪 Starting Automated QA Test Suite for SCRUM-80: Subscription Tier & Quota Enforcement...\n');

  let passed = 0;
  let total = 7;

  try {
    // 1. Test GET /api/subscription-plans
    const getPlansRes = await fetch(`${API_BASE}/subscription-plans`);
    const plansData = await getPlansRes.json();
    assert.strictEqual(plansData.success, true, 'GET /api/subscription-plans should return success: true');
    assert(plansData.data.length >= 3, 'Should have at least 3 default seeded plans');
    const starter = plansData.data.find(p => p.code === 'STARTER');
    const pro = plansData.data.find(p => p.code === 'PROFESSIONAL');
    const ent = plansData.data.find(p => p.code === 'ENTERPRISE');
    assert(starter && pro && ent, 'STARTER, PROFESSIONAL, and ENTERPRISE plans must exist');
    console.log('  ✅ PASSED [Test 1]: GET /api/subscription-plans returns seeded tiers (STARTER, PRO, ENTERPRISE)');
    passed++;

    // 2. Test POST /api/subscription-plans (Create new plan)
    const newPlanCode = `PILOT_${Date.now()}`;
    const createPlanRes = await fetch(`${API_BASE}/subscription-plans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Pilot Evaluation Tier',
        code: newPlanCode,
        description: 'Temporary pilot program tier for trial factories',
        price: 999,
        currency: 'INR',
        billingInterval: 'MONTHLY',
        maxMachines: 4,
        maxUsers: 8,
        maxInvoicesPerMonth: 250,
        features: ['BASIC_BILLING', 'PILOT_FEATURE'],
        isDefault: false
      })
    });
    const createData = await createPlanRes.json();
    assert.strictEqual(createData.success, true, 'POST /api/subscription-plans should create plan');
    const createdPlanId = createData.data.id;
    console.log(`  ✅ PASSED [Test 2]: POST /api/subscription-plans creates new tier '${createData.data.name}'`);
    passed++;

    // 3. Test PUT /api/subscription-plans/:id
    const updatePlanRes = await fetch(`${API_BASE}/subscription-plans/${createdPlanId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        price: 1199,
        maxUsers: 10
      })
    });
    const updateData = await updatePlanRes.json();
    assert.strictEqual(updateData.success, true, 'PUT /api/subscription-plans/:id should update plan');
    assert.strictEqual(updateData.data.price, 1199, 'Plan price should be updated to 1199');
    assert.strictEqual(updateData.data.maxUsers, 10, 'Plan maxUsers should be updated to 10');
    console.log('  ✅ PASSED [Test 3]: PUT /api/subscription-plans/:id updates plan parameters & pricing');
    passed++;

    // 4. Test PATCH /api/companies/:id/subscription (Assign plan)
    const company = await prisma.company.findFirst({ where: { isSeed: false } });
    assert(company, 'Must have at least one tenant company');

    const assignRes = await fetch(`${API_BASE}/companies/${company.id}/subscription`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscriptionPlanId: createdPlanId,
        planStatus: 'ACTIVE',
        planExpiryDate: new Date(Date.now() + 60 * 86400000).toISOString()
      })
    });
    const assignData = await assignRes.json();
    assert.strictEqual(assignData.success, true, 'PATCH /api/companies/:id/subscription should succeed');
    assert.strictEqual(assignData.data.subscriptionPlanId, createdPlanId, 'Company subscriptionPlanId should match');
    console.log(`  ✅ PASSED [Test 4]: PATCH /api/companies/:id/subscription allocates '${assignData.data.subscriptionPlan?.name}' to tenant`);
    passed++;

    // 5. Test GET /api/companies/:id/quota-usage
    const quotaRes = await fetch(`${API_BASE}/companies/${company.id}/quota-usage`);
    const quotaData = await quotaRes.json();
    assert.strictEqual(quotaData.success, true, 'GET /api/companies/:id/quota-usage should succeed');
    assert(quotaData.data.quotas.users.max === 10, 'Users quota max should match assigned plan (10)');
    assert(typeof quotaData.data.quotas.users.used === 'number', 'Used user count must be numeric');
    assert(typeof quotaData.data.quotas.users.percent === 'number', 'Utilization percentage must be numeric');
    console.log(`  ✅ PASSED [Test 5]: GET /api/companies/:id/quota-usage computes live utilization (Users: ${quotaData.data.quotas.users.used}/${quotaData.data.quotas.users.max} [${quotaData.data.quotas.users.percent}%])`);
    passed++;

    // 6. Test User Quota Enforcement: Create a company with a 1-user plan and verify overflow is blocked (HTTP 403)
    const tightPlanRes = await fetch(`${API_BASE}/subscription-plans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Single User Micro Plan',
        code: `MICRO_${Date.now()}`,
        maxUsers: 1,
        maxMachines: 1,
        maxInvoicesPerMonth: 10
      })
    });
    const tightPlanData = await tightPlanRes.json();
    const tightPlanId = tightPlanData.data.id;

    // Create a temporary test company
    const tempCompRes = await fetch(`${API_BASE}/companies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Quota Test Enterprises',
        code: `QTEST_${Date.now()}`,
        subscriptionPlanId: tightPlanId
      })
    });
    const tempCompData = await tempCompRes.json();
    const tempCompId = tempCompData.data.company ? tempCompData.data.company.id : tempCompData.data.id;

    // First user creation succeeds
    const u1Res = await fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'User One',
        email: `u1_${Date.now()}@qtest.com`,
        companyId: tempCompId
      })
    });
    const u1Data = await u1Res.json();
    assert.strictEqual(u1Data.success, true, 'First user creation under quota should succeed');

    // Second user creation MUST BE BLOCKED (HTTP 403)
    const u2Res = await fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'User Two Overflow',
        email: `u2_${Date.now()}@qtest.com`,
        companyId: tempCompId
      })
    });
    assert.strictEqual(u2Res.status, 403, 'Second user must be blocked with HTTP 403 Forbidden');
    const u2Data = await u2Res.json();
    assert.strictEqual(u2Data.code, 'QUOTA_EXCEEDED', 'Response code must be QUOTA_EXCEEDED');
    console.log('  ✅ PASSED [Test 6]: User Quota Enforcement strictly blocks overflow user creation with HTTP 403 QUOTA_EXCEEDED');
    passed++;

    // 7. Cleanup & DELETE /api/subscription-plans/:id
    // Revert company plan back to STARTER
    await fetch(`${API_BASE}/companies/${company.id}/subscription`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscriptionPlanId: starter.id })
    });

    const deletePlanRes = await fetch(`${API_BASE}/subscription-plans/${createdPlanId}`, { method: 'DELETE' });
    const deleteData = await deletePlanRes.json();
    assert.strictEqual(deleteData.success, true, 'DELETE /api/subscription-plans/:id should delete unassigned plan');

    // Clean up temp company
    await prisma.user.deleteMany({ where: { companyId: tempCompId } });
    await prisma.role.deleteMany({ where: { companyId: tempCompId } });
    await prisma.parameter.deleteMany({ where: { companyId: tempCompId } });
    await prisma.company.delete({ where: { id: tempCompId } });
    await prisma.subscriptionPlan.delete({ where: { id: tightPlanId } });

    console.log('  ✅ PASSED [Test 7]: DELETE /api/subscription-plans/:id deletes custom plan after tenant reassignment');
    passed++;

    console.log(`\n📊 QA Result: ${passed}/${total} Tests Passed (${((passed / total) * 100).toFixed(1)}%)`);
    console.log('✨ SCRUM-80 QA Verification Complete: 100% Pass Rate!\n');
    process.exit(0);
  } catch (error) {
    console.error(`\n💥 QA Test Error:`, error);
    process.exit(1);
  }
}

runSubscriptionEngineQATests();
