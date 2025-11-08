import express from 'express';
import {
    getDashboardStats,
    getEmployeeCountByDepartment,
    getLeaveBalance,
    getMonthlyAttendanceSummary
} from '../controllers/dashboardController.js';
import { authenticate, authorize } from '../middlewares/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router.get('/stats', getDashboardStats);
router.get('/departments/employee-count', authorize('admin', 'hr officer'), getEmployeeCountByDepartment);
router.get('/leave-balance', getLeaveBalance);
router.get('/attendance-summary', getMonthlyAttendanceSummary);

export default router;


