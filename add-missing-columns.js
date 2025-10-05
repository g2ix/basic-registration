const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'cooperative_gathering.db');
console.log('Database path:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    return;
  }
  console.log('Connected to SQLite database');
});

// Add missing columns if they don't exist
const addColumn = (columnName, columnType) => {
  return new Promise((resolve, reject) => {
    const sql = `ALTER TABLE member_journey ADD COLUMN ${columnName} ${columnType}`;
    console.log(`Adding column: ${sql}`);
    
    db.run(sql, (err) => {
      if (err) {
        if (err.message.includes('duplicate column name')) {
          console.log(`✅ Column ${columnName} already exists`);
          resolve();
        } else {
          console.error(`❌ Error adding column ${columnName}:`, err.message);
          reject(err);
        }
      } else {
        console.log(`✅ Successfully added column: ${columnName}`);
        resolve();
      }
    });
  });
};

// Add the missing columns
async function migrateDatabase() {
  try {
    console.log('🔄 Starting database migration...');
    
    await addColumn('different_stub_number', 'INTEGER DEFAULT 0');
    await addColumn('different_stub_value', 'TEXT');
    
    console.log('✅ Database migration completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  } finally {
    db.close();
  }
}

migrateDatabase();
