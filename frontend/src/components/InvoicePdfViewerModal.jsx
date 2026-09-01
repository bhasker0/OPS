import React from 'react';
import { Printer, Download, FileText, CheckCircle2 } from 'lucide-react';
import Drawer from './ui/Drawer';

export default function InvoicePdfViewerModal({ isOpen, onClose, invoice }) {
  if (!isOpen || !invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  const isIntraState = (invoice.company?.gstin || '').startsWith('24');

  const footerContent = (
    <>
      <button type="button" className="btn btn-secondary" onClick={onClose} style={{ fontSize: '0.78rem' }}>
        Close
      </button>
      <button
        type="button"
        className="btn btn-primary"
        onClick={handlePrint}
        style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem' }}
      >
        <Printer size={13} /> Print / Export PDF
      </button>
    </>
  );

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={`Tax Invoice: ${invoice.invoiceNumber}`}
      subtitle={`${invoice.company?.name || 'Tenant Organization'} • Status: ${invoice.status}`}
      icon={<FileText size={18} color="var(--accent-red)" />}
      size="xl"
      footer={footerContent}
    >
      <div
        id="printable-tax-invoice"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: '1.5rem',
          color: 'var(--text-main)',
        }}
      >
        {/* Header Row: Provider vs Tenant */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--border)',
            paddingBottom: '1rem',
            marginBottom: '1rem',
          }}
        >
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>
              OPS SaaS Systems India Pvt Ltd
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Ring Road Textile Market Complex, Surat, Gujarat — 395002
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-main)', marginTop: '0.2rem' }}>
              <strong>GSTIN:</strong> 24AABCO1234E1Z9 | <strong>PAN:</strong> AABCO1234E
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              <strong>State:</strong> Gujarat (Code: 24)
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--accent-blue)' }}>Tax Invoice &bull; SAC 9983</div>
            <div className="font-mono-tabular" style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '0.2rem' }}>
              {invoice.invoiceNumber}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Date: {new Date(invoice.createdAt).toISOString().split('T')[0]}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Due: {new Date(invoice.dueDate).toISOString().split('T')[0]}
            </div>
          </div>
        </div>

        {/* Billed To / Tenant Info */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1rem',
            marginBottom: '1rem',
            background: 'var(--bg-surface-elevated)',
            padding: '1rem',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)',
          }}
        >
          <div>
            <div
              style={{
                fontSize: '0.72rem',
                fontWeight: 600,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                marginBottom: '0.35rem',
              }}
            >
              Billed To (Customer Tenant):
            </div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{invoice.company?.name}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
              Code: {invoice.company?.code} | Contact: {invoice.company?.contactPerson || 'N/A'}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {invoice.company?.address || 'Surat, Gujarat, India'}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--accent-green)', fontWeight: 600, marginTop: '0.25rem' }}>
              GSTIN: {invoice.company?.gstin || 'Unregistered / Consumer'}
            </div>
          </div>

          <div>
            <div
              style={{
                fontSize: '0.72rem',
                fontWeight: 600,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                marginBottom: '0.35rem',
              }}
            >
              Subscription Period:
            </div>
            <div style={{ fontSize: '0.78rem' }}>
              <strong>Start:</strong> {new Date(invoice.billingPeriodStart).toISOString().split('T')[0]}
            </div>
            <div style={{ fontSize: '0.78rem' }}>
              <strong>End:</strong> {new Date(invoice.billingPeriodEnd).toISOString().split('T')[0]}
            </div>
            <div style={{ fontSize: '0.78rem', marginTop: '0.25rem' }}>
              <strong>Payment Method:</strong> {invoice.paymentMethod || 'Gateway / NEFT'}
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1rem', fontSize: '0.78rem' }}>
          <thead>
            <tr style={{ background: 'var(--bg-surface-elevated)', borderBottom: '1px solid var(--border)' }}>
              <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem' }}>#</th>
              <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem' }}>Service Description</th>
              <th style={{ textAlign: 'center', padding: '0.5rem 0.75rem' }}>SAC Code</th>
              <th style={{ textAlign: 'right', padding: '0.5rem 0.75rem' }}>Base Price</th>
              <th style={{ textAlign: 'right', padding: '0.5rem 0.75rem' }}>Tax Rate</th>
              <th style={{ textAlign: 'right', padding: '0.5rem 0.75rem' }}>Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ padding: '0.65rem 0.75rem' }}>01</td>
              <td style={{ padding: '0.65rem 0.75rem' }}>
                <strong>{invoice.plan?.name || 'SaaS Plan'} Subscription</strong>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Micro-ERP Cloud License &bull; {invoice.plan?.maxMachines || 2} Units & {invoice.plan?.maxUsers || 5} Operators
                </div>
              </td>
              <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center' }} className="font-mono-tabular">
                {invoice.sacCode || '998313'}
              </td>
              <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right' }} className="font-mono-tabular">₹{invoice.baseAmount?.toFixed(2)}</td>
              <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right' }}>{invoice.gstRate || 18}%</td>
              <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right', fontWeight: 700 }} className="font-mono-tabular">
                ₹{invoice.baseAmount?.toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Tax Breakdown & Totals */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.25rem' }}>
          <div
            style={{
              width: '340px',
              background: 'var(--bg-surface-elevated)',
              padding: '1rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              fontSize: '0.78rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '0.35rem',
              }}
            >
              <span>Sub-Total (Taxable Value):</span>
              <strong className="font-mono-tabular">₹{invoice.baseAmount?.toFixed(2)}</strong>
            </div>

            {isIntraState ? (
              <>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '0.35rem',
                    color: 'var(--text-muted)',
                  }}
                >
                  <span>CGST (9.0%):</span>
                  <span className="font-mono-tabular">₹{invoice.cgstAmount?.toFixed(2)}</span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '0.35rem',
                    color: 'var(--text-muted)',
                  }}
                >
                  <span>SGST (9.0%):</span>
                  <span className="font-mono-tabular">₹{invoice.sgstAmount?.toFixed(2)}</span>
                </div>
              </>
            ) : (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '0.35rem',
                  color: 'var(--text-muted)',
                }}
              >
                <span>IGST (18.0%):</span>
                <span className="font-mono-tabular">₹{invoice.igstAmount?.toFixed(2)}</span>
              </div>
            )}

            <div
              style={{
                borderTop: '1px solid var(--border)',
                paddingTop: '0.5rem',
                marginTop: '0.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.95rem',
                fontWeight: 700,
                color: 'var(--text-main)',
              }}
            >
              <span>Total Invoice Value:</span>
              <span className="font-mono-tabular" style={{ color: 'var(--accent-green)' }}>₹{invoice.totalAmount?.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Bank & Remittance Instructions */}
        <div
          style={{
            borderTop: '1px solid var(--border)',
            paddingTop: '0.85rem',
            display: 'grid',
            gridTemplateColumns: '1.2fr 0.8fr',
            gap: '1rem',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
          }}
        >
          <div>
            <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
              Bank Transfer / RTGS / NEFT:
            </div>
            <div>Account Name: OPS SaaS Systems India Pvt Ltd</div>
            <div>Bank: HDFC Bank Ltd (Ring Road Branch, Surat)</div>
            <div>Account No: 50200012345678 | IFSC: HDFC0000123</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 600, color: 'var(--accent-green)', marginBottom: '0.25rem' }}>
              Digitally Signed &bull; SAC 9983 Compliant
            </div>
            <div>Computer generated fiscal document. No physical signature required.</div>
          </div>
        </div>
      </div>
    </Drawer>
  );
}

