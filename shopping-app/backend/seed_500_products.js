const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const datasets = {
  'Electronics': {
    brands: ['Sony', 'Logitech', 'Samsung', 'Bose', 'Anker', 'Apple', 'Dell', 'Sennheiser', 'Xiaomi', 'JBL', 'HP', 'Lenovo', 'Asus'],
    adjectives: ['Wireless', 'Pro', 'Ultra-Slim', 'Smart', 'Portable', 'Next-Gen', 'Heavy-Duty', 'High-Fidelity', 'Rechargeable', 'Ergonomic', 'Noise-Cancelling'],
    nouns: ['Earbuds', 'Keyboard', 'Bluetooth Speaker', 'Smartwatch', 'Power Bank', 'Charging Dock', 'Over-Ear Headphones', 'Webcam', 'USB-C Hub', 'Tablet Stand', 'Gaming Mouse', 'Wireless Router', 'External SSD', 'Monitor Stand', 'Fitness Tracker', 'Microphone', 'Stylus Pen'],
    features: [
      'Active Noise Cancellation (ANC)',
      'Bluetooth 5.3 low-latency connectivity',
      'ultra-fast charging technology',
      'long-lasting battery performance',
      'ergonomic design for maximum comfort',
      'customizable RGB accent lighting',
      'high-resolution audiophile sound quality',
      'seamless multi-device pairing support',
      'voice assistant compatibility',
      'premium durable aluminum construction'
    ],
    batteries: ['12', '20', '35', '45', '60'],
    images: [
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=500&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=500&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1496181130204-755241524eab?w=500&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=500&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=500&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=500&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1593508512255-86ab42a8e620?w=500&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=500&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1563206767-5b18f218e8de?w=500&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1591510456681-370bec0135ff?w=500&auto=format&fit=crop&q=60'
    ],
    sellers: ['reseller@amazon.com', 'electrogizmos@amazon.com', 'gadgetbox@amazon.com']
  },
  'Fashion & Apparel': {
    brands: ['Nike', "Levi's", 'Adidas', 'Zara', 'Tommy Hilfiger', 'Calvin Klein', 'Patagonia', 'Uniqlo', 'H&M', 'Puma', 'Columbia', 'Under Armour', 'Timberland'],
    adjectives: ['Classic', 'Modern', 'Vintage', 'Minimalist', 'Athletic', 'Casual', 'Premium', 'Water-Resistant', 'Breathable', 'Tailored', 'Stretch-Fit'],
    nouns: ['Backpack', 'Running Shoes', 'Sunglasses', 'Leather Wallet', 'Cotton T-Shirt', 'Windbreaker Jacket', 'Denim Jeans', 'Canvas Sneakers', 'Wool Beanie', 'Slim Fit Chinos', 'Fleece Pullover', 'Leather Belt', 'Sports Socks', 'Activewear Shorts', 'Duffel Bag', 'Crewneck Sweatshirt', 'Polo Shirt'],
    materials: ['100% organic cotton', 'premium full-grain leather', 'breathable recycled polyester', 'durable water-repellent nylon', 'soft combed merino wool', 'flexible spandex blend'],
    usages: ['casual everyday wear', 'outdoor trail hiking', 'intense gym workouts', 'semi-formal events', 'weekend travel trips', 'daily urban commutes'],
    images: [
      'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=500&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=500&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1520639888713-7851133b1ed0?w=500&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=500&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1534215754734-18e55d13e346?w=500&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=500&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1603252109303-2751441dd157?w=500&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1602293589930-45aad59ba3ab?w=500&auto=format&fit=crop&q=60'
    ],
    sellers: ['urbanthread@amazon.com', 'styleaura@amazon.com']
  },
  'Home & Kitchen': {
    brands: ['T-fal', 'Cuisinart', 'Pyrex', 'Keurig', 'Lodge', 'Dyson', 'Philips', 'KitchenAid', 'Instant Pot', 'Le Creuset', 'Hamilton Beach', 'Shark', 'Breville'],
    adjectives: ['Gourmet', 'Ergonomic', 'Eco-Friendly', 'Modern', 'Handcrafted', 'Rustic', 'Heavy-Duty', 'Space-Saving', 'Insulated', 'Non-Stick', 'Elegant'],
    nouns: ['Cast Iron Skillet', 'Coffee Maker', 'Stainless Steel Kettle', 'Chef Knife Set', 'Blender', 'Air Fryer', 'Storage Container Set', 'Cutting Board', 'Non-Stick Frying Pan', 'Food Processor', 'Slow Cooker', 'Toaster Oven', 'Electric Grill', 'Knife Sharpener', 'Mixing Bowl Set', 'Silicone Baking Mats', 'Spatula Set'],
    materials: ['high-grade 18/10 stainless steel', 'pre-seasoned cast iron', 'sustainable eco-friendly bamboo', 'thermal shock-resistant borosilicate glass', 'heavy-gauge anodized aluminum'],
    features: ['even heat distribution', 'intuitive digital controls', 'compact space-saving storage', 'dishwasher-safe components', 'programmable multi-functional settings'],
    images: [
      'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=500&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1517256064527-09c53b2d0bc6?w=500&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1577140917170-285929fb55b7?w=500&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=500&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=500&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=500&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1593113630400-ea4288922497?w=500&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=500&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1616627460737-ac10e741a908?w=500&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1527018601619-a508a2be00cd?w=500&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1588854337236-6889d631faa8?w=500&auto=format&fit=crop&q=60'
    ],
    sellers: ['kitchenchefs@amazon.com', 'decornook@amazon.com']
  },
  'Books & Stationery': {
    brands: ['Moleskine', 'Parker', 'Pilot', 'Faber-Castell', 'Lamy', 'Rotring', 'Cross', 'Pentel', 'Staedtler', 'Paper Mate', 'Leuchtturm1917', 'Rhodia', 'TWSBI'],
    adjectives: ['Inspirational', 'Best-Selling', 'Comprehensive', 'Interactive', 'Leather-Bound', 'Elegant', 'Hardcover', 'Premium', 'Minimalist', 'Classic', 'Deluxe'],
    nouns: ['Self-Help Guide', 'Hardcover Journal', 'Fountain Pen Set', 'Weekly Planner', 'Business Strategy Book', 'Sci-Fi Novel', 'Desk Organizer', 'Sketchbook', 'Calligraphy Kit', 'Gel Pen Pack', 'History Anthology', 'Mystery Thriller', 'Biography', 'Colored Pencils Pack', 'Bullet Journal', 'Mechanical Pencil', 'Travel Notebook'],
    themes: [
      'actionable strategies for personal growth and habit building',
      'a gripping narrative filled with suspense and rich character development',
      'elegant and smooth writing performance with quick-drying smudge-free ink',
      'efficient organization of your busy schedule, goals, and daily tasks',
      'high-quality textured acid-free pages perfect for sketching and journaling'
    ],
    audiences: ['professionals', 'students', 'creative artists', 'avid readers', 'anyone looking to build better habits'],
    images: [
      'https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=500&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=500&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=500&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=500&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1576243345690-4e4b79b63288?w=500&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=500&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1534349762230-e0cadf78f5da?w=500&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1519751138087-5bf79df62d5b?w=500&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=500&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=500&auto=format&fit=crop&q=60'
    ],
    sellers: ['pending_reseller@amazon.com', 'bookworm@amazon.com', 'stationerydepot@amazon.com']
  },
  'Beauty & Health': {
    brands: ['CeraVe', 'The Ordinary', 'Neutrogena', 'L\'Oreal', 'Cetaphil', 'Innisfree', 'Kiehl\'s', 'Estee Lauder', 'Nivea', 'Clinique', 'La Roche-Posay', 'Garnier', 'Aveeno'],
    adjectives: ['Organic', 'Hydrating', 'Rejuvenating', 'All-Natural', 'Gentle', 'Therapeutic', 'Vegan', 'Nourishing', 'Anti-Aging', 'Soothing', 'Radiant'],
    nouns: ['Face Serum', 'Moisturizing Cream', 'Sunscreen SPF 50', 'Gentle Cleanser', 'Essential Oil Set', 'Lip Balm Pack', 'Clay Face Mask', 'Hair Treatment Oil', 'Body Wash', 'Exfoliating Scrub', 'Toner Solution', 'Eye Cream', 'Night Cream', 'Hand Cream', 'Shampoo', 'Conditioner', 'Peel Exfoliator'],
    ingredients: [
      'hyaluronic acid, niacinamide, and vitamin C',
      'organic tea tree oil, witch hazel, and aloe vera',
      'nourishing shea butter, jojoba oil, and coconut extract',
      'gentle salicylic acid, ceramides, and green tea extracts',
      'natural lavender, chamomile, and rosemary essential extracts'
    ],
    benefits: [
      'provide deep multi-layered hydration and restore healthy radiance',
      'gently cleanse, remove impurities, and soothe skin irritation',
      'protect against harmful environmental stressors and UV damage',
      'reduce the appearance of fine lines and improve skin elasticity',
      'deeply condition, repair split ends, and strengthen hair follicles'
    ],
    skinTypes: ['all skin types', 'sensitive skin', 'dry skin', 'oily/combination skin', 'acne-prone skin'],
    images: [
      'https://images.unsplash.com/photo-1617897903246-719242758050?w=500&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=500&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=500&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=500&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=500&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1616683693504-3ea7e9ad6fec?w=500&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=500&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1607006342411-9c37d0f6b71f?w=500&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1541643600914-78b084683601?w=500&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=500&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=500&auto=format&fit=crop&q=60'
    ],
    sellers: ['glowradiance@amazon.com', 'vitalityhub@amazon.com']
  }
};

