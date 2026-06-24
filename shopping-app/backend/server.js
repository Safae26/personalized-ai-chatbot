const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');
const crypto = require('crypto');
const Razorpay = require('razorpay');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkeyshoppingapp1234567890';

app.use(cors());
app.use(express.json());

// Initialize SQLite database
const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to SQLite database:', err);
  } else {
    console.log('Connected to SQLite database at:', dbPath);
    initializeDatabase();
  }
});

// Database promise helpers
const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

const dbAll = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

const dbGet = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

// Database schema initialization
async function initializeDatabase() {
  try {
    // Create Users table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('admin', 'reseller', 'customer')),
        status TEXT NOT NULL CHECK(status IN ('approved', 'pending', 'suspended')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create Categories table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        description TEXT
      )
    `);

    // Create Products table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reseller_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        price REAL NOT NULL,
        stock INTEGER NOT NULL,
        image_url TEXT,
        category_id INTEGER NOT NULL,
        average_rating REAL DEFAULT 0,
        reviews_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (reseller_id) REFERENCES users(id),
        FOREIGN KEY (category_id) REFERENCES categories(id)
      )
    `);

    // Create Cart Items table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS cart_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (product_id) REFERENCES products(id)
      )
    `);

    // Create Orders table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        total_amount REAL NOT NULL,
        shipping_address TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'paid', 'shipped', 'delivered', 'cancelled')),
        payment_method TEXT NOT NULL,
        razorpay_order_id TEXT,
        razorpay_payment_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Create Order Items table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        reseller_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        price REAL NOT NULL,
        FOREIGN KEY (order_id) REFERENCES orders(id),
        FOREIGN KEY (product_id) REFERENCES products(id),
        FOREIGN KEY (reseller_id) REFERENCES users(id)
      )
    `);

    // Create Reviews table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
        comment TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (product_id) REFERENCES products(id)
      )
    `);

    // Dynamic schema updates for tracking
    try {
      await dbRun("ALTER TABLE order_items ADD COLUMN status TEXT NOT NULL DEFAULT 'paid'");
      console.log('Migrated: Added status column to order_items');
    } catch (e) {
      // Ignored if column already exists
    }

    // Create Order Tracking Updates table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS order_tracking_updates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_item_id INTEGER NOT NULL,
        status TEXT NOT NULL,
        location TEXT,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_item_id) REFERENCES order_items(id)
      )
    `);

    console.log('Database tables verified/created successfully.');
    await seedDatabase();
  } catch (error) {
    console.error('Error initializing database tables:', error);
  }
}

// Seed Database
async function seedDatabase() {
  try {
    const userCount = await dbGet('SELECT COUNT(*) as count FROM users');
    if (userCount.count > 0) {
      console.log('Database already has data. Skipping seeding.');
      return;
    }

    console.log('Seeding initial data...');
    const { seedDatabase: runSeeder } = require('./seed_500_products');
    await runSeeder(db);
    console.log('Database seeding finished successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}

// Middleware: Authentication
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ message: 'Access denied. Token missing.' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid or expired token.' });
    req.user = user;
    next();
  });
};

// Middleware: Check Role
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied. Insufficient permissions.' });
    }
    next();
  };
};

// --- AUTHENTICATION ENDPOINTS ---

// Register User
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ message: 'Please provide all details: name, email, password, role.' });
  }

  if (!['admin', 'reseller', 'customer'].includes(role)) {
    return res.status(400).json({ message: 'Invalid role selection.' });
  }

  try {
    const existing = await dbGet('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) {
      return res.status(400).json({ message: 'Email already exists.' });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    // Customers are approved automatically; resellers require admin approval
    const status = role === 'reseller' ? 'pending' : 'approved';

    const result = await dbRun(
      'INSERT INTO users (name, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?)',
      [name, email, passwordHash, role, status]
    );

    res.status(201).json({
      message: role === 'reseller' 
        ? 'Reseller application submitted. Please wait for Admin approval.' 
        : 'User registered successfully!',
      userId: result.lastID
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Registration failed.' });
  }
});

// Login User
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Please enter email and password.' });
  }

  try {
    const user = await dbGet('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password.' });
    }

    const validPassword = bcrypt.compareSync(password, user.password_hash);
    if (!validPassword) {
      return res.status(400).json({ message: 'Invalid email or password.' });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({ message: 'Your account has been suspended by an Admin.' });
    }

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role, status: user.status },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Login failed.' });
  }
});

// Get Current User Profile
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await dbGet('SELECT id, name, email, role, status, created_at FROM users WHERE id = ?', [req.user.id]);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch user profile.' });
  }
});

// --- CATEGORY ENDPOINTS ---

app.get('/api/categories', async (req, res) => {
  try {
    const categories = await dbAll('SELECT * FROM categories ORDER BY name ASC');
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: 'Failed to load categories.' });
  }
});

app.post('/api/categories', authenticateToken, requireRole(['admin']), async (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ message: 'Category name is required.' });

  try {
    const existing = await dbGet('SELECT id FROM categories WHERE name = ?', [name]);
    if (existing) return res.status(400).json({ message: 'Category name already exists.' });

    const result = await dbRun('INSERT INTO categories (name, description) VALUES (?, ?)', [name, description]);
    res.status(201).json({ id: result.lastID, name, description });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create category.' });
  }
});

app.put('/api/categories/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  const { name, description } = req.body;
  try {
    await dbRun('UPDATE categories SET name = ?, description = ? WHERE id = ?', [name, description, req.params.id]);
    res.json({ id: req.params.id, name, description });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update category.' });
  }
});

app.delete('/api/categories/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    // Check if products exist in category
    const products = await dbGet('SELECT COUNT(*) as count FROM products WHERE category_id = ?', [req.params.id]);
    if (products.count > 0) {
      return res.status(400).json({ message: 'Cannot delete category containing products. Reassign or delete products first.' });
    }
    await dbRun('DELETE FROM categories WHERE id = ?', [req.params.id]);
    res.json({ message: 'Category deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete category.' });
  }
});

