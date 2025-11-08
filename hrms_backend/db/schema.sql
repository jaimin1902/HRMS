-- WorkZen HRMS Database Schema
-- PostgreSQL Database Setup

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. ROLES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 2. DEPARTMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    head_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 3. USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    date_of_birth DATE,
    address TEXT,
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
    designation VARCHAR(100),
    joining_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    profile_picture VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add foreign key constraint for departments.head_id after users table is created
ALTER TABLE departments 
    ADD CONSTRAINT fk_departments_head 
    FOREIGN KEY (head_id) REFERENCES users(id) ON DELETE SET NULL;

-- ============================================
-- 4. SALARY_STRUCTURE TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS salary_structure (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    basic_salary DECIMAL(12, 2) NOT NULL,
    hra DECIMAL(12, 2) DEFAULT 0,
    transport_allowance DECIMAL(12, 2) DEFAULT 0,
    medical_allowance DECIMAL(12, 2) DEFAULT 0,
    other_allowances DECIMAL(12, 2) DEFAULT 0,
    pf_percentage DECIMAL(5, 2) DEFAULT 12.00,
    professional_tax DECIMAL(12, 2) DEFAULT 0,
    other_deductions DECIMAL(12, 2) DEFAULT 0,
    effective_from DATE NOT NULL,
    effective_to DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 5. LEAVE_TYPES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS leave_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    max_days INTEGER,
    is_paid BOOLEAN DEFAULT TRUE,
    requires_approval BOOLEAN DEFAULT TRUE,
    carry_forward BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 6. LEAVE_APPLICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS leave_applications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    leave_type_id INTEGER NOT NULL REFERENCES leave_types(id) ON DELETE RESTRICT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days DECIMAL(5, 2) NOT NULL,
    reason TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP,
    rejection_reason TEXT,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 7. ATTENDANCE TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS attendance (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    check_in_time TIMESTAMP,
    check_out_time TIMESTAMP,
    working_hours DECIMAL(5, 2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'absent' CHECK (status IN ('present', 'absent', 'half-day', 'leave', 'holiday', 'weekend')),
    leave_application_id INTEGER REFERENCES leave_applications(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, date)
);

-- ============================================
-- 8. PAYROLL_RUNS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS payroll_runs (
    id SERIAL PRIMARY KEY,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    year INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'processing', 'completed', 'paid')),
    processed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    processed_at TIMESTAMP,
    total_employees INTEGER DEFAULT 0,
    total_amount DECIMAL(15, 2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(month, year)
);

-- ============================================
-- 9. PAYSLIPS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS payslips (
    id SERIAL PRIMARY KEY,
    payroll_run_id INTEGER NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    basic_salary DECIMAL(12, 2) NOT NULL,
    hra DECIMAL(12, 2) DEFAULT 0,
    transport_allowance DECIMAL(12, 2) DEFAULT 0,
    medical_allowance DECIMAL(12, 2) DEFAULT 0,
    other_allowances DECIMAL(12, 2) DEFAULT 0,
    gross_salary DECIMAL(12, 2) NOT NULL,
    pf_employee DECIMAL(12, 2) DEFAULT 0,
    pf_employer DECIMAL(12, 2) DEFAULT 0,
    professional_tax DECIMAL(12, 2) DEFAULT 0,
    other_deductions DECIMAL(12, 2) DEFAULT 0,
    total_deductions DECIMAL(12, 2) DEFAULT 0,
    net_salary DECIMAL(12, 2) NOT NULL,
    working_days INTEGER DEFAULT 0,
    present_days INTEGER DEFAULT 0,
    leave_days INTEGER DEFAULT 0,
    absent_days INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(payroll_run_id, user_id)
);

-- ============================================
-- 10. AUDIT_LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 11. SYSTEM_SETTINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS system_settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT,
    data_type VARCHAR(20) DEFAULT 'string' CHECK (data_type IN ('string', 'number', 'boolean', 'json')),
    description TEXT,
    updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Users indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_employee_id ON users(employee_id);
CREATE INDEX idx_users_role_id ON users(role_id);
CREATE INDEX idx_users_department_id ON users(department_id);
CREATE INDEX idx_users_is_active ON users(is_active);

-- Attendance indexes
CREATE INDEX idx_attendance_user_id ON attendance(user_id);
CREATE INDEX idx_attendance_date ON attendance(date);
CREATE INDEX idx_attendance_user_date ON attendance(user_id, date);
CREATE INDEX idx_attendance_status ON attendance(status);

-- Leave applications indexes
CREATE INDEX idx_leave_applications_user_id ON leave_applications(user_id);
CREATE INDEX idx_leave_applications_status ON leave_applications(status);
CREATE INDEX idx_leave_applications_dates ON leave_applications(start_date, end_date);
CREATE INDEX idx_leave_applications_approved_by ON leave_applications(approved_by);

-- Payroll indexes
CREATE INDEX idx_payroll_runs_month_year ON payroll_runs(month, year);
CREATE INDEX idx_payroll_runs_status ON payroll_runs(status);
CREATE INDEX idx_payslips_payroll_run_id ON payslips(payroll_run_id);
CREATE INDEX idx_payslips_user_id ON payslips(user_id);

-- Salary structure indexes
CREATE INDEX idx_salary_structure_user_id ON salary_structure(user_id);
CREATE INDEX idx_salary_structure_is_active ON salary_structure(is_active);

-- Audit logs indexes
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- ============================================
-- VIEWS FOR REPORTS
-- ============================================

-- Employee count by department
CREATE OR REPLACE VIEW v_employee_count_by_department AS
SELECT 
    d.id AS department_id,
    d.name AS department_name,
    COUNT(u.id) AS employee_count,
    COUNT(CASE WHEN u.is_active = TRUE THEN 1 END) AS active_employees
FROM departments d
LEFT JOIN users u ON u.department_id = d.id
GROUP BY d.id, d.name;

-- Leave balance calculation
CREATE OR REPLACE VIEW v_leave_balance AS
SELECT 
    u.id AS user_id,
    u.employee_id,
    u.first_name || ' ' || u.last_name AS employee_name,
    lt.id AS leave_type_id,
    lt.name AS leave_type_name,
    lt.max_days AS allocated_days,
    COALESCE(SUM(CASE WHEN la.status = 'approved' THEN la.total_days ELSE 0 END), 0) AS used_days,
    (lt.max_days - COALESCE(SUM(CASE WHEN la.status = 'approved' THEN la.total_days ELSE 0 END), 0)) AS balance_days
FROM users u
CROSS JOIN leave_types lt
LEFT JOIN leave_applications la ON la.user_id = u.id AND la.leave_type_id = lt.id
WHERE u.is_active = TRUE AND lt.is_active = TRUE
GROUP BY u.id, u.employee_id, u.first_name, u.last_name, lt.id, lt.name, lt.max_days;

-- Monthly attendance summary
CREATE OR REPLACE VIEW v_monthly_attendance_summary AS
SELECT 
    u.id AS user_id,
    u.employee_id,
    u.first_name || ' ' || u.last_name AS employee_name,
    DATE_TRUNC('month', a.date)::DATE AS month,
    COUNT(CASE WHEN a.status = 'present' THEN 1 END) AS present_days,
    COUNT(CASE WHEN a.status = 'absent' THEN 1 END) AS absent_days,
    COUNT(CASE WHEN a.status = 'half-day' THEN 1 END) AS half_days,
    COUNT(CASE WHEN a.status = 'leave' THEN 1 END) AS leave_days,
    COUNT(CASE WHEN a.status IN ('holiday', 'weekend') THEN 1 END) AS holidays,
    SUM(a.working_hours) AS total_working_hours
FROM users u
LEFT JOIN attendance a ON a.user_id = u.id
WHERE u.is_active = TRUE
GROUP BY u.id, u.employee_id, u.first_name, u.last_name, DATE_TRUNC('month', a.date)::DATE;

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON departments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_salary_structure_updated_at BEFORE UPDATE ON salary_structure
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leave_types_updated_at BEFORE UPDATE ON leave_types
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leave_applications_updated_at BEFORE UPDATE ON leave_applications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attendance_updated_at BEFORE UPDATE ON attendance
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payroll_runs_updated_at BEFORE UPDATE ON payroll_runs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payslips_updated_at BEFORE UPDATE ON payslips
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- INITIAL DATA SEEDING
-- ============================================

-- Insert default roles
INSERT INTO roles (name, description) VALUES
('Admin', 'Full system access with no limitations'),
('HR Officer', 'Manage employees, attendance, and leaves'),
('Payroll Officer', 'Manage payroll, time-off approvals, and reports'),
('Employee', 'Basic employee access with limited permissions')
ON CONFLICT (name) DO NOTHING;

-- Insert default leave types
INSERT INTO leave_types (name, code, description, max_days, is_paid, requires_approval) VALUES
('Casual Leave', 'CL', 'Casual leave for personal reasons', 12, TRUE, TRUE),
('Sick Leave', 'SL', 'Medical leave for illness', 12, TRUE, TRUE),
('Earned Leave', 'EL', 'Earned/Privilege leave', 15, TRUE, TRUE),
('Maternity Leave', 'ML', 'Maternity leave for female employees', 90, TRUE, TRUE),
('Paternity Leave', 'PL', 'Paternity leave for male employees', 7, TRUE, TRUE),
('Compensatory Off', 'CO', 'Compensatory leave for working on holidays', 5, TRUE, TRUE),
('Leave Without Pay', 'LWP', 'Unpaid leave', NULL, FALSE, TRUE)
ON CONFLICT (code) DO NOTHING;

-- Insert default system settings
INSERT INTO system_settings (key, value, data_type, description) VALUES
('company_name', 'WorkZen', 'string', 'Company name'),
('working_days_per_week', '5', 'number', 'Number of working days per week'),
('working_hours_per_day', '8', 'number', 'Standard working hours per day'),
('pf_percentage', '12', 'number', 'Provident Fund contribution percentage'),
('professional_tax_amount', '200', 'number', 'Professional tax amount per month'),
('fiscal_year_start', '2024-04-01', 'string', 'Fiscal year start date')
ON CONFLICT (key) DO NOTHING;

