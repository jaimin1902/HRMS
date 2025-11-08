import express from 'express';
import {
    createPayrollRun,
    processPayroll,
    getAllPayrollRuns,
    getPayrollRunById,
    updatePayrollRun,
    getAllPayslips,
    getMyPayslips,
    getPayslipById,
    getMySalaryStructure,
    getPayrollDashboard,
    validatePayroll,
    getPayslipComputation,
    downloadPayslipPDF,
    generatePayslipReport
} from '../controllers/payrollController.js';
import { authenticate, authorize } from '../middlewares/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Employee routes
router.get('/payslips/my', getMyPayslips);
router.get('/salary-structure/my', getMySalaryStructure);
router.get('/payslips/:id', getPayslipById);
router.get('/payslips/:id/computation', getPayslipComputation);
router.get('/payslips/:id/download', downloadPayslipPDF);

// Admin, Payroll Officer routes
router.get('/dashboard', authorize('admin', 'payroll officer'), getPayrollDashboard);
router.post('/runs', authorize('admin', 'payroll officer'), createPayrollRun);
router.post('/runs/:id/process', authorize('admin', 'payroll officer'), processPayroll);
router.get('/runs', authorize('admin', 'payroll officer'), getAllPayrollRuns);
router.get('/runs/:id', authorize('admin', 'payroll officer'), getPayrollRunById);
router.put('/runs/:id', authorize('admin', 'payroll officer'), updatePayrollRun);
router.post('/validate', authorize('admin', 'payroll officer'), validatePayroll);
router.get('/payslips', authorize('admin', 'payroll officer'), getAllPayslips);
router.get('/payslips/:id/computation', authorize('admin', 'payroll officer'), getPayslipComputation);
router.get('/reports/payslips', authorize('admin', 'payroll officer'), generatePayslipReport);

export default router;


