import { PayrollRun } from '../models/PayrollRun.js';
import { Payslip } from '../models/Payslip.js';
import { SalaryStructure } from '../models/SalaryStructure.js';
import { Attendance } from '../models/Attendance.js';
import { LeaveApplication } from '../models/LeaveApplication.js';
import { User } from '../models/User.js';
import { SystemSetting } from '../models/SystemSetting.js';
import { pool } from '../config/db.js';
import { logAction } from '../utils/auditLogger.js';
import { generatePayslipPDF } from '../utils/payslipPdfService.js';
import { sendPayslipEmail } from '../utils/emailService.js';

export const createPayrollRun = async (req, res, next) => {
    try {
        const { month, year } = req.body;

        if (!month || !year) {
            return res.status(400).json({
                success: false,
                message: 'Month and year are required'
            });
        }

        // Check if payroll run already exists
        const existing = await PayrollRun.findByMonthYear(month, year);
        if (existing) {
            return res.status(400).json({
                success: false,
                message: 'Payroll run for this month already exists'
            });
        }

        const payrollRun = await PayrollRun.create({
            month: parseInt(month),
            year: parseInt(year),
            status: 'draft',
            processed_by: req.user.id
        });

        await logAction(req, 'PAYROLL_RUN_CREATED', 'payroll_runs', payrollRun.id, null, { month, year });

        res.status(201).json({
            success: true,
            message: 'Payroll run created successfully',
            data: payrollRun
        });
    } catch (error) {
        next(error);
    }
};

export const processPayroll = async (req, res, next) => {
    try {
        const { id } = req.params;

        const payrollRun = await PayrollRun.findById(id);
        if (!payrollRun) {
            return res.status(404).json({
                success: false,
                message: 'Payroll run not found'
            });
        }

        if (payrollRun.status !== 'draft') {
            return res.status(400).json({
                success: false,
                message: 'Payroll run is not in draft status'
            });
        }

        // Update status to processing
        await PayrollRun.update(id, { status: 'processing', processed_by: req.user.id, processed_at: new Date() });

        // Get all active employees
        const employees = await User.findAll({ is_active: true });

        // Get system settings
        const workingHoursPerDay = await SystemSetting.getValue('working_hours_per_day', 8);
        const pfPercentage = await SystemSetting.getValue('pf_percentage', 12);
        const professionalTaxAmount = await SystemSetting.getValue('professional_tax_amount', 200);

        let totalAmount = 0;
        const payslips = [];

        for (const employee of employees) {
            // Get active salary structure
            const salaryStructure = await SalaryStructure.findActiveByUserId(employee.id);
            if (!salaryStructure) {
                continue; // Skip employees without salary structure
            }

            // Get attendance for the month
            const startDate = `${payrollRun.year}-${String(payrollRun.month).padStart(2, '0')}-01`;
            const endDate = new Date(payrollRun.year, payrollRun.month, 0).toISOString().split('T')[0];

            const attendanceRecords = await Attendance.findAll({
                user_id: employee.id,
                start_date: startDate,
                end_date: endDate
            });

            // Get approved leave applications for the month
            const leaveApplications = await LeaveApplication.findAll({
                user_id: employee.id,
                start_date: startDate,
                end_date: endDate
            });

            const presentDays = attendanceRecords.filter(a => a.status === 'present').length;
            
            // Calculate paid and unpaid leave days from leave applications
            let paidLeaveDays = 0;
            let unpaidLeaveDays = 0;
            
            for (const la of leaveApplications.filter(la => la.status === 'approved')) {
                const leaveTypeResult = await pool.query('SELECT is_paid FROM leave_types WHERE id = $1', [la.leave_type_id]);
                const isPaid = leaveTypeResult.rows[0]?.is_paid;
                if (isPaid) {
                    paidLeaveDays += parseFloat(la.total_days || 0);
                } else {
                    unpaidLeaveDays += parseFloat(la.total_days || 0);
                }
            }
            
            const absentDays = attendanceRecords.filter(a => a.status === 'absent').length;
            // Total working days = present days + paid leave days (unpaid leaves are not included)
            const totalWorkingDays = presentDays + paidLeaveDays;

            // Calculate salary components (full amounts)
            const basicSalary = salaryStructure.basic_salary;
            const hra = salaryStructure.hra || 0;
            const transportAllowance = salaryStructure.transport_allowance || 0;
            const medicalAllowance = salaryStructure.medical_allowance || 0;
            const otherAllowances = salaryStructure.other_allowances || 0;

            // Calculate full gross salary (sum of all components)
            const fullGrossSalary = basicSalary + hra + transportAllowance + medicalAllowance + otherAllowances;

            // Calculate attendance adjustment for unpaid days
            const daysInMonth = new Date(payrollRun.year, payrollRun.month, 0).getDate();
            const dailyRate = fullGrossSalary / daysInMonth;
            const unpaidDays = absentDays + unpaidLeaveDays;
            const attendanceAdjustment = -(dailyRate * unpaidDays);

            // Calculate adjusted gross salary (after attendance adjustment)
            const grossSalary = fullGrossSalary + attendanceAdjustment;

            // Calculate deductions (based on full basic salary, not prorated)
            const pfEmployee = (basicSalary * (pfPercentage / 100));
            const pfEmployer = (basicSalary * (pfPercentage / 100));
            const professionalTax = salaryStructure.professional_tax || professionalTaxAmount;
            const otherDeductions = salaryStructure.other_deductions || 0;
            const totalDeductions = pfEmployee + professionalTax + otherDeductions;

            // Calculate net salary
            const netSalary = grossSalary - totalDeductions;

            // Create payslip
            const payslip = await Payslip.create({
                payroll_run_id: id,
                user_id: employee.id,
                basic_salary: basicSalary,
                hra: hra,
                transport_allowance: transportAllowance,
                medical_allowance: medicalAllowance,
                other_allowances: otherAllowances,
                gross_salary: grossSalary,
                pf_employee: pfEmployee,
                pf_employer: pfEmployer,
                professional_tax: professionalTax,
                other_deductions: otherDeductions,
                total_deductions: totalDeductions,
                net_salary: netSalary,
                working_days: daysInMonth,
                present_days: presentDays,
                leave_days: paidLeaveDays,
                absent_days: absentDays + unpaidLeaveDays
            });

            payslips.push(payslip);
            totalAmount += netSalary;

            // Send payslip email notification (async, don't wait)
            const monthName = new Date(2000, payrollRun.month - 1).toLocaleString('default', { month: 'long' });
            sendPayslipEmail(
                employee.email,
                employee.first_name,
                monthName,
                payrollRun.year,
                payslip.id
            ).catch(err => console.error(`Failed to send payslip email to ${employee.email}:`, err));
        }

        // Update payroll run
        await PayrollRun.update(id, {
            status: 'completed',
            total_employees: payslips.length,
            total_amount: totalAmount
        });

        await logAction(req, 'PAYROLL_PROCESSED', 'payroll_runs', id, payrollRun, { total_employees: payslips.length, total_amount: totalAmount });

        res.json({
            success: true,
            message: 'Payroll processed successfully',
            data: {
                payroll_run: await PayrollRun.findById(id),
                payslips_count: payslips.length,
                total_amount: totalAmount
            }
        });
    } catch (error) {
        next(error);
    }
};

export const getAllPayrollRuns = async (req, res, next) => {
    try {
        const { month, year, status } = req.query;

        const filters = {};
        if (month) filters.month = parseInt(month);
        if (year) filters.year = parseInt(year);
        if (status) filters.status = status;

        const payrollRuns = await PayrollRun.findAll(filters);

        res.json({
            success: true,
            count: payrollRuns.length,
            data: payrollRuns
        });
    } catch (error) {
        next(error);
    }
};

export const getPayrollRunById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const payrollRun = await PayrollRun.findById(id);

        if (!payrollRun) {
            return res.status(404).json({
                success: false,
                message: 'Payroll run not found'
            });
        }

        res.json({
            success: true,
            data: payrollRun
        });
    } catch (error) {
        next(error);
    }
};

export const getAllPayslips = async (req, res, next) => {
    try {
        const { payroll_run_id, user_id, month, year } = req.query;

        const filters = {};
        if (payroll_run_id) filters.payroll_run_id = parseInt(payroll_run_id);
        if (user_id) filters.user_id = parseInt(user_id);
        if (month) filters.month = parseInt(month);
        if (year) filters.year = parseInt(year);

        const payslips = await Payslip.findAll(filters);

        res.json({
            success: true,
            count: payslips.length,
            data: payslips
        });
    } catch (error) {
        next(error);
    }
};

export const getMySalaryStructure = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const salaryStructures = await SalaryStructure.findByUserId(userId);

        res.json({
            success: true,
            count: salaryStructures.length,
            data: salaryStructures
        });
    } catch (error) {
        next(error);
    }
};

export const getMyPayslips = async (req, res, next) => {
    try {
        const user_id = req.user.id;
        const { month, year } = req.query;

        const filters = { user_id };
        if (month) filters.month = parseInt(month);
        if (year) filters.year = parseInt(year);

        const payslips = await Payslip.findAll(filters);

        res.json({
            success: true,
            count: payslips.length,
            data: payslips
        });
    } catch (error) {
        next(error);
    }
};

export const getPayslipById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const payslip = await Payslip.findById(id);

        if (!payslip) {
            return res.status(404).json({
                success: false,
                message: 'Payslip not found'
            });
        }

        // Check if user has access (own payslip or admin/payroll officer)
        if (payslip.user_id !== req.user.id && 
            !['admin', 'payroll officer'].includes(req.user.role_name?.toLowerCase())) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        res.json({
            success: true,
            data: payslip
        });
    } catch (error) {
        next(error);
    }
};

export const updatePayrollRun = async (req, res, next) => {
    try {
        const { id } = req.params;
        const oldPayrollRun = await PayrollRun.findById(id);

        if (!oldPayrollRun) {
            return res.status(404).json({
                success: false,
                message: 'Payroll run not found'
            });
        }

        const { status, notes } = req.body;
        const updateData = { status, notes };
        Object.keys(updateData).forEach(key => 
            updateData[key] === undefined && delete updateData[key]
        );

        const updatedPayrollRun = await PayrollRun.update(id, updateData);

        await logAction(req, 'PAYROLL_RUN_UPDATED', 'payroll_runs', id, oldPayrollRun, updatedPayrollRun);

        res.json({
            success: true,
            message: 'Payroll run updated successfully',
            data: updatedPayrollRun
        });
    } catch (error) {
        next(error);
    }
};

// Get payroll dashboard statistics
export const getPayrollDashboard = async (req, res, next) => {
    try {
        // Get warnings - check if columns exist first
        let employeesWithoutBank = { rows: [{ count: '0' }] };
        let employeesWithoutManager = { rows: [{ count: '0' }] };
        
        try {
            employeesWithoutBank = await pool.query(`
                SELECT COUNT(*) as count
                FROM users u
                WHERE u.is_active = TRUE 
                AND (u.bank_account_number IS NULL OR u.bank_account_number = '')
            `);
        } catch (err) {
            // Column might not exist, ignore
            console.log('bank_account_number column may not exist');
        }

        try {
            employeesWithoutManager = await pool.query(`
                SELECT COUNT(*) as count
                FROM users u
                WHERE u.is_active = TRUE 
                AND u.manager_id IS NULL
            `);
        } catch (err) {
            // Column might not exist, ignore
            console.log('manager_id column may not exist');
        }

        // Get recent pay runs
        const recentPayruns = await PayrollRun.findAll({});
        const payrunsWithPayslipCount = await Promise.all(
            recentPayruns.slice(0, 5).map(async (payrun) => {
                const payslipCount = await pool.query(
                    'SELECT COUNT(*) as count FROM payslips WHERE payroll_run_id = $1',
                    [payrun.id]
                );
                return {
                    ...payrun,
                    payslip_count: parseInt(payslipCount.rows[0].count)
                };
            })
        );

        // Get employer costs (monthly and annual)
        const currentYear = new Date().getFullYear();
        let employerCosts = { rows: [] };
        let employeeCounts = { rows: [] };
        
        try {
            employerCosts = await pool.query(`
                SELECT 
                    pr.month,
                    pr.year,
                    SUM(p.gross_salary + COALESCE(p.pf_employer, 0)) as employer_cost
                FROM payroll_runs pr
                JOIN payslips p ON pr.id = p.payroll_run_id
                WHERE pr.year = $1
                GROUP BY pr.month, pr.year
                ORDER BY pr.month
            `, [currentYear]);
        } catch (err) {
            console.error('Error fetching employer costs:', err);
        }

        // Get employee count (monthly and annual)
        try {
            employeeCounts = await pool.query(`
                SELECT 
                    pr.month,
                    pr.year,
                    COUNT(DISTINCT p.user_id) as employee_count
                FROM payroll_runs pr
                JOIN payslips p ON pr.id = p.payroll_run_id
                WHERE pr.year = $1
                GROUP BY pr.month, pr.year
                ORDER BY pr.month
            `, [currentYear]);
        } catch (err) {
            console.error('Error fetching employee counts:', err);
        }

        res.json({
            success: true,
            data: {
                warnings: {
                    employees_without_bank: parseInt(employeesWithoutBank.rows[0]?.count || 0),
                    employees_without_manager: parseInt(employeesWithoutManager.rows[0]?.count || 0)
                },
                payruns: payrunsWithPayslipCount || [],
                employer_costs: {
                    monthly: employerCosts.rows || [],
                    annual: (employerCosts.rows || []).reduce((sum, row) => sum + parseFloat(row.employer_cost || 0), 0)
                },
                employee_counts: {
                    monthly: employeeCounts.rows || [],
                    annual: (employeeCounts.rows || []).reduce((sum, row) => sum + parseInt(row.employee_count || 0), 0)
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

// Validate payrun or payslip
export const validatePayroll = async (req, res, next) => {
    try {
        const { type, id } = req.body; // type: 'payrun' or 'payslip'

        if (type === 'payrun') {
            const payrun = await PayrollRun.findById(id);
            if (!payrun) {
                return res.status(404).json({
                    success: false,
                    message: 'Payroll run not found'
                });
            }

            // Update payrun status to 'paid' (validated)
            await PayrollRun.update(id, { status: 'paid' });

            // Update all payslips in this payrun to 'done' status
            await pool.query(
                `UPDATE payslips SET status = 'done' WHERE payroll_run_id = $1`,
                [id]
            );

            await logAction(req, 'PAYROLL_RUN_VALIDATED', 'payroll_runs', id, payrun, { status: 'paid' });

            res.json({
                success: true,
                message: 'Payroll run validated successfully'
            });
        } else if (type === 'payslip') {
            const payslip = await Payslip.findById(id);
            if (!payslip) {
                return res.status(404).json({
                    success: false,
                    message: 'Payslip not found'
                });
            }

            // Update payslip status to 'done'
            await Payslip.update(id, { status: 'done' });

            await logAction(req, 'PAYSLIP_VALIDATED', 'payslips', id, payslip, { status: 'done' });

            res.json({
                success: true,
                message: 'Payslip validated successfully'
            });
        } else {
            return res.status(400).json({
                success: false,
                message: 'Invalid type. Must be "payrun" or "payslip"'
            });
        }
    } catch (error) {
        next(error);
    }
};

// Get payslip computation details
export const getPayslipComputation = async (req, res, next) => {
    try {
        const { id } = req.params;
        const payslip = await Payslip.findById(id);

        if (!payslip) {
            return res.status(404).json({
                success: false,
                message: 'Payslip not found'
            });
        }

        // Check access
        if (payslip.user_id !== req.user.id && 
            !['admin', 'payroll officer'].includes(req.user.role_name?.toLowerCase())) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        // Get payroll run details
        const payrollRun = await PayrollRun.findById(payslip.payroll_run_id);
        
        // Get attendance records for the month
        const startDate = `${payrollRun.year}-${String(payrollRun.month).padStart(2, '0')}-01`;
        const endDate = new Date(payrollRun.year, payrollRun.month, 0).toISOString().split('T')[0];

        const attendanceRecords = await Attendance.findAll({
            user_id: payslip.user_id,
            start_date: startDate,
            end_date: endDate
        });

        // Get leave applications for the month
        const leaveApplications = await LeaveApplication.findAll({
            user_id: payslip.user_id,
            start_date: startDate,
            end_date: endDate
        });

        // Calculate worked days breakdown
        const presentDays = attendanceRecords.filter(a => a.status === 'present').length;
        
        // Calculate paid and unpaid leave days
        let paidLeaveDays = 0;
        let unpaidLeaveDays = 0;
        
        for (const la of leaveApplications.filter(la => la.status === 'approved')) {
            const leaveTypeResult = await pool.query('SELECT is_paid FROM leave_types WHERE id = $1', [la.leave_type_id]);
            const isPaid = leaveTypeResult.rows[0]?.is_paid;
            if (isPaid) {
                paidLeaveDays += parseFloat(la.total_days || 0);
            } else {
                unpaidLeaveDays += parseFloat(la.total_days || 0);
            }
        }

        // Get salary structure for breakdown
        const salaryStructure = await SalaryStructure.findActiveByUserId(payslip.user_id);
        const workingDaysPerWeek = await SystemSetting.getValue('working_days_per_week', 5);
        const daysInMonth = payslip.working_days || new Date(payrollRun.year, payrollRun.month, 0).getDate();
        const dailyRate = payslip.basic_salary / daysInMonth;

        // Worked days breakdown
        const workedDaysBreakdown = [
            {
                type: 'Attendance',
                days: presentDays,
                description: `${workingDaysPerWeek} working days in week`,
                amount: dailyRate * presentDays
            },
            {
                type: 'Paid Time Off',
                days: paidLeaveDays,
                description: `${paidLeaveDays} Paid leaves/Month`,
                amount: dailyRate * paidLeaveDays
            }
        ];

        const totalDays = presentDays + paidLeaveDays;
        const totalAmount = workedDaysBreakdown.reduce((sum, item) => sum + item.amount, 0);

        // Calculate full gross salary for computation display
        const fullGrossSalary = payslip.basic_salary + payslip.hra + payslip.transport_allowance + 
                               payslip.medical_allowance + payslip.other_allowances;
        
        // Calculate percentages for each component (based on wage)
        const wage = fullGrossSalary; // Total wage is the sum of all components
        const basicPercent = wage > 0 ? (payslip.basic_salary / wage) * 100 : 0;
        const hraPercent = wage > 0 ? (payslip.hra / wage) * 100 : 0;
        const standardPercent = wage > 0 ? (payslip.medical_allowance / wage) * 100 : 0;
        
        // Split other_allowances into Performance Bonus, LTA, and Fixed Allowance
        // Based on typical structure: Performance Bonus (15%), LTA (5%), Fixed Allowance (remaining)
        const otherAllowances = payslip.other_allowances || 0;
        const performanceBonus = otherAllowances * 0.6; // ~15% of wage if other_allowances is 25% of wage
        const lta = otherAllowances * 0.2; // ~5% of wage
        const fixedAllowance = otherAllowances * 0.2; // Remaining
        
        // Salary computation breakdown
        const salaryComputation = [
            { rule_name: 'Basic Salary', rate_percent: Math.round(basicPercent), amount: payslip.basic_salary },
            { rule_name: 'House Rent Allowance', rate_percent: Math.round(hraPercent), amount: payslip.hra || 0 },
            { rule_name: 'Standard Allowance', rate_percent: Math.round(standardPercent), amount: payslip.medical_allowance || 0 },
            { rule_name: 'Performance Bonus', rate_percent: 100, amount: performanceBonus },
            { rule_name: 'Leave Travel Allowance', rate_percent: 100, amount: lta },
            { rule_name: 'Fixed Allowance', rate_percent: 100, amount: fixedAllowance },
            { rule_name: 'Gross', rate_percent: 100, amount: fullGrossSalary }
        ];

        const deductions = [
            { rule_name: 'PF Employee', rate_percent: 100, amount: -payslip.pf_employee },
            { rule_name: 'PF Employer', rate_percent: 100, amount: -payslip.pf_employer },
            { rule_name: 'Professional Tax', rate_percent: 100, amount: -payslip.professional_tax }
        ];

        res.json({
            success: true,
            data: {
                payslip,
                payroll_run: payrollRun,
                worked_days: {
                    breakdown: workedDaysBreakdown,
                    total_days: totalDays,
                    total_amount: totalAmount
                },
                salary_computation: {
                    gross: salaryComputation,
                    deductions: deductions,
                    net_amount: payslip.net_salary
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

// Download payslip as PDF
export const downloadPayslipPDF = async (req, res, next) => {
    try {
        const { id } = req.params;
        const payslip = await Payslip.findById(id);

        if (!payslip) {
            return res.status(404).json({
                success: false,
                message: 'Payslip not found'
            });
        }

        // Check if user has access (own payslip or admin/payroll officer)
        if (payslip.user_id !== req.user.id && 
            !['admin', 'payroll officer'].includes(req.user.role_name?.toLowerCase())) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        // Get employee details
        const employeeResult = await pool.query(`
            SELECT u.*, d.name as department_name
            FROM users u
            LEFT JOIN departments d ON u.department_id = d.id
            WHERE u.id = $1
        `, [payslip.user_id]);

        if (employeeResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        const employee = employeeResult.rows[0];

        // Get payroll run details
        const payrollRun = await PayrollRun.findById(payslip.payroll_run_id);
        if (!payrollRun) {
            return res.status(404).json({
                success: false,
                message: 'Payroll run not found'
            });
        }

        // Generate PDF
        const pdfBuffer = await generatePayslipPDF(payslip, employee, payrollRun);

        // Set response headers
        const monthName = new Date(2000, payrollRun.month - 1).toLocaleString('default', { month: 'long' });
        const filename = `Payslip_${employee.employee_id}_${monthName}_${payrollRun.year}.pdf`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', pdfBuffer.length);

        res.send(pdfBuffer);
    } catch (error) {
        next(error);
    }
};

// Generate payslip report
export const generatePayslipReport = async (req, res, next) => {
    try {
        const { month, year, user_id, format } = req.query;

        const filters = {};
        if (month) filters.month = parseInt(month);
        if (year) filters.year = parseInt(year);
        if (user_id) filters.user_id = parseInt(user_id);

        const payslips = await Payslip.findAll(filters);

        // Format: 'json' or 'csv'
        if (format === 'csv') {
            // Generate CSV
            const csvHeader = 'Employee ID,Employee Name,Month,Year,Gross Salary,Total Deductions,Net Salary,Status\n';
            const csvRows = payslips.map(p => 
                `${p.employee_id || ''},"${p.employee_name || ''}",${p.month || ''},${p.year || ''},${p.gross_salary || 0},${p.total_deductions || 0},${p.net_salary || 0},${p.status || 'pending'}`
            ).join('\n');
            
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="payslip_report_${month || 'all'}_${year || 'all'}.csv"`);
            res.send(csvHeader + csvRows);
        } else {
            // Return JSON
            res.json({
                success: true,
                count: payslips.length,
                data: payslips,
                summary: {
                    total_gross: payslips.reduce((sum, p) => sum + parseFloat(p.gross_salary || 0), 0),
                    total_deductions: payslips.reduce((sum, p) => sum + parseFloat(p.total_deductions || 0), 0),
                    total_net: payslips.reduce((sum, p) => sum + parseFloat(p.net_salary || 0), 0)
                }
            });
        }
    } catch (error) {
        next(error);
    }
};


