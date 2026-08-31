import React from 'react';
import { Printer, Download, FileText } from 'lucide-react';
import Drawer from './ui/Drawer';

export default function InvoicePdfViewerModal({ isOpen, onClose, invoice }) {
  if (!isOpen || !invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  const isIntraState = (invoice.company?.gstin || '').startsWith('24');

  const footerContent = (
    <>
      <button type="button" className="btn btn-secondary" onClick={onClose}>
        Close Inspector
      </button>
      <button
        type="button"
        className="btn btn-primary"
        onClick={handlePrint}
        style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
      >
        <Printer size={14} /> Print / Save PDF
      </button>
    </>
  );

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={`Tax Invoice: ${invoice.invoiceNumber}`}
      subtitle={`${invoice.company?.name || 'Tenant Company'} • Status: ${invoice.status}`}
      icon={<FileText size={18} />}
      size="xl"
      footer={footerContent}
    >
      <div
        id="printable-tax-invoice"
        style={{
          background: '#ffffff',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          padding: '2rem',
          fontFamily: 'var(--font-sans)',
          color: '#1e293b',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        {/* Header Row: Provider vs Tenant */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            borderBottom: '2px solid #0f172a',
            paddingBottom: '1rem',
            marginBottom: '1.25rem',
          }}
        >
          <div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)' }}>
              OPS SaaS Systems India Pvt Ltd
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.2rem' }}>
              Ring Road Textile Market Complex, Surat, Gujarat — 395002
            </div>
            <div style={{ fontSize: '0.78rem', color: '#334155', marginTop: '0.2rem' }}>
              <strong>GSTIN:</strong> 24AABCO1234E1Z9 | <strong>PAN:</strong> AABCO1234E
            </div>
            <div style={{ fontSize: '0.78rem', color: '#334155' }}>
              <strong>State:</strong> Gujarat (Code: 24)
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>TAX INVOICE</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary)', marginTop: '0.2rem' }}>
              {invoice.invoiceNumber}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.2rem' }}>
              Date: {new Date(invoice.createdAt).toLocaleDateString('en-IN')}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
              Due Date: {new Date(invoice.dueDate).toLocaleDateString('en-IN')}
            </div>
          </div>
        </div>

        {/* Billed To / Tenant Info */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1.5rem',
            marginBottom: '1.5rem',
            background: '#f8fafc',
            padding: '1rem',
            borderRadius: '6px',
            border: '1px solid #e2e8f0',
          }}
        >
          <div>
            <div
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                color: '#64748b',
                textTransform: 'uppercase',
                marginBottom: '0.25rem',
              }}
            >
              Billed To (Customer):
            </div>
            <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>{invoice.company?.name}</div>
            <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: '0.15rem' }}>
              Code: {invoice.company?.code} | Contact: {invoice.company?.contactPerson || 'N/A'}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#475569' }}>
              {invoice.company?.address || 'Surat, Gujarat, India'}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#1e40af', fontWeight: 600, marginTop: '0.2rem' }}>
              GSTIN: {invoice.company?.gstin || 'Unregistered / Consumer'}
            </div>
          </div>

          <div>
            <div
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                color: '#64748b',
                textTransform: 'uppercase',
                marginBottom: '0.25rem',
              }}
            >
              Subscription Period:
            </div>
            <div style={{ fontSize: '0.82rem', color: '#334155' }}>
              <strong>From:</strong> {new Date(invoice.billingPeriodStart).toLocaleDateString('en-IN')}
            </div>
            <div style={{ fontSize: '0.82rem', color: '#334155' }}>
              <strong>To:</strong> {new Date(invoice.billingPeriodEnd).toLocaleDateString('en-IN')}
            </div>
            <div style={{ fontSize: '0.82rem', color: '#334155', marginTop: '0.35rem' }}>
              <strong>Payment Method:</strong> {invoice.paymentMethod || 'Online Gateway / NEFT'}
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1.25rem', fontSize: '0.8rem' }}>
          <thead>
            <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
              <th style={{ textAlign: 'left', padding: '0.6rem' }}>#</th>
              <th style={{ textAlign: 'left', padding: '0.6rem' }}>Service Description</th>
              <th style={{ textAlign: 'center', padding: '0.6rem' }}>SAC Code</th>
              <th style={{ textAlign: 'right', padding: '0.6rem' }}>Base Price</th>
              <th style={{ textAlign: 'right', padding: '0.6rem' }}>Tax Rate</th>
              <th style={{ textAlign: 'right', padding: '0.6rem' }}>Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
              <td style={{ padding: '0.65rem' }}>1</td>
              <td style={{ padding: '0.65rem' }}>
                <strong>{invoice.plan?.name || 'SaaS Plan'} Subscription</strong>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                  Micro-ERP cloud license for {invoice.plan?.maxMachines || 2} machines & {invoice.plan?.maxUsers || 5} users
                </div>
              </td>
              <td style={{ padding: '0.65rem', textAlign: 'center' }}>
                <code style={{ background: '#f1f5f9', padding: '0.15rem 0.35rem', borderRadius: '3px' }}>
                  {invoice.sacCode || '998313'}
                </code>
              </td>
              <td style={{ padding: '0.65rem', textAlign: 'right' }}>₹{invoice.baseAmount?.toFixed(2)}</td>
              <td style={{ padding: '0.65rem', textAlign: 'right' }}>{invoice.gstRate || 18}%</td>
              <td style={{ padding: '0.65rem', textAlign: 'right', fontWeight: 700 }}>
                ₹{invoice.baseAmount?.toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Tax Breakdown & Totals */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
          <div
            style={{
              width: '320px',
              background: '#f8fafc',
              padding: '1rem',
              borderRadius: '6px',
              border: '1px solid #e2e8f0',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '0.35rem',
                fontSize: '0.8rem',
              }}
            >
              <span>Sub-Total (Taxable Value):</span>
              <strong>₹{invoice.baseAmount?.toFixed(2)}</strong>
            </div>

            {isIntraState ? (
              <>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '0.35rem',
                    fontSize: '0.78rem',
                    color: '#475569',
                  }}
                >
                  <span>CGST (9.0%):</span>
                  <span>₹{invoice.cgstAmount?.toFixed(2)}</span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '0.35rem',
                    fontSize: '0.78rem',
                    color: '#475569',
                  }}
                >
                  <span>SGST (9.0%):</span>
                  <span>₹{invoice.sgstAmount?.toFixed(2)}</span>
                </div>
              </>
            ) : (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '0.35rem',
                  fontSize: '0.78rem',
                  color: '#475569',
                }}
              >
                <span>IGST (18.0%):</span>
                <span>₹{invoice.igstAmount?.toFixed(2)}</span>
              </div>
            )}

            <div
              style={{
                borderTop: '2px solid #cbd5e1',
                paddingTop: '0.5rem',
                marginTop: '0.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '1rem',
                fontWeight: 800,
                color: '#0f172a',
              }}
            >
              <span>Total Invoice Value:</span>
              <span style={{ color: 'var(--primary)' }}>₹{invoice.totalAmount?.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Bank & Remittance Instructions */}
        <div
          style={{
            borderTop: '1px solid #e2e8f0',
            paddingTop: '1rem',
            display: 'grid',
            gridTemplateColumns: '1.2fr 0.8fr',
            gap: '1rem',
            fontSize: '0.75rem',
            color: '#64748b',
          }}
        >
          <div>
            <div style={{ fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>
              Bank Transfer / RTGS / NEFT:
            </div>
            <div>Account Name: OPS SaaS Systems India Pvt Ltd</div>
            <div>Bank: HDFC Bank Ltd (Ring Road Branch, Surat)</div>
            <div>Account No: 50200012345678 | IFSC: HDFC0000123</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>
              Terms & Conditions:
            </div>
            <div>This is a computer-generated tax invoice under SAC 9983. No physical signature required.</div>
          </div>
        </div>
      </div>
    </Drawer>
  );
}
