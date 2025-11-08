import express from 'express';
import {
    getAllRoles,
    createRole,
    updateRole,
    getAllDepartments,
    createDepartment,
    updateDepartment,
    deleteDepartment,
    createLeaveType,
    updateLeaveType,
    createSalaryStructure,
    updateSalaryStructure,
    getSalaryStructureByUser,
    getSalaryStructureById,
    getAllSalaryComponentTemplates,
    getSalaryComponentTemplateById,
    createSalaryComponentTemplate,
    updateSalaryComponentTemplate,
    deleteSalaryComponentTemplate,
    reorderSalaryComponentTemplates,
    getAllSettings,
    getSettingByKey,
    updateSetting,
    getAllAuditLogs
} from '../controllers/adminController.js';
import { authenticate, authorize } from '../middlewares/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Role management - Admin only
router.get('/roles', authorize('admin'), getAllRoles);
router.post('/roles', authorize('admin'), createRole);
router.put('/roles/:id', authorize('admin'), updateRole);

// Department management - Admin only
router.get('/departments', authorize('admin'), getAllDepartments);
router.post('/departments', authorize('admin'), createDepartment);
router.put('/departments/:id', authorize('admin'), updateDepartment);
router.delete('/departments/:id', authorize('admin'), deleteDepartment);

// Leave type management - Admin only
router.post('/leave-types', authorize('admin'), createLeaveType);
router.put('/leave-types/:id', authorize('admin'), updateLeaveType);

// Salary structure management - Admin and Payroll Officer
router.post('/salary-structures', authorize('admin', 'payroll officer'), createSalaryStructure);
router.get('/salary-structures/:id', authorize('admin', 'payroll officer'), getSalaryStructureById);
router.put('/salary-structures/:id', authorize('admin', 'payroll officer'), updateSalaryStructure);
router.get('/salary-structures/user/:user_id', authorize('admin', 'payroll officer'), getSalaryStructureByUser);

// Salary component template management
// All operations accessible to admin and payroll officer (since they manage salary structures)
router.get('/salary-component-templates', authorize('admin', 'payroll officer'), getAllSalaryComponentTemplates);
router.get('/salary-component-templates/:id', authorize('admin', 'payroll officer'), getSalaryComponentTemplateById);
router.post('/salary-component-templates', authorize('admin', 'payroll officer'), createSalaryComponentTemplate);
router.put('/salary-component-templates/:id', authorize('admin', 'payroll officer'), updateSalaryComponentTemplate);
router.delete('/salary-component-templates/:id', authorize('admin', 'payroll officer'), deleteSalaryComponentTemplate);
router.post('/salary-component-templates/reorder', authorize('admin', 'payroll officer'), reorderSalaryComponentTemplates);

// System settings - Admin only
router.get('/settings', authorize('admin'), getAllSettings);
router.get('/settings/:key', authorize('admin'), getSettingByKey);
router.put('/settings/:key', authorize('admin'), updateSetting);

// Audit logs - Admin only
router.get('/audit-logs', authorize('admin'), getAllAuditLogs);

export default router;