// --- PRODUCT ENDPOINTS ---

// Get all products (with search & category filters)
app.get('/api/products', async (req, res) => {
  const { categoryId, search, resellerId } = req.query;
  let query = 'SELECT p.*, c.name as category_name, u.name as reseller_name FROM products p JOIN categories c ON p.category_id = c.id JOIN users u ON p.reseller_id = u.id WHERE u.status = "approved"';
  let params = [];

  if (categoryId) {
    query += ' AND p.category_id = ?';
    params.push(categoryId);
  }

  if (resellerId) {
    query += ' AND p.reseller_id = ?';
    params.push(resellerId);
  }

  if (search) {
    query += ' AND (p.title LIKE ? OR p.description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  query += ' ORDER BY p.created_at DESC';

  try {
    const products = await dbAll(query, params);
    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch products.' });
  }
});

// Get a single product and its reviews
app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await dbGet(
      'SELECT p.*, c.name as category_name, u.name as reseller_name FROM products p JOIN categories c ON p.category_id = c.id JOIN users u ON p.reseller_id = u.id WHERE p.id = ?',
      [req.params.id]
    );

    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    const reviews = await dbAll(
      'SELECT r.*, u.name as reviewer_name FROM reviews r JOIN users u ON r.user_id = u.id WHERE r.product_id = ? ORDER BY r.created_at DESC',
      [req.params.id]
    );

    res.json({ ...product, reviews });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch product details.' });
  }
});

