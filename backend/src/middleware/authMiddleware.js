const jwt = require('jsonwebtoken');
const prisma = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'surat_embroidery_super_secret_jwt_key_2026';

/**
 * Authentication Middleware with Session Revocation Killswitch Guard
 */
async function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      code: 'AUTH_REQUIRED',
      message: 'Access denied. Valid Bearer authorization token is required.',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // 1. Verify User exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            code: true,
            status: true,
            sessionsRevokedAt: true,
          },
        },
        role: {
          select: {
            id: true,
            name: true,
            permissions: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        code: 'USER_NOT_FOUND',
        message: 'The user account associated with this token no longer exists.',
      });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        code: 'ACCOUNT_SUSPENDED',
        message: `Your account is currently ${user.status.toLowerCase()}. Contact your administrator.`,
      });
    }

    // 2. Killswitch Check: Single User Token Version Revocation
    if (decoded.tokenVersion !== undefined && user.tokenVersion !== decoded.tokenVersion) {
      return res.status(401).json({
        success: false,
        code: 'SESSION_REVOKED',
        message: 'Your session has been invalidated or terminated. Please log in again.',
      });
    }

    // 3. Killswitch Check: Company-Wide Session Revocation
    if (!decoded.isImpersonated && user.company && user.company.sessionsRevokedAt) {
      const revokedAtSec = Math.floor(new Date(user.company.sessionsRevokedAt).getTime() / 1000);

      if (decoded.iat < revokedAtSec) {
        return res.status(401).json({
          success: false,
          code: 'TENANT_SESSIONS_REVOKED',
          message: 'All active sessions for your organization were revoked by an Administrator.',
        });
      }
    }

    // Attach verified user and decoded claims to request context
    req.user = {
      ...user,
      permissions: user.role?.permissions ? JSON.parse(user.role.permissions) : ['*'],
      isImpersonated: Boolean(decoded.isImpersonated),
      impersonatedBy: decoded.impersonatedBy || null,
      impersonatorEmail: decoded.impersonatorEmail || null,
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        code: 'TOKEN_EXPIRED',
        message: 'Authentication token has expired. Please refresh your session.',
      });
    }

    return res.status(401).json({
      success: false,
      code: 'INVALID_TOKEN',
      message: 'Invalid or forged authentication token.',
    });
  }
}

/**
 * Super Admin Role Guard Middleware
 */
function requireSuperAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  const isSuperAdmin =
    req.user.isInternalOps ||
    req.user.permissions.includes('*') ||
    req.user.permissions.includes('ADMIN_ACCESS') ||
    req.user.permissions.includes('GLOBAL_OPS_ADMIN');

  if (!isSuperAdmin) {
    return res.status(403).json({
      success: false,
      code: 'FORBIDDEN',
      message: 'Super Administrator privileges are required to perform this operational action.',
    });
  }

  next();
}

module.exports = {
  authenticateJWT,
  requireSuperAdmin,
  JWT_SECRET,
};
