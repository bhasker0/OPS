const crypto = require('crypto');

const ETMS_BACKEND_URL = process.env.ETMS_BACKEND_URL || 'http://localhost:4000';
const OPS_SYNC_SECRET = process.env.JWT_SECRET || 'surat_embroidery_super_secret_jwt_key_2026';

function generateSignature(payload) {
  const bodyString = JSON.stringify(payload);
  return crypto.createHmac('sha256', OPS_SYNC_SECRET).update(bodyString).digest('hex');
}

async function dispatchOpsSync(endpoint, payload) {
  try {
    const url = `${ETMS_BACKEND_URL}/api/v1/ops-sync/${endpoint}`;
    const signature = generateSignature(payload);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-ops-signature': signature,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    console.log(`[OPS-SYNC] Dispatched to /${endpoint} - Status: ${response.status}`);
    return data;
  } catch (error) {
    console.error(`[OPS-SYNC ERROR] Failed to dispatch to /${endpoint}:`, error.message);
    return { success: false, error: error.message };
  }
}

module.exports = {
  dispatchOpsSync,
};
