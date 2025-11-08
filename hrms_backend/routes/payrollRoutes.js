import express from 'express';
import {
    createPayrollRun,
    processPayroll,
    getAllPayrollRuns,
    getPayrollRunById,
    updatePayrollRun,
    getAllPayslips,
    getMyPayslips,
    getPayslipById
} from '../controllers/payrollController.js';
import { authenticate, authorize } from '../middlewares/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Employee routes
router.get('/payslips/my', getMyPayslips);
router.get('/payslips/:id', getPayslipById);

// Admin, Payroll Officer routes
router.post('/runs', authorize('admin', 'payroll officer'), createPayrollRun);
router.post('/runs/:id/process', authorize('admin', 'payroll officer'), processPayroll);
router.get('/runs', authorize('admin', 'payroll officer'), getAllPayrollRuns);
router.get('/runs/:id', authorize('admin', 'payroll officer'), getPayrollRunById);
router.put('/runs/:id', authorize('admin', 'payroll officer'), updatePayrollRun);
router.get('/payslips', authorize('admin', 'payroll officer'), getAllPayslips);

export default router;


