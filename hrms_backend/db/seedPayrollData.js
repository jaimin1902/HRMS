import { pool } from '../config/db.js';
import dotenv from 'dotenv';

dotenv.config();

// Helper function to get working days in a month (excluding weekends)
function getWorkingDays(year, month) {
    const daysInMonth = new Date(year, month, 0).getDate();
    let workingDays = 0;
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month - 1, day);
        const dayOfWeek = date.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday (0) or Saturday (6)
            workingDays++;
        }
    }
    return workingDays;
}

async function seedPayrollData() {
    try {
        console.log('🌱 Starting payroll data seed...\n');
   // First, check if there are any users at all
   const allUsersResult = await pool.query('SELECT COUNT(*) as count FROM users');
   console.log(`📊 Total users in database: ${allUsersResult.rows[0].count}\n`);

   // Check active users
   const activeUsersResult = await pool.query('SELECT COUNT(*) as count FROM users WHERE is_active = TRUE');
   console.log(`📊 Active users: ${activeUsersResult.rows[0].count}\n`);

   // Check roles
   const rolesResult = await pool.query('SELECT id, name FROM roles');
   console.log(`📊 Available roles:`, rolesResult.rows);
   console.log('');
        // Get all active employees (excluding admin)
        const usersResult = await pool.query(
            `SELECT id, employee_id, first_name, last_name 
             FROM users 
             WHERE is_active = TRUE 
             AND role_id = 4 `
        );
        const users = usersResult.rows;

        if (users.length === 0) {
            console.log('❌ No active employees found. Please create users first.');
            process.exit(1);
        }

        console.log(`📋 Found ${users.length} active employees\n`);

        // Get current date
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();

        // Generate data for last 2 months
        const months = [];
        for (let i = 1; i <= 2; i++) {
            let month = currentMonth - i;
            let year = currentYear;
            if (month <= 0) {
                month += 12;
                year -= 1;
            }
            months.push({ month, year });
        }

        // Get admin user for processed_by
        const adminResult = await pool.query(
            "SELECT id FROM users WHERE role_id = (SELECT id FROM roles WHERE name = 'admin') LIMIT 1"
        );
        const adminId = adminResult.rows[0]?.id || null;

        // 1. Create Payroll Runs
        console.log('💼 Creating payroll runs...');
        const payrollRuns = [];

        for (const { month, year } of months) {
            // Check if payroll run already exists
            const existing = await pool.query(
                'SELECT id FROM payroll_runs WHERE month = $1 AND year = $2',
                [month, year]
            );

            if (existing.rows.length === 0) {
                const processedAt = new Date(year, month - 1, 25).toISOString();
                
                const result = await pool.query(
                    `INSERT INTO payroll_runs (month, year, status, processed_by, processed_at)
                     VALUES ($1, $2, $3, $4, $5)
                     RETURNING *`,
                    [month, year, 'completed', adminId, processedAt]
                );

                if (result.rows.length > 0) {
                    payrollRuns.push(result.rows[0]);
                    console.log(`   ✅ Created payroll run for ${month}/${year}`);
                }
            } else {
                const existingRun = await pool.query(
                    'SELECT * FROM payroll_runs WHERE month = $1 AND year = $2',
                    [month, year]
                );
                payrollRuns.push(existingRun.rows[0]);
                console.log(`   ℹ️  Payroll run for ${month}/${year} already exists`);
            }
        }
        console.log(`✅ Created/Found ${payrollRuns.length} payroll runs\n`);

        // 2. Create Payslips for each payroll run
        console.log('📄 Creating payslips...');
        let payslipCount = 0;

        for (const payrollRun of payrollRuns) {
            const { month, year, id: payrollRunId } = payrollRun;
            const workingDays = getWorkingDays(year, month);

            for (const user of users) {
                // Check if payslip already exists
                const existingPayslip = await pool.query(
                    'SELECT id FROM payslips WHERE payroll_run_id = $1 AND user_id = $2',
                    [payrollRunId, user.id]
                );

                if (existingPayslip.rows.length > 0) {
                    console.log(`   ℹ️  Payslip for ${user.first_name} ${user.last_name} (${month}/${year}) already exists`);
                    continue;
                }

                // Get user's salary structure
                const salaryResult = await pool.query(
                    `SELECT * FROM salary_structure 
                     WHERE user_id = $1 AND is_active = TRUE 
                     ORDER BY effective_from DESC LIMIT 1`,
                    [user.id]
                );

                if (salaryResult.rows.length === 0) {
                    console.log(`   ⚠️  No salary structure found for user ${user.id}, creating default...`);
                    
                    // Create a default salary structure
                    const defaultBasic = 50000;
                    const defaultHra = defaultBasic * 0.4;
                    const defaultMedical = defaultBasic * 0.1;
                    const defaultOther = defaultBasic * 0.15;
                    
                    await pool.query(
                        `INSERT INTO salary_structure (
                            user_id, basic_salary, hra, transport_allowance,
                            medical_allowance, other_allowances, pf_percentage,
                            professional_tax, effective_from, is_active
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE)`,
                        [
                            user.id, defaultBasic, defaultHra, 0,
                            defaultMedical, defaultOther, 12,
                            200, new Date(year, month - 1, 1).toISOString().split('T')[0]
                        ]
                    );
                    
                    // Re-fetch salary structure
                    const newSalaryResult = await pool.query(
                        `SELECT * FROM salary_structure 
                         WHERE user_id = $1 AND is_active = TRUE 
                         ORDER BY effective_from DESC LIMIT 1`,
                        [user.id]
                    );
                    
                    if (newSalaryResult.rows.length === 0) {
                        console.log(`   ❌ Failed to create salary structure for user ${user.id}`);
                        continue;
                    }
                    
                    salaryResult.rows = newSalaryResult.rows;
                }

                const salary = salaryResult.rows[0];

                // Get attendance summary for the month
                const attendanceResult = await pool.query(
                    `SELECT 
                        COUNT(CASE WHEN status = 'present' THEN 1 END) as present_days,
                        COUNT(CASE WHEN status = 'leave' THEN 1 END) as leave_days,
                        COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent_days,
                        COUNT(CASE WHEN status = 'half-day' THEN 1 END) as half_days
                     FROM attendance 
                     WHERE user_id = $1 
                     AND EXTRACT(MONTH FROM date) = $2 
                     AND EXTRACT(YEAR FROM date) = $3`,
                    [user.id, month, year]
                );

                const attendance = attendanceResult.rows[0];
                const presentDays = parseInt(attendance.present_days) || 0;
                const leaveDays = parseInt(attendance.leave_days) || 0;
                const absentDays = parseInt(attendance.absent_days) || 0;
                const halfDays = parseInt(attendance.half_days) || 0;
                
                // Half days count as 0.5 present days
                const totalWorkingDays = presentDays + leaveDays + (halfDays * 0.5);

                // Calculate pro-rated salary based on working days
                const dailyRate = parseFloat(salary.basic_salary) / workingDays;
                const proRatedBasic = dailyRate * totalWorkingDays;

                // Calculate allowances (pro-rated)
                const hra = (parseFloat(salary.hra) / workingDays) * totalWorkingDays;
                const medicalAllowance = (parseFloat(salary.medical_allowance) / workingDays) * totalWorkingDays;
                const otherAllowances = (parseFloat(salary.other_allowances) / workingDays) * totalWorkingDays;

                // Calculate gross salary
                const grossSalary = proRatedBasic + hra + medicalAllowance + otherAllowances;

                // Calculate deductions
                const pfEmployee = (proRatedBasic * parseFloat(salary.pf_percentage)) / 100;
                const pfEmployer = (proRatedBasic * parseFloat(salary.pf_percentage)) / 100;
                const professionalTax = parseFloat(salary.professional_tax) || 200;
                const totalDeductions = pfEmployee + professionalTax;

                // Calculate net salary
                const netSalary = grossSalary - totalDeductions;

                await pool.query(
                    `INSERT INTO payslips (
                        payroll_run_id, user_id, basic_salary, hra,
                        transport_allowance, medical_allowance, other_allowances,
                        gross_salary, pf_employee, pf_employer, professional_tax,
                        other_deductions, total_deductions, net_salary,
                        working_days, present_days, leave_days, absent_days, status
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
                    [
                        payrollRunId, user.id, proRatedBasic, hra,
                        0, medicalAllowance, otherAllowances,
                        grossSalary, pfEmployee, pfEmployer, professionalTax,
                        0, totalDeductions, netSalary,
                        workingDays, presentDays, leaveDays, absentDays, 'done'
                    ]
                );
                payslipCount++;
                console.log(`   ✅ Created payslip for ${user.first_name} ${user.last_name} (${month}/${year})`);
            }

            // Update payroll run totals
            const totalsResult = await pool.query(
                `SELECT COUNT(*) as total_employees, SUM(net_salary) as total_amount
                 FROM payslips WHERE payroll_run_id = $1`,
                [payrollRunId]
            );
            const totals = totalsResult.rows[0];
            
            await pool.query(
                `UPDATE payroll_runs 
                 SET total_employees = $1, total_amount = $2 
                 WHERE id = $3`,
                [
                    parseInt(totals.total_employees),
                    parseFloat(totals.total_amount || 0),
                    payrollRunId
                ]
            );
        }
        console.log(`\n✅ Created ${payslipCount} payslips\n`);

        console.log('🎉 Payroll data seed completed successfully!');
        console.log('\n📊 Summary:');
        console.log(`   - Payroll Runs: ${payrollRuns.length}`);
        console.log(`   - Payslips: ${payslipCount}`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding payroll data:', error);
        process.exit(1);
    }
}

// Run the seed function
seedPayrollData();