const usersToSeed = [
  { name: 'Admin User', email: 'admin@amazon.com', password: 'admin123', role: 'admin', status: 'approved' },
  { name: 'John Doe Customer', email: 'customer@amazon.com', password: 'customer123', role: 'customer', status: 'approved' },
  { name: 'Electro World Seller', email: 'reseller@amazon.com', password: 'reseller123', role: 'reseller', status: 'approved' },
  { name: 'Pending Book Vendor', email: 'pending_reseller@amazon.com', password: 'reseller123', role: 'reseller', status: 'approved' },
  { name: 'ElectroGizmos', email: 'electrogizmos@amazon.com', password: 'reseller123', role: 'reseller', status: 'approved' },
  { name: 'GadgetBox', email: 'gadgetbox@amazon.com', password: 'reseller123', role: 'reseller', status: 'approved' },
  { name: 'UrbanThread Co.', email: 'urbanthread@amazon.com', password: 'reseller123', role: 'reseller', status: 'approved' },
  { name: 'StyleAura', email: 'styleaura@amazon.com', password: 'reseller123', role: 'reseller', status: 'approved' },
  { name: 'KitchenChefs', email: 'kitchenchefs@amazon.com', password: 'reseller123', role: 'reseller', status: 'approved' },
  { name: 'DecorNook', email: 'decornook@amazon.com', password: 'reseller123', role: 'reseller', status: 'approved' },
  { name: 'Bookworm Oasis', email: 'bookworm@amazon.com', password: 'reseller123', role: 'reseller', status: 'approved' },
  { name: 'Stationery Depot', email: 'stationerydepot@amazon.com', password: 'reseller123', role: 'reseller', status: 'approved' },
  { name: 'GlowRadiance Beauty', email: 'glowradiance@amazon.com', password: 'reseller123', role: 'reseller', status: 'approved' },
  { name: 'VitalityHub Health', email: 'vitalityhub@amazon.com', password: 'reseller123', role: 'reseller', status: 'approved' }
];

