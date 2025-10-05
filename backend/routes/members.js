const express = require('express');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const pool = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Configure multer for file uploads
const upload = multer({ 
  dest: 'uploads/',
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  }
});

const router = express.Router();

// Get all members
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { memberType, search, status, eligibility } = req.query;
    let query = 'SELECT * FROM members WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (memberType) {
      paramCount++;
      query += ` AND member_type = ?`;
      params.push(memberType);
    }

    if (status) {
      paramCount++;
      query += ` AND status = ?`;
      params.push(status);
    }

    if (eligibility) {
      paramCount++;
      query += ` AND eligibility = ?`;
      params.push(eligibility);
    }

    if (search) {
      paramCount++;
      query += ` AND (first_name LIKE ? OR last_name LIKE ? OR cooperative_id LIKE ? OR work_email LIKE ? OR personal_email LIKE ?)`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }

    query += ' ORDER BY registered_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get members error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get member by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM members WHERE member_id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get member error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new member
router.post('/', authenticateToken, requireRole(['Admin', 'Staff']), async (req, res) => {
  try {
    const { 
      cooperative_id, 
      first_name, 
      middle_initial, 
      last_name, 
      work_email, 
      personal_email, 
      status, 
      eligibility, 
      member_type 
    } = req.body;

    // Validation
    if (!cooperative_id || !first_name || !last_name || !status || !eligibility || !member_type) {
      return res.status(400).json({ error: 'Required fields: cooperative_id, first_name, last_name, status, eligibility, member_type' });
    }

    if (!['Regular', 'Associate'].includes(member_type)) {
      return res.status(400).json({ error: 'Invalid member type' });
    }

    if (!['active', 'dormant'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    if (!['eligible', 'not_eligible'].includes(eligibility)) {
      return res.status(400).json({ error: 'Invalid eligibility' });
    }

    // Check if cooperative_id already exists
    const existingMember = await pool.query(
      'SELECT cooperative_id FROM members WHERE cooperative_id = ?',
      [cooperative_id]
    );

    if (existingMember.rows.length > 0) {
      return res.status(400).json({ error: 'Cooperative ID already exists' });
    }

    const result = await pool.query(
      `INSERT INTO members (
        cooperative_id, first_name, middle_initial, last_name, 
        work_email, personal_email, status, eligibility, member_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
      [cooperative_id, first_name, middle_initial, last_name, work_email, personal_email, status, eligibility, member_type]
    );

    // Log the action
    await pool.query(
      'INSERT INTO audit_logs (action, table_name, record_id, new_values, staff_id, terminal_id) VALUES (?, ?, ?, ?, ?, ?)',
      ['CREATE', 'members', result.rows[0].member_id, JSON.stringify(result.rows[0]), req.user.staff_id, req.user.terminal_id]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create member error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update member
router.put('/:id', authenticateToken, requireRole(['Admin', 'Staff']), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, memberType } = req.body;

    // Get current member data
    const currentResult = await pool.query('SELECT * FROM members WHERE member_id = $1', [id]);
    if (currentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }

    const result = await pool.query(
      'UPDATE members SET name = $1, member_type = $2, updated_at = CURRENT_TIMESTAMP WHERE member_id = $3 RETURNING *',
      [name, memberType, id]
    );

    // Log the action
    await pool.query(
      'INSERT INTO audit_logs (action, table_name, record_id, old_values, new_values, staff_id, terminal_id) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      ['UPDATE', 'members', id, JSON.stringify(currentResult.rows[0]), JSON.stringify(result.rows[0]), req.user.staff_id, req.user.terminal_id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update member error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete member (Admin only)
router.delete('/:id', authenticateToken, requireRole(['Admin']), async (req, res) => {
  try {
    const { id } = req.params;

    // Check if member has attendance records
    const attendanceCheck = await pool.query(
      'SELECT COUNT(*) FROM attendance WHERE member_id = $1',
      [id]
    );

    if (parseInt(attendanceCheck.rows[0].count) > 0) {
      return res.status(400).json({ error: 'Cannot delete member with attendance records' });
    }

    const result = await pool.query('DELETE FROM members WHERE member_id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }

    // Log the action
    await pool.query(
      'INSERT INTO audit_logs (action, table_name, record_id, old_values, staff_id, terminal_id) VALUES ($1, $2, $3, $4, $5, $6)',
      ['DELETE', 'members', id, JSON.stringify(result.rows[0]), req.user.staff_id, req.user.terminal_id]
    );

    res.json({ message: 'Member deleted successfully' });
  } catch (error) {
    console.error('Delete member error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// CSV Batch Upload (Admin only)
router.post('/upload-csv', authenticateToken, requireRole(['Admin']), upload.single('csvFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No CSV file uploaded' });
    }

    const results = [];
    const errors = [];
    let rowNumber = 0;

    // Read and parse CSV file
    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on('data', (data) => {
        rowNumber++;
        
        // Validate required fields
        const requiredFields = ['cooperative_id', 'first_name', 'last_name', 'status', 'eligibility', 'member_type'];
        const missingFields = requiredFields.filter(field => !data[field] || data[field].trim() === '');
        
        if (missingFields.length > 0) {
          errors.push(`Row ${rowNumber}: Missing required fields: ${missingFields.join(', ')}`);
          return;
        }

        // Validate field values
        if (!['Regular', 'Associate'].includes(data.member_type)) {
          errors.push(`Row ${rowNumber}: Invalid member_type. Must be 'Regular' or 'Associate'`);
          return;
        }

        if (!['active', 'dormant'].includes(data.status)) {
          errors.push(`Row ${rowNumber}: Invalid status. Must be 'active' or 'dormant'`);
          return;
        }

        if (!['eligible', 'not_eligible'].includes(data.eligibility)) {
          errors.push(`Row ${rowNumber}: Invalid eligibility. Must be 'eligible' or 'not_eligible'`);
          return;
        }

        results.push({
          cooperative_id: data.cooperative_id.trim(),
          first_name: data.first_name.trim(),
          middle_initial: data.middle_initial ? data.middle_initial.trim() : null,
          last_name: data.last_name.trim(),
          work_email: data.work_email ? data.work_email.trim() : null,
          personal_email: data.personal_email ? data.personal_email.trim() : null,
          status: data.status.trim(),
          eligibility: data.eligibility.trim(),
          member_type: data.member_type.trim()
        });
      })
      .on('end', async () => {
        try {
          // Clean up uploaded file
          fs.unlinkSync(req.file.path);

          if (errors.length > 0) {
            return res.status(400).json({ 
              error: 'Validation errors found', 
              errors,
              validRows: results.length 
            });
          }

          // Insert valid records
          const insertedMembers = [];
          const duplicateErrors = [];

          for (const member of results) {
            try {
              // Check for duplicate cooperative_id
              const existingMember = await pool.query(
                'SELECT cooperative_id FROM members WHERE cooperative_id = ?',
                [member.cooperative_id]
              );

              if (existingMember.rows.length > 0) {
                duplicateErrors.push(`Cooperative ID ${member.cooperative_id} already exists`);
                continue;
              }

              const result = await pool.query(
                `INSERT INTO members (
                  cooperative_id, first_name, middle_initial, last_name, 
                  work_email, personal_email, status, eligibility, member_type
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
                [
                  member.cooperative_id, member.first_name, member.middle_initial, 
                  member.last_name, member.work_email, member.personal_email, 
                  member.status, member.eligibility, member.member_type
                ]
              );

              insertedMembers.push(result.rows[0]);

              // Log the action
              await pool.query(
                'INSERT INTO audit_logs (action, table_name, record_id, new_values, staff_id, terminal_id) VALUES (?, ?, ?, ?, ?, ?)',
                ['CREATE', 'members', result.rows[0].member_id, JSON.stringify(result.rows[0]), req.user.staff_id, req.user.terminal_id]
              );

            } catch (error) {
              duplicateErrors.push(`Error inserting ${member.cooperative_id}: ${error.message}`);
            }
          }

          res.json({
            message: 'CSV upload completed',
            totalRows: results.length,
            inserted: insertedMembers.length,
            duplicates: duplicateErrors.length,
            duplicateErrors,
            members: insertedMembers
          });

        } catch (error) {
          console.error('CSV processing error:', error);
          res.status(500).json({ error: 'Error processing CSV file' });
        }
      })
      .on('error', (error) => {
        console.error('CSV parsing error:', error);
        res.status(500).json({ error: 'Error parsing CSV file' });
      });

  } catch (error) {
    console.error('CSV upload error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
