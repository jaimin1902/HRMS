import { Role } from '../models/Role.js';
import { Department } from '../models/Department.js';
import { LeaveType } from '../models/LeaveType.js';
import { SalaryStructure } from '../models/SalaryStructure.js';
import { SystemSetting } from '../models/SystemSetting.js';
import { logAction } from '../utils/auditLogger.js';

// ========== ROLE MANAGEMENT ==========
export const getAllRoles = async (req, res, next) => {
    try {
        const roles = await Role.findAll();
        res.json({
            success: true,
            count: roles.length,
            data: roles
        });
    } catch (error) {
        next(error);
    }
};

export const createRole = async (req, res, next) => {
    try {
        const { name, description, permissions } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Role name is required'
            });
        }

        const role = await Role.create({ name, description, permissions });

        await logAction(req, 'ROLE_CREATED', 'roles', role.id, null, { name });

        res.status(201).json({
            success: true,
            message: 'Role created successfully',
            data: role
        });
    } catch (error) {
        next(error);
    }
};

export const updateRole = async (req, res, next) => {
    try {
        const { id } = req.params;
        const oldRole = await Role.findById(id);

        if (!oldRole) {
            return res.status(404).json({
                success: false,
                message: 'Role not found'
            });
        }

        const { name, description, permissions } = req.body;
        const updatedRole = await Role.update(id, { name, description, permissions });

        await logAction(req, 'ROLE_UPDATED', 'roles', id, oldRole, updatedRole);

        res.json({
            success: true,
            message: 'Role updated successfully',
            data: updatedRole
        });
    } catch (error) {
        next(error);
    }
};

// ========== DEPARTMENT MANAGEMENT ==========
export const getAllDepartments = async (req, res, next) => {
    try {
        const departments = await Department.findAll();
        res.json({
            success: true,
            count: departments.length,
            data: departments
        });
    } catch (error) {
        next(error);
    }
};

export const createDepartment = async (req, res, next) => {
    try {
        const { name, description, head_id } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Department name is required'
            });
        }

        const department = await Department.create({ name, description, head_id });

        await logAction(req, 'DEPARTMENT_CREATED', 'departments', department.id, null, { name });

        res.status(201).json({
            success: true,
            message: 'Department created successfully',
            data: department
        });
    } catch (error) {
        next(error);
    }
};

export const updateDepartment = async (req, res, next) => {
    try {
        const { id } = req.params;
        const oldDepartment = await Department.findById(id);

        if (!oldDepartment) {
            return res.status(404).json({
                success: false,
                message: 'Department not found'
            });
        }

        const { name, description, head_id } = req.body;
        const updatedDepartment = await Department.update(id, { name, description, head_id });

        await logAction(req, 'DEPARTMENT_UPDATED', 'departments', id, oldDepartment, updatedDepartment);

        res.json({
            success: true,
            message: 'Department updated successfully',
            data: updatedDepartment
        });
    } catch (error) {
        next(error);
    }
};