const categoriesToSeed = [
  { name: 'Electronics', description: 'Gadgets, devices, smart tech, and accessories' },
  { name: 'Fashion & Apparel', description: 'Clothing, footwear, and styling accessories' },
  { name: 'Home & Kitchen', description: 'Home decor, furniture, cooking equipment, appliances' },
  { name: 'Books & Stationery', description: 'Novels, text books, journals, and pens' },
  { name: 'Beauty & Health', description: 'Skincare, makeup, vitamins, and hygiene products' }
];

async function seedDatabase(dbConnection) {
  const localDbRun = (sql, params = []) => {
    return new Promise((resolve, reject) => {
      dbConnection.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve(this);
      });
    });
  };

  const localDbAll = (sql, params = []) => {
    return new Promise((resolve, reject) => {
      dbConnection.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  };

  console.log('PRAGMA foreign_keys = OFF...');
  await localDbRun('PRAGMA foreign_keys = OFF');

  console.log('Clearing database tables...');
  await localDbRun('DELETE FROM order_tracking_updates');
  await localDbRun('DELETE FROM order_items');
  await localDbRun('DELETE FROM orders');
  await localDbRun('DELETE FROM cart_items');
  await localDbRun('DELETE FROM reviews');
  await localDbRun('DELETE FROM products');
  await localDbRun('DELETE FROM categories');
  await localDbRun('DELETE FROM users');
  console.log('Database tables cleared.');

  console.log('PRAGMA foreign_keys = ON...');
  await localDbRun('PRAGMA foreign_keys = ON');

  // Hash passwords and seed users
  console.log('Seeding users...');
  const userMap = {};
  for (const u of usersToSeed) {
    const hash = bcrypt.hashSync(u.password, 10);
    const res = await localDbRun(
      'INSERT INTO users (name, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?)',
      [u.name, u.email, hash, u.role, u.status]
    );
    userMap[u.email] = res.lastID;
  }
  console.log(`Seeded ${Object.keys(userMap).length} users successfully.`);

  // Seed categories
  console.log('Seeding categories...');
  const categoryMap = {};
  for (const cat of categoriesToSeed) {
    const res = await localDbRun(
      'INSERT INTO categories (name, description) VALUES (?, ?)',
      [cat.name, cat.description]
    );
    categoryMap[cat.name] = res.lastID;
  }
  console.log(`Seeded ${Object.keys(categoryMap).length} categories successfully.`);

  // Generate and seed 500 products (100 per category)
  console.log('Generating and seeding 500 products...');
  let productInsertCount = 0;
  
  for (const catName of Object.keys(datasets)) {
    const dataset = datasets[catName];
    const categoryId = categoryMap[catName];
    
    for (let i = 0; i < 100; i++) {
      const brand = dataset.brands[i % dataset.brands.length];
      const adj = dataset.adjectives[(i * 3) % dataset.adjectives.length];
      const noun = dataset.nouns[(i * 7) % dataset.nouns.length];
      const title = `${brand} ${adj} ${noun}`;

      let description = '';
      if (catName === 'Electronics') {
        const f1 = dataset.features[i % dataset.features.length];
        const f2 = dataset.features[(i * 2 + 1) % dataset.features.length];
        const f3 = dataset.features[(i * 3 + 2) % dataset.features.length];
        const battery = dataset.batteries[i % dataset.batteries.length];
        description = `Experience the ultimate performance with the ${brand} ${adj} ${noun}. Equipped with state-of-the-art components, it features ${f1}, ${f2}, and ${f3}. Designed for high efficiency and seamless everyday use, it boasts an incredible battery life of up to ${battery} hours. Elevate your technology game with this sleek, robust device, which comes with a full 1-year manufacturer warranty and dedicated customer service support.`;
      } else if (catName === 'Fashion & Apparel') {
        const material = dataset.materials[i % dataset.materials.length];
        const usage = dataset.usages[(i * 2 + 1) % dataset.usages.length];
        description = `Elevate your style and performance with the ${brand} ${adj} ${noun}. Expertly crafted from ${material}, this item is tailored to combine maximum durability with a lightweight feel. Ideal for ${usage}, it incorporates advanced fabric technology to ensure maximum breathability and style. Features reinforced double stitching, functional details, and a modern aesthetic suitable for both formal and casual settings.`;
      } else if (catName === 'Home & Kitchen') {
        const material = dataset.materials[i % dataset.materials.length];
        const feature = dataset.features[(i * 2 + 1) % dataset.features.length];
        description = `Upgrade your culinary space with the premium ${brand} ${adj} ${noun}. Engineered with high-quality ${material}, this product offers exceptional performance. It highlights a ${feature} that makes food preparation or home management incredibly convenient and efficient. Dishwasher-safe and extremely easy to clean, it makes the perfect addition to any modern household or professional kitchen.`;
      } else if (catName === 'Books & Stationery') {
        const theme = dataset.themes[i % dataset.themes.length];
        const audience = dataset.audiences[(i * 2 + 1) % dataset.audiences.length];
        description = `Unleash your potential with the ${brand} ${adj} ${noun}. Highly acclaimed by readers and experts alike, this edition details ${theme}. It is the perfect resource for ${audience} looking to build practical skills, inspire creative thinking, or organize daily routines. Beautifully bound and printed on premium paper, it makes a thoughtful gift and a permanent addition to your bookshelf or writing desk.`;
      } else if (catName === 'Beauty & Health') {
        const ingredient = dataset.ingredients[i % dataset.ingredients.length];
        const benefit = dataset.benefits[(i * 2 + 1) % dataset.benefits.length];
        const skinType = dataset.skinTypes[(i * 3 + 2) % dataset.skinTypes.length];
        description = `Revitalize your wellness routine with the ${brand} ${adj} ${noun}. Formulated with ${ingredient}, this advanced mixture is designed to ${benefit}. Dermatologist-tested, hypoallergenic, and free from harsh parabens, it is suitable for ${skinType}. Use daily to see a noticeable improvement in elasticity, hydration, and overall texture.`;
      }

      let price = 0.0;
      if (catName === 'Electronics') {
        price = 2999.00 + ((i * 149) % 12000);
      } else if (catName === 'Fashion & Apparel') {
        price = 599.00 + ((i * 89) % 4000);
      } else if (catName === 'Home & Kitchen') {
        price = 399.00 + ((i * 99) % 8000);
      } else if (catName === 'Books & Stationery') {
        price = 199.00 + ((i * 29) % 1500);
      } else if (catName === 'Beauty & Health') {
        price = 249.00 + ((i * 59) % 3000);
      }
      
      let stock = 5 + ((i * 17) % 95);
      if (i % 15 === 0) {
        stock = 0; // Seeding out-of-stock items specifically
      }

      const sellerEmail = dataset.sellers[i % dataset.sellers.length];
      const resellerId = userMap[sellerEmail];
      const imageUrl = dataset.images[i % dataset.images.length];

      await localDbRun(
        `INSERT INTO products (reseller_id, title, description, price, stock, image_url, category_id, average_rating, reviews_count)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0.0, 0)`,
        [resellerId, title, description, price, stock, imageUrl, categoryId]
      );
      productInsertCount++;
    }
  }
  console.log(`Seeded ${productInsertCount} products successfully.`);

  // Seed Reviews on some products
  console.log('Seeding product reviews...');
  const products = await localDbAll('SELECT id, title FROM products');
  const customerId = userMap['customer@amazon.com'];
  
  const sampleReviews = [
    { rating: 5, comment: 'Absolutely stellar product! Extremely satisfied with the performance and design.' },
    { rating: 5, comment: 'Outstanding quality and very fast shipping. Highly recommend to everyone!' },
    { rating: 4, comment: 'Great value for money. Very solid build quality, works perfectly.' },
    { rating: 4, comment: 'Pretty good experience. Description was accurate, and it fits nicely.' },
    { rating: 3, comment: 'Decent item. It functions well enough, though packaging could be improved.' },
    { rating: 2, comment: 'Underwhelming. The product has some design flaws and did not meet expectations.' },
    { rating: 1, comment: 'Very disappointed. Stopped working after minimal usage. Customer support was slow.' }
  ];

  let reviewsSeeded = 0;
  for (let idx = 0; idx < products.length; idx += 7) {
    const prod = products[idx];
    const numReviews = (idx % 3) + 1; // 1 to 3 reviews
    for (let r = 0; r < numReviews; r++) {
      const reviewData = sampleReviews[(idx + r) % sampleReviews.length];
      await localDbRun(
        'INSERT INTO reviews (user_id, product_id, rating, comment) VALUES (?, ?, ?, ?)',
        [customerId, prod.id, reviewData.rating, reviewData.comment]
      );
      reviewsSeeded++;
    }
  }
  console.log(`Seeded ${reviewsSeeded} reviews.`);

  // Recalculate average rating and reviews count for all reviewed products
  console.log('Aggregating product ratings...');
  await localDbRun(`
    UPDATE products 
    SET 
      average_rating = (SELECT AVG(rating) FROM reviews WHERE reviews.product_id = products.id),
      reviews_count = (SELECT COUNT(*) FROM reviews WHERE reviews.product_id = products.id)
    WHERE id IN (SELECT DISTINCT product_id FROM reviews)
  `);
  console.log('Product ratings aggregated successfully.');
}

if (require.main === module) {
  const mainDb = new sqlite3.Database(dbPath);
  seedDatabase(mainDb)
    .then(() => {
      console.log('Standalone database seeding completed successfully.');
      mainDb.close();
    })
    .catch((err) => {
      console.error('Standalone seeding failed:', err);
      mainDb.close();
    });
}

module.exports = {
  seedDatabase
};
