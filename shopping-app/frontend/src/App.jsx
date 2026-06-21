import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Auth from './pages/Auth';
import CustomerApp from './pages/CustomerApp';
import ResellerDashboard from './pages/ResellerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import Chatbot from './components/Chatbot';

export default function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState('');
  
  // Controls the current active view for Customer
  const [view, setView] = useState('products'); // products, product-detail, cart, checkout, orders, auth
  const [cartCount, setCartCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore session from localStorage
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (savedToken && savedUser) {
      setToken(savedToken);
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      
      // Auto-navigate to their respective panels on restore
      if (parsedUser.role === 'admin') {
        setView('admin');
      } else if (parsedUser.role === 'reseller') {
        setView('reseller');
      } else {
        setView('products');
      }
      
      // Verify token/user from server to check if session expired or user suspended
      fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${savedToken}` }
      })
      .then(res => {
        if (!res.ok) {
          throw new Error('Session expired');
        }
        return res.json();
      })
      .then(userData => {
        if (userData.status === 'suspended') {
          alert('Your account has been suspended by an Admin.');
          logout();
        } else {
          setUser(userData);
          localStorage.setItem('user', JSON.stringify(userData));
        }
      })
      .catch(err => {
        console.warn('Session verification failed:', err);
        logout();
      });
    }
    setLoading(false);
  }, []);

  const login = (newToken, newUser) => {
    if (!newToken || !newUser) {
      logout();
      return;
    }
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));

    if (newUser.role === 'admin') {
      setView('admin');
    } else if (newUser.role === 'reseller') {
      setView('reseller');
    } else {
      setView('products');
    }
  };

  const logout = () => {
    setToken('');
    setUser(null);
    setCartCount(0);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setView('products');
  };

  const handleSetView = (newView) => {
    // Authorization checks for gating views
    if (['cart', 'checkout', 'orders'].includes(newView) && !user) {
      setView('auth');
      return;
    }
    
    if (newView === 'reseller' && (!user || user.role !== 'reseller')) {
      setView('auth');
      return;
    }

    if (newView === 'admin' && (!user || user.role !== 'admin')) {
      setView('auth');
      return;
    }

    setView(newView);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-primary)' }}>
        <div style={{
          width: '50px',
          height: '50px',
          border: '4px solid var(--border)',
          borderTop: '4px solid var(--accent)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <Navbar 
        user={user} 
        logout={logout} 
        cartCount={cartCount} 
        view={view}
        setView={handleSetView}
      />
      
      <main className="main-content">
        {/* Auth Gateway View */}
        {view === 'auth' && !user && (
          <Auth login={login} setView={handleSetView} />
        )}

        {/* Customer Routing views */}
        {['products', 'product-detail', 'cart', 'checkout', 'orders'].includes(view) && (
          <CustomerApp 
            user={user} 
            token={token} 
            view={view}
            setView={handleSetView}
            refreshCartCount={setCartCount}
          />
        )}

        {/* Reseller Routing View */}
        {view === 'reseller' && user && user.role === 'reseller' && (
          <ResellerDashboard 
            user={user} 
            token={token} 
          />
        )}

        {/* Admin Routing View */}
        {view === 'admin' && user && user.role === 'admin' && (
          <AdminDashboard 
            user={user} 
            token={token} 
          />
        )}
      </main>
      
      {/* Floating AI Chatbot Assistant */}
      <Chatbot />
    </div>
  );
}
