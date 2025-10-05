-- Cooperative Gathering Registration System Database Schema

-- Create database (run this manually first)
-- CREATE DATABASE cooperative_gathering;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Members table
CREATE TABLE IF NOT EXISTS members (
    member_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    member_type VARCHAR(20) NOT NULL CHECK (member_type IN ('Regular', 'Associate')),
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Staff table
CREATE TABLE IF NOT EXISTS staff (
    staff_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('Admin', 'Staff')),
    terminal_id VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Attendance table
CREATE TABLE IF NOT EXISTS attendance (
    attendance_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID REFERENCES members(member_id) ON DELETE CASCADE,
    control_number VARCHAR(50) UNIQUE NOT NULL,
    check_in_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    check_in_terminal VARCHAR(100) NOT NULL,
    meal_stub_issued BOOLEAN DEFAULT false,
    transportation_stub_issued BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Claims table
CREATE TABLE IF NOT EXISTS claims (
    claim_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    control_number VARCHAR(50) NOT NULL,
    check_out_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    check_out_terminal VARCHAR(100) NOT NULL,
    claimed BOOLEAN DEFAULT false,
    lost_stub BOOLEAN DEFAULT false,
    incorrect_stub BOOLEAN DEFAULT false,
    manual_form_signed BOOLEAN DEFAULT false,
    override_reason TEXT,
    staff_id UUID REFERENCES staff(staff_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(50) NOT NULL,
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    staff_id UUID REFERENCES staff(staff_id),
    terminal_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_members_member_type ON members(member_type);
CREATE INDEX IF NOT EXISTS idx_attendance_control_number ON attendance(control_number);
CREATE INDEX IF NOT EXISTS idx_attendance_member_id ON attendance(member_id);
CREATE INDEX IF NOT EXISTS idx_claims_control_number ON claims(control_number);
CREATE INDEX IF NOT EXISTS idx_claims_staff_id ON claims(staff_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_staff_id ON audit_logs(staff_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- Insert default admin user (password: admin123)
INSERT INTO staff (username, password_hash, role, terminal_id) 
VALUES ('admin', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Admin', 'ADMIN-TERMINAL')
ON CONFLICT (username) DO NOTHING;

-- Insert sample staff user (password: staff123)
INSERT INTO staff (username, password_hash, role, terminal_id) 
VALUES ('staff', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Staff', 'STAFF-TERMINAL-001')
ON CONFLICT (username) DO NOTHING;
