const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'backend', 'cooperative_gathering.db');
console.log('Database path:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    return;
  }
  console.log('Connected to SQLite database');
});

// Check if the new columns exist
db.all("PRAGMA table_info(member_journey)", (err, rows) => {
  if (err) {
    console.error('Error checking table schema:', err.message);
    return;
  }
  
  const existingColumns = rows.map(row => row.name);
  const newColumns = [
    { name: 'different_stub_number', type: 'INTEGER DEFAULT 0' },
    { name: 'different_stub_value', type: 'TEXT' }
  ];
  
  console.log('Existing columns:', existingColumns);
  
  let needsMigration = false;
  newColumns.forEach(col => {
    if (!existingColumns.includes(col.name)) {
      console.log(`❌ Missing column: ${col.name}`);
      needsMigration = true;
    } else {
      console.log(`✅ Column exists: ${col.name}`);
    }
  });
  
  if (needsMigration) {
    console.log('\n🔄 Adding missing columns...');
    
    // Add missing columns one by one
    newColumns.forEach((col, index) => {
      if (!existingColumns.includes(col.name)) {
        const addColumnSQL = `ALTER TABLE member_journey ADD COLUMN ${col.name} ${col.type}`;
        console.log(`Adding: ${addColumnSQL}`);
        
        db.run(addColumnSQL, (err) => {
          if (err) {
            console.error(`Error adding column ${col.name}:`, err.message);
          } else {
            console.log(`✅ Successfully added column: ${col.name}`);
          }
          
          // Check if this is the last column
          if (index === newColumns.length - 1) {
            console.log('\n✅ Migration completed');
            db.close();
          }
        });
      } else {
        console.log(`⏭️  Column ${col.name} already exists, skipping`);
        
        // Check if this is the last column
        if (index === newColumns.length - 1) {
          console.log('\n✅ All columns already exist');
          db.close();
        }
      }
    });
  } else {
    console.log('\n✅ All required columns already exist');
    db.close();
  }
});
