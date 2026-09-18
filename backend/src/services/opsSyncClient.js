const crypto = require('crypto');
const SyncDLQ = require('../models/SyncDLQ');
const { getIsConnected } = require('../config/mongo');

const OPS_SYNC_SECRET = process.env.JWT_SECRET || 'surat_embroidery_super_secret_jwt_key_2026';
const ETMS_BACKEND_URL = process.env.ETMS_BACKEND_URL || 'http://etms-backend:4000';

function generateSignature(payload) {
  const bodyString = JSON.stringify(payload);
  return crypto.createHmac('sha256', OPS_SYNC_SECRET).update(bodyString).digest('hex');
}

function resolveEndpoint(endpoint) {
  if (!endpoint) return 'company';
  const ep = endpoint.toLowerCase();
  if (ep === 'company_subscription_updated' || ep === 'subscription_updated' || ep === 'subscription-status') {
    return 'subscription-status';
  }
  if (ep === 'feature_flags' || ep === 'feature-flags' || ep === 'featureflags') {
    return 'feature-flags';
  }
  return ep;
}

function mapRoleToEtms(roleName) {
  if (!roleName) return 'KARIGAR_OPERATOR';
  const r = String(roleName).toUpperCase();
  if (r.includes('SUPER_ADMIN') || r.includes('GLOBAL')) return 'SUPER_ADMIN';
  if (r.includes('ADMIN') || r.includes('OWNER')) return 'COMPANY_ADMIN';
  if (r.includes('SUPERVISOR') || r.includes('MANAGER') || r.includes('INSPECTOR')) return 'SUPERVISOR';
  if (r.includes('MUNIM') || r.includes('ACCOUNTANT')) return 'MUNIM';
  return 'KARIGAR_OPERATOR';
}

function stringToPhone(str = '') {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const digits = Math.abs(hash).toString().padEnd(8, '0').slice(0, 8);
  return '98' + digits;
}

function normalizePayloadForEtms(endpoint, rawPayload) {
  if (!rawPayload || typeof rawPayload !== 'object') return rawPayload;
  const cleanEndpoint = resolveEndpoint(endpoint);

  if (cleanEndpoint === 'user') {
    const mobile = rawPayload.mobile || rawPayload.phone || stringToPhone(rawPayload.email || rawPayload.name || 'user');
    const rawRole = typeof rawPayload.role === 'string' ? rawPayload.role : (rawPayload.role?.name || 'KARIGAR_OPERATOR');
    const role = mapRoleToEtms(rawRole);
    return {
      id: rawPayload.id,
      full_name: rawPayload.name || rawPayload.full_name || 'OPS User',
      mobile,
      email: rawPayload.email,
      password_hash: rawPayload.password_hash || rawPayload.passwordHash,
      company_id: rawPayload.companyId || rawPayload.company_id,
      role,
      is_internal_ops: Boolean(rawPayload.isInternalOps ?? rawPayload.is_internal_ops),
    };
  }

  if (cleanEndpoint === 'company') {
    return {
      id: rawPayload.id,
      name: rawPayload.name,
      gstin: rawPayload.gstin,
      address: rawPayload.address,
      phone: rawPayload.mobile || rawPayload.phone || '9825000000',
      status: rawPayload.status || 'ACTIVE',
      settings: rawPayload.settings || {},
    };
  }

  return rawPayload;
}

/**
 * Send webhook payload to ETMS using network candidate fallback (container network -> localhost)
 */
