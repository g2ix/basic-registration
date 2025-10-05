const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Set timezone to Philippine Standard Time (UTC+8)
process.env.TZ = 'Asia/Manila';

// Database path
const dbPath = path.join(__dirname, 'cooperative_gathering.db');

async function setupSimplifiedSchema() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);
    
    // Enable foreign keys
    db.run('PRAGMA foreign_keys = ON');
    
    // Set timezone for SQLite
    db.run("PRAGMA timezone = '+08:00'");
    
    console.log('🔄 Setting up simplified schema for SQLite...');
    
    // Read the simplified schema
    const schemaPath = path.join(__dirname, 'database', 'simplified_schema_sqlite.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute the schema
    db.exec(schema, (err) => {
      if (err) {
        console.error('❌ Error creating schema:', err);
        reject(err);
      } else {
        console.log('✅ Simplified schema created successfully');
        
        // Test the schema by checking if the table exists
        db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='member_journey'", (err, row) => {
          if (err) {
            console.error('❌ Error checking table:', err);
            reject(err);
          } else if (row) {
            console.log('✅ member_journey table created successfully');
            resolve();
          } else {
            console.error('❌ member_journey table not found');
            reject(new Error('Table not created'));
          }
        });
      }
    });
    
    db.close();
  });
}

// Run setup if called directly
if (require.main === module) {
  setupSimplifiedSchema()
    .then(() => {
      console.log('✅ Setup completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Setup failed:', error);
      process.exit(1);
    });
}

module.exports = { setupSimplifiedSchema };
