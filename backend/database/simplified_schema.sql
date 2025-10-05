-- Simplified Member Journey Schema
-- Combines attendance and claims into a single table

CREATE TABLE IF NOT EXISTS member_journey (
    journey_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID REFERENCES members(member_id) ON DELETE CASCADE,
    control_number VARCHAR(50) UNIQUE NOT NULL,
    
    -- Check-in details
    check_in_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    check_in_terminal VARCHAR(100) NOT NULL,
    
    -- Stub issuance (from original attendance)
    meal_stub_issued BOOLEAN DEFAULT false,
    transportation_stub_issued BOOLEAN DEFAULT false,
    
    -- Check-out details
    check_out_time TIMESTAMP,
    check_out_terminal VARCHAR(100),
    
    -- Claim details (from original claims)
    claimed BOOLEAN DEFAULT false,
    lost_stub BOOLEAN DEFAULT false,
    incorrect_stub BOOLEAN DEFAULT false,
    different_stub_number BOOLEAN DEFAULT false,
    different_stub_value TEXT,
    manual_form_signed BOOLEAN DEFAULT false,
    override_reason TEXT,
    staff_id UUID REFERENCES staff(staff_id),
    
    -- Status tracking
    status VARCHAR(20) DEFAULT 'checked_in' CHECK (status IN ('checked_in', 'complete')),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_member_journey_member_id ON member_journey(member_id);
CREATE INDEX IF NOT EXISTS idx_member_journey_control_number ON member_journey(control_number);
CREATE INDEX IF NOT EXISTS idx_member_journey_status ON member_journey(status);
CREATE INDEX IF NOT EXISTS idx_member_journey_date ON member_journey(DATE(check_in_time));

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
    setting_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default settings
INSERT INTO settings (setting_key, setting_value, description) VALUES 
('checkout_enabled', 'true', 'Enable/disable checkout functionality'),
('system_maintenance', 'false', 'System maintenance mode')
ON CONFLICT (setting_key) DO NOTHING;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_member_journey_updated_at 
    BEFORE UPDATE ON member_journey 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_settings_updated_at 
    BEFORE UPDATE ON settings 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
