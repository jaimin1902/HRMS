-- Migration: Add status field to payslips table
-- This migration adds a status field to track payslip validation status

-- Add status column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'payslips' AND column_name = 'status'
    ) THEN
        ALTER TABLE payslips 
        ADD COLUMN status VARCHAR(20) DEFAULT 'pending' 
        CHECK (status IN ('pending', 'done'));
        
        -- Update existing payslips based on payroll run status
        UPDATE payslips p
        SET status = CASE 
            WHEN pr.status = 'paid' THEN 'done'
            ELSE 'pending'
        END
        FROM payroll_runs pr
        WHERE p.payroll_run_id = pr.id;
    END IF;
END $$;


