const express = require('express');
const { v4: uuidv4 } = require('uuid');
const pool = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { getCurrentDate, getCurrentDateTime } = require('../utils/timezone');

const router = express.Router();

// Generate unique control number
const generateControlNumber = () => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  return `CN-${timestamp}-${random}`.toUpperCase();
};

// Check-in member
router.post('/checkin', authenticateToken, requireRole(['Admin', 'Staff']), async (req, res) => {
  try {
    const { member_id, control_number, mealStub, transportationStub } = req.body;

    if (!member_id) {
      return res.status(400).json({ error: 'Member ID is required' });
    }

    if (!control_number) {
      return res.status(400).json({ error: 'Control number is required' });
    }

    // Verify member exists and check eligibility
    const memberResult = await pool.query('SELECT * FROM members WHERE member_id = ?', [member_id]);
    if (memberResult.rows.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }

    const member = memberResult.rows[0];
    if (member.eligibility !== 'eligible') {
      return res.status(400).json({ 
        error: 'Member is not eligible for check-in',
        code: 'NOT_ELIGIBLE',
        member: {
          name: `${member.first_name} ${member.middle_initial ? member.middle_initial + '. ' : ''}${member.last_name}`,
          eligibility: member.eligibility
        }
      });
    }

    // Check if member is already checked in (Philippine time)
    const today = getCurrentDate();
    const existingCheckin = await pool.query(
      'SELECT * FROM attendance WHERE member_id = ? AND DATE(check_in_time) = ?',
      [member_id, today]
    );

    if (existingCheckin.rows.length > 0) {
      return res.status(400).json({ 
        error: 'Member already checked in today',
        code: 'ALREADY_CHECKED_IN',
        existingRecord: existingCheckin.rows[0]
      });
    }

    // Check if control number already exists
    const existingControlNumber = await pool.query(
      'SELECT * FROM attendance WHERE control_number = ?',
      [control_number]
    );

    console.log(`🔍 Checking control number: ${control_number}`);
    console.log(`📊 Found ${existingControlNumber.rows.length} existing records`);

    if (existingControlNumber.rows.length > 0) {
      console.log('❌ Control number already exists:', existingControlNumber.rows[0]);
      return res.status(400).json({ 
        error: 'Control number already exists',
        code: 'CONTROL_NUMBER_EXISTS',
        existingRecord: existingControlNumber.rows[0]
      });
    }

    const terminalId = req.user.terminal_id || 'UNKNOWN';

    const result = await pool.query(
      `INSERT INTO attendance (member_id, control_number, check_in_terminal, meal_stub_issued, transportation_stub_issued) 
       VALUES (?, ?, ?, ?, ?)`,
      [member_id, control_number, terminalId, mealStub || false, transportationStub || false]
    );

    // Log the action
    await pool.query(
      'INSERT INTO audit_logs (action, table_name, record_id, new_values, staff_id, terminal_id) VALUES (?, ?, ?, ?, ?, ?)',
      ['CHECKIN', 'attendance', result.lastID, JSON.stringify({ control_number: control_number, member_id: member_id }), req.user.staff_id, terminalId]
    );

    res.status(201).json({
      control_number: control_number,
      member_id: member_id,
      check_in_terminal: terminalId,
      meal_stub_issued: mealStub || false,
      transportation_stub_issued: transportationStub || false,
      member: memberResult.rows[0]
    });
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get attendance records
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { 
      date, 
      memberType, 
      terminal, 
      search, 
      status, 
      page = 1, 
      limit = 10 
    } = req.query;
    
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    let baseQuery = `
      SELECT a.*, m.first_name, m.middle_initial, m.last_name, m.member_type, m.cooperative_id,
             CASE WHEN c.claimed = 1 THEN 1 ELSE 0 END as claimed,
             c.check_out_time,
             c.check_out_terminal
      FROM attendance a 
      JOIN members m ON a.member_id = m.member_id 
      LEFT JOIN claims c ON a.control_number = c.control_number
      WHERE 1=1
    `;
    
    let countQuery = `
      SELECT COUNT(*) as total
      FROM attendance a 
      JOIN members m ON a.member_id = m.member_id 
      LEFT JOIN claims c ON a.control_number = c.control_number
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 0;

    if (date) {
      paramCount++;
      baseQuery += ` AND DATE(a.check_in_time) = ?`;
      countQuery += ` AND DATE(a.check_in_time) = ?`;
      params.push(date);
    } else {
      // Default to today
      baseQuery += ` AND DATE(a.check_in_time) = CURRENT_DATE`;
      countQuery += ` AND DATE(a.check_in_time) = CURRENT_DATE`;
    }

    if (memberType) {
      paramCount++;
      baseQuery += ` AND m.member_type = ?`;
      countQuery += ` AND m.member_type = ?`;
      params.push(memberType);
    }

    if (terminal) {
      paramCount++;
      baseQuery += ` AND a.check_in_terminal = ?`;
      countQuery += ` AND a.check_in_terminal = ?`;
      params.push(terminal);
    }

    if (search) {
      paramCount++;
      baseQuery += ` AND (
        m.first_name LIKE ? OR 
        m.last_name LIKE ? OR 
        m.cooperative_id LIKE ? OR 
        a.control_number LIKE ?
      )`;
      countQuery += ` AND (
        m.first_name LIKE ? OR 
        m.last_name LIKE ? OR 
        m.cooperative_id LIKE ? OR 
        a.control_number LIKE ?
      )`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (status === 'checked-in') {
      baseQuery += ` AND c.claimed IS NULL OR c.claimed = 0`;
      countQuery += ` AND c.claimed IS NULL OR c.claimed = 0`;
    } else if (status === 'checked-out') {
      baseQuery += ` AND c.claimed = 1`;
      countQuery += ` AND c.claimed = 1`;
    }

    // Get total count
    const countResult = await pool.query(countQuery, params);
    const total = countResult.rows[0].total;

    // Add pagination and ordering
    baseQuery += ` ORDER BY a.check_in_time DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);

    const result = await pool.query(baseQuery, params);
    
    const totalPages = Math.ceil(total / parseInt(limit));
    
    res.json({
      records: result.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalRecords: total,
        recordsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get attendance by control number
router.get('/control/:controlNumber', authenticateToken, async (req, res) => {
  try {
    const { controlNumber } = req.params;

    const result = await pool.query(
      `SELECT a.*, m.first_name, m.middle_initial, m.last_name, m.member_type, m.cooperative_id 
       FROM attendance a 
       JOIN members m ON a.member_id = m.member_id 
       WHERE a.control_number = ?`,
      [controlNumber]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Attendance record not found',
        code: 'CONTROL_NOT_FOUND'
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get attendance by control number error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get attendance by member ID
router.get('/member/:memberId', authenticateToken, async (req, res) => {
  try {
    const { memberId } = req.params;

    console.log(`🔍 Looking for attendance for member ID: ${memberId}`);

    // First check if member exists
    const memberCheck = await pool.query('SELECT * FROM members WHERE member_id = ?', [memberId]);
    console.log(`👤 Member exists: ${memberCheck.rows.length > 0}`);

    const result = await pool.query(
      `SELECT a.*, m.first_name, m.middle_initial, m.last_name, m.member_type, m.cooperative_id 
       FROM attendance a 
       JOIN members m ON a.member_id = m.member_id 
       WHERE a.member_id = ? AND DATE(a.check_in_time) = CURRENT_DATE`,
      [memberId]
    );

    console.log(`📊 Found ${result.rows.length} attendance records for today`);

    if (result.rows.length === 0) {
      console.log('❌ No attendance record found for this member today');
      return res.status(404).json({ 
        error: 'No attendance record found for this member today',
        code: 'MEMBER_NOT_FOUND'
      });
    }

    const attendance = result.rows[0];

    // Check if already checked out
    const claimResult = await pool.query(
      'SELECT * FROM claims WHERE control_number = ?',
      [attendance.control_number]
    );

    if (claimResult.rows.length > 0) {
      return res.status(400).json({
        error: 'Member has completed the full cycle',
        code: 'COMPLETE',
        attendance: attendance,
        claim: claimResult.rows[0]
      });
    }

    res.json(attendance);
  } catch (error) {
    console.error('Get attendance by member ID error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get today's attendance summary
router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    const summaryResult = await pool.query(`
      SELECT 
        COUNT(*) as total_checked_in,
        COUNT(CASE WHEN m.member_type = 'Regular' THEN 1 END) as regular_members,
        COUNT(CASE WHEN m.member_type = 'Associate' THEN 1 END) as associate_members,
        COUNT(CASE WHEN a.meal_stub_issued = 1 THEN 1 END) as meal_stubs_issued,
        COUNT(CASE WHEN a.transportation_stub_issued = 1 THEN 1 END) as transportation_stubs_issued
      FROM attendance a
      JOIN members m ON a.member_id = m.member_id
      WHERE DATE(a.check_in_time) = ?
    `, [targetDate]);

    const terminalSummary = await pool.query(`
      SELECT 
        check_in_terminal,
        COUNT(*) as count
      FROM attendance
      WHERE DATE(check_in_time) = ?
      GROUP BY check_in_terminal
      ORDER BY count DESC
    `, [targetDate]);

    res.json({
      date: targetDate,
      summary: summaryResult.rows[0],
      terminalBreakdown: terminalSummary.rows
    });
  } catch (error) {
    console.error('Get attendance summary error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Override check-in (Admin only)
router.post('/override-checkin/:memberId', authenticateToken, requireRole(['Admin']), async (req, res) => {
  try {
    const { memberId } = req.params;
    const today = getCurrentDate(); // Philippine time

    // Remove today's check-in record
    await pool.query(`
      DELETE FROM attendance 
      WHERE member_id = ? AND DATE(check_in_time) = ?
    `, [memberId, today]);

    res.json({ message: 'Check-in overridden successfully' });
  } catch (error) {
    console.error('Override check-in error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove check-in record (Admin only)
router.delete('/remove-checkin/:memberId', authenticateToken, requireRole(['Admin']), async (req, res) => {
  try {
    const { memberId } = req.params;

    // Remove all check-in records for this member
    await pool.query(`
      DELETE FROM attendance 
      WHERE member_id = ?
    `, [memberId]);

    res.json({ message: 'Check-in record removed successfully' });
  } catch (error) {
    console.error('Remove check-in error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Export attendance data (Admin only)
router.get('/export', authenticateToken, requireRole(['Admin']), async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    const result = await pool.query(`
      SELECT 
        a.control_number,
        TRIM(m.first_name || ' ' || COALESCE(m.middle_initial || '. ', '') || m.last_name) as name,
        m.member_type,
        m.cooperative_id,
        a.check_in_time,
        a.check_in_terminal,
        a.meal_stub_issued,
        a.transportation_stub_issued,
        CASE WHEN c.claimed = 1 THEN 'Yes' ELSE 'No' END as checked_out,
        c.check_out_time,
        c.check_out_terminal
      FROM attendance a
      JOIN members m ON a.member_id = m.member_id
      LEFT JOIN claims c ON a.control_number = c.control_number
      WHERE DATE(a.check_in_time) = ?
      ORDER BY a.check_in_time
    `, [targetDate]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No data found for the specified date' });
    }

    // Convert to CSV format
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
    res.setHeader('Content-Disposition', `attachment; filename="attendance_${targetDate}.csv"`);
    res.send(csvContent);
  } catch (error) {
    console.error('Export attendance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
