const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create SQLite database connection
const dbPath = path.join(__dirname, 'cooperative_gathering.db');
const db = new sqlite3.Database(dbPath);

async function updateMembersSchema() {
    try {
        console.log('Updating members table schema...');
        
        // Create new members table with updated schema
        const newSchema = `
        CREATE TABLE IF NOT EXISTS members_new (
            member_id TEXT PRIMARY KEY,
            cooperative_id TEXT UNIQUE NOT NULL,
            first_name TEXT NOT NULL,
            middle_initial TEXT,
            last_name TEXT NOT NULL,
            work_email TEXT,
            personal_email TEXT,
            status TEXT NOT NULL CHECK (status IN ('active', 'dormant')),
            eligibility TEXT NOT NULL CHECK (eligibility IN ('eligible', 'not_eligible')),
            member_type TEXT NOT NULL CHECK (member_type IN ('Regular', 'Associate')),
            registered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        `;
        
        // Execute new schema
        db.exec(newSchema, (err) => {
            if (err) {
                console.error('Error creating new table:', err);
                return;
            }
            
            console.log('New members table created successfully!');
            
            // Migrate existing data if any
            const migrateData = `
                INSERT INTO members_new (
                    member_id, cooperative_id, first_name, last_name, 
                    member_type, registered_at, created_at, updated_at
                )
                SELECT 
                    member_id,
                    'COOP-' || substr(member_id, 1, 8) as cooperative_id,
                    substr(name, 1, instr(name || ' ', ' ') - 1) as first_name,
                    substr(name, instr(name, ' ') + 1) as last_name,
                    member_type,
                    registered_at,
                    created_at,
                    updated_at
                FROM members;
            `;
            
            db.exec(migrateData, (err) => {
                if (err) {
                    console.log('No existing data to migrate or migration completed');
                } else {
                    console.log('Existing data migrated successfully!');
                }
                
                // Drop old table and rename new one
                const finalizeMigration = `
                    DROP TABLE IF EXISTS members;
                    ALTER TABLE members_new RENAME TO members;
                `;
                
                db.exec(finalizeMigration, (err) => {
                    if (err) {
                        console.error('Error finalizing migration:', err);
                        return;
                    }
                    
                    console.log('✅ Members table schema updated successfully!');
                    console.log('New fields added:');
                    console.log('- cooperative_id (unique)');
                    console.log('- first_name, middle_initial, last_name');
                    console.log('- work_email, personal_email');
                    console.log('- status (active/dormant)');
                    console.log('- eligibility (eligible/not_eligible)');
                    
                    db.close();
                });
            });
        });
        
    } catch (error) {
        console.error('❌ Schema update failed:', error.message);
    }
}

updateMembersSchema();
