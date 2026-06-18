import React, { useState } from 'react';
import { CreditCard, X, ShieldCheck, AlertCircle } from 'lucide-react';

export default function MockRazorpay({ orderData, onSuccess, onCancel }) {
  const [method, setMethod] = useState('card'); // card, upi, netbanking
  const [processing, setProcessing] = useState(false);
  const [cardNumber, setCardNumber] = useState('4111 1111 1111 1111');
  const [expiry, setExpiry] = useState('12/29');
  const [cvv, setCvv] = useState('123');

  const amountInINR = (orderData.amount / 100).toFixed(2);

  const handlePay = (status) => {
    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
      if (status === 'success') {
        const mockPaymentId = `pay_mock_${Math.random().toString(36).substring(2, 12)}`;
        onSuccess({
          razorpay_order_id: orderData.id,
          razorpay_payment_id: mockPaymentId,
          razorpay_signature: 'mock_signature_verified',
          shipping_address: orderData.shipping_address,
          isMock: true
        });
      } else {
        alert('Payment Simulation Failed: Card declined or transaction aborted.');
      }
    }, 1500);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '440px', padding: '0', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ background: '#1c1f2e', padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#2b83eb', fontWeight: '800', fontSize: '1.3rem', fontFamily: 'var(--font-title)' }}>Razorpay</span>
              <span className="badge badge-pending" style={{ fontSize: '0.65rem' }}>SIMULATOR</span>
            </div>
            <button onClick={onCancel} style={{ color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <X size={20} />
            </button>
          </div>
          
          <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>AmazeKart Checkout</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Order: {orderData.id}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Amount to pay</p>
              <p style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--accent)' }}>₹{amountInINR}</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '24px' }}>
          {processing ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justify: 'center', padding: '40px 0', gap: '16px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                border: '3px solid var(--border)',
                borderTop: '3px solid var(--accent)',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
              <style>{`
                @keyframes spin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
              `}</style>
              <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>Processing payment with Razorpay mock gateway...</p>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                <button 
                  onClick={() => setMethod('card')} 
                  style={{ 
                    flex: '1', 
                    padding: '8px 12px', 
                    borderRadius: 'var(--radius-sm)', 
                    background: method === 'card' ? 'var(--bg-tertiary)' : 'transparent',
                    color: method === 'card' ? 'var(--accent)' : 'var(--text-secondary)',
                    fontWeight: method === 'card' ? '600' : '400',
                    fontSize: '0.85rem'
                  }}
                >
                  Card
                </button>
                <button 
                  onClick={() => setMethod('upi')} 
                  style={{ 
                    flex: '1', 
                    padding: '8px 12px', 
                    borderRadius: 'var(--radius-sm)', 
                    background: method === 'upi' ? 'var(--bg-tertiary)' : 'transparent',
                    color: method === 'upi' ? 'var(--accent)' : 'var(--text-secondary)',
                    fontWeight: method === 'upi' ? '600' : '400',
                    fontSize: '0.85rem'
                  }}
                >
                  UPI
                </button>
                <button 
                  onClick={() => setMethod('net')} 
                  style={{ 
                    flex: '1', 
                    padding: '8px 12px', 
                    borderRadius: 'var(--radius-sm)', 
                    background: method === 'net' ? 'var(--bg-tertiary)' : 'transparent',
                    color: method === 'net' ? 'var(--accent)' : 'var(--text-secondary)',
                    fontWeight: method === 'net' ? '600' : '400',
                    fontSize: '0.85rem'
                  }}
                >
                  NetBanking
                </button>
              </div>

              {method === 'card' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Card Number</label>
                    <input 
                      type="text" 
                      value={cardNumber} 
                      onChange={(e) => setCardNumber(e.target.value)}
                      className="form-control" 
                      style={{ padding: '8px 12px' }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ flex: '1' }}>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Expiry</label>
                      <input 
                        type="text" 
                        value={expiry} 
                        onChange={(e) => setExpiry(e.target.value)}
                        className="form-control" 
                        style={{ padding: '8px 12px' }}
                      />
                    </div>
                    <div style={{ flex: '1' }}>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>CVV</label>
                      <input 
                        type="password" 
                        value={cvv} 
                        onChange={(e) => setCvv(e.target.value)}
                        className="form-control" 
                        style={{ padding: '8px 12px' }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {method === 'upi' && (
                <div style={{ textAlign: 'center', padding: '10px 0' }}>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Simulate UPI Payment</p>
                  <input type="text" className="form-control" placeholder="success@razorpay" style={{ textAlign: 'center', padding: '8px 12px' }} readOnly />
                </div>
              )}

              {method === 'net' && (
                <div style={{ textAlign: 'center', padding: '10px 0' }}>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Simulate NetBanking (SBI, HDFC, ICICI)</p>
                  <select className="form-control" style={{ padding: '8px 12px' }}>
                    <option>State Bank of India (Mock)</option>
                    <option>HDFC Bank (Mock)</option>
                    <option>ICICI Bank (Mock)</option>
                  </select>
                </div>
              )}

              <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
                <button 
                  onClick={() => handlePay('success')} 
                  className="btn btn-success" 
                  style={{ flex: '1', padding: '12px' }}
                >
                  Simulate Success
                </button>
                <button 
                  onClick={() => handlePay('failure')} 
                  className="btn btn-danger" 
                  style={{ flex: '1', padding: '12px' }}
                >
                  Simulate Failure
                </button>
              </div>

              <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                <ShieldCheck size={14} style={{ color: 'var(--success)' }} />
                <span>100% Secure. Simulated Sandbox Gateway.</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
