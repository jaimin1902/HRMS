import { Role } from '../models/Role.js';
import { Department } from '../models/Department.js';
import { LeaveType } from '../models/LeaveType.js';
import { SalaryStructure } from '../models/SalaryStructure.js';
import { SalaryComponentTemplate } from '../models/SalaryComponentTemplate.js';
import { SystemSetting } from '../models/SystemSetting.js';
import { AuditLog } from '../models/AuditLog.js';
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

        // Validation: Required fields
        if (!user_id || basic_salary === undefined || !effective_from) {
            return res.status(400).json({
                success: false,
                message: 'User ID, basic salary, and effective from date are required'
            });
        }

        // Validation: Basic salary must be positive
        if (basic_salary < 0) {
            return res.status(400).json({
                success: false,
                message: 'Basic salary cannot be negative'
            });
        }

        // Validation: Allowances cannot be negative
        if ((hra !== undefined && hra < 0) ||
            (transport_allowance !== undefined && transport_allowance < 0) ||
            (medical_allowance !== undefined && medical_allowance < 0) ||
            (other_allowances !== undefined && other_allowances < 0)) {
            return res.status(400).json({
                success: false,
                message: 'Allowances cannot be negative'
            });
        }

        // Validation: Deductions cannot be negative
        if ((professional_tax !== undefined && professional_tax < 0) ||
            (other_deductions !== undefined && other_deductions < 0)) {
            return res.status(400).json({
                success: false,
                message: 'Deductions cannot be negative'
            });
        }

        // Validation: PF percentage should be between 0 and 100
        const pfPercent = pf_percentage !== undefined ? pf_percentage : 12;
        if (pfPercent < 0 || pfPercent > 100) {
            return res.status(400).json({
                success: false,
                message: 'PF percentage must be between 0 and 100'
            });
        }

        // Validation: Effective from date format
        const effectiveFromDate = new Date(effective_from);
        if (isNaN(effectiveFromDate.getTime())) {
            return res.status(400).json({
                success: false,
                message: 'Invalid effective from date format'
            });
        }

        // Validation: Effective to date (if provided)
        if (effective_to) {
            const effectiveToDate = new Date(effective_to);
            if (isNaN(effectiveToDate.getTime())) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid effective to date format'
                });
            }
            
            if (effectiveToDate <= effectiveFromDate) {
                return res.status(400).json({
                    success: false,
                    message: 'Effective to date must be after effective from date'
                });
            }
        }

        // Check if user exists
        const { User } = await import('../models/User.js');
        const user = await User.findById(user_id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const salaryStructure = await SalaryStructure.create({
            user_id, basic_salary, hra, transport_allowance,
            medical_allowance, other_allowances, pf_percentage: pfPercent,
            professional_tax, other_deductions, effective_from, effective_to
        });

        await logAction(req, 'SALARY_STRUCTURE_CREATED', 'salary_structure', salaryStructure.id, null, { user_id, basic_salary });

        res.status(201).json({
            success: true,
            message: 'Salary structure created successfully',
            data: salaryStructure
        });
    } catch (error) {
        console.error('Error creating salary structure:', error);
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

        // Validation: Basic salary must be positive (if provided)
        if (basic_salary !== undefined && basic_salary < 0) {
            return res.status(400).json({
                success: false,
                message: 'Basic salary cannot be negative'
            });
        }

        // Validation: Allowances cannot be negative (if provided)
        if ((hra !== undefined && hra < 0) ||
            (transport_allowance !== undefined && transport_allowance < 0) ||
            (medical_allowance !== undefined && medical_allowance < 0) ||
            (other_allowances !== undefined && other_allowances < 0)) {
            return res.status(400).json({
                success: false,
                message: 'Allowances cannot be negative'
            });
        }

        // Validation: Deductions cannot be negative (if provided)
        if ((professional_tax !== undefined && professional_tax < 0) ||
            (other_deductions !== undefined && other_deductions < 0)) {
            return res.status(400).json({
                success: false,
                message: 'Deductions cannot be negative'
            });
        }

        // Validation: PF percentage should be between 0 and 100 (if provided)
        if (pf_percentage !== undefined && (pf_percentage < 0 || pf_percentage > 100)) {
            return res.status(400).json({
                success: false,
                message: 'PF percentage must be between 0 and 100'
            });
        }

        // Validation: Effective from date (if provided)
        if (effective_from) {
            const effectiveFromDate = new Date(effective_from);
            if (isNaN(effectiveFromDate.getTime())) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid effective from date format'
                });
            }
        }

        // Validation: Effective to date (if provided)
        if (effective_to) {
            const effectiveToDate = new Date(effective_to);
            if (isNaN(effectiveToDate.getTime())) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid effective to date format'
                });
            }
            
            const fromDate = effective_from ? new Date(effective_from) : new Date(oldSalaryStructure.effective_from);
            if (effectiveToDate <= fromDate) {
                return res.status(400).json({
                    success: false,
                    message: 'Effective to date must be after effective from date'
                });
            }
        }

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
        console.error('Error updating salary structure:', error);
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

