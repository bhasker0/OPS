import React, { useState, useEffect } from 'react';
import { Shield, Key, QrCode, CheckCircle, AlertTriangle, Copy, Lock, RefreshCw } from 'lucide-react';
import Drawer from './ui/Drawer';
import { useToast } from '../context/ToastContext';

export default function SecuritySettingsModal({
  isOpen,
  onClose,
  apiBase = 'http://localhost:5000/api',
  user,
  onUserUpdated,
}) {
  const toast = useToast();

  const [step, setStep] = useState('overview'); // overview, setup, disable
  const [totpSecret, setTotpSecret] = useState('');
  const [totpUri, setTotpUri] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStep('overview');
      setVerificationCode('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleStart2FASetup = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('ops_access_token');
      const res = await fetch(`${apiBase}/auth/2fa/setup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
      const data = await res.json();
      if (data.success) {
        setTotpSecret(data.data.secret);
        setTotpUri(data.data.uri);
        setQrCodeUrl(data.data.qrCodeUrl);
        setStep('setup');
      } else {
        toast.error(data.message || 'Failed to initialize 2FA setup.');
      }
    } catch (err) {
      toast.error('Network error setting up 2FA.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndEnable2FA = async (e) => {
    if (e) e.preventDefault();
    if (!verificationCode || verificationCode.length !== 6) {
      toast.warning('Please enter a valid 6-digit verification code.');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('ops_access_token');
      const res = await fetch(`${apiBase}/auth/2fa/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          secret: totpSecret,
          code: verificationCode.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success('Two-Factor Authentication is now active on your account!', '2FA Enabled');
        if (onUserUpdated) onUserUpdated({ ...user, twoFactorEnabled: true });
        setStep('overview');
        onClose();
      } else {
        toast.error(data.message || 'Invalid verification code.');
      }
    } catch (err) {
      toast.error('Network error during 2FA verification.');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable2FA = async (e) => {
    if (e) e.preventDefault();
    if (!verificationCode || verificationCode.length !== 6) {
      toast.warning('Please enter current 6-digit code to confirm disable.');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('ops_access_token');
      const res = await fetch(`${apiBase}/auth/2fa/disable`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          code: verificationCode.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.info('Two-Factor Authentication has been disabled.');
        if (onUserUpdated) onUserUpdated({ ...user, twoFactorEnabled: false });
        setStep('overview');
        onClose();
      } else {
        toast.error(data.message || 'Invalid verification code.');
      }
    } catch (err) {
      toast.error('Network error disabling 2FA.');
    } finally {
      setLoading(false);
    }
  };

  const copySecret = () => {
    navigator.clipboard.writeText(totpSecret);
    toast.info('TOTP Secret key copied to clipboard.');
  };

  const getFooter = () => {
    if (step === 'overview') {
      return (
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
          {user?.twoFactorEnabled ? (
            <button
              type="button"
              className="btn btn-secondary"
              style={{ color: '#dc2626' }}
              onClick={() => setStep('disable')}
            >
              Disable 2FA
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleStart2FASetup}
              disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <Key size={14} /> Enable Two-Factor Auth
            </button>
          )}
        </>
      );
    }

    if (step === 'setup') {
      return (
        <>
          <button type="button" className="btn btn-secondary" onClick={() => setStep('overview')}>
            Back
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleVerifyAndEnable2FA}
            disabled={loading || verificationCode.length !== 6}
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <CheckCircle size={14} /> Verify & Activate 2FA
          </button>
        </>
      );
    }

    if (step === 'disable') {
      return (
        <>
          <button type="button" className="btn btn-secondary" onClick={() => setStep('overview')}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            style={{ background: '#dc2626' }}
            onClick={handleDisable2FA}
            disabled={loading || verificationCode.length !== 6}
          >
            Confirm & Disable 2FA
          </button>
        </>
      );
    }

    return null;
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Account Security & MFA"
      subtitle="TOTP RFC 6238 Multi-Factor Authentication & Session Controls"
      icon={<Shield size={18} />}
      size="md"
      footer={getFooter()}
    >
      {/* STEP 1: OVERVIEW */}
      {step === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div
            style={{
              background: user?.twoFactorEnabled ? 'var(--success-light)' : 'var(--warning-light)',
              border: `1px solid ${user?.twoFactorEnabled ? 'var(--success)' : 'var(--warning)'}`,
              borderRadius: '8px',
              padding: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            {user?.twoFactorEnabled ? (
              <CheckCircle size={24} color="var(--success)" />
            ) : (
              <AlertTriangle size={24} color="var(--warning)" />
            )}
            <div>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  color: user?.twoFactorEnabled ? 'var(--success)' : 'var(--warning)',
                }}
              >
                2FA Status: {user?.twoFactorEnabled ? 'PROTECTED (Active)' : 'NOT CONFIGURED'}
              </div>
              <div
                style={{
                  fontSize: '0.78rem',
                  color: 'var(--text-muted)',
                  marginTop: '0.1rem',
                }}
              >
                {user?.twoFactorEnabled
                  ? 'Your Super Admin account requires a 6-digit TOTP code during every login.'
                  : 'Protect your operations account with Google Authenticator, Authy, or Microsoft Authenticator.'}
              </div>
            </div>
          </div>

          <div
            style={{
              background: 'var(--bg-canvas)',
              padding: '1rem',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              fontSize: '0.8rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Account:</span>
              <strong>{user?.email || 'admin@ops.saas'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Auth Architecture:</span>
              <strong>JWT (Argon2 / Bcrypt) + TOTP RFC 6238</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-muted)' }}>Session Killswitch:</span>
              <span className="badge badge-active" style={{ fontSize: '0.7rem' }}>
                ACTIVE ENFORCEMENT
              </span>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: SETUP 2FA */}
      {step === 'setup' && (
        <form onSubmit={handleVerifyAndEnable2FA} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
            Scan the QR code with your authenticator app (Google Authenticator, Microsoft Authenticator, or 1Password):
          </p>

          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              padding: '1rem',
              background: 'var(--bg-canvas)',
              borderRadius: '8px',
              border: '1px solid var(--border)',
            }}
          >
            {qrCodeUrl ? (
              <img
                src={qrCodeUrl}
                alt="TOTP QR Code"
                style={{ width: '180px', height: '180px', borderRadius: '6px' }}
              />
            ) : (
              <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>Generating QR...</div>
            )}
          </div>

          <div>
            <label
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'var(--text-muted)',
                display: 'block',
                marginBottom: '0.25rem',
              }}
            >
              Or enter this Secret Key manually:
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <code
                style={{
                  flex: 1,
                  padding: '0.4rem 0.6rem',
                  background: 'var(--border-subtle)',
                  borderRadius: '5px',
                  fontSize: '0.82rem',
                  letterSpacing: '1px',
                  wordBreak: 'break-all',
                }}
              >
                {totpSecret}
              </code>
              <button type="button" className="btn btn-secondary" onClick={copySecret} title="Copy Key">
                <Copy size={13} />
              </button>
            </div>
          </div>

          <div>
            <label
              style={{
                fontSize: '0.78rem',
                fontWeight: 600,
                color: 'var(--text-main)',
                display: 'block',
                marginBottom: '0.35rem',
              }}
            >
              Enter the 6-digit code shown in your app:
            </label>
            <input
              type="text"
              maxLength="6"
              placeholder="123456"
              className="form-control"
              style={{ fontSize: '1.25rem', letterSpacing: '4px', textAlign: 'center', fontWeight: 700 }}
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
              autoFocus
            />
          </div>
        </form>
      )}

      {/* STEP 3: DISABLE 2FA */}
      {step === 'disable' && (
        <form onSubmit={handleDisable2FA} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div
            style={{
              background: 'var(--danger-light)',
              padding: '0.85rem',
              borderRadius: '6px',
              border: '1px solid var(--danger)',
              fontSize: '0.8rem',
              color: 'var(--danger)',
            }}
          >
            ⚠️ Disabling Two-Factor Authentication reduces your Super Admin account security. Enter current OTP code to confirm.
          </div>

          <div>
            <label
              style={{
                fontSize: '0.78rem',
                fontWeight: 600,
                color: 'var(--text-main)',
                display: 'block',
                marginBottom: '0.35rem',
              }}
            >
              Enter current 6-digit TOTP code:
            </label>
            <input
              type="text"
              maxLength="6"
              placeholder="123456"
              className="form-control"
              style={{ fontSize: '1.25rem', letterSpacing: '4px', textAlign: 'center', fontWeight: 700 }}
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
              autoFocus
            />
          </div>
        </form>
      )}
    </Drawer>
  );
}
