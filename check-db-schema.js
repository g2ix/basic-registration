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

// Check the schema of member_journey table
db.all("PRAGMA table_info(member_journey)", (err, rows) => {
  if (err) {
    console.error('Error checking table schema:', err.message);
    return;
  }
  
  console.log('\nMember Journey Table Schema:');
  console.log('Column Name | Type | Not Null | Default Value');
  console.log('--------------------------------------------');
  rows.forEach(row => {
    console.log(`${row.name.padEnd(20)} | ${row.type.padEnd(10)} | ${row.notnull ? 'YES' : 'NO'.padEnd(6)} | ${row.dflt_value || 'NULL'}`);
  });
  
  // Check if the new columns exist
  const newColumns = ['different_stub_number', 'different_stub_value'];
  const existingColumns = rows.map(row => row.name);
  
  console.log('\nChecking for new columns:');
  newColumns.forEach(col => {
    if (existingColumns.includes(col)) {
      console.log(`✅ ${col} exists`);
    } else {
      console.log(`❌ ${col} missing`);
    }
  });
  
  db.close();
});
