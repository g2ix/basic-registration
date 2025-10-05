const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// Create SQLite database
const dbPath = path.join(__dirname, 'cooperative_gathering.db');
const db = new sqlite3.Database(dbPath);

async function setupDatabase() {
    try {
        console.log('Setting up SQLite database...');
        
        // Enable foreign keys
        db.run('PRAGMA foreign_keys = ON');
        
        // Create tables
        const schema = `
        -- Members table
        CREATE TABLE IF NOT EXISTS members (
            member_id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            member_type TEXT NOT NULL CHECK (member_type IN ('Regular', 'Associate')),
            registered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- Staff table
        CREATE TABLE IF NOT EXISTS staff (
            staff_id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL CHECK (role IN ('Admin', 'Staff')),
            terminal_id TEXT,
            is_active BOOLEAN DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- Attendance table
        CREATE TABLE IF NOT EXISTS attendance (
            attendance_id TEXT PRIMARY KEY,
            member_id TEXT REFERENCES members(member_id) ON DELETE CASCADE,
            control_number TEXT UNIQUE NOT NULL,
            check_in_time DATETIME DEFAULT CURRENT_TIMESTAMP,
            check_in_terminal TEXT NOT NULL,
            meal_stub_issued BOOLEAN DEFAULT 0,
            transportation_stub_issued BOOLEAN DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- Claims table
        CREATE TABLE IF NOT EXISTS claims (
            claim_id TEXT PRIMARY KEY,
            control_number TEXT NOT NULL,
            check_out_time DATETIME DEFAULT CURRENT_TIMESTAMP,
            check_out_terminal TEXT NOT NULL,
            claimed BOOLEAN DEFAULT 0,
            lost_stub BOOLEAN DEFAULT 0,
            incorrect_stub BOOLEAN DEFAULT 0,
            manual_form_signed BOOLEAN DEFAULT 0,
            override_reason TEXT,
            staff_id TEXT REFERENCES staff(staff_id),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- Audit logs table
        CREATE TABLE IF NOT EXISTS audit_logs (
            log_id TEXT PRIMARY KEY,
            action TEXT NOT NULL,
            table_name TEXT NOT NULL,
            record_id TEXT,
            old_values TEXT,
            new_values TEXT,
            staff_id TEXT REFERENCES staff(staff_id),
            terminal_id TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        `;

        // Execute schema
        db.exec(schema, (err) => {
            if (err) {
                console.error('Error creating tables:', err);
                return;
            }
            
            console.log('Tables created successfully!');
            
            // Insert default users
            const bcrypt = require('bcryptjs');
            const adminPassword = bcrypt.hashSync('admin123', 10);
            const staffPassword = bcrypt.hashSync('staff123', 10);
            
            const insertUsers = `
                INSERT OR IGNORE INTO staff (staff_id, username, password_hash, role, terminal_id) 
                VALUES 
                ('admin-uuid', 'admin', '${adminPassword}', 'Admin', 'ADMIN-TERMINAL'),
                ('staff-uuid', 'staff', '${staffPassword}', 'Staff', 'STAFF-TERMINAL-001');
            `;
            
            db.exec(insertUsers, (err) => {
                if (err) {
                    console.error('Error inserting users:', err);
                    return;
                }
                
                console.log('✅ Database setup completed!');
                console.log('Default credentials:');
                console.log('  Admin: admin / admin123');
                console.log('  Staff: staff / staff123');
                console.log(`Database file: ${dbPath}`);
                
                db.close();
            });
        });
        
    } catch (error) {
        console.error('❌ Database setup failed:', error.message);
    }
}

setupDatabase();
