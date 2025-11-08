import { Attendance } from '../models/Attendance.js';
import { logAction } from '../utils/auditLogger.js';

export const markAttendance = async (req, res, next) => {
    try {
        const user_id = req.user.id;
        const { date, check_in_time, status } = req.body;

        const attendanceDate = date || new Date().toISOString().split('T')[0];
        const checkIn = check_in_time || new Date().toISOString();

        const attendance = await Attendance.markAttendance(
            user_id,
            attendanceDate,
            checkIn,
            status || 'present'
        );

        await logAction(req, 'ATTENDANCE_MARKED', 'attendance', attendance.id, null, { date: attendanceDate, status });

        res.status(201).json({
            success: true,
            message: 'Attendance marked successfully',
            data: attendance
        });
    } catch (error) {
        next(error);
    }
};

export const checkOut = async (req, res, next) => {
    try {
        const user_id = req.user.id;
        const { date, check_out_time } = req.body;

        const attendanceDate = date || new Date().toISOString().split('T')[0];
        const checkOut = check_out_time || new Date().toISOString();

        const attendance = await Attendance.checkOut(user_id, attendanceDate, checkOut);

        await logAction(req, 'ATTENDANCE_CHECKOUT', 'attendance', attendance.id, null, { check_out_time: checkOut });

        res.json({
            success: true,
            message: 'Check-out recorded successfully',
            data: attendance
        });
    } catch (error) {
        next(error);
    }
};

export const getMyAttendance = async (req, res, next) => {
    try {
        const user_id = req.user.id;
        const { start_date, end_date, status } = req.query;

        const filters = { user_id };
        if (start_date) filters.start_date = start_date;
        if (end_date) filters.end_date = end_date;
        if (status) filters.status = status;

        const attendance = await Attendance.findAll(filters);

        res.json({
            success: true,
            count: attendance.length,
            data: attendance
        });
    } catch (error) {
        next(error);
    }
};

export const getAllAttendance = async (req, res, next) => {
    try {
        const { user_id, start_date, end_date, status } = req.query;

        const filters = {};
        if (user_id) filters.user_id = parseInt(user_id);
        if (start_date) filters.start_date = start_date;
        if (end_date) filters.end_date = end_date;
        if (status) filters.status = status;

        const attendance = await Attendance.findAll(filters);

        res.json({
            success: true,
            count: attendance.length,
            data: attendance
        });
    } catch (error) {
        next(error);
    }
};

export const getAttendanceById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const attendance = await Attendance.findById(id);

        if (!attendance) {
            return res.status(404).json({
                success: false,
                message: 'Attendance record not found'
            });
        }

        res.json({
            success: true,
            data: attendance
        });
    } catch (error) {
        next(error);
    }
};

export const updateAttendance = async (req, res, next) => {
    try {
        const { id } = req.params;
        const oldAttendance = await Attendance.findById(id);

        if (!oldAttendance) {
            return res.status(404).json({
                success: false,
                message: 'Attendance record not found'
            });
        }

        const { check_in_time, check_out_time, working_hours, status, notes } = req.body;

        const updateData = {
            check_in_time, check_out_time, working_hours, status, notes
        };

        Object.keys(updateData).forEach(key => 
            updateData[key] === undefined && delete updateData[key]
        );

        const updatedAttendance = await Attendance.update(id, updateData);

        await logAction(req, 'ATTENDANCE_UPDATED', 'attendance', id, oldAttendance, updatedAttendance);

        res.json({
            success: true,
            message: 'Attendance updated successfully',
            data: updatedAttendance
        });
    } catch (error) {
        next(error);
    }
};


