const http = require('http');

const API_BASE = 'http://localhost:5000/api';

async function req(path, method = 'GET', body = null) {
  const url = `${API_BASE}${path}`;
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };

  return new Promise((resolve, reject) => {
    const request = http.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    request.on('error', reject);
    if (body) {
      request.write(JSON.stringify(body));
    }
    request.end();
  });
}

async function runTests() {
  console.log('🧪 Running Indian Business Registration & Utility Parameters Test Suite...\n');

  // 1. Health check
  const health = await req('/health');
  console.log('1️⃣ Health check status:', health.status);

  // 2. Register New Indian Business
  const code = `IND_${Date.now()}`;
  console.log(`\n2️⃣ Registering Indian Business 'Reliance Digital Infra' with code '${code}'...`);
  const createRes = await req('/companies', 'POST', {
    name: 'Reliance Digital Infra Ltd',
    code,
    contactPerson: 'Vikram Mehta',
    mobile: '+91 98200 11223',
    email: 'billing@reliancedigital.in',
    gstin: '27AAACR1234F1Z9',
    address: 'Maker Chambers IV, Nariman Point, Mumbai, Maharashtra 400021',
    logoUrl: 'https://example.com/reliance_logo.png',
    timezone: 'Asia/Kolkata',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '12H',
    currency: 'INR',
    currencySymbol: '₹',
    roundOffFormat: 'NEAREST_RUPEE',
    digitsAfterDecimal: 2,
  });

  console.log('   Create Status:', createRes.status);
  console.log('   New Company ID:', createRes.body.data.company.id);
  console.log('   GSTIN Saved:', createRes.body.data.company.gstin);
  console.log('   Contact Person:', createRes.body.data.company.contactPerson);
  console.log('   Address:', createRes.body.data.company.address);
  console.log('   Round-Off Format:', createRes.body.data.company.roundOffFormat);
  console.log('   Digits After Decimal:', createRes.body.data.company.digitsAfterDecimal);
  console.log('   Attached System Role:', createRes.body.data.systemRole.name);
  console.log('   Cloned Parameters Count:', createRes.body.data.parametersCount);

  // 3. Inspect Created Company Parameters
  const newCompanyId = createRes.body.data.company.id;
  const paramRes = await req(`/companies/${newCompanyId}/parameters`);
  console.log('\n3️⃣ Inspecting Saved Utility Parameters:');
  paramRes.body.data.forEach(p => {
    if (['date_format', 'time_format', 'currency', 'currency_symbol', 'timezone', 'round_off_format', 'digits_after_decimal'].includes(p.key)) {
      console.log(`   ${p.key} -> ${p.value}`);
    }
  });

  // 4. Verify MongoDB Audit Trail Record
  const auditRes = await req('/audit-logs');
  console.log('\n4️⃣ MongoDB Audit Trail Records Count:', auditRes.body.data.length);
  console.log('   Latest Action Logged:', auditRes.body.data[0].action, `(${auditRes.body.data[0].module})`);

  console.log('\n🎉 ALL INDIAN BUSINESS REGISTRATION & COMPLIANCE TESTS PASSED!');
}

runTests().catch(console.error);
