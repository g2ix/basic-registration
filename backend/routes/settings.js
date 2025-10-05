const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const pool = require('../config/database');

// Get all settings
router.get('/', authenticateToken, requireRole(['Admin']), async (req, res) => {
  try {
    const settings = await pool.query('SELECT * FROM settings ORDER BY setting_key');
    res.json(settings.rows || settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Get a specific setting
router.get('/:key', authenticateToken, async (req, res) => {
  try {
    const { key } = req.params;
    const result = await pool.query('SELECT * FROM settings WHERE setting_key = ?', [key]);
    
    if (result.rows && result.rows.length === 0) {
      return res.status(404).json({ error: 'Setting not found' });
    }
    
    const setting = result.rows ? result.rows[0] : result[0];
    res.json(setting);
  } catch (error) {
    console.error('Error fetching setting:', error);
    res.status(500).json({ error: 'Failed to fetch setting' });
  }
});

// Update a setting
router.put('/:key', authenticateToken, requireRole(['Admin']), async (req, res) => {
  try {
    const { key } = req.params;
    const { value, description } = req.body;
    
    if (value === undefined) {
      return res.status(400).json({ error: 'Setting value is required' });
    }
    
    // Check if setting exists
    const existing = await pool.query('SELECT * FROM settings WHERE setting_key = ?', [key]);
    const settingExists = existing.rows ? existing.rows.length > 0 : existing.length > 0;
    
    if (settingExists) {
      // Update existing setting
      const updateQuery = description 
        ? 'UPDATE settings SET setting_value = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE setting_key = ?'
        : 'UPDATE settings SET setting_value = ?, updated_at = CURRENT_TIMESTAMP WHERE setting_key = ?';
      
      const updateParams = description ? [value, description, key] : [value, key];
      await pool.query(updateQuery, updateParams);
    } else {
      // Create new setting
      await pool.query(
        'INSERT INTO settings (setting_key, setting_value, description) VALUES (?, ?, ?)',
        [key, value, description || null]
      );
    }
    
    res.json({ message: 'Setting updated successfully' });
  } catch (error) {
    console.error('Error updating setting:', error);
    res.status(500).json({ error: 'Failed to update setting' });
  }
});

// Get checkout enabled status (public endpoint for frontend checks)
router.get('/public/checkout-enabled', async (req, res) => {
  try {
    const result = await pool.query('SELECT setting_value FROM settings WHERE setting_key = ?', ['checkout_enabled']);
    
    const isEnabled = result.rows ? 
      (result.rows[0]?.setting_value === 'true') : 
      (result[0]?.setting_value === 'true');
    
    res.json({ checkout_enabled: isEnabled });
  } catch (error) {
    console.error('Error checking checkout status:', error);
    // Default to enabled if there's an error
    res.json({ checkout_enabled: true });
  }
});

// Helper function to get statistics data
const getStatisticsData = async () => {
  // Get member population statistics
  const memberStats = await pool.query(`
    SELECT 
      member_type,
      COUNT(*) as count
    FROM members 
    GROUP BY member_type
  `);
  
  // Get assembly attendance statistics for today (members who attended - checked in and completed journey)
  const today = new Date().toISOString().split('T')[0];
  const attendanceStats = await pool.query(`
    SELECT 
      m.member_type,
      COUNT(mj.journey_id) as attended_count
    FROM members m
    LEFT JOIN member_journey mj ON m.member_id = mj.member_id 
      AND DATE(mj.check_in_time) = ?
      AND (mj.status = 'complete' OR mj.status = 'checked_in')
    GROUP BY m.member_type
  `, [today]);
  
  // Calculate totals
  const totalMembers = memberStats.rows ? 
    memberStats.rows.reduce((sum, row) => sum + parseInt(row.count), 0) :
    memberStats.reduce((sum, row) => sum + parseInt(row.count), 0);
  
  const totalAttended = attendanceStats.rows ?
    attendanceStats.rows.reduce((sum, row) => sum + parseInt(row.attended_count), 0) :
    attendanceStats.reduce((sum, row) => sum + parseInt(row.attended_count), 0);
  
  // Format data for charts
  const memberPopulation = {
    regular: 0,
    associate: 0,
    total: totalMembers
  };
  
  const attendedAssembly = {
    regular: 0,
    associate: 0,
    total: totalAttended
  };
  
  // Process member stats
  const memberData = memberStats.rows || memberStats;
  memberData.forEach(row => {
    if (row.member_type === 'Regular') {
      memberPopulation.regular = parseInt(row.count);
    } else if (row.member_type === 'Associate') {
      memberPopulation.associate = parseInt(row.count);
    }
  });
  
  // Process attendance stats
  const attendanceData = attendanceStats.rows || attendanceStats;
  attendanceData.forEach(row => {
    if (row.member_type === 'Regular') {
      attendedAssembly.regular = parseInt(row.attended_count);
    } else if (row.member_type === 'Associate') {
      attendedAssembly.associate = parseInt(row.attended_count);
    }
  });
  
  return {
    memberPopulation,
    attendedAssembly,
    lastUpdated: new Date().toISOString()
  };
};

// Get public statistics (no authentication required)
router.get('/public/statistics', async (req, res) => {
  try {
    const data = await getStatisticsData();
    res.json(data);
  } catch (error) {
    console.error('Error fetching public statistics:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Server-Sent Events endpoint for real-time statistics
router.get('/public/statistics/stream', async (req, res) => {
  // Set headers for SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  const sendUpdate = async () => {
    try {
      const data = await getStatisticsData();
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (error) {
      console.error('Error sending SSE update:', error);
      res.write(`data: ${JSON.stringify({ error: 'Failed to fetch statistics' })}\n\n`);
    }
  };

  // Send initial data
  await sendUpdate();

  // Send updates every 5 seconds
  const interval = setInterval(async () => {
    await sendUpdate();
  }, 5000);

  // Clean up on client disconnect
  req.on('close', () => {
    clearInterval(interval);
    res.end();
  });

  req.on('error', () => {
    clearInterval(interval);
    res.end();
  });
});

// Reset all data (Admin only)
router.post('/reset-all-data', authenticateToken, requireRole(['Admin']), async (req, res) => {
  try {
    const { confirmReset } = req.body;
    
    if (!confirmReset) {
      return res.status(400).json({ error: 'Confirmation required to reset all data' });
    }
    
    
    // Get database type to use appropriate syntax
    const isPostgreSQL = process.env.DATABASE_URL && process.env.DATABASE_URL.includes('postgres');
    
    if (isPostgreSQL) {
      // PostgreSQL: Truncate all tables
      await pool.query('TRUNCATE TABLE member_journey, members, staff, settings RESTART IDENTITY CASCADE');
      
      // Re-insert default settings
      await pool.query(`
        INSERT INTO settings (setting_key, setting_value, description) VALUES 
        ('checkout_enabled', 'true', 'Enable/disable checkout functionality'),
        ('system_maintenance', 'false', 'System maintenance mode')
        ON CONFLICT (setting_key) DO NOTHING
      `);
    } else {
      // SQLite: Delete all data and reset auto-increment
      await pool.query('DELETE FROM member_journey');
      await pool.query('DELETE FROM members');
      await pool.query('DELETE FROM staff');
      await pool.query('DELETE FROM settings');
      
      // Reset auto-increment counters
      await pool.query('DELETE FROM sqlite_sequence WHERE name IN ("members", "staff", "member_journey")');
      
      // Re-insert default settings
      await pool.query(`
        INSERT INTO settings (setting_key, setting_value, description) VALUES 
        ('checkout_enabled', 'true', 'Enable/disable checkout functionality'),
        ('system_maintenance', 'false', 'System maintenance mode')
      `);
    }
    
    res.json({ 
      message: 'All data has been successfully reset',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error resetting data:', error);
    res.status(500).json({ error: 'Failed to reset data' });
  }
});

// Reset member journey data only (Admin only)
router.post('/reset-journey-data', authenticateToken, requireRole(['Admin']), async (req, res) => {
  try {
    const { confirmReset } = req.body;
    
    if (!confirmReset) {
      return res.status(400).json({ error: 'Confirmation required to reset journey data' });
    }
    
    
    // Get database type to use appropriate syntax
    const isPostgreSQL = process.env.DATABASE_URL && process.env.DATABASE_URL.includes('postgres');
    
    if (isPostgreSQL) {
      // PostgreSQL: Truncate only member_journey table
      await pool.query('TRUNCATE TABLE member_journey RESTART IDENTITY CASCADE');
    } else {
      // SQLite: Delete only member_journey data and reset auto-increment
      await pool.query('DELETE FROM member_journey');
      await pool.query('DELETE FROM sqlite_sequence WHERE name = "member_journey"');
    }
    
    res.json({ 
      message: 'Member journey data has been successfully reset',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error resetting journey data:', error);
    res.status(500).json({ error: 'Failed to reset journey data' });
  }
});

module.exports = router;
