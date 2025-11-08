import express from 'express';
import {
    applyLeave,
    getMyLeaves,
    getAllLeaves,
    getLeaveById,
    approveLeave,
    rejectLeave,
    cancelLeave,
    getAllLeaveTypes,
    generateLeaveReport
} from '../controllers/leaveController.js';
import { authenticate, authorize } from '../middlewares/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Public leave types
router.get('/types', getAllLeaveTypes);

// Employee routes
router.post('/apply', applyLeave);
router.get('/my', getMyLeaves);
router.put('/:id/cancel', cancelLeave);

// Admin, HR Officer, Payroll Officer routes
router.get('/', authorize('admin', 'hr officer', 'payroll officer'), getAllLeaves);
router.get('/reports', authorize('admin', 'hr officer', 'payroll officer'), generateLeaveReport);
router.get('/:id', authorize('admin', 'hr officer', 'payroll officer', 'employee'), getLeaveById);
router.put('/:id/approve', authorize('admin', 'payroll officer','hr officer'), approveLeave);
router.put('/:id/reject', authorize('admin', 'payroll officer', 'hr officer'), rejectLeave);

export default router;


