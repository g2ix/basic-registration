const express = require('express');
const pool = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Check in member
router.post('/checkin', authenticateToken, requireRole(['Admin', 'Staff']), async (req, res) => {
  try {
    const { member_id, control_number, mealStub, transportationStub } = req.body;
    const terminalId = req.user.terminal_id || 'UNKNOWN';

    // Check if member exists and is eligible
    const memberResult = await pool.query('SELECT * FROM members WHERE member_id = ?', [member_id]);
    if (memberResult.rows.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }

    if (memberResult.rows[0].eligibility !== 'eligible') {
      return res.status(400).json({ error: 'Member is not eligible for check-in' });
    }

    // Check if member already has a journey today
    const existingJourney = await pool.query(`
      SELECT * FROM member_journey 
      WHERE member_id = ? AND date(check_in_time) = date('now', '+08:00')
    `, [member_id]);

    if (existingJourney.rows.length > 0) {
      const journey = existingJourney.rows[0];
      if (journey.status === 'complete') {
        return res.status(400).json({
          error: 'Member has completed the full cycle',
          code: 'COMPLETE',
          journey: journey
        });
      } else {
        return res.status(400).json({
          error: 'Member is already checked in',
          code: 'ALREADY_CHECKED_IN',
          journey: journey
        });
      }
    }

    // Check if control number already exists
    const existingControlNumber = await pool.query(
      'SELECT * FROM member_journey WHERE control_number = ?',
      [control_number]
    );
    if (existingControlNumber.rows.length > 0) {
      return res.status(400).json({ 
        error: 'Control number already exists',
        code: 'CONTROL_NUMBER_EXISTS'
      });
    }

    // Create new journey
    const result = await pool.query(`
      INSERT INTO member_journey (
        member_id, control_number, check_in_terminal, 
        meal_stub_issued, transportation_stub_issued, status
      ) VALUES (?, ?, ?, ?, ?, 'checked_in')
    `, [member_id, control_number, terminalId, mealStub ? 1 : 0, transportationStub ? 1 : 0]);

    // Log the action
    await pool.query(
      'INSERT INTO audit_logs (action, table_name, record_id, new_values, staff_id, terminal_id) VALUES (?, ?, ?, ?, ?, ?)',
      ['CHECKIN', 'member_journey', result.lastID, JSON.stringify({ control_number, member_id }), req.user.staff_id, terminalId]
    );

    res.status(201).json({
      journey_id: result.lastID,
      control_number: control_number,
      member_id: member_id,
      status: 'checked_in',
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

// Check out member
router.post('/checkout', authenticateToken, requireRole(['Admin', 'Staff']), async (req, res) => {
  try {
    // Check if checkout is enabled
    const settingsResult = await pool.query('SELECT setting_value FROM settings WHERE setting_key = ?', ['checkout_enabled']);
    const checkoutEnabled = settingsResult.rows ? 
      (settingsResult.rows[0]?.setting_value === 'true') : 
      (settingsResult[0]?.setting_value === 'true');
    
    if (!checkoutEnabled) {
      return res.status(403).json({ 
        error: 'Checkout is currently disabled by system settings',
        checkout_disabled: true 
      });
    }

    const { control_number, claimed, lost_stub, incorrect_stub, different_stub_number, different_stub_value, manual_form_signed, override_reason } = req.body;
    const terminalId = req.user.terminal_id || 'UNKNOWN';

    // Find the journey
    const journeyResult = await pool.query(
      'SELECT * FROM member_journey WHERE control_number = ?',
      [control_number]
    );

    if (journeyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Journey not found' });
    }

    const journey = journeyResult.rows[0];

    if (journey.status === 'complete') {
      return res.status(400).json({
        error: 'Member has already completed the full cycle',
        code: 'ALREADY_COMPLETE'
      });
    }

    // Update journey with checkout details
    await pool.query(`
      UPDATE member_journey SET 
        check_out_time = datetime('now', '+08:00'),
        check_out_terminal = ?,
        claimed = ?,
        lost_stub = ?,
        incorrect_stub = ?,
        different_stub_number = ?,
        different_stub_value = ?,
        manual_form_signed = ?,
        override_reason = ?,
        staff_id = ?,
        status = 'complete'
      WHERE control_number = ?
    `, [
      terminalId, claimed ? 1 : 0, lost_stub ? 1 : 0, incorrect_stub ? 1 : 0,
      different_stub_number ? 1 : 0, different_stub_value || null,
      manual_form_signed ? 1 : 0, override_reason || null, req.user.staff_id, control_number
    ]);

    // Log the action
    await pool.query(
      'INSERT INTO audit_logs (action, table_name, record_id, new_values, staff_id, terminal_id) VALUES (?, ?, ?, ?, ?, ?)',
      ['CHECKOUT', 'member_journey', journey.journey_id, JSON.stringify({ control_number, claimed }), req.user.staff_id, terminalId]
    );

    res.json({
      message: 'Check-out successful',
      control_number: control_number,
      status: 'complete',
      check_out_time: new Date().toISOString()
    });
  } catch (error) {
    console.error('Check-out error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get member journey by member ID
router.get('/member/:memberId', authenticateToken, async (req, res) => {
  try {
    const { memberId } = req.params;

    const result = await pool.query(`
      SELECT mj.*, m.first_name, m.middle_initial, m.last_name, m.member_type, m.cooperative_id 
      FROM member_journey mj 
      JOIN members m ON mj.member_id = m.member_id 
      WHERE mj.member_id = ? AND date(mj.check_in_time) = date('now', '+08:00')
    `, [memberId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'No journey found for this member today',
        code: 'MEMBER_NOT_FOUND'
      });
    }

    const journey = result.rows[0];

    if (journey.status === 'complete') {
      return res.status(400).json({
        error: 'Member has completed the full cycle',
        code: 'COMPLETE',
        journey: journey
      });
    }

    res.json(journey);
  } catch (error) {
    console.error('Get journey by member ID error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all journeys
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, date, limit = 50, offset = 0 } = req.query;
    
    let query = `
      SELECT mj.*, m.first_name, m.middle_initial, m.last_name, m.member_type, m.cooperative_id
      FROM member_journey mj
      JOIN members m ON mj.member_id = m.member_id
    `;
    
    const conditions = [];
    const params = [];
    
    if (status) {
      conditions.push('mj.status = ?');
      params.push(status);
    }
    
    if (date) {
      conditions.push('date(mj.check_in_time) = ?');
      params.push(date);
    } else {
      conditions.push('date(mj.check_in_time) = date(\'now\', \'+08:00\')');
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY mj.check_in_time DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get journeys error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get journey statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const { date } = req.query;
    const dateFilter = date ? `date(check_in_time) = '${date}'` : 'date(check_in_time) = date(\'now\', \'+08:00\')';
    
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_journeys,
        COUNT(CASE WHEN status = 'checked_in' THEN 1 END) as checked_in,
        COUNT(CASE WHEN status = 'complete' THEN 1 END) as complete,
        COUNT(CASE WHEN meal_stub_issued = 1 THEN 1 END) as meal_stubs_issued,
        COUNT(CASE WHEN transportation_stub_issued = 1 THEN 1 END) as transportation_stubs_issued,
        COUNT(CASE WHEN claimed = 1 THEN 1 END) as claimed
      FROM member_journey 
      WHERE ${dateFilter}
    `);
    
    res.json(stats.rows[0]);
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
