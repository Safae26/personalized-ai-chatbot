import React, { useState, useEffect } from 'react';
import { Shield, Users, Layers, Award, Check, X, ShieldAlert, BarChart, Plus, Trash2, Edit2 } from 'lucide-react';

export default function AdminDashboard({ user, token }) {
  const [activeTab, setActiveTab] = useState('stats'); // stats, categories, resellers, users
  const [resellers, setResellers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [stats, setStats] = useState({
    usersCount: 0,
    resellersCount: 0,
    pendingResellers: 0,
    productsCount: 0,
    totalRevenue: 0,
    ordersCount: 0
  });

  // Category modal / form states
  const [showCatModal, setShowCatModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [catName, setCatName] = useState('');
  const [catDescription, setCatDescription] = useState('');

  useEffect(() => {
    fetchStats();
    if (activeTab === 'categories') fetchCategories();
    if (activeTab === 'resellers') fetchResellers();
    if (activeTab === 'users') fetchUsers();
  }, [activeTab]);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      const data = await res.json();
      setCategories(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchResellers = async () => {
    try {
      const res = await fetch('/api/admin/resellers', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setResellers(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setUsersList(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenAddCat = () => {
    setEditingCategory(null);
    setCatName('');
    setCatDescription('');
    setShowCatModal(true);
  };

  const handleOpenEditCat = (cat) => {
    setEditingCategory(cat);
    setCatName(cat.name);
    setCatDescription(cat.description || '');
    setShowCatModal(true);
  };

  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    const url = editingCategory ? `/api/categories/${editingCategory.id}` : '/api/categories';
    const method = editingCategory ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: catName, description: catDescription })
      });
      const data = await res.json();
      if (res.ok) {
        alert(editingCategory ? 'Category updated successfully!' : 'Category added successfully!');
        setShowCatModal(false);
        fetchCategories();
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteCategory = async (catId) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;
    try {
      const res = await fetch(`/api/categories/${catId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        alert('Category deleted successfully.');
        fetchCategories();
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleResellerStatus = async (id, status) => {
    try {
      const res = await fetch(`/api/admin/resellers/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (res.ok) {
        alert(`Reseller application status updated to: ${status}`);
        fetchResellers();
        fetchStats(); // Update dashboard stats
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUserStatus = async (id, status) => {
    try {
      const res = await fetch(`/api/admin/users/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (res.ok) {
        alert(`User status set to ${status}.`);
        fetchUsers();
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="dashboard-layout">
      {/* Sidebar Panel */}
      <div className="dashboard-sidebar">
        <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '16px', paddingLeft: '16px' }}>
          Admin Controls
        </h3>
        <button 
          onClick={() => setActiveTab('stats')} 
          className={`sidebar-link ${activeTab === 'stats' ? 'active' : ''}`}
        >
          <BarChart size={18} /> Platform Analytics
        </button>
        <button 
          onClick={() => setActiveTab('categories')} 
          className={`sidebar-link ${activeTab === 'categories' ? 'active' : ''}`}
        >
          <Layers size={18} /> Category Manager
        </button>
        <button 
          onClick={() => setActiveTab('resellers')} 
          className={`sidebar-link ${activeTab === 'resellers' ? 'active' : ''}`}
        >
          <Award size={18} /> Reseller Requests 
          {stats.pendingResellers > 0 && (
            <span style={{ 
              background: 'var(--danger)', 
              color: '#fff', 
              fontSize: '0.7rem', 
              padding: '2px 6px', 
              borderRadius: '999px',
              marginLeft: 'auto' 
            }}>{stats.pendingResellers}</span>
          )}
        </button>
        <button 
          onClick={() => setActiveTab('users')} 
          className={`sidebar-link ${activeTab === 'users' ? 'active' : ''}`}
        >
          <Users size={18} /> User Accounts
        </button>
      </div>

      {/* Main Panel Content */}
      <div className="dashboard-main">

        {/* --- TAB: STATS & ANALYTICS --- */}
        {activeTab === 'stats' && (
          <div>
            <h2 style={{ fontSize: '1.6rem', marginBottom: '8px', fontFamily: 'var(--font-title)' }}>
              Platform Diagnostics Overview
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '30px' }}>
              Global control panel monitoring transaction volumes, users, and merchant logs.
            </p>

            <div className="stats-grid">
              <div className="stat-card">
                <div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>TOTAL REVENUE</p>
                  <p className="stat-value" style={{ color: 'var(--success)' }}>₹{stats.totalRevenue.toLocaleString('en-IN')}</p>
                </div>
                <div className="stat-icon" style={{ color: 'var(--success)' }}><Users size={24} /></div>
              </div>

              <div className="stat-card">
                <div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>TOTAL CUSTOMERS & SELLERS</p>
                  <p className="stat-value">{stats.usersCount}</p>
                </div>
                <div className="stat-icon"><Users size={24} /></div>
              </div>

              <div className="stat-card">
                <div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>VERIFIED RESELLERS</p>
                  <p className="stat-value">{stats.resellersCount}</p>
                </div>
                <div className="stat-icon" style={{ color: 'var(--info)' }}><Award size={24} /></div>
              </div>

              <div className="stat-card">
                <div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>CATALOG PRODUCTS</p>
                  <p className="stat-value">{stats.productsCount}</p>
                </div>
                <div className="stat-icon" style={{ color: 'var(--accent)' }}><Layers size={24} /></div>
              </div>
            </div>

            <div className="card" style={{ marginTop: '30px', borderLeft: '4px solid var(--accent)' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '8px' }}>Sandbox System Notice</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6' }}>
                All transaction amounts are securely routed via Razorpay payment verification. In development mode without live merchant tokens, checkouts fall back automatically to Simulated payment flows with manual overrides.
              </p>
            </div>
          </div>
        )}

        {/* --- TAB: CATEGORIES MANAGER --- */}
        {activeTab === 'categories' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '1.6rem', fontFamily: 'var(--font-title)' }}>Category Manager</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Organize store catalog layout filters.</p>
              </div>
              <button onClick={handleOpenAddCat} className="btn btn-primary">
                <Plus size={18} /> Add Category
              </button>
            </div>

            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Category ID</th>
                    <th>Name</th>
                    <th>Description</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map(cat => (
                    <tr key={cat.id}>
                      <td style={{ color: 'var(--text-secondary)' }}>#{cat.id}</td>
                      <td style={{ fontWeight: '600' }}>{cat.name}</td>
                      <td style={{ color: 'var(--text-secondary)', maxWidth: '350px' }}>{cat.description || 'No description.'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button 
                            onClick={() => handleOpenEditCat(cat)} 
                            className="btn btn-secondary btn-icon"
                            style={{ width: '32px', height: '32px' }}
                            title="Edit"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button 
                            onClick={() => handleDeleteCategory(cat.id)} 
                            className="btn btn-danger btn-icon"
                            style={{ width: '32px', height: '32px' }}
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- TAB: RESELLER APPLICATIONS REVIEW --- */}
        {activeTab === 'resellers' && (
          <div>
            <h2 style={{ fontSize: '1.6rem', marginBottom: '8px', fontFamily: 'var(--font-title)' }}>
              Reseller Applications
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '20px' }}>
              Verify seller accounts before they list items on the market.
            </p>

            {resellers.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)' }}>No reseller accounts registered on the platform.</p>
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Registered On</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resellers.map(reseller => (
                      <tr key={reseller.id}>
                        <td style={{ fontWeight: '500' }}>{reseller.name}</td>
                        <td>{reseller.email}</td>
                        <td>{new Date(reseller.created_at).toLocaleDateString()}</td>
                        <td>
                          <span className={`badge badge-${reseller.status}`}>{reseller.status}</span>
                        </td>
                        <td>
                          {reseller.status === 'pending' && (
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button 
                                onClick={() => handleResellerStatus(reseller.id, 'approved')} 
                                className="btn btn-success"
                                style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                              >
                                <Check size={14} /> Approve Merchant
                              </button>
                              <button 
                                onClick={() => handleResellerStatus(reseller.id, 'suspended')} 
                                className="btn btn-danger"
                                style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                              >
                                <X size={14} /> Reject
                              </button>
                            </div>
                          )}
                          {reseller.status === 'approved' && (
                            <button 
                              onClick={() => handleResellerStatus(reseller.id, 'suspended')}
                              className="btn btn-danger"
                              style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                            >
                              Suspend Store
                            </button>
                          )}
                          {reseller.status === 'suspended' && (
                            <button 
                              onClick={() => handleResellerStatus(reseller.id, 'approved')}
                              className="btn btn-success"
                              style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                            >
                              Re-Approve
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* --- TAB: USER MANAGER --- */}
        {activeTab === 'users' && (
          <div>
            <h2 style={{ fontSize: '1.6rem', marginBottom: '8px', fontFamily: 'var(--font-title)' }}>
              User Accounts
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '20px' }}>
              Suspend or restore registered accounts.
            </p>

            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>User ID</th>
                    <th>Name</th>
                    <th>Email Address</th>
                    <th>Platform Role</th>
                    <th>Account Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {usersList.map(u => (
                    <tr key={u.id}>
                      <td style={{ color: 'var(--text-secondary)' }}>#{u.id}</td>
                      <td style={{ fontWeight: '500' }}>{u.name}</td>
                      <td>{u.email}</td>
                      <td>
                        <span className={`badge badge-${u.role === 'admin' ? 'approved' : u.role === 'reseller' ? 'pending' : 'shipped'}`} style={{ fontSize: '0.7rem' }}>
                          {u.role}
                        </span>
                      </td>
                      <td>
                        <span className={`badge badge-${u.status}`}>{u.status}</span>
                      </td>
                      <td>
                        {u.role === 'admin' ? (
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Protected Account</span>
                        ) : u.status === 'suspended' ? (
                          <button 
                            onClick={() => handleUserStatus(u.id, 'approved')} 
                            className="btn btn-success"
                            style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                          >
                            Restore Account
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleUserStatus(u.id, 'suspended')} 
                            className="btn btn-danger"
                            style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                          >
                            Suspend Account
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* --- ADD / EDIT CATEGORY MODAL --- */}
      {showCatModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <h3 style={{ fontSize: '1.3rem', marginBottom: '24px', fontFamily: 'var(--font-title)' }}>
              {editingCategory ? 'Modify Category' : 'Create New Category'}
            </h3>

            <form onSubmit={handleCategorySubmit}>
              <div className="form-group">
                <label>Category Title*</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  required
                  placeholder="e.g. Smart Home Devices"
                />
              </div>

              <div className="form-group">
                <label>Detailed Description</label>
                <textarea 
                  className="form-control" 
                  rows="3" 
                  value={catDescription}
                  onChange={(e) => setCatDescription(e.target.value)}
                  placeholder="Enter a brief summary of catalog items this category covers..."
                ></textarea>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button type="button" onClick={() => setShowCatModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingCategory ? 'Save Changes' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
