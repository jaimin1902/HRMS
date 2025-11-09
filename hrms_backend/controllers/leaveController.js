import { LeaveApplication } from '../models/LeaveApplication.js';
import { LeaveType } from '../models/LeaveType.js';
import { Attendance } from '../models/Attendance.js';
import { logAction } from '../utils/auditLogger.js';

export const applyLeave = async (req, res, next) => {
    try {
        const user_id = req.user.id;
        const { leave_type_id, start_date, end_date, reason } = req.body;

        if (!leave_type_id || !start_date || !end_date) {
            return res.status(400).json({
                success: false,
                message: 'Leave type, start date, and end date are required'
            });
        }

        // Calculate total days
        const start = new Date(start_date);
        const end = new Date(end_date);
        const diffTime = Math.abs(end - start);
        const total_days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

        const leaveApplication = await LeaveApplication.create({
            user_id,
            leave_type_id,
            start_date,
            end_date,
            total_days,
            reason
        });

        await logAction(req, 'LEAVE_APPLIED', 'leave_applications', leaveApplication.id, null, { start_date, end_date, total_days });

        res.status(201).json({
            success: true,
            message: 'Leave application submitted successfully',
            data: leaveApplication
        });
    } catch (error) {
        next(error);
    }
};

export const getMyLeaves = async (req, res, next) => {
    try {
        const user_id = req.user.id;
        const { status, start_date, end_date } = req.query;

        const filters = { user_id };
        if (status) filters.status = status;
        if (start_date) filters.start_date = start_date;
        if (end_date) filters.end_date = end_date;

        const leaves = await LeaveApplication.findAll(filters);

        res.json({
            success: true,
            count: leaves.length,
            data: leaves
        });
    } catch (error) {
        next(error);
    }
};

export const getAllLeaves = async (req, res, next) => {
    try {
        const { user_id, status, leave_type_id, start_date, end_date } = req.query;

        const filters = {};
        if (user_id) filters.user_id = parseInt(user_id);
        if (status) filters.status = status;
        if (leave_type_id) filters.leave_type_id = parseInt(leave_type_id);
        if (start_date) filters.start_date = start_date;
        if (end_date) filters.end_date = end_date;

        const leaves = await LeaveApplication.findAll(filters);

        res.json({
            success: true,
            count: leaves.length,
            data: leaves
        });
    } catch (error) {
        next(error);
    }
};

export const getLeaveById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const leave = await LeaveApplication.findById(id);

        if (!leave) {
            return res.status(404).json({
                success: false,
                message: 'Leave application not found'
            });
        }

        res.json({
            success: true,
            data: leave
        });
    } catch (error) {
        next(error);
    }
};

export const approveLeave = async (req, res, next) => {
    try {
        const { id } = req.params;
        const approved_by = req.user.id;
        const { rejection_reason } = req.body;

        const oldLeave = await LeaveApplication.findById(id);
        if (!oldLeave) {
            return res.status(404).json({
                success: false,
                message: 'Leave application not found'
            });
        }

        if (oldLeave.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Leave application is not pending'
            });
        }

        const updatedLeave = await LeaveApplication.approve(id, approved_by, rejection_reason);

        // Update attendance records for the leave period
        const startDate = new Date(updatedLeave.start_date);
        const endDate = new Date(updatedLeave.end_date);
        const currentDate = new Date(startDate);

        while (currentDate <= endDate) {
            const dateStr = currentDate.toISOString().split('T')[0];
            await Attendance.create({
                user_id: updatedLeave.user_id,
                date: dateStr,
                status: 'leave',
                leave_application_id: updatedLeave.id
            });
            currentDate.setDate(currentDate.getDate() + 1);
        }

        await logAction(req, 'LEAVE_APPROVED', 'leave_applications', id, oldLeave, updatedLeave);

        res.json({
            success: true,
            message: 'Leave application approved successfully',
            data: updatedLeave
        });
    } catch (error) {
        next(error);
    }
};

