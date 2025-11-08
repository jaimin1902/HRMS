-- Migration: Create salary_component_templates table
-- This table stores dynamic salary component configurations

CREATE TABLE IF NOT EXISTS salary_component_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    computation_type VARCHAR(20) NOT NULL CHECK (computation_type IN ('percentage', 'fixed')),
    base VARCHAR(20) NOT NULL CHECK (base IN ('wage', 'basic')),
    percentage DECIMAL(5, 2),
    fixed_amount DECIMAL(12, 2),
    description TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    is_required BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default salary component templates
INSERT INTO salary_component_templates (name, computation_type, base, percentage, description, display_order, is_required) VALUES
('Basic Salary', 'percentage', 'wage', 50.00, 'Basic salary from company will remain 50% based on monthly wages', 1, TRUE),
('HRA (House Rent Allowance)', 'percentage', 'basic', 50.00, 'HRA is provided to employees 50% of the basic salary', 2, TRUE),
('Standard Allowance', 'percentage', 'wage', 16.67, 'A standard allowance is a predetermined, fixed amount provided to employees', 3, FALSE),
('Performance Bonus', 'percentage', 'wage', 8.33, 'Variable amount paid during payroll. Calculated as a % of the basic salary', 4, FALSE),
('Leave Travel Allowance', 'percentage', 'wage', 8.333, 'LTA is paid by the company to employees to cover their travel expenses', 5, FALSE),
('Fixed Allowance', 'fixed', 'wage', NULL, 'Fixed allowance portion of wages determined after calculating all salary components', 6, FALSE)
ON CONFLICT DO NOTHING;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_salary_component_templates_display_order ON salary_component_templates(display_order);
CREATE INDEX IF NOT EXISTS idx_salary_component_templates_is_active ON salary_component_templates(is_active);


