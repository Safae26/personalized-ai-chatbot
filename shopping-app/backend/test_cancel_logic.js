const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this);
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

const dbAll = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

async function testCancel(orderId) {
  try {
    const order = await dbGet('SELECT * FROM orders WHERE id = ?', [orderId]);
    if (!order) {
      console.log('Order not found');
      return;
    }
    console.log('Order found:', order);

    const items = await dbAll('SELECT id, product_id, quantity, status FROM order_items WHERE order_id = ?', [order.id]);
    console.log('Order items:', items);

    const shippedOrDelivered = items.some(item => ['shipped', 'out_for_delivery', 'delivered'].includes(item.status));
    if (shippedOrDelivered) {
      console.log('Cannot cancel order as one or more items have already been shipped or delivered.');
      return;
    }

    // Return stock back to products and set status to cancelled for each item
    for (const item of items) {
      console.log(`Updating product stock for product_id: ${item.product_id}, quantity: ${item.quantity}`);
      await dbRun('UPDATE products SET stock = stock + ? WHERE id = ?', [item.quantity, item.product_id]);
      console.log(`Updating order item ${item.id} status to cancelled`);
      await dbRun('UPDATE order_items SET status = "cancelled" WHERE id = ?', [item.id]);
      console.log(`Inserting order tracking update for order item ${item.id}`);
      await dbRun(
        'INSERT INTO order_tracking_updates (order_item_id, status, location, description) VALUES (?, "cancelled", "System", "Order item cancelled by buyer.")',
        [item.id]
      );
    }

    console.log(`Updating order ${orderId} status to cancelled`);
    await dbRun('UPDATE orders SET status = "cancelled" WHERE id = ?', [orderId]);
    console.log('Success');
  } catch (error) {
    console.error('Error during cancellation:', error);
  } finally {
    db.close();
  }
}

testCancel(2);
