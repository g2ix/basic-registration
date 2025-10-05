-- Simplified Member Journey Schema for SQLite
-- Combines attendance and claims into a single table

CREATE TABLE IF NOT EXISTS member_journey (
    journey_id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
    member_id TEXT REFERENCES members(member_id) ON DELETE CASCADE,
    control_number TEXT UNIQUE NOT NULL,
    
    -- Check-in details
    check_in_time TEXT DEFAULT (datetime('now', '+08:00')),
    check_in_terminal TEXT NOT NULL,
    
    -- Stub issuance (from original attendance)
    meal_stub_issued INTEGER DEFAULT 0,
    transportation_stub_issued INTEGER DEFAULT 0,
    
    -- Check-out details
    check_out_time TEXT,
    check_out_terminal TEXT,
    
    -- Claim details (from original claims)
    claimed INTEGER DEFAULT 0,
    lost_stub INTEGER DEFAULT 0,
    incorrect_stub INTEGER DEFAULT 0,
    different_stub_number INTEGER DEFAULT 0,
    different_stub_value TEXT,
    manual_form_signed INTEGER DEFAULT 0,
    override_reason TEXT,
    staff_id TEXT REFERENCES staff(staff_id),
    
    -- Status tracking
    status TEXT DEFAULT 'checked_in' CHECK (status IN ('checked_in', 'complete')),
    
    -- Timestamps
    created_at TEXT DEFAULT (datetime('now', '+08:00')),
    updated_at TEXT DEFAULT (datetime('now', '+08:00'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_member_journey_member_id ON member_journey(member_id);
CREATE INDEX IF NOT EXISTS idx_member_journey_control_number ON member_journey(control_number);
CREATE INDEX IF NOT EXISTS idx_member_journey_status ON member_journey(status);
CREATE INDEX IF NOT EXISTS idx_member_journey_date ON member_journey(date(check_in_time));

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
    setting_id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
    setting_key TEXT UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    description TEXT,
    created_at TEXT DEFAULT (datetime('now', '+08:00')),
    updated_at TEXT DEFAULT (datetime('now', '+08:00'))
);

-- Insert default settings
INSERT INTO settings (setting_key, setting_value, description) VALUES 
('checkout_enabled', 'true', 'Enable/disable checkout functionality'),
('system_maintenance', 'false', 'System maintenance mode');

-- Trigger to automatically update updated_at
CREATE TRIGGER IF NOT EXISTS update_member_journey_updated_at 
    AFTER UPDATE ON member_journey 
    FOR EACH ROW 
    BEGIN
        UPDATE member_journey SET updated_at = datetime('now', '+08:00') WHERE journey_id = NEW.journey_id;
    END;

CREATE TRIGGER IF NOT EXISTS update_settings_updated_at 
    AFTER UPDATE ON settings 
    FOR EACH ROW 
    BEGIN
        UPDATE settings SET updated_at = datetime('now', '+08:00') WHERE setting_id = NEW.setting_id;
    END;