export const getSalaryStructureById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const salaryStructure = await SalaryStructure.findById(id);

        if (!salaryStructure) {
            return res.status(404).json({
                success: false,
                message: 'Salary structure not found'
            });
        }

        res.json({
            success: true,
            data: salaryStructure
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

// ========== SALARY COMPONENT TEMPLATE MANAGEMENT ==========
export const getAllSalaryComponentTemplates = async (req, res, next) => {
    try {
        const { is_active } = req.query;
        const filters = {};
        if (is_active !== undefined) {
            filters.is_active = is_active === 'true';
        }

        const templates = await SalaryComponentTemplate.findAll(filters);

        res.json({
            success: true,
            count: templates.length,
            data: templates
        });
    } catch (error) {
        next(error);
    }
};

export const getSalaryComponentTemplateById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const template = await SalaryComponentTemplate.findById(id);

        if (!template) {
            return res.status(404).json({
                success: false,
                message: 'Salary component template not found'
            });
        }

        res.json({
            success: true,
            data: template
        });
    } catch (error) {
        next(error);
    }
};

export const createSalaryComponentTemplate = async (req, res, next) => {
    try {
        const {
            name, computation_type, base, percentage, fixed_amount,
            description, display_order, is_active, is_required
        } = req.body;

        // Validation
        if (!name || !computation_type || !base) {
            return res.status(400).json({
                success: false,
                message: 'Name, computation type, and base are required'
            });
        }

        if (computation_type === 'percentage' && percentage === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Percentage is required for percentage-based components'
            });
        }

        if (computation_type === 'fixed' && fixed_amount === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Fixed amount is required for fixed components'
            });
        }

        const template = await SalaryComponentTemplate.create({
            name, computation_type, base, percentage, fixed_amount,
            description, display_order, is_active, is_required
        });

        await logAction(req, 'SALARY_COMPONENT_TEMPLATE_CREATED', 'salary_component_templates', template.id, null, { name });

        res.status(201).json({
            success: true,
            message: 'Salary component template created successfully',
            data: template
        });
    } catch (error) {
        next(error);
    }
};

export const updateSalaryComponentTemplate = async (req, res, next) => {
    try {
        const { id } = req.params;
        const oldTemplate = await SalaryComponentTemplate.findById(id);

        if (!oldTemplate) {
            return res.status(404).json({
                success: false,
                message: 'Salary component template not found'
            });
        }

        const {
            name, computation_type, base, percentage, fixed_amount,
            description, display_order, is_active, is_required
        } = req.body;

        const updateData = {
            name, computation_type, base, percentage, fixed_amount,
            description, display_order, is_active, is_required
        };

        // Remove undefined values
        Object.keys(updateData).forEach(key => 
            updateData[key] === undefined && delete updateData[key]
        );

        const updatedTemplate = await SalaryComponentTemplate.update(id, updateData);

        await logAction(req, 'SALARY_COMPONENT_TEMPLATE_UPDATED', 'salary_component_templates', id, oldTemplate, updatedTemplate);

        res.json({
            success: true,
            message: 'Salary component template updated successfully',
            data: updatedTemplate
        });
    } catch (error) {
        next(error);
    }
};

export const deleteSalaryComponentTemplate = async (req, res, next) => {
    try {
        const { id } = req.params;
        const template = await SalaryComponentTemplate.findById(id);

        if (!template) {
            return res.status(404).json({
                success: false,
                message: 'Salary component template not found'
            });
        }

        if (template.is_required) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete required salary component template'
            });
        }

        await SalaryComponentTemplate.delete(id);

        await logAction(req, 'SALARY_COMPONENT_TEMPLATE_DELETED', 'salary_component_templates', id, template, null);

        res.json({
            success: true,
            message: 'Salary component template deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};

export const reorderSalaryComponentTemplates = async (req, res, next) => {
    try {
        const { ids } = req.body; // Array of template IDs in desired order

        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'IDs array is required'
            });
        }

        const templates = await SalaryComponentTemplate.reorder(ids);

        await logAction(req, 'SALARY_COMPONENT_TEMPLATES_REORDERED', 'salary_component_templates', null, null, { ids });

        res.json({
            success: true,
            message: 'Salary component templates reordered successfully',
            data: templates
        });
    } catch (error) {
        next(error);
    }
};

// ========== AUDIT LOGS ==========
export const getAllAuditLogs = async (req, res, next) => {
    try {
        const { user_id, entity_type, entity_id, action, start_date, end_date } = req.query;
        
        const filters = {};
        if (user_id) filters.user_id = parseInt(user_id);
        if (entity_type) filters.entity_type = entity_type;
        if (entity_id) filters.entity_id = parseInt(entity_id);
        if (action) filters.action = action;
        if (start_date) filters.start_date = start_date;
        if (end_date) filters.end_date = end_date;

        const logs = await AuditLog.findAll(filters);

        res.json({
            success: true,
            count: logs.length,
            data: logs
        });
    } catch (error) {
        next(error);
    }
};