export const rejectLeave = async (req, res, next) => {
    try {
        const { id } = req.params;
        const approved_by = req.user.id;
        const { rejection_reason } = req.body;

        if (!rejection_reason) {
            return res.status(400).json({
                success: false,
                message: 'Rejection reason is required'
            });
        }

        const oldLeave = await LeaveApplication.findById(id);
        if (!oldLeave) {
            return res.status(404).json({
                success: false,
                message: 'Leave application not found'
            });
        }

        if (oldLeave.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Leave application is not pending'
            });
        }

        const updatedLeave = await LeaveApplication.reject(id, approved_by, rejection_reason);

        await logAction(req, 'LEAVE_REJECTED', 'leave_applications', id, oldLeave, updatedLeave);

        res.json({
            success: true,
            message: 'Leave application rejected',
            data: updatedLeave
        });
    } catch (error) {
        next(error);
    }
};

export const cancelLeave = async (req, res, next) => {
    try {
        const { id } = req.params;
        const user_id = req.user.id;

        const oldLeave = await LeaveApplication.findById(id);
        if (!oldLeave) {
            return res.status(404).json({
                success: false,
                message: 'Leave application not found'
            });
        }

        if (oldLeave.user_id !== user_id) {
            return res.status(403).json({
                success: false,
                message: 'You can only cancel your own leave applications'
            });
        }

        if (oldLeave.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Only pending leave applications can be cancelled'
            });
        }

        const updatedLeave = await LeaveApplication.update(id, { status: 'cancelled' });

        await logAction(req, 'LEAVE_CANCELLED', 'leave_applications', id, oldLeave, updatedLeave);

        res.json({
            success: true,
            message: 'Leave application cancelled successfully',
            data: updatedLeave
        });
    } catch (error) {
        next(error);
    }
};

export const getAllLeaveTypes = async (req, res, next) => {
    try {
        const leaveTypes = await LeaveType.findAll();

        res.json({
            success: true,
            count: leaveTypes.length,
            data: leaveTypes
        });
    } catch (error) {
        next(error);
    }
};

// Generate leave report
export const generateLeaveReport = async (req, res, next) => {
    try {
        const { status, start_date, end_date, user_id, leave_type_id, format } = req.query;

        const filters = {};
        if (status) filters.status = status;
        if (start_date) filters.start_date = start_date;
        if (end_date) filters.end_date = end_date;
        if (user_id) filters.user_id = parseInt(user_id);
        if (leave_type_id) filters.leave_type_id = parseInt(leave_type_id);

        const leaves = await LeaveApplication.findAll(filters);

        // Format: 'json' or 'csv'
        if (format === 'csv') {
            // Generate CSV
            const csvHeader = 'Employee ID,Employee Name,Leave Type,Start Date,End Date,Total Days,Status,Applied At,Approved By\n';
            const csvRows = leaves.map(l => 
                `${l.employee_id || ''},"${l.employee_name || ''}","${l.leave_type_name || ''}",${l.start_date || ''},${l.end_date || ''},${l.total_days || 0},${l.status || 'pending'},${l.applied_at || ''},"${l.approved_by_name || ''}"`
            ).join('\n');
            
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="leave_report_${start_date || 'all'}_${end_date || 'all'}.csv"`);
            res.send(csvHeader + csvRows);
        } else {
            // Return JSON
            res.json({
                success: true,
                count: leaves.length,
                data: leaves,
                summary: {
                    total_days: leaves.reduce((sum, l) => sum + parseFloat(l.total_days || 0), 0),
                    approved: leaves.filter(l => l.status === 'approved').length,
                    pending: leaves.filter(l => l.status === 'pending').length,
                    rejected: leaves.filter(l => l.status === 'rejected').length
                }
            });
        }
    } catch (error) {
        next(error);
    }
};


