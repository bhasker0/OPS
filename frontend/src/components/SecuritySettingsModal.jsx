import React, { useState, useEffect } from 'react';
import { Shield, Key, QrCode, CheckCircle, AlertTriangle, Copy, Lock, RefreshCw, Terminal } from 'lucide-react';
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
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', width: '100%' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} style={{ fontSize: '0.78rem' }}>
            Close
          </button>
          {user?.twoFactorEnabled ? (
            <button
              type="button"
              className="btn btn-secondary"
              style={{ color: 'var(--accent-red)', fontSize: '0.78rem' }}
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
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem' }}
            >
              <Key size={14} /> Enable Two-Factor Auth
            </button>
          )}
        </div>
      );
    }

    if (step === 'setup') {
      return (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', width: '100%' }}>
          <button type="button" className="btn btn-secondary" onClick={() => setStep('overview')} style={{ fontSize: '0.78rem' }}>
            Back
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleVerifyAndEnable2FA}
            disabled={loading || verificationCode.length !== 6}
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem' }}
          >
            <CheckCircle size={14} /> Verify &amp; Activate 2FA
          </button>
        </div>
      );
    }

    if (step === 'disable') {
      return (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', width: '100%' }}>
          <button type="button" className="btn btn-secondary" onClick={() => setStep('overview')} style={{ fontSize: '0.78rem' }}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={handleDisable2FA}
            disabled={loading || verificationCode.length !== 6}
            style={{ fontSize: '0.78rem' }}
          >
            Confirm &amp; Disable 2FA
          </button>
        </div>
      );
    }

    return null;
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Security Dossier & MFA Settings"
      subtitle="TOTP RFC 6238 Authentication & Session Defense"
      icon={<Shield size={18} color="var(--accent-red)" />}
      size="md"
      footer={getFooter()}
    >
      {/* STEP 1: OVERVIEW */}
      {step === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div
            style={{
              background: user?.twoFactorEnabled ? 'var(--accent-green-bg)' : 'var(--accent-yellow-bg)',
              border: `1px solid ${user?.twoFactorEnabled ? 'rgba(46, 125, 50, 0.2)' : 'rgba(149, 100, 0, 0.2)'}`,
              borderRadius: 'var(--radius-sm)',
              padding: '1rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem',
            }}
          >
            {user?.twoFactorEnabled ? (
              <CheckCircle size={20} color="var(--accent-green)" style={{ marginTop: '0.1rem' }} />
            ) : (
              <AlertTriangle size={20} color="var(--accent-yellow)" style={{ marginTop: '0.1rem' }} />
            )}
            <div>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  color: user?.twoFactorEnabled ? 'var(--accent-green)' : 'var(--accent-yellow)',
                }}
              >
                2FA Status: {user?.twoFactorEnabled ? 'Protected (Active)' : 'Not Configured (Elevated Risk)'}
              </div>
              <div
                style={{
                  fontSize: '0.78rem',
                  color: 'var(--text-muted)',
                  marginTop: '0.25rem',
                  lineHeight: 1.5
                }}
              >
                {user?.twoFactorEnabled
                  ? 'Super Admin account requires a 6-digit TOTP RFC 6238 token upon every login.'
                  : 'Protect your OPS Super Admin privileges using Google Authenticator, Microsoft Authenticator, or 1Password.'}
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: '0.85rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.65rem', background: 'var(--bg-surface-elevated)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Account Identity:</span>
              <span className="font-mono-tabular" style={{ fontWeight: 600 }}>{user?.email || 'admin@ops.saas'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Auth Cipher:</span>
              <span className="font-mono-tabular">Argon2id + TOTP RFC 6238</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Session Policy:</span>
              <span className="badge badge-pastel-green">Global Token Revocation Armed</span>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: SETUP 2FA */}
      {step === 'setup' && (
        <form onSubmit={handleVerifyAndEnable2FA} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0 }}>
            Scan this QR code with your authenticator app (Google Authenticator, Microsoft Authenticator, or 1Password):
          </p>

          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              padding: '1.25rem',
              background: 'var(--bg-surface-elevated)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
            }}
          >
            {qrCodeUrl ? (
              <img
                src={qrCodeUrl}
                alt="TOTP QR Code"
                style={{ width: '160px', height: '160px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
              />
            ) : (
              <div style={{ padding: '2rem', color: 'var(--text-muted)', fontSize: '0.78rem' }}>Generating QR matrix...</div>
            )}
          </div>

          <div>
            <label
              style={{
                fontSize: '0.78rem',
                fontWeight: 600,
                color: 'var(--text-muted)',
                display: 'block',
                marginBottom: '0.35rem',
              }}
            >
              Or enter secret key manually:
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <samp
                className="font-mono-tabular"
                style={{
                  flex: 1,
                  padding: '0.45rem 0.65rem',
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.78rem',
                  letterSpacing: '1px',
                  wordBreak: 'break-all',
                }}
              >
                {totpSecret}
              </samp>
              <button type="button" className="btn btn-secondary" onClick={copySecret} title="Copy Key" style={{ padding: '0.4rem 0.65rem' }}>
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
              Enter 6-digit code from app:
            </label>
            <input
              type="text"
              maxLength="6"
              placeholder="123456"
              className="form-control font-mono-tabular"
              style={{ fontSize: '1.25rem', letterSpacing: '6px', textAlign: 'center', fontWeight: 700, borderRadius: 'var(--radius-sm)' }}
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
              background: 'var(--accent-red-bg)',
              padding: '0.85rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid rgba(198, 40, 40, 0.2)',
              fontSize: '0.78rem',
              color: 'var(--accent-red)',
              lineHeight: 1.5
            }}
          >
            ⚠️ <strong>Warning:</strong> Disabling Two-Factor Authentication lowers account security defenses. Enter your current 6-digit code to confirm.
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
              className="form-control font-mono-tabular"
              style={{ fontSize: '1.25rem', letterSpacing: '6px', textAlign: 'center', fontWeight: 700, borderRadius: 'var(--radius-sm)' }}
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

