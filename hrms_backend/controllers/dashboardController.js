import { pool } from '../config/db.js';
import { User } from '../models/User.js';
import { Attendance } from '../models/Attendance.js';
import { LeaveApplication } from '../models/LeaveApplication.js';
import { PayrollRun } from '../models/PayrollRun.js';
import { Payslip } from '../models/Payslip.js';

export const getDashboardStats = async (req, res, next) => {
    try {
        const userRole = req.user.role_name?.toLowerCase();
        const userId = req.user.id;

        let stats = {};

        if (userRole === 'admin') {
            // Admin dashboard - all stats
            const totalEmployees = await pool.query(
                'SELECT COUNT(*) as count FROM users WHERE is_active = TRUE'
            );
            const totalDepartments = await pool.query('SELECT COUNT(*) as count FROM departments');
            const pendingLeaves = await pool.query(
                'SELECT COUNT(*) as count FROM leave_applications WHERE status = $1',
                ['pending']
            );
            const thisMonthAttendance = await pool.query(
                `SELECT 
                    COUNT(CASE WHEN status = 'present' THEN 1 END) as present,
                    COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent,
                    COUNT(CASE WHEN status = 'leave' THEN 1 END) as leave
                FROM attendance 
                WHERE DATE_TRUNC('month', date) = DATE_TRUNC('month', CURRENT_DATE)`
            );
            const recentPayrollRuns = await PayrollRun.findAll({});
            const totalPayrollAmount = await pool.query(
                'SELECT COALESCE(SUM(total_amount), 0) as total FROM payroll_runs WHERE status = $1',
                ['completed']
            );

            stats = {
                total_employees: parseInt(totalEmployees.rows[0].count),
                total_departments: parseInt(totalDepartments.rows[0].count),
                pending_leaves: parseInt(pendingLeaves.rows[0].count),
                this_month_attendance: {
                    present: parseInt(thisMonthAttendance.rows[0].present),
                    absent: parseInt(thisMonthAttendance.rows[0].absent),
                    leave: parseInt(thisMonthAttendance.rows[0].leave)
                },
                recent_payroll_runs: recentPayrollRuns.slice(0, 5),
                total_payroll_amount: parseFloat(totalPayrollAmount.rows[0].total)
            };
        } else if (userRole === 'hr officer') {
            // HR Officer dashboard
            const totalEmployees = await pool.query(
                'SELECT COUNT(*) as count FROM users WHERE is_active = TRUE'
            );
            const pendingLeaves = await pool.query(
                'SELECT COUNT(*) as count FROM leave_applications WHERE status = $1',
                ['pending']
            );
            const thisMonthAttendance = await pool.query(
                `SELECT 
                    COUNT(CASE WHEN status = 'present' THEN 1 END) as present,
                    COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent
                FROM attendance 
                WHERE DATE_TRUNC('month', date) = DATE_TRUNC('month', CURRENT_DATE)`
            );

            stats = {
                total_employees: parseInt(totalEmployees.rows[0].count),
                pending_leaves: parseInt(pendingLeaves.rows[0].count),
                this_month_attendance: {
                    present: parseInt(thisMonthAttendance.rows[0].present),
                    absent: parseInt(thisMonthAttendance.rows[0].absent)
                }
            };
        } else if (userRole === 'payroll officer') {
            // Payroll Officer dashboard
            const pendingLeaves = await pool.query(
                'SELECT COUNT(*) as count FROM leave_applications WHERE status = $1',
                ['pending']
            );
            const recentPayrollRuns = await PayrollRun.findAll({});
            const totalPayrollAmount = await pool.query(
                'SELECT COALESCE(SUM(total_amount), 0) as total FROM payroll_runs WHERE status = $1',
                ['completed']
            );

            stats = {
                pending_leaves: parseInt(pendingLeaves.rows[0].count),
                recent_payroll_runs: recentPayrollRuns.slice(0, 5),
                total_payroll_amount: parseFloat(totalPayrollAmount.rows[0].total)
            };
        } else {
            // Employee dashboard
            const myAttendance = await Attendance.findAll({
                user_id: userId,
                start_date: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
            });
            const myLeaves = await LeaveApplication.findAll({ user_id: userId });
            const myPayslips = await Payslip.findAll({ user_id: userId });

            const presentDays = myAttendance.filter(a => a.status === 'present').length;
            const leaveDays = myAttendance.filter(a => a.status === 'leave').length;
            const pendingLeaves = myLeaves.filter(l => l.status === 'pending').length;

            stats = {
                this_month_attendance: {
                    present: presentDays,
                    leave: leaveDays,
                    total: myAttendance.length
                },
                leave_applications: {
                    total: myLeaves.length,
                    pending: pendingLeaves,
                    approved: myLeaves.filter(l => l.status === 'approved').length
                },
                payslips_count: myPayslips.length,
                recent_payslips: myPayslips.slice(0, 3)
            };
        }

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        next(error);
    }
};

export const getEmployeeCountByDepartment = async (req, res, next) => {
    try {
        const result = await pool.query('SELECT * FROM v_employee_count_by_department');
        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        next(error);
    }
};

export const getLeaveBalance = async (req, res, next) => {
    try {
        const { user_id } = req.query;
        let query = 'SELECT * FROM v_leave_balance';
        const params = [];

        if (user_id) {
            query += ' WHERE user_id = $1';
            params.push(user_id);
        } else if (req.user.role_name?.toLowerCase() !== 'admin' && 
                   req.user.role_name?.toLowerCase() !== 'hr officer') {
            // Employees can only see their own balance
            query += ' WHERE user_id = $1';
            params.push(req.user.id);
        }

        const result = await pool.query(query, params);
        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        next(error);
    }
};

export const getMonthlyAttendanceSummary = async (req, res, next) => {
    try {
        const { user_id, month, year } = req.query;
        let query = 'SELECT * FROM v_monthly_attendance_summary WHERE 1=1';
        const params = [];
        let paramCount = 1;

        if (user_id) {
            query += ` AND user_id = $${paramCount++}`;
            params.push(user_id);
        } else if (req.user.role_name?.toLowerCase() === 'employee') {
            // Employees can only see their own summary
            query += ` AND user_id = $${paramCount++}`;
            params.push(req.user.id);
        }

        if (month) {
            query += ` AND EXTRACT(MONTH FROM month) = $${paramCount++}`;
            params.push(month);
        }

        if (year) {
            query += ` AND EXTRACT(YEAR FROM month) = $${paramCount++}`;
            params.push(year);
        }

        query += ' ORDER BY month DESC, employee_name';

        const result = await pool.query(query, params);
        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        next(error);
    }
};


