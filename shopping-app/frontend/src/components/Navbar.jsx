import React from 'react';
import { ShoppingCart, LogOut, ShieldAlert, Store } from 'lucide-react';

export default function Navbar({ user, logout, cartCount, view, setView }) {
  const handleLogout = () => {
    logout();
    setView('products');
  };

  return (
    <nav className="navbar glass-panel">
      <span onClick={() => setView('products')} className="nav-brand" style={{ cursor: 'pointer' }}>
        Amaze<span>Kart</span>
      </span>

      <div className="nav-links">
        <span 
          onClick={() => setView('products')} 
          className={`nav-link ${view === 'products' || view === 'product-detail' ? 'active' : ''}`}
          style={{ cursor: 'pointer' }}
        >
          Browse Products
        </span>
        
        {user && user.role === 'customer' && (
          <span 
            onClick={() => setView('orders')} 
            className={`nav-link ${view === 'orders' ? 'active' : ''}`}
            style={{ cursor: 'pointer' }}
          >
            My Orders
          </span>
        )}

        {user && user.role === 'reseller' && (
          <span 
            onClick={() => setView('reseller')} 
            className={`nav-link ${view === 'reseller' ? 'active' : ''}`}
            style={{ cursor: 'pointer' }}
          >
            <Store size={18} /> Reseller Panel
          </span>
        )}

        {user && user.role === 'admin' && (
          <span 
            onClick={() => setView('admin')} 
            className={`nav-link ${view === 'admin' ? 'active' : ''}`}
            style={{ cursor: 'pointer' }}
          >
            <ShieldAlert size={18} /> Admin Panel
          </span>
        )}
      </div>

      <div className="nav-actions">
        {user ? (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: '500' }}>{user.name}</span>
              <span className={`badge badge-${user.status === 'approved' ? 'approved' : 'pending'}`} style={{ fontSize: '0.65rem', padding: '2px 6px' }}>
                {user.role.toUpperCase()}
              </span>
            </div>

            {user.role === 'customer' && (
              <span 
                onClick={() => setView('cart')} 
                className="cart-badge-container nav-link" 
                style={{ marginRight: '8px', cursor: 'pointer' }}
              >
                <ShoppingCart size={22} style={{ color: 'var(--text-primary)' }} />
                {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
              </span>
            )}

            <button 
              onClick={handleLogout} 
              className="btn btn-secondary btn-icon" 
              title="Logout"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <LogOut size={18} />
            </button>
          </>
        ) : (
          <button onClick={() => setView('auth')} className="btn btn-primary">
            Sign In
          </button>
        )}
      </div>
    </nav>
  );
}
