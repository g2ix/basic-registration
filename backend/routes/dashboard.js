const express = require('express');
const pool = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { getCurrentDate } = require('../utils/timezone');

const router = express.Router();

// Get dashboard statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || getCurrentDate(); // Philippine time

    // Get overall statistics
    const overallStats = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM members) as total_members,
        (SELECT COUNT(*) FROM members WHERE member_type = 'Regular') as regular_members,
        (SELECT COUNT(*) FROM members WHERE member_type = 'Associate') as associate_members,
        (SELECT COUNT(*) FROM attendance WHERE DATE(check_in_time) = ?) as checked_in_today,
        (SELECT COUNT(*) FROM claims WHERE DATE(check_out_time) = ?) as claimed_today
    `, [targetDate, targetDate]);

    // Get attendance breakdown
    const attendanceBreakdown = await pool.query(`
      SELECT 
        m.member_type,
        COUNT(*) as count
      FROM attendance a
      JOIN members m ON a.member_id = m.member_id
      WHERE DATE(a.check_in_time) = ?
      GROUP BY m.member_type
    `, [targetDate]);

    // Get claims breakdown
    const claimsBreakdown = await pool.query(`
      SELECT 
        CASE 
          WHEN lost_stub = 1 THEN 'Lost Stub'
          WHEN incorrect_stub = 1 THEN 'Incorrect Stub'
          ELSE 'Normal'
        END as claim_type,
        COUNT(*) as count
      FROM claims
      WHERE DATE(check_out_time) = ?
      GROUP BY 
        CASE 
          WHEN lost_stub = 1 THEN 'Lost Stub'
          WHEN incorrect_stub = 1 THEN 'Incorrect Stub'
          ELSE 'Normal'
        END
    `, [targetDate]);

    // Get terminal activity
    const terminalActivity = await pool.query(`
      SELECT 
        'Check-in' as activity_type,
        check_in_terminal as terminal,
        COUNT(*) as count
      FROM attendance
      WHERE DATE(check_in_time) = ?
      GROUP BY check_in_terminal
      
      UNION ALL
      
      SELECT 
        'Check-out' as activity_type,
        check_out_terminal as terminal,
        COUNT(*) as count
      FROM claims
      WHERE DATE(check_out_time) = ?
      GROUP BY check_out_terminal
      
      ORDER BY activity_type, count DESC
    `, [targetDate, targetDate]);

    // Get recent activity
    const recentActivity = await pool.query(`
      SELECT 
        'Check-in' as activity,
        a.control_number,
        TRIM(m.first_name || ' ' || COALESCE(m.middle_initial || '. ', '') || m.last_name) as name,
        m.member_type,
        a.check_in_time as timestamp,
        a.check_in_terminal as terminal
      FROM attendance a
      JOIN members m ON a.member_id = m.member_id
      WHERE DATE(a.check_in_time) = ?
      
      UNION ALL
      
      SELECT 
        'Check-out' as activity,
        c.control_number,
        TRIM(m.first_name || ' ' || COALESCE(m.middle_initial || '. ', '') || m.last_name) as name,
        m.member_type,
        c.check_out_time as timestamp,
        c.check_out_terminal as terminal
      FROM claims c
      JOIN attendance a ON c.control_number = a.control_number
      JOIN members m ON a.member_id = m.member_id
      WHERE DATE(c.check_out_time) = ?
      
      ORDER BY timestamp DESC
      LIMIT 20
    `, [targetDate, targetDate]);

    res.json({
      date: targetDate,
      overall: overallStats.rows[0],
      attendanceBreakdown: attendanceBreakdown.rows,
      claimsBreakdown: claimsBreakdown.rows,
      terminalActivity: terminalActivity.rows,
      recentActivity: recentActivity.rows
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get audit logs (Admin only)
router.get('/audit-logs', authenticateToken, requireRole(['Admin']), async (req, res) => {
  try {
    const { date, action, staffId, limit = 100 } = req.query;
    
    let query = `
      SELECT al.*, s.username as staff_username
      FROM audit_logs al
      LEFT JOIN staff s ON al.staff_id = s.staff_id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (date) {
      paramCount++;
      query += ` AND DATE(al.created_at) = ?`;
      params.push(date);
    }

    if (action) {
      paramCount++;
      query += ` AND al.action = ?`;
      params.push(action);
    }

    if (staffId) {
      paramCount++;
      query += ` AND al.staff_id = ?`;
      params.push(staffId);
    }

    query += ` ORDER BY al.created_at DESC LIMIT ?`;
    params.push(parseInt(limit));

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Export data (Admin only)
router.get('/export', authenticateToken, requireRole(['Admin']), async (req, res) => {
  try {
    const { type, date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    let query, filename;
    
    switch (type) {
      case 'attendance':
        query = `
          SELECT 
            a.control_number,
            TRIM(m.first_name || ' ' || COALESCE(m.middle_initial || '. ', '') || m.last_name) as name,
            m.member_type,
            a.check_in_time,
            a.check_in_terminal,
            a.meal_stub_issued,
            a.transportation_stub_issued
          FROM attendance a
          JOIN members m ON a.member_id = m.member_id
          WHERE DATE(a.check_in_time) = ?
          ORDER BY a.check_in_time
        `;
        filename = `attendance_${targetDate}.csv`;
        break;
        
      case 'claims':
        query = `
          SELECT 
            c.control_number,
            TRIM(m.first_name || ' ' || COALESCE(m.middle_initial || '. ', '') || m.last_name) as name,
            m.member_type,
            c.check_out_time,
            c.check_out_terminal,
            c.claimed,
            c.lost_stub,
            c.incorrect_stub,
            c.manual_form_signed,
            c.override_reason
          FROM claims c
          JOIN attendance a ON c.control_number = a.control_number
          JOIN members m ON a.member_id = m.member_id
          WHERE DATE(c.check_out_time) = ?
          ORDER BY c.check_out_time
        `;
        filename = `claims_${targetDate}.csv`;
        break;
        
      default:
        return res.status(400).json({ error: 'Invalid export type' });
    }

    const result = await pool.query(query, [targetDate]);
    
    // Convert to CSV format
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No data found for the specified date' });
    }

    const headers = Object.keys(result.rows[0]);
    const csvContent = [
      headers.join(','),
      ...result.rows.map(row => 
        headers.map(header => {
          const value = row[header];
          return typeof value === 'string' && value.includes(',') 
            ? `"${value}"` 
            : value;
        }).join(',')
      )
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);
  } catch (error) {
    console.error('Export data error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reset all data (Admin only) - DANGEROUS OPERATION
router.post('/reset-all-data', authenticateToken, requireRole(['Admin']), async (req, res) => {
  try {
    const { confirmReset } = req.body;
    
    // Require explicit confirmation
    if (confirmReset !== 'RESET_ALL_DATA') {
      return res.status(400).json({ 
        error: 'Reset confirmation required. Send confirmReset: "RESET_ALL_DATA" in request body.' 
      });
    }

    console.log('⚠️  ADMIN RESET: Clearing all attendance, claims, and audit logs...');
    
    // Log the reset action first (before clearing audit_logs)
    await pool.query(
      'INSERT INTO audit_logs (action, table_name, new_values, staff_id, terminal_id) VALUES (?, ?, ?, ?, ?)',
      [
        'SYSTEM_RESET', 
        'all_tables', 
        JSON.stringify({ 
          reset_by: req.user.username,
          reset_at: new Date().toISOString(),
          cleared_tables: ['attendance', 'claims', 'audit_logs']
        }), 
        req.user.staff_id, 
        req.user.terminal_id
      ]
    );
    
    // Clear all tables in order (respecting foreign key constraints)
    const claimsResult = await pool.query('DELETE FROM claims');
    const attendanceResult = await pool.query('DELETE FROM attendance');
    const auditResult = await pool.query('DELETE FROM audit_logs');
    
    console.log('✅ Deleted records:', {
      claims: claimsResult.rowCount,
      attendance: attendanceResult.rowCount,
      audit_logs: auditResult.rowCount
    });
    
    // Reset SQLite auto-increment sequences (if sqlite_sequence table exists)
    try {
      await pool.query('DELETE FROM sqlite_sequence WHERE name IN (?, ?, ?)', ['attendance', 'claims', 'audit_logs']);
      console.log('✅ SQLite sequences reset successfully');
    } catch (seqError) {
      console.log('ℹ️  SQLite sequences table not found or no auto-increment columns - this is normal');
    }
    
    console.log('✅ System reset completed successfully');
    
    res.json({ 
      message: 'All data has been reset successfully. Control numbers can now start from 1.',
      reset_by: req.user.username,
      reset_at: new Date().toISOString(),
      cleared_tables: ['attendance', 'claims', 'audit_logs']
    });
    
  } catch (error) {
    console.error('Reset all data error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Contact administrator'
    });
  }
});

// Get system status (Admin only)
router.get('/system-status', authenticateToken, requireRole(['Admin']), async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM attendance) as total_attendance,
        (SELECT COUNT(*) FROM claims) as total_claims,
        (SELECT COUNT(*) FROM audit_logs) as total_audit_logs,
        (SELECT COUNT(*) FROM members) as total_members,
        (SELECT COUNT(*) FROM staff) as total_staff,
        (SELECT MIN(control_number) FROM attendance) as min_control_number,
        (SELECT MAX(control_number) FROM attendance) as max_control_number
    `);
    
    res.json({
      system_status: 'operational',
      data_counts: stats.rows[0],
      reset_available: true,
      last_checked: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get system status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
