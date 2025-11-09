import express from 'express';
import {
    markAttendance,
    checkOut,
    getMyAttendance,
    getAllAttendance,
    getAttendanceById,
    updateAttendance,
    markAttendanceForUser,
    checkOutForUser
} from '../controllers/attendanceController.js';
import { authenticate, authorize } from '../middlewares/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Employee routes
router.post('/mark', markAttendance);
router.post('/checkout', checkOut);
router.get('/my', getMyAttendance);

// Admin/HR routes for marking attendance for any user (must come before /:id route)
router.post('/admin/mark', authorize('admin', 'hr officer'), markAttendanceForUser);
router.post('/admin/checkout', authorize('admin', 'hr officer'), checkOutForUser);

// Admin, HR Officer, Payroll Officer can view all attendance
router.get('/', authorize('admin', 'hr officer', 'payroll officer'), getAllAttendance);
router.get('/:id', authorize('admin', 'hr officer', 'payroll officer'), getAttendanceById);
router.put('/:id', authorize('admin', 'hr officer'), updateAttendance);

export default router;


