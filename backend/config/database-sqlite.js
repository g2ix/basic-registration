const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create SQLite database connection
const dbPath = path.join(__dirname, '..', 'cooperative_gathering.db');
const db = new sqlite3.Database(dbPath);

// Enable foreign keys
db.run('PRAGMA foreign_keys = ON');

// Test database connection
db.get('SELECT 1', (err) => {
  if (err) {
    console.error('SQLite database connection error:', err);
  } else {
    console.log('Connected to SQLite database');
  }
});

module.exports = db;