// Add Product (Reseller only)
app.post('/api/products', authenticateToken, requireRole(['reseller']), async (req, res) => {
  const { title, description, price, stock, image_url, category_id } = req.body;
  if (!title || !price || stock === undefined || !category_id) {
    return res.status(400).json({ message: 'Please enter all details: title, price, stock, category_id.' });
  }

  if (req.user.status !== 'approved') {
    return res.status(403).json({ message: 'Reseller account is pending or suspended. Cannot add products.' });
  }

  try {
    const result = await dbRun(
      'INSERT INTO products (reseller_id, title, description, price, stock, image_url, category_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [req.user.id, title, description, price, stock, image_url || 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=500&auto=format&fit=crop&q=60', category_id]
    );
    res.status(201).json({ id: result.lastID, title, description, price, stock, image_url, category_id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to add product.' });
  }
});

// Update Product (Reseller only)
app.put('/api/products/:id', authenticateToken, requireRole(['reseller']), async (req, res) => {
  const { title, description, price, stock, image_url, category_id } = req.body;
  try {
    // Confirm ownership
    const product = await dbGet('SELECT reseller_id FROM products WHERE id = ?', [req.params.id]);
    if (!product) return res.status(404).json({ message: 'Product not found.' });
    if (product.reseller_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied. You do not own this product listing.' });
    }

    await dbRun(
      'UPDATE products SET title = ?, description = ?, price = ?, stock = ?, image_url = ?, category_id = ? WHERE id = ?',
      [title, description, price, stock, image_url, category_id, req.params.id]
    );
    res.json({ message: 'Product updated successfully.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to update product.' });
  }
});

// Delete Product (Reseller or Admin)
app.delete('/api/products/:id', authenticateToken, requireRole(['reseller', 'admin']), async (req, res) => {
  try {
    const product = await dbGet('SELECT reseller_id FROM products WHERE id = ?', [req.params.id]);
    if (!product) return res.status(404).json({ message: 'Product not found.' });

    // Admin can delete anything; Resellers can only delete their own
    if (req.user.role !== 'admin' && product.reseller_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied. You do not own this product listing.' });
    }

    await dbRun('DELETE FROM products WHERE id = ?', [req.params.id]);
    await dbRun('DELETE FROM cart_items WHERE product_id = ?', [req.params.id]);
    res.json({ message: 'Product deleted successfully.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to delete product.' });
  }
});

// --- CART ENDPOINTS (Customer only) ---

app.get('/api/cart', authenticateToken, requireRole(['customer']), async (req, res) => {
  try {
    const cart = await dbAll(
      'SELECT c.*, p.title, p.price, p.image_url, p.stock FROM cart_items c JOIN products p ON c.product_id = p.id WHERE c.user_id = ?',
      [req.user.id]
    );
    res.json(cart);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch cart.' });
  }
});

app.post('/api/cart', authenticateToken, requireRole(['customer']), async (req, res) => {
  const { product_id, quantity } = req.body;
  if (!product_id || quantity === undefined) {
    return res.status(400).json({ message: 'Product ID and quantity are required.' });
  }

  try {
    const product = await dbGet('SELECT stock FROM products WHERE id = ?', [product_id]);
    if (!product) return res.status(404).json({ message: 'Product not found.' });

    if (quantity > product.stock) {
      return res.status(400).json({ message: `Cannot add requested quantity. Only ${product.stock} items left in stock.` });
    }

    const existing = await dbGet('SELECT * FROM cart_items WHERE user_id = ? AND product_id = ?', [req.user.id, product_id]);

    if (quantity <= 0) {
      if (existing) {
        await dbRun('DELETE FROM cart_items WHERE id = ?', [existing.id]);
      }
      return res.json({ message: 'Item removed from cart.' });
    }

    if (existing) {
      await dbRun('UPDATE cart_items SET quantity = ? WHERE id = ?', [quantity, existing.id]);
    } else {
      await dbRun('INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)', [req.user.id, product_id, quantity]);
    }
    res.json({ message: 'Cart updated successfully.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to update cart.' });
  }
});

app.delete('/api/cart/:productId', authenticateToken, requireRole(['customer']), async (req, res) => {
  try {
    await dbRun('DELETE FROM cart_items WHERE user_id = ? AND product_id = ?', [req.user.id, req.params.productId]);
    res.json({ message: 'Item removed from cart.' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to remove item.' });
  }
});

app.post('/api/cart/clear', authenticateToken, requireRole(['customer']), async (req, res) => {
  try {
    await dbRun('DELETE FROM cart_items WHERE user_id = ?', [req.user.id]);
    res.json({ message: 'Cart cleared.' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to clear cart.' });
  }
});

// --- ORDER & PAYMENT ENDPOINTS (RAZORPAY) ---

// Step 1: Create Razorpay Order
app.post('/api/orders/create-payment', authenticateToken, requireRole(['customer']), async (req, res) => {
  const { shipping_address } = req.body;
  if (!shipping_address) {
    return res.status(400).json({ message: 'Shipping address is required.' });
  }

  try {
    const cart = await dbAll(
      'SELECT c.*, p.price, p.stock, p.title FROM cart_items c JOIN products p ON c.product_id = p.id WHERE c.user_id = ?',
      [req.user.id]
    );

    if (cart.length === 0) {
      return res.status(400).json({ message: 'Cart is empty.' });
    }

    let totalAmount = 0;
    for (const item of cart) {
      if (item.quantity > item.stock) {
        return res.status(400).json({ message: `Insufficient stock for product: ${item.title}. Only ${item.stock} available.` });
      }
      totalAmount += item.price * item.quantity;
    }

    // Razorpay operates in paise (e.g., 100 paise = 1 INR)
    const amountInPaise = Math.round(totalAmount * 100);

    const isRazorpayConfigured = 
      process.env.RAZORPAY_KEY_ID && 
      process.env.RAZORPAY_KEY_SECRET && 
      !process.env.RAZORPAY_KEY_ID.includes('placeholder');

    if (isRazorpayConfigured) {
      const razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      });

      const options = {
        amount: amountInPaise,
        currency: 'INR',
        receipt: `receipt_order_${Date.now()}`,
      };

      const razorpayOrder = await razorpay.orders.create(options);
      res.json({
        isMock: false,
        key_id: process.env.RAZORPAY_KEY_ID,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        id: razorpayOrder.id,
        shipping_address
      });
    } else {
      // Return simulated Razorpay order credentials
      const mockOrderId = `order_mock_${Math.random().toString(36).substring(2, 12)}`;
      res.json({
        isMock: true,
        key_id: 'mock_key',
        amount: amountInPaise,
        currency: 'INR',
        id: mockOrderId,
        shipping_address
      });
    }
  } catch (error) {
    console.error('Error creating payment order:', error);
    res.status(500).json({ message: 'Failed to create payment order.' });
  }
});

// Step 2: Verify Razorpay Payment and Complete Order
app.post('/api/orders/verify-payment', authenticateToken, requireRole(['customer']), async (req, res) => {
  const { 
    razorpay_order_id, 
    razorpay_payment_id, 
    razorpay_signature,
    shipping_address,
    isMock
  } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !shipping_address) {
    return res.status(400).json({ message: 'Missing payment transaction identifiers.' });
  }

  try {
    // 1. Signature Verification
    if (isMock) {
      console.log('Verifying simulated payment for order:', razorpay_order_id);
      // Simulated payment always passes if designated as mock
    } else {
      const body = razorpay_order_id + '|' + razorpay_payment_id;
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest('hex');

      if (expectedSignature !== razorpay_signature) {
        return res.status(400).json({ message: 'Payment verification failed. Security signature mismatch.' });
      }
    }

    // 2. Fetch cart and lock order details
    const cart = await dbAll(
      'SELECT c.*, p.price, p.stock, p.reseller_id, p.title FROM cart_items c JOIN products p ON c.product_id = p.id WHERE c.user_id = ?',
      [req.user.id]
    );

    if (cart.length === 0) {
      return res.status(400).json({ message: 'No items in cart to fulfill.' });
    }

    let totalAmount = 0;
    for (const item of cart) {
      if (item.quantity > item.stock) {
        return res.status(400).json({ message: `Product "${item.title}" run out of stock during checkout!` });
      }
      totalAmount += item.price * item.quantity;
    }

    // 3. Create entry in Database
    const orderResult = await dbRun(`
      INSERT INTO orders (user_id, total_amount, shipping_address, status, payment_method, razorpay_order_id, razorpay_payment_id)
      VALUES (?, ?, ?, 'paid', 'razorpay', ?, ?)`,
      [req.user.id, totalAmount, shipping_address, razorpay_order_id, razorpay_payment_id]
    );
    const orderId = orderResult.lastID;

    // 4. Create Order Items, Update Product Inventory Stocks
    for (const item of cart) {
      const orderItemResult = await dbRun(`
        INSERT INTO order_items (order_id, product_id, reseller_id, quantity, price, status)
        VALUES (?, ?, ?, ?, ?, 'paid')`,
        [orderId, item.product_id, item.reseller_id, item.quantity, item.price]
      );
      const orderItemId = orderItemResult.lastID;

      // Log initial tracking checkpoint
      await dbRun(`
        INSERT INTO order_tracking_updates (order_item_id, status, location, description)
        VALUES (?, 'paid', 'Merchant Warehouse', 'Order placed and payment verified via Razorpay.')`,
        [orderItemId]
      );

      // Decrement stock
      await dbRun(
        'UPDATE products SET stock = stock - ? WHERE id = ?',
        [item.quantity, item.product_id]
      );
    }

    // 5. Clear User Cart
    await dbRun('DELETE FROM cart_items WHERE user_id = ?', [req.user.id]);

    res.json({
      success: true,
      message: 'Payment verified and order created successfully!',
      orderId
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ message: 'Order finalization failed due to database or payment verification errors.' });
  }
});

// Get orders history
app.get('/api/orders', authenticateToken, async (req, res) => {
  try {
    if (req.user.role === 'customer') {
      const orders = await dbAll(
        'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC',
        [req.user.id]
      );

      // Populate items for each order
      for (const order of orders) {
        order.items = await dbAll(
          'SELECT oi.*, p.title, p.image_url FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?',
          [order.id]
        );
      }
      return res.json(orders);
    } else if (req.user.role === 'reseller') {
      // Reseller gets items belonging to their products
      const orderItems = await dbAll(
        `SELECT oi.*, o.shipping_address, o.status as order_status, o.created_at, p.title, p.image_url, u.name as customer_name
         FROM order_items oi 
         JOIN orders o ON oi.order_id = o.id 
         JOIN products p ON oi.product_id = p.id 
         JOIN users u ON o.user_id = u.id
         WHERE oi.reseller_id = ?
         ORDER BY o.created_at DESC`,
        [req.user.id]
      );
      return res.json(orderItems);
    } else if (req.user.role === 'admin') {
      // Admin gets all orders
      const orders = await dbAll('SELECT o.*, u.name as customer_name FROM orders o JOIN users u ON o.user_id = u.id ORDER BY o.created_at DESC');
      for (const order of orders) {
        order.items = await dbAll(
          'SELECT oi.*, p.title, p.image_url, u.name as reseller_name FROM order_items oi JOIN products p ON oi.product_id = p.id JOIN users u ON oi.reseller_id = u.id WHERE oi.order_id = ?',
          [order.id]
        );
      }
      return res.json(orders);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch order history.' });
  }
});

// Update order item status (Resellers and Admins)
app.put('/api/orders/:id/status', authenticateToken, requireRole(['reseller', 'admin']), async (req, res) => {
  const { status, location, description } = req.body;
  if (!status) return res.status(400).json({ message: 'Status is required.' });

  try {
    const item = await dbGet('SELECT reseller_id, order_id FROM order_items WHERE id = ?', [req.params.id]);
    if (!item) return res.status(404).json({ message: 'Order item not found.' });

    if (req.user.role === 'reseller' && item.reseller_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied. You do not sell this product.' });
    }

    // 1. Update order item status
    await dbRun('UPDATE order_items SET status = ? WHERE id = ?', [status, req.params.id]);

    // 2. Insert tracking update checkpoint
    const defaultDescriptions = {
      paid: 'Order paid and payment verified.',
      packed: 'Item has been packed and is ready for courier pickup.',
      shipped: 'Item has been shipped and is in transit.',
      out_for_delivery: 'Item is out for delivery in the local area.',
      delivered: 'Item has been successfully delivered.',
      cancelled: 'Item delivery was cancelled.'
    };
    const finalDescription = description || defaultDescriptions[status] || `Item status updated to ${status}.`;
    const finalLocation = location || (status === 'packed' ? 'Merchant Warehouse' : 'In Transit');

    await dbRun(
      'INSERT INTO order_tracking_updates (order_item_id, status, location, description) VALUES (?, ?, ?, ?)',
      [req.params.id, status, finalLocation, finalDescription]
    );

    // 3. Update parent order status dynamically:
    const allItems = await dbAll('SELECT status FROM order_items WHERE order_id = ?', [item.order_id]);
    let overallStatus = 'pending';
    const statuses = allItems.map(i => i.status);
    
    if (statuses.every(s => s === 'delivered')) {
      overallStatus = 'delivered';
    } else if (statuses.every(s => s === 'shipped' || s === 'delivered' || s === 'out_for_delivery')) {
      overallStatus = 'shipped';
    } else if (statuses.includes('cancelled') && statuses.filter(s => s !== 'cancelled').length === 0) {
      overallStatus = 'cancelled';
    } else {
      overallStatus = 'paid';
    }

    await dbRun('UPDATE orders SET status = ? WHERE id = ?', [overallStatus, item.order_id]);

    res.json({ message: 'Order item status and tracking updated successfully.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to update order status.' });
  }
});

// Get tracking history for an order item
app.get('/api/orders/items/:orderItemId/tracking', authenticateToken, async (req, res) => {
  try {
    const orderItemId = req.params.orderItemId;

    // Fetch order item details
    const item = await dbGet(
      `SELECT oi.*, p.title, p.price, p.image_url, o.shipping_address, o.created_at as order_created_at, o.user_id as buyer_id, u.name as reseller_name
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       JOIN orders o ON oi.order_id = o.id
       JOIN users u ON oi.reseller_id = u.id
       WHERE oi.id = ?`,
      [orderItemId]
    );

    if (!item) {
      return res.status(404).json({ message: 'Order item not found.' });
    }

    // Gating check: customer must be the buyer, reseller must be the owner, or admin
    if (req.user.role === 'customer' && item.buyer_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied. You do not own this order.' });
    }
    if (req.user.role === 'reseller' && item.reseller_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied. You do not own this order listing.' });
    }

    // Fetch tracking logs
    const updates = await dbAll(
      'SELECT * FROM order_tracking_updates WHERE order_item_id = ? ORDER BY created_at DESC',
      [orderItemId]
    );

    res.json({ item, updates });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch tracking information.' });
  }
});

// Cancel Order (Customers and Admins)
app.put('/api/orders/:id/cancel', authenticateToken, requireRole(['customer', 'admin']), async (req, res) => {
  try {
    const order = await dbGet('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    if (!order) return res.status(404).json({ message: 'Order not found.' });

    if (req.user.role !== 'admin' && order.user_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied. You cannot cancel this order.' });
    }

    if (order.status !== 'paid' && order.status !== 'pending') {
      return res.status(400).json({ message: `Cannot cancel order in ${order.status} state.` });
    }

    // Fetch order items to inspect individual status
    const items = await dbAll('SELECT id, product_id, quantity, status FROM order_items WHERE order_id = ?', [order.id]);
    const shippedOrDelivered = items.some(item => ['shipped', 'out_for_delivery', 'delivered'].includes(item.status));
    if (shippedOrDelivered) {
      return res.status(400).json({ message: 'Cannot cancel order as one or more items have already been shipped or delivered.' });
    }

    // Return stock back to products and set status to cancelled for each item
    for (const item of items) {
      await dbRun('UPDATE products SET stock = stock + ? WHERE id = ?', [item.quantity, item.product_id]);
      await dbRun('UPDATE order_items SET status = "cancelled" WHERE id = ?', [item.id]);
      await dbRun(
        'INSERT INTO order_tracking_updates (order_item_id, status, location, description) VALUES (?, "cancelled", "System", "Order item cancelled by buyer.")',
        [item.id]
      );
    }

    await dbRun('UPDATE orders SET status = "cancelled" WHERE id = ?', [req.params.id]);
    res.json({ message: 'Order cancelled and stock returned successfully!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to cancel order.' });
  }
});

// --- REVIEW ENDPOINTS ---

app.post('/api/products/:id/reviews', authenticateToken, requireRole(['customer']), async (req, res) => {
  const { rating, comment } = req.body;
  const productId = req.params.id;

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ message: 'Please provide rating value between 1 and 5 stars.' });
  }

  try {
    // Check if product exists
    const product = await dbGet('SELECT id FROM products WHERE id = ?', [productId]);
    if (!product) return res.status(404).json({ message: 'Product not found.' });

    // Allow user to write review only if they have not reviewed yet
    const existing = await dbGet('SELECT id FROM reviews WHERE user_id = ? AND product_id = ?', [req.user.id, productId]);
    if (existing) {
      return dbRun(
        'UPDATE reviews SET rating = ?, comment = ? WHERE id = ?',
        [rating, comment, existing.id]
      ).then(async () => {
        await recalculateProductRating(productId);
        res.json({ message: 'Review updated successfully!' });
      });
    }

    await dbRun(
      'INSERT INTO reviews (user_id, product_id, rating, comment) VALUES (?, ?, ?, ?)',
      [req.user.id, productId, rating, comment]
    );

    await recalculateProductRating(productId);
    res.status(201).json({ message: 'Review submitted successfully!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to add review.' });
  }
});

async function recalculateProductRating(productId) {
  const stats = await dbGet('SELECT AVG(rating) as avg, COUNT(*) as count FROM reviews WHERE product_id = ?', [productId]);
  const avg = stats.avg ? parseFloat(stats.avg.toFixed(1)) : 0;
  await dbRun(
    'UPDATE products SET average_rating = ?, reviews_count = ? WHERE id = ?',
    [avg, stats.count, productId]
  );
}

function getOrderDateMatches(orderDateStr, query) {
  const orderDate = new Date(orderDateStr);
  const now = new Date();
  
  if (query.includes('today')) {
    return orderDate.toDateString() === now.toDateString();
  }
  if (query.includes('yesterday')) {
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    return orderDate.toDateString() === yesterday.toDateString();
  }
  if (query.includes('last 7 days') || query.includes('last week')) {
    const diffTime = Math.abs(now - orderDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 7;
  }
  if (query.includes('last 30 days') || query.includes('last month')) {
    const diffTime = Math.abs(now - orderDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 30;
  }
  if (query.includes('this month')) {
    return orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
  }
  
  const months = [
    { name: 'january', value: 0 }, { name: 'february', value: 1 }, { name: 'march', value: 2 },
    { name: 'april', value: 3 }, { name: 'may', value: 4 }, { name: 'june', value: 5 },
    { name: 'july', value: 6 }, { name: 'august', value: 7 }, { name: 'september', value: 8 },
    { name: 'october', value: 9 }, { name: 'november', value: 10 }, { name: 'december', value: 11 },
    { name: 'jan', value: 0 }, { name: 'feb', value: 1 }, { name: 'mar', value: 2 },
    { name: 'apr', value: 3 }, { name: 'jun', value: 5 }, { name: 'jul', value: 6 },
    { name: 'aug', value: 7 }, { name: 'sep', value: 8 }, { name: 'oct', value: 9 },
    { name: 'nov', value: 10 }, { name: 'dec', value: 11 }
  ];
  
  for (const m of months) {
    if (query.includes(m.name)) {
      const monthMatches = orderDate.getMonth() === m.value;
      const yearMatch = query.match(/\b(202\d)\b/);
      if (yearMatch) {
        return monthMatches && orderDate.getFullYear() === parseInt(yearMatch[1]);
      }
      return monthMatches;
    }
  }
  
  const yearMatch = query.match(/\b(202\d)\b/);
  if (yearMatch) {
    return orderDate.getFullYear() === parseInt(yearMatch[1]);
  }
  
  return false;
}

// --- AI CHATBOT ENDPOINT ---

// API helper for Gemini requests
async function callGemini(apiKey, prompt, systemInstruction) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`;
  const payload = {
    contents: [{ parts: [{ text: prompt }] }]
  };
  if (systemInstruction) {
    payload.systemInstruction = { parts: [{ text: systemInstruction }] };
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const json = await res.json();
  if (res.ok && json.candidates?.[0]?.content?.parts?.[0]?.text) {
    return json.candidates[0].content.parts[0].text;
  }
  throw new Error(json.error?.message || `Gemini API status ${res.status}`);
}

app.post('/api/chat', async (req, res) => {
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ reply: "I didn't receive any message. How can I help you?" });
  }

  const query = message.toLowerCase().trim();

  // Try to extract and authenticate user if token is provided
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  let currentUser = null;
  if (token) {
    try {
      currentUser = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      // Allow request to proceed as guest
    }
  }

  const isPersonalQuery = query.includes('order') || query.includes('track') || 
                           query.includes('billing') || query.includes('invoice') || 
                           query.includes('spend') || query.includes('spent') || 
                           query.includes('save') || query.includes('savings') || 
                           query.includes('purchase') || query.includes('receipt') ||
                           query.includes('payment') || query.includes('how much');

  if (isPersonalQuery && !currentUser) {
    return res.json({ 
      reply: "🔒 **Secure Session Gating:** To check your personal orders, billing details, payments, or savings history, please log in to your Customer Account first. Once logged in, I'll be able to fetch your live tracking checkpoints and invoices!" 
    });
  }

  try {
    // 1. Fetch store catalog & orders details to feed into LLM system prompt
    const products = await dbAll('SELECT p.title, p.price, p.stock, c.name as category FROM products p JOIN categories c ON p.category_id = c.id');
    const catalogContext = products.map(p => 
      `- Product: ${p.title} | Category: ${p.category} | Price: ₹${p.price.toFixed(2)} | Stock: ${p.stock}`
    ).join('\n');

    let userContext = "User is not logged in.";
    let ordersInfo = [];
    if (currentUser) {
      const orders = await dbAll('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC', [currentUser.id]);
      
      for (let order of orders) {
        const items = await dbAll(`
          SELECT oi.*, p.title 
          FROM order_items oi 
          JOIN products p ON oi.product_id = p.id 
          WHERE oi.order_id = ?`, [order.id]);
          
        const itemsDetails = [];
        for (let item of items) {
          const updates = await dbAll('SELECT status, location, description, created_at FROM order_tracking_updates WHERE order_item_id = ? ORDER BY created_at DESC', [item.id]);
          itemsDetails.push({
            itemId: item.id,
            productTitle: item.title,
            quantity: item.quantity,
            pricePaid: item.price,
            status: item.status,
            trackingUpdates: updates
          });
        }
        
        ordersInfo.push({
          orderId: order.id,
          date: order.created_at,
          totalAmount: order.total_amount,
          shippingAddress: order.shipping_address,
          status: order.status,
          paymentMethod: order.payment_method,
          razorpayPaymentId: order.razorpay_payment_id,
          items: itemsDetails
        });
      }

      userContext = `Logged in User Details:
- Name: ${currentUser.name}
- Email: ${currentUser.email}
- User ID: ${currentUser.id}

User Orders Context:
${JSON.stringify(ordersInfo, null, 2)}`;
    }

    // 2. Try Gemini API routing if configured
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey && !geminiKey.includes('placeholder')) {
      try {
        const systemInstruction = `You are AmazeBot, a premium conversational AI chatbot assistant for AmazeKart, a multi-role e-commerce platform.
Your task is to answer user inquiries accurately and contextually using the provided STORE CATALOG and USER CONTEXT (which includes their real-time order history, tracking details, invoices, spending, and savings).

Key Guidelines:
1. If the user asks about products, catalog, or search queries, refer to the STORE CATALOG below.
2. If the user asks about their personal orders, tracking status, or shipping delivery updates, refer to their USER CONTEXT below. Break down their items, current statuses, and history logs clearly.
3. If they ask for an invoice, receipt, or billing details for an order, construct a detailed textual receipt/invoice outlining order ID, date, customer name, billing/shipping address, subtotal, discount/savings, and payment reference.
4. If they ask about total spent, purchases, payments, or savings amount:
   - Compute total spent (sum up totalAmount of paid/delivered orders, exclude cancelled ones).
   - Compute total savings (state they saved 10% of total spending through cart promotion codes).
   - Display a clean billing summary/portfolio.
5. If they ask about purchases during a certain period of time (e.g. "last week", "today", "June 2026"), filter their order list based on dates in the context and summarize what they bought during that specific time.
6. If the user asks a personal/account query but is NOT logged in (USER CONTEXT indicates not logged in), politely ask them to sign in to their Customer Account so you can access their orders.
7. Be extremely friendly, human-like, empathize with delivery complaints, and keep formatting neat using bullet points, bold labels, and simple tables where helpful.

--- STORE CATALOG ---
${catalogContext}

--- USER CONTEXT ---
${userContext}`;

        const reply = await callGemini(geminiKey, message, systemInstruction);
        return res.json({ reply });
      } catch (err) {
        console.warn("Gemini API call failed, falling back to local NLP logic:", err.message);
      }
    }

    // 3. Fallback: Local database-driven query matching and logic
    let reply = "";

    if (currentUser) {
      // 3a. Specific Order Tracking or Invoice Check
      const orderIdMatch = query.match(/(?:order|invoice|track|receipt|#)\s*#?(\d+)/i) || query.match(/\b(\d+)\b/);
      if (orderIdMatch) {
        const orderId = parseInt(orderIdMatch[1]);
        const order = ordersInfo.find(o => o.orderId === orderId);

        if (order) {
          if (query.includes('invoice') || query.includes('billing') || query.includes('receipt')) {
            const itemLines = order.items.map(item => 
              `• **${item.productTitle}** (Qty: ${item.quantity}) - ₹${item.pricePaid.toLocaleString('en-IN')} each`
            ).join('\n');

            reply = `🧾 **INVOICE / BILLING DOCUMENT**\n` +
                    `-----------------------------------------\n` +
                    `**Order Reference:** #ORD-${String(order.orderId).padStart(4, '0')}\n` +
                    `**Transaction Date:** ${new Date(order.date).toLocaleString()}\n` +
                    `**Customer Name:** ${currentUser.name}\n` +
                    `**Registered Email:** ${currentUser.email}\n` +
                    `**Billing & Shipping Address:** ${order.shippingAddress}\n` +
                    `**Payment Gateway:** Razorpay (Simulated ID: ${order.razorpayPaymentId || 'MOCK_PYMT_1298'})\n` +
                    `-----------------------------------------\n` +
                    `**Purchased Items:**\n${itemLines}\n` +
                    `-----------------------------------------\n` +
                    `**Subtotal:** ₹${order.totalAmount.toLocaleString('en-IN')}\n` +
                    `**Shipping & Processing:** ₹0.00 (FREE Promo Applied)\n` +
                    `**Total Paid Amount:** ₹${order.totalAmount.toLocaleString('en-IN')}\n` +
                    `-----------------------------------------`;
            return res.json({ reply });
          } else {
            const trackingSummary = order.items.map(item => {
              const latestUpdate = item.trackingUpdates[0] || { status: 'processing', location: 'Warehouse', description: 'Order packaging and dispatch preparation.' };
              const history = item.trackingUpdates.map(up => 
                `  - [${new Date(up.created_at).toLocaleDateString()}] **${up.status.toUpperCase()}** at *${up.location}*: ${up.description}`
              ).join('\n');

              return `📦 **Item:** ${item.productTitle} (Qty: ${item.quantity})\n` +
                     `  • **Current status:** ${latestUpdate.status.toUpperCase()}\n` +
                     `  • **Location:** ${latestUpdate.location || 'N/A'}\n` +
                     `  • **Checkpoint history:**\n${history || '  - No history logs available yet.'}`;
            }).join('\n\n');

            reply = `📋 **ORDER STATUS & TRACKING (Order #${order.orderId})**\n` +
                    `Placed on: ${new Date(order.date).toLocaleDateString()}\n` +
                    `Shipping destination: ${order.shippingAddress}\n` +
                    `Overall order status: **${order.status.toUpperCase()}**\n\n` +
                    `${trackingSummary}`;
            return res.json({ reply });
          }
        }
      }

      // 3b. Spending & Savings summaries
      if (query.includes('save') || query.includes('savings') || query.includes('spent') || query.includes('spend') || query.includes('payment') || query.includes('how much')) {
        const totalSpent = ordersInfo.reduce((sum, o) => sum + (o.status !== 'cancelled' ? o.totalAmount : 0), 0);
        const totalSaved = Math.round(totalSpent * 0.1); // Simulated 10% savings
        const orderCount = ordersInfo.filter(o => o.status !== 'cancelled').length;

        reply = `💰 **PURCHASES & PAYMENTS FINANCIAL PORTFOLIO**\n` +
                `-----------------------------------------\n` +
                `👤 **Customer:** ${currentUser.name}\n` +
                `📦 **Total Successful Orders:** ${orderCount} items\n` +
                `💳 **Total Cash Spent (via Razorpay):** ₹${totalSpent.toLocaleString('en-IN')}\n` +
                `🎁 **Smart Cart Savings (10% promo):** ₹${totalSaved.toLocaleString('en-IN')}\n` +
                `-----------------------------------------\n` +
                `*Savings are calculated automatically based on checkout promo codes, seller discounts, and free shipping benefits.*`;
        return res.json({ reply });
      }

      // 3c. Purchases during a certain period of time
      const dateKeywords = ['today', 'yesterday', 'week', 'month', 'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december', 'jan', 'feb', 'mar', 'apr', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec', '2024', '2025', '2026'];
      const queryHasDate = dateKeywords.some(keyword => query.includes(keyword));

      if (queryHasDate || query.includes('purchases') || query.includes('buy') || query.includes('order')) {
        let filteredOrders = ordersInfo;
        let periodDescription = "All time";

        if (queryHasDate) {
          filteredOrders = ordersInfo.filter(o => getOrderDateMatches(o.date, query));
          
          if (query.includes('today')) periodDescription = "Today";
          else if (query.includes('yesterday')) periodDescription = "Yesterday";
          else if (query.includes('week')) periodDescription = "This Week";
          else if (query.includes('month') || query.includes('30 days')) periodDescription = "Last 30 Days";
          else {
            const matchedMonth = dateKeywords.slice(4, 28).find(m => query.includes(m));
            const yearMatch = query.match(/\b(202\d)\b/);
            periodDescription = (matchedMonth ? matchedMonth.toUpperCase() : "") + (yearMatch ? ` ${yearMatch[1]}` : "");
          }
        }

        if (filteredOrders.length === 0) {
          reply = `📅 I couldn't find any orders placed during the requested period (**${periodDescription}**). Would you like to view your all-time order history instead?`;
        } else {
          let orderListStr = "";
          for (let order of filteredOrders) {
            const itemNames = order.items.map(item => `${item.productTitle} (x${item.quantity})`).join(', ');
            orderListStr += `• **Order #${order.orderId}** [${new Date(order.date).toLocaleDateString()}] - Total: ₹${order.totalAmount.toLocaleString('en-IN')} - Status: *${order.status}*\n  *Items:* ${itemNames}\n`;
          }

          reply = `📅 **ORDER HISTORY - PERIOD: ${periodDescription.toUpperCase()}**\n` +
                  `I found ${filteredOrders.length} matching order(s):\n\n` +
                  `${orderListStr}\n` +
                  `💡 *Tip: You can ask 'track order <ID>' or 'invoice for order <ID>' for more details.*`;
        }
        return res.json({ reply });
      }
    }

    // 3d. Static responses fallback
    if (query.includes('hello') || query.includes('hi') || query.includes('hey') || query.includes('greetings') || query.includes('yo')) {
      reply = `Hello ${currentUser ? currentUser.name : 'there'}! I'm AmazeBot, your premium shopping assistant. How can I guide your experience today?`;
    } 
    else if (query.includes('product') || query.includes('sell') || query.includes('buy') || query.includes('catalog') || query.includes('store') || query.includes('earbuds') || query.includes('band') || query.includes('backpack') || query.includes('book') || query.includes('habits') || query.includes('moisturizer') || query.includes('cream')) {
      const matches = products.filter(p => 
        query.includes(p.title.toLowerCase()) || 
        query.includes(p.category.toLowerCase()) ||
        (p.title.toLowerCase().split(' ').some(word => word.length > 3 && query.includes(word)))
      );

      if (matches.length > 0) {
        reply = `I found some matches in our catalog:\n` + 
          matches.slice(0, 10).map(p => `• **${p.title}** (${p.category}) - ₹${p.price.toLocaleString('en-IN')} (Stock: ${p.stock})`).join('\n') +
          `\nWould you like me to show you how to order any of these?`;
      } else {
        reply = `We have a wide range of products! Currently in our database we have:\n` +
          products.slice(0, 3).map(p => `• **${p.title}** - ₹${p.price.toLocaleString('en-IN')}`).join('\n') +
          `\n...and more. You can browse them on our home page!`;
      }
    } 
    else if (query.includes('shipping') || query.includes('delivery') || query.includes('dispatch') || query.includes('track') || query.includes('arrive')) {
      reply = "We offer express shipping across India. Standard orders are processed and dispatched by our verified sellers within 24-48 hours and typically arrive at your destination in 3-5 business days. You can track your purchase under 'My Orders'.";
    } 
    else if (query.includes('payment') || query.includes('razorpay') || query.includes('checkout') || query.includes('pay') || query.includes('card')) {
      reply = "All payments are securely handled via Razorpay integration. In this sandbox/development environment, we also offer a simulated Razorpay payment flow to let you complete transactions and inspect order workflows without real credentials.";
    } 
    else if (query.includes('reseller') || query.includes('merchant') || query.includes('seller') || query.includes('vendor') || query.includes('sell product')) {
      reply = "Interested in listing products on AmazeKart? Simply register a new account and select the **Reseller** role. Once a platform Administrator approves your request, you'll unlock the Reseller Dashboard to list items and manage dispatches.";
    } 
    else if (query.includes('admin') || query.includes('approve') || query.includes('suspend') || query.includes('dashboard')) {
      reply = "AmazeKart features a full Admin Panel where platform administrators can approve pending reseller requests, create/modify product categories, and manage or suspend user accounts to keep the marketplace safe.";
    } 
    else if (query.includes('help') || query.includes('what can you do') || query.includes('features')) {
      reply = "I'm AmazeBot! I can help you with:\n1. Finding products in our catalog.\n2. Checking shipping and payment methods.\n3. Explaining how to become a reseller.\n4. Administrative control inquiries. Let me know what you need!";
    } 
    else if (query.includes('thank') || query.includes('cool') || query.includes('awesome') || query.includes('perfect')) {
      reply = "You're very welcome! If there's anything else you need to build or test, just let me know. Happy shopping!";
    } 
    else {
      reply = "I'm not sure I fully understand that. I can assist you with search inquiries, reseller sign-up info, shipping, payments, and admin configurations. Could you please rephrase or pick one of those topics?";
    }

    res.json({ reply });
  } catch (error) {
    console.error('Chatbot error:', error);
    res.status(500).json({ reply: "Apologies, I encountered an internal server error while fetching our catalog. Please try again." });
  }
});