export const deleteDepartment = async (req, res, next) => {
    try {
        const { id } = req.params;
        const department = await Department.findById(id);

        if (!department) {
            return res.status(404).json({
                success: false,
                message: 'Department not found'
            });
        }

        await Department.delete(id);

        await logAction(req, 'DEPARTMENT_DELETED', 'departments', id, department, null);

        res.json({
            success: true,
            message: 'Department deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};

// ========== LEAVE TYPE MANAGEMENT ==========
export const createLeaveType = async (req, res, next) => {
    try {
        const { name, code, description, max_days, is_paid, requires_approval, carry_forward } = req.body;

        if (!name || !code) {
            return res.status(400).json({
                success: false,
                message: 'Leave type name and code are required'
            });
        }

        const leaveType = await LeaveType.create({
            name, code, description, max_days, is_paid, requires_approval, carry_forward
        });

        await logAction(req, 'LEAVE_TYPE_CREATED', 'leave_types', leaveType.id, null, { name, code });

        res.status(201).json({
            success: true,
            message: 'Leave type created successfully',
            data: leaveType
        });
    } catch (error) {
        next(error);
    }
};

export const updateLeaveType = async (req, res, next) => {
    try {
        const { id } = req.params;
        const oldLeaveType = await LeaveType.findById(id);

        if (!oldLeaveType) {
            return res.status(404).json({
                success: false,
                message: 'Leave type not found'
            });
        }

        const { name, code, description, max_days, is_paid, requires_approval, carry_forward, is_active } = req.body;
        const updatedLeaveType = await LeaveType.update(id, {
            name, code, description, max_days, is_paid, requires_approval, carry_forward, is_active
        });

        await logAction(req, 'LEAVE_TYPE_UPDATED', 'leave_types', id, oldLeaveType, updatedLeaveType);

        res.json({
            success: true,
            message: 'Leave type updated successfully',
            data: updatedLeaveType
        });
    } catch (error) {
        next(error);
    }
};

// ========== SALARY STRUCTURE MANAGEMENT ==========
export const createSalaryStructure = async (req, res, next) => {
    try {
        const {
            user_id, basic_salary, hra, transport_allowance,
            medical_allowance, other_allowances, pf_percentage,
            professional_tax, other_deductions, effective_from, effective_to
        } = req.body;

        if (!user_id || !basic_salary || !effective_from) {
            return res.status(400).json({
                success: false,
                message: 'User ID, basic salary, and effective from date are required'
            });
        }

        const salaryStructure = await SalaryStructure.create({
            user_id, basic_salary, hra, transport_allowance,
            medical_allowance, other_allowances, pf_percentage,
            professional_tax, other_deductions, effective_from, effective_to
        });

        await logAction(req, 'SALARY_STRUCTURE_CREATED', 'salary_structure', salaryStructure.id, null, { user_id, basic_salary });

        res.status(201).json({
            success: true,
            message: 'Salary structure created successfully',
            data: salaryStructure
        });
    } catch (error) {
        next(error);
    }
};

export const updateSalaryStructure = async (req, res, next) => {
    try {
        const { id } = req.params;
        const oldSalaryStructure = await SalaryStructure.findById(id);

        if (!oldSalaryStructure) {
            return res.status(404).json({
                success: false,
                message: 'Salary structure not found'
            });
        }

        const {
            basic_salary, hra, transport_allowance, medical_allowance,
            other_allowances, pf_percentage, professional_tax,
            other_deductions, effective_from, effective_to, is_active
        } = req.body;

        const updatedSalaryStructure = await SalaryStructure.update(id, {
            basic_salary, hra, transport_allowance, medical_allowance,
            other_allowances, pf_percentage, professional_tax,
            other_deductions, effective_from, effective_to, is_active
        });

        await logAction(req, 'SALARY_STRUCTURE_UPDATED', 'salary_structure', id, oldSalaryStructure, updatedSalaryStructure);

        res.json({
            success: true,
            message: 'Salary structure updated successfully',
            data: updatedSalaryStructure
        });
    } catch (error) {
        next(error);
    }
};

export const getSalaryStructureByUser = async (req, res, next) => {
    try {
        const { user_id } = req.params;
        const salaryStructures = await SalaryStructure.findByUserId(user_id);

        res.json({
            success: true,
            count: salaryStructures.length,
            data: salaryStructures
        });
    } catch (error) {
        next(error);
    }
};

// ========== SYSTEM SETTINGS MANAGEMENT ==========
export const getAllSettings = async (req, res, next) => {
    try {
        const settings = await SystemSetting.findAll();
        res.json({
            success: true,
            count: settings.length,
            data: settings
        });
    } catch (error) {
        next(error);
    }
};

export const getSettingByKey = async (req, res, next) => {
    try {
        const { key } = req.params;
        const setting = await SystemSetting.findByKey(key);

        if (!setting) {
            return res.status(404).json({
                success: false,
                message: 'Setting not found'
            });
        }

        res.json({
            success: true,
            data: setting
        });
    } catch (error) {
        next(error);
    }
};

export const updateSetting = async (req, res, next) => {
    try {
        const { key } = req.params;
        const oldSetting = await SystemSetting.findByKey(key);

        if (!oldSetting) {
            return res.status(404).json({
                success: false,
                message: 'Setting not found'
            });
        }

        const { value, description } = req.body;
        const updatedSetting = await SystemSetting.update(key, {
            value, description, updated_by: req.user.id
        });

        await logAction(req, 'SETTING_UPDATED', 'system_settings', key, oldSetting, updatedSetting);

        res.json({
            success: true,
            message: 'Setting updated successfully',
            data: updatedSetting
        });
    } catch (error) {
        next(error);
    }
};


