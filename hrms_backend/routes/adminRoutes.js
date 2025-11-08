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
    getAllSettings,
    getSettingByKey,
    updateSetting
} from '../controllers/adminController.js';
import { authenticate, authorize } from '../middlewares/auth.js';

const router = express.Router();

// All routes require authentication and admin access
router.use(authenticate);
router.use(authorize('admin'));

// Role management
router.get('/roles', getAllRoles);
router.post('/roles', createRole);
router.put('/roles/:id', updateRole);

// Department management
router.get('/departments', getAllDepartments);
router.post('/departments', createDepartment);
router.put('/departments/:id', updateDepartment);
router.delete('/departments/:id', deleteDepartment);

// Leave type management
router.post('/leave-types', createLeaveType);
router.put('/leave-types/:id', updateLeaveType);

// Salary structure management
router.post('/salary-structures', createSalaryStructure);
router.put('/salary-structures/:id', updateSalaryStructure);
router.get('/salary-structures/user/:user_id', getSalaryStructureByUser);

// System settings
router.get('/settings', getAllSettings);
router.get('/settings/:key', getSettingByKey);
router.put('/settings/:key', updateSetting);

export default router;