// --- ADMIN MANAGEMENT ENDPOINTS ---

// Get all resellers & pending requests
app.get('/api/admin/resellers', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const resellers = await dbAll(
      `SELECT id, name, email, status, created_at 
       FROM users 
       WHERE role = 'reseller' 
       ORDER BY CASE WHEN status = 'pending' THEN 0 ELSE 1 END, created_at DESC`
    );
    res.json(resellers);
  } catch (error) {
    res.status(500).json({ message: 'Failed to load resellers.' });
  }
});

// Approve / Suspend reseller
app.put('/api/admin/resellers/:id/status', authenticateToken, requireRole(['admin']), async (req, res) => {
  const { status } = req.body;
  if (!['approved', 'suspended', 'pending'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status value.' });
  }

  try {
    await dbRun('UPDATE users SET status = ? WHERE id = ? AND role = "reseller"', [status, req.params.id]);
    res.json({ message: `Reseller status set to ${status}.` });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update reseller status.' });
  }
});

// Get all platform users
app.get('/api/admin/users', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const users = await dbAll('SELECT id, name, email, role, status, created_at FROM users ORDER BY role, created_at DESC');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Failed to load users.' });
  }
});

// Change user status (Customer / Reseller)
app.put('/api/admin/users/:id/status', authenticateToken, requireRole(['admin']), async (req, res) => {
  const { status } = req.body;
  if (!['approved', 'suspended', 'pending'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status value.' });
  }

  try {
    const user = await dbGet('SELECT role FROM users WHERE id = ?', [req.params.id]);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    if (user.role === 'admin') return res.status(400).json({ message: 'Cannot modify Admin status.' });

    await dbRun('UPDATE users SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ message: `User status set to ${status}.` });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update user status.' });
  }
});

// Platform analytics
app.get('/api/admin/stats', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const totalUsers = await dbGet('SELECT COUNT(*) as count FROM users');
    const totalResellers = await dbGet('SELECT COUNT(*) as count FROM users WHERE role = "reseller"');
    const pendingResellers = await dbGet('SELECT COUNT(*) as count FROM users WHERE role = "reseller" AND status = "pending"');
    const totalProducts = await dbGet('SELECT COUNT(*) as count FROM products');
    const revenueStats = await dbGet('SELECT SUM(total_amount) as sum FROM orders WHERE status = "paid" OR status = "shipped" OR status = "delivered"');
    const ordersCount = await dbGet('SELECT COUNT(*) as count FROM orders');

    res.json({
      usersCount: totalUsers.count,
      resellersCount: totalResellers.count,
      pendingResellers: pendingResellers.count,
      productsCount: totalProducts.count,
      totalRevenue: revenueStats.sum || 0,
      ordersCount: ordersCount.count
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch platform statistics.' });
  }
});

// Fallback path to frontend static assets in production (optional)
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// Serve index.html as fallback
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'), (err) => {
    if (err) {
      // In development fallback
      res.status(200).send('Express API Server is up! Run frontend separately via Vite dev server.');
    }
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
