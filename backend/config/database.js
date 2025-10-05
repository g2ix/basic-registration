const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Set timezone to Philippine Standard Time (UTC+8)
process.env.TZ = 'Asia/Manila';

// Create SQLite database connection
const dbPath = path.join(__dirname, '..', 'cooperative_gathering.db');
const db = new sqlite3.Database(dbPath);

// Enable foreign keys
db.run('PRAGMA foreign_keys = ON');

// Set timezone for SQLite
db.run("PRAGMA timezone = '+08:00'");

// Create a compatibility layer to mimic PostgreSQL pool.query
const pool = {
  query: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      // Convert PostgreSQL syntax to SQLite
      let sqliteSql = sql
        .replace(/\$(\d+)/g, '?') // Replace $1, $2, etc. with ?
        .replace(/CURRENT_TIMESTAMP/g, "datetime('now', '+08:00')")
        .replace(/CURRENT_DATE/g, "date('now', '+08:00')")
        .replace(/uuid_generate_v4\(\)/g, "lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))");
      
      if (sql.trim().toLowerCase().startsWith('select')) {
        db.all(sqliteSql, params, (err, rows) => {
          if (err) reject(err);
          else resolve({ rows });
        });
      } else {
        db.run(sqliteSql, params, function(err) {
          if (err) reject(err);
          else resolve({ rows: [], rowCount: this.changes });
        });
      }
    });
  }
};

// Test database connection
db.get('SELECT 1', (err) => {
  if (err) {
    console.error('SQLite database connection error:', err);
  } else {
    console.log('Connected to SQLite database');
  }
});

module.exports = pool;
