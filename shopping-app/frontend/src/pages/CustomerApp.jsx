import React, { useState, useEffect } from 'react';
import { Search, ShoppingBag, Star, ArrowLeft, Trash2, ShieldAlert, CreditCard, ChevronRight, CheckCircle } from 'lucide-react';
import MockRazorpay from '../components/MockRazorpay';

export default function CustomerApp({ user, token, setView, view, refreshCartCount }) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  
  // Review form states
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  
  // Checkout states
  const [shippingAddress, setShippingAddress] = useState('');
  const [paymentOrder, setPaymentOrder] = useState(null);
  const [checkoutStep, setCheckoutStep] = useState('cart'); // cart, shipping, payment_pending
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCategories();
    fetchProducts();
    if (user) {
      fetchCart();
      fetchOrders();
    }
  }, [user, selectedCategory]);

  const fetchProducts = async () => {
    setLoading(true);
    setError('');
    let url = '/api/products';
    const params = [];
    if (selectedCategory) params.push(`categoryId=${selectedCategory}`);
    if (searchQuery) params.push(`search=${encodeURIComponent(searchQuery)}`);
    if (params.length > 0) url += `?${params.join('&')}`;

    try {
      const res = await fetch(url);
      const data = await res.json();
      setProducts(data);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to connect to backend server.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    setError('');
    try {
      const res = await fetch('/api/categories');
      const data = await res.json();
      setCategories(data);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to fetch categories.');
    }
  };

  const fetchCart = async () => {
    if (!token) return;
    setError('');
    try {
      const res = await fetch('/api/cart', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setCart(data);
      const count = data.reduce((sum, item) => sum + item.quantity, 0);
      refreshCartCount(count);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to fetch cart.');
    }
  };

  const fetchOrders = async () => {
    if (!token) return;
    setError('');
    try {
      const res = await fetch('/api/orders', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setOrders(data);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to fetch orders.');
    }
  };

  const fetchProductDetails = async (id) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/products/${id}`);
      const data = await res.json();
      setSelectedProduct(data);
      setView('product-detail');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to load product details.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchProducts();
  };

  const addToCart = async (productId, qty = 1) => {
    if (!user) {
      setView('auth');
      return;
    }
    setError('');
    try {
      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ product_id: productId, quantity: qty })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      
      fetchCart();
      alert('Product added to cart!');
    } catch (err) {
      setError(err.message);
      alert(err.message);
    }
  };

  const updateCartQty = async (productId, newQty) => {
    try {
      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ product_id: productId, quantity: newQty })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      fetchCart();
    } catch (err) {
      alert(err.message);
    }
  };

  const removeFromCart = async (productId) => {
    try {
      const res = await fetch(`/api/cart/${productId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchCart();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddReview = async (e) => {
    e.preventDefault();
    if (!token) return;
    try {
      const res = await fetch(`/api/products/${selectedProduct.id}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ rating: reviewRating, comment: reviewComment })
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        setReviewComment('');
        fetchProductDetails(selectedProduct.id); // Reload product details
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const cancelOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to cancel this order?')) return;
    try {
      const res = await fetch(`/api/orders/${orderId}/cancel`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        alert('Order cancelled successfully.');
        fetchOrders();
        fetchProducts(); // Refetch product catalog to sync stock count
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // --- CHECKOUT & RAZORPAY INTEGRATION ---

  const handleCheckoutInit = () => {
    if (cart.length === 0) return;
    setCheckoutStep('shipping');
    setView('checkout');
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    if (!shippingAddress) return;

    setLoading(true);
    try {
      // Step 1: Create transaction order in backend
      const res = await fetch('/api/orders/create-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ shipping_address: shippingAddress })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.message);

      setPaymentOrder(data);

      if (data.isMock) {
        // Active Mock Mode
        setCheckoutStep('payment_pending');
      } else {
        // Trigger Real Razorpay Overlay
        const options = {
          key: data.key_id,
          amount: data.amount,
          currency: data.currency,
          name: 'AmazeKart Ltd',
          description: 'Secure Checkout Payment',
          order_id: data.id,
          handler: async function (response) {
            await verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              shipping_address: data.shipping_address,
              isMock: false
            });
          },
          prefill: {
            name: user.name,
            email: user.email
          },
          theme: {
            color: '#f59e0b'
          },
          modal: {
            ondismiss: function () {
              setLoading(false);
              alert('Payment process cancelled by user.');
            }
          }
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      }
    } catch (err) {
      alert(err.message);
      setLoading(false);
    }
  };

  const verifyPayment = async (payload) => {
    setLoading(true);
    try {
      const res = await fetch('/api/orders/verify-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok && data.success) {
        alert('Order placed successfully! Thank you for shopping.');
        fetchCart();
        fetchOrders();
        setView('orders');
      } else {
        alert('Payment verification failed: ' + data.message);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to complete order verification.');
    } finally {
      setLoading(false);
      setPaymentOrder(null);
      setCheckoutStep('cart');
    }
  };

  // Calculate Subtotal
  const cartSubtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div style={{ paddingBottom: '40px' }}>
      
      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'between', alignItems: 'center' }}>
          <span>{error}</span>
          <button onClick={() => setError('')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem' }}>×</button>
        </div>
      )}
      
      {/* --- MOCK RAZORPAY MODAL FOR SIMULATED PAYMENTS --- */}
      {checkoutStep === 'payment_pending' && paymentOrder && (
        <MockRazorpay 
          orderData={paymentOrder}
          onSuccess={verifyPayment}
          onCancel={() => {
            setPaymentOrder(null);
            setCheckoutStep('shipping');
            setView('checkout');
          }}
        />
      )}

      {/* --- VIEW: PRODUCT LIST (BROWSE) --- */}
      {view === 'products' && (
        <div>
          {/* Search and Category Filter Header */}
          <div className="card" style={{ marginBottom: '30px', padding: '20px' }}>
            <form onSubmit={handleSearchSubmit} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr auto', gap: '16px' }}>
              <div style={{ position: 'relative' }}>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Search products..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ paddingLeft: '40px' }}
                />
                <Search size={18} style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--text-secondary)' }} />
              </div>
              <select 
                className="form-control" 
                value={selectedCategory} 
                onChange={(e) => setSelectedCategory(e.target.value)}
                style={{ background: 'var(--bg-secondary)' }}
              >
                <option value="">All Categories</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              <button type="submit" className="btn btn-primary">Search</button>
            </form>
          </div>

          <h2 style={{ fontSize: '1.6rem', marginBottom: '20px', fontFamily: 'var(--font-title)' }}>
            Our Featured Products
          </h2>

          {loading ? (
            <p style={{ color: 'var(--text-secondary)' }}>Loading catalog...</p>
          ) : products.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)' }}>No products found matching filters.</p>
          ) : (
            <div className="products-grid">
              {products.map(prod => (
                <div key={prod.id} className="card product-card" onClick={() => fetchProductDetails(prod.id)} style={{ cursor: 'pointer' }}>
                  <img src={prod.image_url} alt={prod.title} className="product-card-img" />
                  <div className="product-card-body">
                    <span className="product-category">{prod.category_name}</span>
                    <h3 className="product-title">{prod.title}</h3>
                    
                    <div className="product-rating">
                      <Star size={14} fill="var(--accent)" />
                      <span>{prod.average_rating ? prod.average_rating.toFixed(1) : '0.0'}</span>
                      <span className="count">({prod.reviews_count})</span>
                      <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: prod.stock > 0 ? 'var(--success)' : 'var(--danger)' }}>
                        {prod.stock > 0 ? `${prod.stock} left` : 'Out of stock'}
                      </span>
                    </div>

                    <div className="product-footer">
                      <span className="product-price">₹{prod.price.toLocaleString('en-IN')}</span>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (prod.stock > 0) addToCart(prod.id);
                          else alert('Item is out of stock.');
                        }} 
                        className="btn btn-primary btn-icon"
                        disabled={prod.stock <= 0}
                        style={{ width: '36px', height: '36px' }}
                      >
                        <ShoppingBag size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* --- VIEW: PRODUCT DETAILS PAGE --- */}
      {view === 'product-detail' && selectedProduct && (
        <div>
          <button onClick={() => setView('products')} className="btn btn-secondary" style={{ marginBottom: '24px' }}>
            <ArrowLeft size={16} /> Back to Products
          </button>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.5fr', gap: '40px', alignItems: 'start' }}>
            {/* Image */}
            <div className="card" style={{ padding: '10px', overflow: 'hidden' }}>
              <img 
                src={selectedProduct.image_url} 
                alt={selectedProduct.title} 
                style={{ width: '100%', borderRadius: 'var(--radius-md)', height: '400px', objectFit: 'cover' }}
              />
            </div>

            {/* Info */}
            <div>
              <span className="badge badge-approved" style={{ marginBottom: '12px' }}>{selectedProduct.category_name}</span>
              <h1 style={{ fontSize: '2.2rem', marginBottom: '16px', lineHeight: '1.2', fontFamily: 'var(--font-title)' }}>
                {selectedProduct.title}
              </h1>

              <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginBottom: '20px', fontSize: '0.95rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent)' }}>
                  <Star size={16} fill="var(--accent)" />
                  <strong>{selectedProduct.average_rating ? selectedProduct.average_rating.toFixed(1) : '0.0'}</strong>
                  <span style={{ color: 'var(--text-secondary)' }}>({selectedProduct.reviews_count} Customer reviews)</span>
                </div>
                <div style={{ color: 'var(--text-secondary)' }}>|</div>
                <div>
                  Seller: <strong style={{ color: 'var(--accent)' }}>{selectedProduct.reseller_name}</strong>
                </div>
              </div>

              <div style={{ fontSize: '2rem', fontWeight: '800', color: '#fff', marginBottom: '24px' }}>
                ₹{selectedProduct.price.toLocaleString('en-IN')}
              </div>

              <p style={{ color: 'var(--text-secondary)', lineHeight: '1.7', marginBottom: '30px', fontSize: '1.05rem' }}>
                {selectedProduct.description}
              </p>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px', display: 'flex', alignItems: 'center', gap: '24px' }}>
                <div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Availability</p>
                  <p style={{ fontWeight: '600', color: selectedProduct.stock > 0 ? 'var(--success)' : 'var(--danger)' }}>
                    {selectedProduct.stock > 0 ? `${selectedProduct.stock} units in stock` : 'Out of stock'}
                  </p>
                </div>
                
                {selectedProduct.stock > 0 && (
                  <button 
                    onClick={() => addToCart(selectedProduct.id)} 
                    className="btn btn-primary"
                    style={{ padding: '14px 28px' }}
                  >
                    <ShoppingBag size={18} /> Add to Shopping Cart
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Reviews List */}
          <div className="reviews-section">
            <h3 style={{ fontSize: '1.4rem', marginBottom: '24px', fontFamily: 'var(--font-title)' }}>
              Customer Ratings & Reviews
            </h3>

            {/* Write Review Form */}
            {user && user.role === 'customer' && (
              <form onSubmit={handleAddReview} className="card" style={{ marginBottom: '30px' }}>
                <h4 style={{ fontSize: '1rem', marginBottom: '16px' }}>Submit Your Review</h4>
                <div style={{ display: 'flex', gap: '20px', marginBottom: '16px', alignItems: 'center' }}>
                  <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Rating:</label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button 
                        type="button" 
                        key={star} 
                        onClick={() => setReviewRating(star)}
                        style={{ cursor: 'pointer', color: star <= reviewRating ? 'var(--accent)' : 'var(--text-secondary)' }}
                      >
                        <Star size={20} fill={star <= reviewRating ? 'var(--accent)' : 'transparent'} />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label>Review Comment</label>
                  <textarea 
                    className="form-control" 
                    rows="3" 
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Write details about your experience with this product..."
                    required
                  ></textarea>
                </div>

                <button type="submit" className="btn btn-primary">Submit Review</button>
              </form>
            )}

            {selectedProduct.reviews.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)' }}>No reviews submitted yet for this product. Be the first one!</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {selectedProduct.reviews.map(rev => (
                  <div key={rev.id} className="card" style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <strong>{rev.reviewer_name}</strong>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {new Date(rev.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div style={{ display: 'flex', color: 'var(--accent)', gap: '2px', marginBottom: '10px' }}>
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={14} fill={i < rev.rating ? 'var(--accent)' : 'transparent'} color="var(--accent)" />
                      ))}
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>{rev.comment}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- VIEW: CART PAGE --- */}
      {view === 'cart' && (
        <div>
          <h2 style={{ fontSize: '1.8rem', marginBottom: '24px', fontFamily: 'var(--font-title)' }}>
            Shopping Cart
          </h2>

          {cart.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
              <ShoppingBag size={48} style={{ color: 'var(--text-secondary)', marginBottom: '16px' }} />
              <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>Your shopping cart is currently empty.</p>
              <button onClick={() => setView('products')} className="btn btn-primary">Browse Catalog</button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 1fr', gap: '30px', alignItems: 'start' }}>
              
              {/* Cart Items */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {cart.map(item => (
                  <div key={item.id} className="card" style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                    <img 
                      src={item.image_url} 
                      alt={item.title} 
                      style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: 'var(--radius-sm)' }}
                    />
                    <div style={{ flex: '1' }}>
                      <h4 style={{ fontSize: '1.05rem', marginBottom: '4px' }}>{item.title}</h4>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                        Unit Price: ₹{item.price.toFixed(2)}
                      </p>
                      
                      {/* Quantity Controls */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button 
                          onClick={() => updateCartQty(item.product_id, item.quantity - 1)}
                          className="btn btn-secondary" 
                          style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                        >
                          -
                        </button>
                        <span>{item.quantity}</span>
                        <button 
                          onClick={() => updateCartQty(item.product_id, item.quantity + 1)}
                          className="btn btn-secondary" 
                          style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                          disabled={item.quantity >= item.stock}
                        >
                          +
                        </button>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          Max: {item.stock}
                        </span>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.15rem', fontWeight: '700', marginBottom: '12px' }}>
                        ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                      </div>
                      <button onClick={() => removeFromCart(item.product_id)} style={{ color: 'var(--danger)', cursor: 'pointer' }}>
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div className="card" style={{ position: 'sticky', top: '100px' }}>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                  Order Summary
                </h3>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '0.95rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Subtotal ({cart.reduce((sum, item) => sum + item.quantity, 0)} items)</span>
                  <span>₹{cartSubtotal.toLocaleString('en-IN')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '0.95rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Shipping</span>
                  <span style={{ color: 'var(--success)', fontWeight: '600' }}>FREE</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '16px', marginTop: '16px', marginBottom: '24px' }}>
                  <strong style={{ fontSize: '1.15rem' }}>Total Amount</strong>
                  <strong style={{ fontSize: '1.25rem', color: 'var(--accent)' }}>
                    ₹{cartSubtotal.toLocaleString('en-IN')}
                  </strong>
                </div>

                <button onClick={handleCheckoutInit} className="btn btn-primary" style={{ width: '100%', padding: '14px' }}>
                  Proceed to Checkout <ChevronRight size={16} />
                </button>
              </div>

            </div>
          )}
        </div>
      )}

      {/* --- VIEW: CHECKOUT / SHIPPING ADDRESS PAGE --- */}
      {view === 'checkout' && (
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <button onClick={() => setView('cart')} className="btn btn-secondary" style={{ marginBottom: '24px' }}>
            <ArrowLeft size={16} /> Back to Cart
          </button>

          <div className="card">
            <h2 style={{ fontSize: '1.5rem', marginBottom: '8px', fontFamily: 'var(--font-title)' }}>
              Shipping Details
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '24px' }}>
              Please enter the delivery destination. Payment is securely verified by Razorpay.
            </p>

            <form onSubmit={handlePlaceOrder}>
              <div className="form-group">
                <label>Shipping / Delivery Address</label>
                <textarea 
                  className="form-control" 
                  rows="4" 
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  placeholder="Street name, landmark, building/apartment, city, state, pincode"
                  required
                ></textarea>
              </div>

              <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', padding: '16px', borderRadius: 'var(--radius-md)', marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Amount Payable:</span>
                  <strong style={{ color: 'var(--accent)' }}>₹{cartSubtotal.toLocaleString('en-IN')}</strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                  <CreditCard size={14} />
                  <span>Razorpay test credentials or mock payment simulation will be launched.</span>
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '14px' }} disabled={loading}>
                {loading ? 'Initializing payment gateway...' : `Pay & Place Order (₹${cartSubtotal.toLocaleString('en-IN')})`}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- VIEW: ORDER HISTORY PAGE --- */}
      {view === 'orders' && (
        <div>
          <h2 style={{ fontSize: '1.8rem', marginBottom: '24px', fontFamily: 'var(--font-title)' }}>
            My Order History
          </h2>

          {orders.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>You haven't placed any orders yet.</p>
              <button onClick={() => setView('products')} className="btn btn-primary">Start Shopping</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {orders.map(order => (
                <div key={order.id} className="card" style={{ padding: '0', overflow: 'hidden' }}>
                  {/* Order Card Header */}
                  <div style={{ 
                    background: 'var(--bg-tertiary)', 
                    padding: '16px 24px', 
                    borderBottom: '1px solid var(--border)',
                    display: 'flex', 
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '16px'
                  }}>
                    <div style={{ display: 'flex', gap: '24px' }}>
                      <div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>ORDER PLACED</p>
                        <p style={{ fontSize: '0.9rem', fontWeight: '500' }}>{new Date(order.created_at).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>TOTAL PRICE</p>
                        <p style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--accent)' }}>₹{order.total_amount.toLocaleString('en-IN')}</p>
                      </div>
                      <div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>SHIP TO</p>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden', maxWidth: '200px' }} title={order.shipping_address}>
                          {order.shipping_address}
                        </p>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span className={`badge badge-${order.status}`}>
                        {order.status}
                      </span>
                      
                      {(order.status === 'paid' || order.status === 'pending') && (
                        <button 
                          onClick={() => cancelOrder(order.id)} 
                          className="btn btn-danger" 
                          style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                        >
                          Cancel Order
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Order Items */}
                  <div style={{ padding: '20px 24px' }}>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                      Transaction ID: <span style={{ color: 'var(--text-primary)' }}>{order.razorpay_payment_id || 'N/A'}</span>
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {order.items && order.items.map(item => (
                        <div key={item.id} style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                          <img 
                            src={item.image_url} 
                            alt={item.title} 
                            style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: 'var(--radius-sm)' }}
                          />
                          <div style={{ flex: '1' }}>
                            <h5 style={{ fontSize: '0.95rem', marginBottom: '2px' }}>{item.title}</h5>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                              Quantity: {item.quantity} | Price: ₹{item.price.toFixed(2)}
                            </p>
                          </div>
                          <div>
                            <button 
                              onClick={() => fetchProductDetails(item.product_id)} 
                              className="btn btn-secondary" 
                              style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                            >
                              Buy It Again
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
