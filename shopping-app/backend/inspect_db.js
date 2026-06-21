const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

db.all("SELECT sql FROM sqlite_master WHERE type='table'", [], (err, tables) => {
  if (err) {
    console.error(err);
    return;
  }
  console.log("TABLE SCHEMAS:");
  tables.forEach(t => console.log(t.sql));
  console.log("\n--------------------\n");

  db.all("SELECT * FROM orders", [], (err, orders) => {
    if (err) console.error(err);
    else {
      console.log("ORDERS:");
      console.log(orders);
    }
    
    db.all("SELECT * FROM order_items", [], (err, items) => {
      if (err) console.error(err);
      else {
        console.log("\nORDER ITEMS:");
        console.log(items);
      }
      db.close();
    });
  });
});
