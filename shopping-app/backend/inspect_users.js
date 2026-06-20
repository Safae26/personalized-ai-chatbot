const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

db.all("SELECT id, name, email, role, status FROM users", [], (err, rows) => {
  if (err) console.error(err);
  else console.log(rows);
  db.close();
});