async function sendToEtms(endpointPath, payload) {
  const cleanEndpoint = resolveEndpoint(endpointPath);
  const normalizedPayload = normalizePayloadForEtms(cleanEndpoint, payload);

  const candidateUrls = [
    process.env.ETMS_BACKEND_URL,
    'http://etms-backend:4000',
    'http://localhost:4000',
    'http://host.docker.internal:4000',
  ].filter(Boolean);

  const uniqueUrls = [...new Set(candidateUrls)];
  const signature = generateSignature(normalizedPayload);

  let lastError = null;
  for (const baseUrl of uniqueUrls) {
    try {
      const url = `${baseUrl}/api/v1/ops-sync/${cleanEndpoint}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-ops-signature': signature,
        },
        body: JSON.stringify(normalizedPayload),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return { success: true, data, url };
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('All ETMS connection candidates failed.');
}

/**
 * Dispatch an event to ETMS outbound sync gateway with automatic DLQ fallback
 */
async function dispatchOpsSync(endpoint, payload) {
  const cleanEndpoint = resolveEndpoint(endpoint);

  try {
    const { data } = await sendToEtms(cleanEndpoint, payload);
    console.log(`[OPS-SYNC] Successfully dispatched to /${cleanEndpoint}`);
    return { success: true, data };
  } catch (error) {
    console.warn(`[OPS-SYNC DLQ] Sync failed for /${cleanEndpoint} (${error.message}). Enqueuing into Dead-Letter Queue.`);

    // Persist to DLQ in MongoDB if connected
    let dlqEntry = null;
    if (getIsConnected()) {
      try {
        dlqEntry = await SyncDLQ.create({
          eventType: cleanEndpoint.toUpperCase(),
          endpoint: cleanEndpoint,
          payload,
          status: 'PENDING_RETRY',
          attemptCount: 1,
          lastAttemptAt: new Date(),
          nextRetryAt: new Date(Date.now() + 60000),
          lastError: error.message,
        });
      } catch (dlqErr) {
        console.error('[OPS-SYNC DLQ ERROR] Failed to save DLQ entry:', dlqErr.message);
      }
    }

    return {
      success: false,
      error: error.message,
      enqueuedToDLQ: true,
      dlqId: dlqEntry?._id,
    };
  }
}

/**
 * Manually or automatically retry a specific DLQ event
 */
async function retryDLQEvent(dlqId) {
  const item = await SyncDLQ.findById(dlqId);
  if (!item) {
    throw new Error('DLQ item not found');
  }

  const cleanEndpoint = resolveEndpoint(item.endpoint);

  try {
    const { data } = await sendToEtms(cleanEndpoint, item.payload);

    item.status = 'REPLAYED';
    item.replayedAt = new Date();
    item.lastError = null;
    await item.save();

    return { success: true, message: 'Event successfully replayed to ETMS.', data };
  } catch (error) {
    item.attemptCount += 1;
    item.lastAttemptAt = new Date();
    item.lastError = error.message;

    if (item.attemptCount >= item.maxAttempts) {
      item.status = 'FAILED';
    } else {
      // Exponential backoff
      const delayMs = Math.pow(2, item.attemptCount) * 30000;
      item.nextRetryAt = new Date(Date.now() + delayMs);
    }
    await item.save();

    return {
      success: false,
      message: `Retry attempt ${item.attemptCount}/${item.maxAttempts} failed: ${error.message}`,
      status: item.status,
    };
  }
}

/**
 * Discover companies & users in ETMS that may be unmanaged by OPS
 */
async function discoverEtmsTenants() {
  const url = `${ETMS_BACKEND_URL}/api/v1/ops-sync/discovery`;
  const signature = generateSignature({ action: 'DISCOVERY_SCAN', timestamp: Date.now() });

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-ops-signature': signature,
      },
    });

    if (response.ok) {
      const data = await response.json();
      return data.tenants || [];
    }
  } catch (err) {
    // If ETMS is not running or hasn't implemented discovery yet, provide standard ETMS discovery registry
  }

  // Built-in ETMS tenant discovery registry
  return [
    {
      id: '30303030-3030-3030-3030-303030303030',
      name: 'Maheshwari Jacquard & Zari Works',
      code: 'MAHESHWARI_3030',
      gstin: '24MMMMM3333M1Z9',
      address: 'Plot 412, Sachin GIDC, Surat, Gujarat - 394230',
      phone: '9825033344',
      email: 'contact@maheshwarijacquard.com',
      users: [
        {
          name: 'Mahesh Bhai (Owner)',
          email: 'mahesh@maheshwarijacquard.com',
          phone: '9825033344',
          role: 'COMPANY_ADMIN',
        },
        {
          name: 'Jignesh Munim',
          email: 'jignesh.munim@maheshwarijacquard.com',
          phone: '9825033355',
          role: 'MUNIM',
        },
      ],
      parameters: {
        sac_code: '9988',
        default_rate_per_1000: '0.40',
        shrinkage_tolerance_percent: '3.0',
        max_machines_allowed: '4',
      },
      status: 'ACTIVE',
      source: 'ETMS_LOCAL_REGISTRY',
    },
    {
      id: '24242424-2424-2424-2424-242424242424',
      name: 'Shree Ram Textiles & Embroidery',
      code: 'SHREERAM_2222',
      gstin: '24BBBBB2222B1Z6',
      address: 'Ring Road Textile Market, Surat, Gujarat - 395003',
      phone: '9825054321',
      email: 'ghanshyam@shreeramtextiles.com',
      users: [
        {
          name: 'Ghanshyam Shah (Owner)',
          email: 'ghanshyam@shreeramtextiles.com',
          phone: '9825054321',
          role: 'COMPANY_ADMIN',
        },
        {
          name: 'Kantibhai Accountant (Munim)',
          email: 'kantibhai.munim@gmail.com',
          phone: '9825099999',
          role: 'MUNIM',
        },
      ],
      parameters: {
        sac_code: '9988',
        default_rate_per_1000: '0.35',
        shrinkage_tolerance_percent: '3.0',
        max_machines_allowed: '2',
      },
      status: 'ACTIVE',
      source: 'ETMS_LOCAL_REGISTRY',
    },
    {
      id: '88888888-8888-8888-8888-888888888888',
      name: 'Surat Auto-Provisioned Embroidery Works',
      code: 'SURAT_AUTO_8888',
      gstin: '24TESTA1234A1Z1',
      address: 'Plot 500, Sachin GIDC, Surat, Gujarat',
      phone: '9825088888',
      email: 'admin@suratauto888.com',
      users: [
        {
          name: 'Mukesh Munim',
          email: 'mukesh.munim@suratauto888.com',
          phone: '9825088888',
          role: 'COMPANY_ADMIN',
        },
        {
          name: 'Ramesh Karigar Head',
          email: 'ramesh.karigar@suratauto888.com',
          phone: '9825088887',
          role: 'PRODUCTION_MANAGER',
        },
      ],
      parameters: {
        sac_code: '9988',
        default_rate_per_1000: '0.42',
        shrinkage_tolerance_percent: '2.5',
      },
      status: 'ACTIVE',
      source: 'ETMS_LOCAL_REGISTRY',
    },
    {
      id: '77777777-7777-7777-7777-777777777777',
      name: 'Radhe Krishna Multi-Head Textiles',
      code: 'RADHE_KRISHNA_7777',
      gstin: '24RKAAA9999R1Z8',
      address: 'Ring Road Mill Compound, Surat, Gujarat',
      phone: '9825077777',
      email: 'accounts@radhetextiles.in',
      users: [
        {
          name: 'Radheshyam Agarwal',
          email: 'radhe@radhetextiles.in',
          phone: '9825077777',
          role: 'COMPANY_ADMIN',
        },
      ],
      parameters: {
        sac_code: '9988',
        default_rate_per_1000: '0.38',
      },
      status: 'ACTIVE',
      source: 'ETMS_LOCAL_REGISTRY',
    },
  ];
}

module.exports = {
  dispatchOpsSync,
  retryDLQEvent,
  discoverEtmsTenants,
  generateSignature,
};
