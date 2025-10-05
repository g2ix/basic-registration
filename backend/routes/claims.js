const express = require('express');
const { v4: uuidv4 } = require('uuid');
const pool = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { getCurrentDate, getCurrentDateTime } = require('../utils/timezone');

const router = express.Router();

// Check-out and claim validation
router.post('/checkout', authenticateToken, requireRole(['Admin', 'Staff']), async (req, res) => {
  try {
    const { controlNumber, lostStub, incorrectStub, differentStubNumber, differentStubValue, manualFormSigned, overrideReason } = req.body;

    if (!controlNumber) {
      return res.status(400).json({ error: 'Control number is required' });
    }

    // Find attendance record
    const attendanceResult = await pool.query(
      `SELECT a.*, m.first_name, m.middle_initial, m.last_name, m.member_type, m.cooperative_id 
       FROM attendance a 
       JOIN members m ON a.member_id = m.member_id 
       WHERE a.control_number = ?`,
      [controlNumber]
    );

    if (attendanceResult.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Control number not found',
        code: 'CONTROL_NOT_FOUND'
      });
    }

    const attendance = attendanceResult.rows[0];

    // Check if already claimed
    const existingClaim = await pool.query(
      'SELECT * FROM claims WHERE control_number = ?',
      [controlNumber]
    );

    if (existingClaim.rows.length > 0) {
      return res.status(400).json({ 
        error: 'Transportation allowance already claimed',
        code: 'ALREADY_CLAIMED'
      });
    }

    const terminalId = req.user.terminal_id || 'UNKNOWN';
    let claimData = {
      control_number: controlNumber,
      check_out_terminal: terminalId,
      claimed: true,
      lost_stub: lostStub || false,
      incorrect_stub: incorrectStub || false,
      different_stub_number: differentStubNumber || false,
      different_stub_value: differentStubValue || null,
      manual_form_signed: manualFormSigned || false,
      override_reason: overrideReason || null,
      staff_id: req.user.staff_id
    };

    // Handle different scenarios
    if (lostStub) {
      claimData.manual_form_signed = true;
      claimData.override_reason = 'Lost stub - manual form signed';
    }

    if (incorrectStub) {
      claimData.manual_form_signed = true;
      claimData.override_reason = overrideReason || 'Incorrect stub - manual override';
    }

    if (differentStubNumber) {
      claimData.manual_form_signed = true;
      claimData.override_reason = overrideReason || `Different stub number: ${differentStubValue} - manual form signed`;
    }

    const result = await pool.query(
      `INSERT INTO claims (control_number, check_out_terminal, claimed, lost_stub, incorrect_stub, manual_form_signed, override_reason, staff_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        claimData.control_number,
        claimData.check_out_terminal,
        claimData.claimed,
        claimData.lost_stub,
        claimData.incorrect_stub,
        claimData.manual_form_signed,
        claimData.override_reason,
        claimData.staff_id
      ]
    );

    // Log the action
    await pool.query(
      'INSERT INTO audit_logs (action, table_name, record_id, new_values, staff_id, terminal_id) VALUES (?, ?, ?, ?, ?, ?)',
      ['CHECKOUT', 'claims', result.lastID, JSON.stringify(claimData), req.user.staff_id, terminalId]
    );

    res.status(201).json({
      control_number: controlNumber,
      check_out_terminal: terminalId,
      claimed: true,
      lost_stub: claimData.lost_stub,
      incorrect_stub: claimData.incorrect_stub,
      manual_form_signed: claimData.manual_form_signed,
      override_reason: claimData.override_reason,
      attendance: attendance,
      status: getClaimStatus(claimData)
    });
  } catch (error) {
    console.error('Check-out error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get claims
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { date, status, terminal } = req.query;
    let query = `
      SELECT c.*, a.member_id, m.first_name, m.middle_initial, m.last_name, m.member_type, m.cooperative_id, a.check_in_time, a.transportation_stub_issued
      FROM claims c
      JOIN attendance a ON c.control_number = a.control_number
      JOIN members m ON a.member_id = m.member_id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (date) {
      paramCount++;
      query += ` AND DATE(c.check_out_time) = ?`;
      params.push(date);
    } else {
      // Default to today
      query += ` AND DATE(c.check_out_time) = CURRENT_DATE`;
    }

    if (terminal) {
      paramCount++;
      query += ` AND c.check_out_terminal = ?`;
      params.push(terminal);
    }

    if (status) {
      if (status === 'lost') {
        query += ` AND c.lost_stub = true`;
      } else if (status === 'incorrect') {
        query += ` AND c.incorrect_stub = true`;
      } else if (status === 'normal') {
        query += ` AND c.lost_stub = false AND c.incorrect_stub = false`;
      }
    }

    query += ' ORDER BY c.check_out_time DESC';

    const result = await pool.query(query, params);
    
    // Add status to each claim
    const claimsWithStatus = result.rows.map(claim => ({
      ...claim,
      status: getClaimStatus(claim)
    }));

    res.json(claimsWithStatus);
  } catch (error) {
    console.error('Get claims error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get claims summary
router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    const summaryResult = await pool.query(`
      SELECT 
        COUNT(*) as total_claims,
        COUNT(CASE WHEN lost_stub = 1 THEN 1 END) as lost_stubs,
        COUNT(CASE WHEN incorrect_stub = 1 THEN 1 END) as incorrect_stubs,
        COUNT(CASE WHEN lost_stub = 0 AND incorrect_stub = 0 THEN 1 END) as normal_claims,
        COUNT(CASE WHEN manual_form_signed = 1 THEN 1 END) as manual_forms_signed
      FROM claims
      WHERE DATE(check_out_time) = ?
    `, [targetDate]);

    const terminalSummary = await pool.query(`
      SELECT 
        check_out_terminal,
        COUNT(*) as count
      FROM claims
      WHERE DATE(check_out_time) = ?
      GROUP BY check_out_terminal
      ORDER BY count DESC
    `, [targetDate]);

    res.json({
      date: targetDate,
      summary: summaryResult.rows[0],
      terminalBreakdown: terminalSummary.rows
    });
  } catch (error) {
    console.error('Get claims summary error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Override check-out (Admin only)
router.post('/override-checkout/:controlNumber', authenticateToken, requireRole(['Admin']), async (req, res) => {
  try {
    const { controlNumber } = req.params;
    const today = getCurrentDate(); // Philippine time

    // Remove today's check-out record
    await pool.query(`
      DELETE FROM claims 
      WHERE control_number = ? AND DATE(check_out_time) = ?
    `, [controlNumber, today]);

    res.json({ message: 'Check-out overridden successfully' });
  } catch (error) {
    console.error('Override check-out error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove check-out record (Admin only)
router.delete('/remove-checkout/:controlNumber', authenticateToken, requireRole(['Admin']), async (req, res) => {
  try {
    const { controlNumber } = req.params;

    // Remove all check-out records for this control number
    await pool.query(`
      DELETE FROM claims 
      WHERE control_number = ?
    `, [controlNumber]);

    res.json({ message: 'Check-out record removed successfully' });
  } catch (error) {
    console.error('Remove check-out error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper function to determine claim status
function getClaimStatus(claim) {
  if (claim.lost_stub) {
    return '📝 Claimed without Stub';
  } else if (claim.incorrect_stub) {
    return '⚠️ Claimed with Incorrect Stub';
  } else {
    return '✅ Claimed';
  }
}

module.exports = router;
