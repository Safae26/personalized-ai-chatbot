import React, { useState, useEffect } from 'react';
import { LayoutDashboard, ShoppingBag, Truck, Plus, Edit2, Trash2, AlertTriangle, TrendingUp, DollarSign, Package } from 'lucide-react';

export default function ResellerDashboard({ user, token }) {
  const [activeTab, setActiveTab] = useState('analytics'); // analytics, products, orders
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');
  
  // Form modal states
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    stock: '',
    image_url: '',
    category_id: ''
  });

  // Tracking modal states
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [selectedTrackItem, setSelectedTrackItem] = useState(null);
  const [trackingForm, setTrackingForm] = useState({
    status: 'packed',
    location: '',
    description: ''
  });

  // Analytics stats
  const [stats, setStats] = useState({
    totalEarnings: 0,
    totalProducts: 0,
    lowStockCount: 0,
    pendingOrdersCount: 0
  });

  useEffect(() => {
    fetchResellerData();
    fetchCategories();
  }, [activeTab]);

  const fetchResellerData = async () => {
    if (!token) return;
    setError('');
    try {
      // Fetch products listed by this reseller
      const prodRes = await fetch(`/api/products?resellerId=${user.id}`);
      const prodData = await prodRes.json();
      setProducts(prodData);

      // Fetch order items belonging to this reseller
      const orderRes = await fetch('/api/orders', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const orderData = await orderRes.json();
      setOrders(orderData);

      // Calculate analytics
      const earnings = orderData
        .filter(item => item.status !== 'cancelled')
        .reduce((sum, item) => sum + (item.price * item.quantity), 0);
      
      const lowStock = prodData.filter(p => p.stock < 5).length;
      const pendingFulfillment = orderData.filter(item => item.status === 'paid' || item.status === 'packed').length;

      setStats({
        totalEarnings: earnings,
        totalProducts: prodData.length,
        lowStockCount: lowStock,
        pendingOrdersCount: pendingFulfillment
      });

    } catch (err) {
      console.error('Error fetching reseller dashboard metrics:', err);
      setError(err.message || 'Failed to fetch reseller metrics.');
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      const data = await res.json();
      setCategories(data);
      if (data.length > 0 && !formData.category_id) {
        setFormData(prev => ({ ...prev, category_id: data[0].id }));
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to fetch categories.');
    }
  };

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormData({
      title: '',
      description: '',
      price: '',
      stock: '',
      image_url: '',
      category_id: categories.length > 0 ? categories[0].id : ''
    });
    setShowModal(true);
  };

  const handleOpenEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      title: product.title,
      description: product.description,
      price: product.price,
      stock: product.stock,
      image_url: product.image_url,
      category_id: product.category_id
    });
    setShowModal(true);
  };

  const handleDelete = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product listing? It will remove it from the store.')) return;
    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        alert('Product deleted successfully.');
        fetchResellerData();
      } else {
        const data = await res.json();
        alert(data.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const url = editingProduct ? `/api/products/${editingProduct.id}` : '/api/products';
    const method = editingProduct ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          price: parseFloat(formData.price),
          stock: parseInt(formData.stock),
          category_id: parseInt(formData.category_id)
        })
      });
      
      const data = await res.json();
      if (res.ok) {
        alert(editingProduct ? 'Product updated successfully!' : 'Product added successfully!');
        setShowModal(false);
        fetchResellerData();
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenTracking = (item) => {
    setSelectedTrackItem(item);
    setTrackingForm({
      status: item.status === 'paid' ? 'packed' : (item.status === 'packed' ? 'shipped' : (item.status === 'shipped' ? 'out_for_delivery' : 'delivered')),
      location: '',
      description: ''
    });
    setShowTrackingModal(true);
  };

  const handleTrackingSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTrackItem) return;

    try {
      const res = await fetch(`/api/orders/${selectedTrackItem.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(trackingForm)
      });
      const data = await res.json();
      if (res.ok) {
        alert('Tracking checkpoint logged successfully!');
        setShowTrackingModal(false);
        fetchResellerData();
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to update tracking details.');
    }
  };

  return (
    <div className="dashboard-layout">
      {/* Sidebar navigation */}
      <div className="dashboard-sidebar">
        <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '16px', paddingLeft: '16px' }}>
          Seller Controls
        </h3>
        <button 
          onClick={() => setActiveTab('analytics')} 
          className={`sidebar-link ${activeTab === 'analytics' ? 'active' : ''}`}
        >
          <LayoutDashboard size={18} /> Dashboard Stats
        </button>
        <button 
          onClick={() => setActiveTab('products')} 
          className={`sidebar-link ${activeTab === 'products' ? 'active' : ''}`}
        >
          <ShoppingBag size={18} /> Manage Catalog
        </button>
        <button 
          onClick={() => setActiveTab('orders')} 
          className={`sidebar-link ${activeTab === 'orders' ? 'active' : ''}`}
        >
          <Truck size={18} /> Order Shipments
        </button>
      </div>

      {/* Main dashboard content */}
      <div className="dashboard-main">
        {error && (
          <div className="alert alert-danger" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{error}</span>
            <button onClick={() => setError('')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem' }}>×</button>
          </div>
        )}

        {/* --- TAB: ANALYTICS OVERVIEW --- */}
        {activeTab === 'analytics' && (
          <div>
            <h2 style={{ fontSize: '1.6rem', marginBottom: '8px', fontFamily: 'var(--font-title)' }}>
              Seller Dashboard Overview
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '30px' }}>
              Real-time monitoring of products, pending deliveries, and global store earnings.
            </p>

            <div className="stats-grid">
              <div className="stat-card">
                <div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>TOTAL STORE EARNINGS</p>
                  <p className="stat-value" style={{ color: 'var(--success)' }}>₹{stats.totalEarnings.toLocaleString('en-IN')}</p>
                </div>
                <div className="stat-icon" style={{ color: 'var(--success)' }}><DollarSign size={24} /></div>
              </div>

              <div className="stat-card">
                <div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>ACTIVE LISTINGS</p>
                  <p className="stat-value">{stats.totalProducts}</p>
                </div>
                <div className="stat-icon"><Package size={24} /></div>
              </div>

              <div className="stat-card">
                <div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>LOW STOCK LISTINGS</p>
                  <p className="stat-value" style={{ color: stats.lowStockCount > 0 ? 'var(--warning)' : 'inherit' }}>
                    {stats.lowStockCount}
                  </p>
                </div>
                <div className="stat-icon" style={{ color: 'var(--warning)' }}><AlertTriangle size={24} /></div>
              </div>

              <div className="stat-card">
                <div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>PENDING DISPATCHES</p>
                  <p className="stat-value" style={{ color: stats.pendingOrdersCount > 0 ? 'var(--info)' : 'inherit' }}>
                    {stats.pendingOrdersCount}
                  </p>
                </div>
                <div className="stat-icon" style={{ color: 'var(--info)' }}><Truck size={24} /></div>
              </div>
            </div>

            {/* Recent Orders Overview */}
            <div className="card" style={{ marginTop: '30px' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '20px' }}>Recent Sales Summary</h3>
              {orders.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)' }}>No items have been purchased from your store yet.</p>
              ) : (
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Buyer</th>
                        <th>Price</th>
                        <th>Qty</th>
                        <th>Order Status</th>
                        <th>Purchased At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.slice(0, 5).map(ord => (
                        <tr key={ord.id}>
                          <td style={{ fontWeight: '500' }}>{ord.title}</td>
                          <td>{ord.customer_name}</td>
                          <td>₹{ord.price}</td>
                          <td>{ord.quantity}</td>
                          <td>
                            <span className={`badge badge-${ord.order_status}`}>{ord.order_status}</span>
                          </td>
                          <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            {new Date(ord.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- TAB: MANAGE PRODUCTS CATALOG --- */}
        {activeTab === 'products' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '1.6rem', fontFamily: 'var(--font-title)' }}>Product Catalog</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Create, update, or remove your items from the platform.</p>
              </div>
              <button onClick={handleOpenAdd} className="btn btn-primary">
                <Plus size={18} /> Add New Product
              </button>
            </div>

            {products.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
                <Package size={40} style={{ color: 'var(--text-secondary)', marginBottom: '16px' }} />
                <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>You haven't listed any products yet.</p>
                <button onClick={handleOpenAdd} className="btn btn-primary">Create First Listing</button>
              </div>
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Image</th>
                      <th>Title</th>
                      <th>Category</th>
                      <th>Price</th>
                      <th>Stock Status</th>
                      <th>Rating</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map(prod => (
                      <tr key={prod.id}>
                        <td>
                          <img 
                            src={prod.image_url} 
                            alt={prod.title} 
                            style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: 'var(--radius-sm)' }}
                          />
                        </td>
                        <td style={{ fontWeight: '500' }}>{prod.title}</td>
                        <td>{prod.category_name}</td>
                        <td>₹{prod.price.toFixed(2)}</td>
                        <td>
                          {prod.stock < 5 ? (
                            <span style={{ color: 'var(--warning)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <AlertTriangle size={14} /> Low Stock ({prod.stock})
                            </span>
                          ) : (
                            <span style={{ color: 'var(--success)' }}>In Stock ({prod.stock})</span>
                          )}
                        </td>
                        <td style={{ display: 'flex', alignItems: 'center', gap: '4px', height: '65px', color: 'var(--accent)' }}>
                          <Star size={14} fill="var(--accent)" />
                          <span>{prod.average_rating ? prod.average_rating.toFixed(1) : '0.0'}</span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button 
                              onClick={() => handleOpenEdit(prod)} 
                              className="btn btn-secondary btn-icon"
                              style={{ width: '32px', height: '32px' }}
                              title="Edit"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button 
                              onClick={() => handleDelete(prod.id)} 
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
            )}
          </div>
        )}

        {/* --- TAB: ORDER SHIPMENT OPERATIONS --- */}
        {activeTab === 'orders' && (
          <div>
            <h2 style={{ fontSize: '1.6rem', marginBottom: '8px', fontFamily: 'var(--font-title)' }}>
              Shipment Requests
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '20px' }}>
              Review buyer details, dispatch products, and manage delivery status logs.
            </p>

            {orders.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)' }}>No orders have been submitted for your products yet.</p>
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Quantity</th>
                      <th>Value</th>
                      <th>Buyer & Shipping Destination</th>
                      <th>Order status</th>
                      <th>Fulfill actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map(ord => (
                      <tr key={ord.id}>
                        <td>
                          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <img src={ord.image_url} alt={ord.title} style={{ width: '36px', height: '36px', objectFit: 'cover', borderRadius: '4px' }} />
                            <div>
                              <div style={{ fontWeight: '500' }}>{ord.title}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>ID: #{ord.id}</div>
                            </div>
                          </div>
                        </td>
                        <td>{ord.quantity}</td>
                        <td>₹{(ord.price * ord.quantity).toLocaleString('en-IN')}</td>
                        <td>
                          <div style={{ fontSize: '0.9rem' }}><strong>{ord.customer_name}</strong></div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', maxWidth: '250px', wordBreak: 'break-word' }}>
                            {ord.shipping_address}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span className={`badge badge-${ord.status}`} style={{ fontSize: '0.8rem', alignSelf: 'flex-start' }}>
                              {ord.status.toUpperCase()}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              Global Order: {ord.order_status}
                            </span>
                          </div>
                        </td>
                        <td>
                          {ord.status !== 'delivered' && ord.status !== 'cancelled' ? (
                            <button 
                              onClick={() => handleOpenTracking(ord)}
                              className="btn btn-primary"
                              style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                            >
                              Update Tracking
                            </button>
                          ) : ord.status === 'delivered' ? (
                            <span style={{ color: 'var(--success)', fontSize: '0.85rem', fontWeight: '500' }}>Fulfillment Completed</span>
                          ) : (
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Order Cancelled</span>
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

      </div>

      {/* --- ADD / EDIT PRODUCT MODAL --- */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <h3 style={{ fontSize: '1.3rem', marginBottom: '24px', fontFamily: 'var(--font-title)' }}>
              {editingProduct ? 'Edit Product Details' : 'Add New Product Listing'}
            </h3>

            <form onSubmit={handleFormSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label>Product Title*</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    required
                    placeholder="e.g. Wireless Headphones"
                  />
                </div>
                
                <div className="form-group">
                  <label>Store Category*</label>
                  <select 
                    className="form-control"
                    value={formData.category_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, category_id: e.target.value }))}
                    required
                    style={{ background: 'var(--bg-secondary)' }}
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label>Retail Price (INR)*</label>
                  <input 
                    type="number" 
                    step="0.01"
                    className="form-control" 
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                    required
                    placeholder="e.g. 1999"
                  />
                </div>
                
                <div className="form-group">
                  <label>Available Inventory Stock*</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    value={formData.stock}
                    onChange={(e) => setFormData(prev => ({ ...prev, stock: e.target.value }))}
                    required
                    placeholder="e.g. 50"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Product Display Image URL</label>
                <input 
                  type="url" 
                  className="form-control" 
                  value={formData.image_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                  placeholder="https://images.unsplash.com/..."
                />
              </div>

              <div className="form-group">
                <label>Detailed Description</label>
                <textarea 
                  className="form-control" 
                  rows="4" 
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Write specifications, features, colors, warranty, and sizes of this product..."
                ></textarea>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingProduct ? 'Save Changes' : 'Publish Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- UPDATE TRACKING DETAILS MODAL --- */}
      {showTrackingModal && selectedTrackItem && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <h3 style={{ fontSize: '1.3rem', marginBottom: '8px', fontFamily: 'var(--font-title)' }}>
              Log Shipment Tracking Checkpoint
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '20px' }}>
              Updating tracking for: <strong>{selectedTrackItem.title}</strong> (Qty: {selectedTrackItem.quantity})
            </p>

            <form onSubmit={handleTrackingSubmit}>
              <div className="form-group">
                <label>Delivery Tracking Stage*</label>
                <select 
                  className="form-control"
                  value={trackingForm.status}
                  onChange={(e) => setTrackingForm(prev => ({ ...prev, status: e.target.value }))}
                  required
                  style={{ background: 'var(--bg-secondary)' }}
                >
                  <option value="packed">Packed (Ready for dispatch)</option>
                  <option value="shipped">Shipped (In transit)</option>
                  <option value="out_for_delivery">Out for Delivery (Local Sorting Facility)</option>
                  <option value="delivered">Delivered (Successfully received)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Current Location / Hub</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={trackingForm.location}
                  onChange={(e) => setTrackingForm(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="e.g. Mumbai Sorting Center, Delhi Hub, Out for Delivery"
                />
              </div>

              <div className="form-group">
                <label>Status Description / Tracking Comments</label>
                <textarea 
                  className="form-control" 
                  rows="3" 
                  value={trackingForm.description}
                  onChange={(e) => setTrackingForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="e.g. Package has been sorted and loaded onto truck. Carrier: BlueDart, ID: BD102938."
                ></textarea>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button type="button" onClick={() => setShowTrackingModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Log Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
