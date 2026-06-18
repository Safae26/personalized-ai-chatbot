import React, { useState } from 'react';
import { User, Mail, Lock, UserCheck, Shield, Key } from 'lucide-react';

export default function Auth({ login, setView }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('customer'); // customer, reseller
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleQuickLogin = (quickEmail, quickPassword) => {
    setEmail(quickEmail);
    setPassword(quickPassword);
    setIsLogin(true);
    setError('');
    setMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    const payload = isLogin 
      ? { email, password } 
      : { name, email, password, role };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Authentication failed');
      }

      if (isLogin) {
        login(data.token, data.user);
        if (data.user.role === 'admin') {
          setView('admin');
        } else if (data.user.role === 'reseller') {
          if (data.user.status === 'pending') {
            setError('Your reseller application is still pending admin approval.');
            login(null, null); // Clear state
          } else {
            setView('reseller');
          }
        } else {
          setView('products');
        }
      } else {
        setMessage(data.message || 'Registration successful! You can now log in.');
        setIsLogin(true);
        setPassword('');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      minHeight: 'calc(100vh - 120px)', 
      alignItems: 'center', 
      justifyContent: 'center',
      padding: '20px 0'
    }}>
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1.2fr', 
        maxWidth: '900px', 
        width: '100%', 
        background: 'var(--bg-secondary)', 
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-lg)'
      }}>
        {/* Left Side: Information & Quick Accounts */}
        <div style={{ 
          background: 'linear-gradient(135deg, #161622 0%, #1e1e2f 100%)', 
          padding: '40px', 
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <h2 style={{ fontSize: '2rem', marginBottom: '16px', fontFamily: 'var(--font-title)' }}>
              Welcome to <span style={{ color: 'var(--accent)' }}>AmazeKart</span>
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '24px' }}>
              Experience a premium multi-role e-commerce network with integrated payment verification, inventory stock alerting, and review controls.
            </p>
          </div>

          <div>
            <h4 style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Key size={16} style={{ color: 'var(--accent)' }} /> Quick Test Credentials
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button 
                type="button"
                onClick={() => handleQuickLogin('customer@amazon.com', 'customer123')}
                className="btn btn-secondary" 
                style={{ justifyContent: 'flex-start', padding: '10px 14px', fontSize: '0.85rem' }}
              >
                <User size={16} /> Login as <strong>Customer</strong>
              </button>
              <button 
                type="button"
                onClick={() => handleQuickLogin('reseller@amazon.com', 'reseller123')}
                className="btn btn-secondary" 
                style={{ justifyContent: 'flex-start', padding: '10px 14px', fontSize: '0.85rem' }}
              >
                <UserCheck size={16} /> Login as <strong>Reseller (Approved)</strong>
              </button>
              <button 
                type="button"
                onClick={() => handleQuickLogin('admin@amazon.com', 'admin123')}
                className="btn btn-secondary" 
                style={{ justifyContent: 'flex-start', padding: '10px 14px', fontSize: '0.85rem' }}
              >
                <Shield size={16} /> Login as <strong>Admin</strong>
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Auth Form */}
        <div style={{ padding: '40px' }}>
          <div style={{ display: 'flex', gap: '20px', marginBottom: '30px' }}>
            <button 
              onClick={() => { setIsLogin(true); setError(''); setMessage(''); }}
              style={{ 
                fontSize: '1.2rem', 
                fontWeight: '600', 
                color: isLogin ? 'var(--text-primary)' : 'var(--text-secondary)',
                borderBottom: isLogin ? '2px solid var(--accent)' : 'none',
                paddingBottom: '6px',
                cursor: 'pointer'
              }}
            >
              Sign In
            </button>
            <button 
              onClick={() => { setIsLogin(false); setError(''); setMessage(''); }}
              style={{ 
                fontSize: '1.2rem', 
                fontWeight: '600', 
                color: !isLogin ? 'var(--text-primary)' : 'var(--text-secondary)',
                borderBottom: !isLogin ? '2px solid var(--accent)' : 'none',
                paddingBottom: '6px',
                cursor: 'pointer'
              }}
            >
              Register
            </button>
          </div>

          {error && <div className="alert alert-danger">{error}</div>}
          {message && <div className="alert alert-success">{message}</div>}

          <form onSubmit={handleSubmit}>
            {!isLogin && (
              <div className="form-group">
                <label>Full Name</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required 
                    style={{ paddingLeft: '40px' }}
                    placeholder="Enter name"
                  />
                  <User size={18} style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--text-secondary)' }} />
                </div>
              </div>
            )}

            <div className="form-group">
              <label>Email Address</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type="email" 
                  className="form-control" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required 
                  style={{ paddingLeft: '40px' }}
                  placeholder="name@example.com"
                />
                <Mail size={18} style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--text-secondary)' }} />
              </div>
            </div>

            <div className="form-group">
              <label>Password</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type="password" 
                  className="form-control" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                  style={{ paddingLeft: '40px' }}
                  placeholder="••••••••"
                />
                <Lock size={18} style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--text-secondary)' }} />
              </div>
            </div>

            {!isLogin && (
              <div className="form-group">
                <label>Account Role</label>
                <select 
                  className="form-control" 
                  value={role} 
                  onChange={(e) => setRole(e.target.value)}
                  style={{ background: 'var(--bg-secondary)' }}
                >
                  <option value="customer">Customer (Buy Products)</option>
                  <option value="reseller">Reseller (Sell Products - Requires Admin Approval)</option>
                </select>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
                  * Reseller accounts require platform admin approval before you can list items.
                </p>
              </div>
            )}

            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%', padding: '12px', marginTop: '10px' }}
              disabled={loading}
            >
              {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Create Account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
