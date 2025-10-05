const { Pool } = require('pg');
const path = require('path');

// Database configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://username:password@localhost:5432/cooperative_gathering'
});

async function migrateToSimplified() {
  try {
    console.log('🔄 Starting migration to simplified schema...');
    
    // Step 1: Create the new table
    console.log('📋 Creating member_journey table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS member_journey (
        journey_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        member_id UUID REFERENCES members(member_id) ON DELETE CASCADE,
        control_number VARCHAR(50) UNIQUE NOT NULL,
        
        -- Check-in details
        check_in_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        check_in_terminal VARCHAR(100) NOT NULL,
        
        -- Stub issuance
        meal_stub_issued BOOLEAN DEFAULT false,
        transportation_stub_issued BOOLEAN DEFAULT false,
        
        -- Check-out details
        check_out_time TIMESTAMP,
        check_out_terminal VARCHAR(100),
        
        -- Claim details
        claimed BOOLEAN DEFAULT false,
        lost_stub BOOLEAN DEFAULT false,
        incorrect_stub BOOLEAN DEFAULT false,
        manual_form_signed BOOLEAN DEFAULT false,
        override_reason TEXT,
        staff_id UUID REFERENCES staff(staff_id),
        
        -- Status tracking
        status VARCHAR(20) DEFAULT 'checked_in' CHECK (status IN ('checked_in', 'complete')),
        
        -- Timestamps
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Step 2: Migrate existing data
    console.log('📊 Migrating existing attendance and claims data...');
    
    // Get all attendance records
    const attendanceResult = await pool.query(`
      SELECT a.*, m.first_name, m.middle_initial, m.last_name, m.member_type, m.cooperative_id
      FROM attendance a
      JOIN members m ON a.member_id = m.member_id
    `);
    
    console.log(`📋 Found ${attendanceResult.rows.length} attendance records`);
    
    for (const attendance of attendanceResult.rows) {
      // Check if there's a corresponding claim
      const claimResult = await pool.query(
        'SELECT * FROM claims WHERE control_number = ?',
        [attendance.control_number]
      );
      
      const claim = claimResult.rows[0];
      
      // Determine status
      const status = claim ? 'complete' : 'checked_in';
      
      // Insert into member_journey
      await pool.query(`
        INSERT INTO member_journey (
          member_id, control_number, check_in_time, check_in_terminal,
          meal_stub_issued, transportation_stub_issued,
          check_out_time, check_out_terminal,
          claimed, lost_stub, incorrect_stub, manual_form_signed, override_reason, staff_id,
          status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        attendance.member_id,
        attendance.control_number,
        attendance.check_in_time,
        attendance.check_in_terminal,
        attendance.meal_stub_issued,
        attendance.transportation_stub_issued,
        claim?.check_out_time || null,
        claim?.check_out_terminal || null,
        claim?.claimed || false,
        claim?.lost_stub || false,
        claim?.incorrect_stub || false,
        claim?.manual_form_signed || false,
        claim?.override_reason || null,
        claim?.staff_id || null,
        status,
        attendance.created_at
      ]);
      
      console.log(`✅ Migrated ${attendance.control_number} - Status: ${status}`);
    }
    
    console.log('🎉 Migration completed successfully!');
    console.log('📊 Summary:');
    console.log(`   - Migrated ${attendanceResult.rows.length} records`);
    console.log(`   - Checked in: ${attendanceResult.rows.filter(a => !a.claim).length}`);
    console.log(`   - Complete: ${attendanceResult.rows.filter(a => a.claim).length}`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateToSimplified()
    .then(() => {
      console.log('✅ Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateToSimplified };
