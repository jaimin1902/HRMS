import { PayrollRun } from '../models/PayrollRun.js';
import { Payslip } from '../models/Payslip.js';
import { SalaryStructure } from '../models/SalaryStructure.js';
import { Attendance } from '../models/Attendance.js';
import { LeaveApplication } from '../models/LeaveApplication.js';
import { User } from '../models/User.js';
import { SystemSetting } from '../models/SystemSetting.js';
import { pool } from '../config/db.js';
import { logAction } from '../utils/auditLogger.js';

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

            const presentDays = attendanceRecords.filter(a => a.status === 'present').length;
            const leaveDays = attendanceRecords.filter(a => a.status === 'leave').length;
            const absentDays = attendanceRecords.filter(a => a.status === 'absent').length;
            const totalWorkingDays = presentDays + leaveDays;

            // Calculate salary components
            const basicSalary = salaryStructure.basic_salary;
            const hra = salaryStructure.hra || 0;
            const transportAllowance = salaryStructure.transport_allowance || 0;
            const medicalAllowance = salaryStructure.medical_allowance || 0;
            const otherAllowances = salaryStructure.other_allowances || 0;

            // Calculate gross salary (pro-rated based on working days)
            const daysInMonth = new Date(payrollRun.year, payrollRun.month, 0).getDate();
            const grossSalary = (
                (basicSalary + hra + transportAllowance + medicalAllowance + otherAllowances) *
                (totalWorkingDays / daysInMonth)
            );

            // Calculate deductions
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
                leave_days: leaveDays,
                absent_days: absentDays
            });

            payslips.push(payslip);
            totalAmount += netSalary;
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


