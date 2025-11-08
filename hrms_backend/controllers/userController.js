import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { logAction } from '../utils/auditLogger.js';

export const getAllUsers = async (req, res, next) => {
    try {
        const { role_id, department_id, is_active } = req.query;
        
        const filters = {};
        if (role_id) filters.role_id = parseInt(role_id);
        if (department_id) filters.department_id = parseInt(department_id);
        if (is_active !== undefined) filters.is_active = is_active === 'true';

        const users = await User.findAll(filters);
        users.forEach(user => delete user.password_hash);

        res.json({
            success: true,
            count: users.length,
            data: users
        });
    } catch (error) {
        next(error);
    }
};

export const getUserById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Employees can only view their own profile, others can view any
        const userRole = req.user.role_name?.toLowerCase();
        if (userRole === 'employee' && parseInt(id) !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. You can only view your own profile.'
            });
        }

        delete user.password_hash;

        res.json({
            success: true,
            data: user
        });
    } catch (error) {
        next(error);
    }
};

export const createUser = async (req, res, next) => {
    try {
        const {
            employee_id, email, password, first_name, last_name,
            phone, date_of_birth, address, role_id, department_id,
            designation, joining_date, is_active
        } = req.body;

        if (!employee_id || !email || !password || !first_name || !last_name || !role_id || !joining_date) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User with this email already exists'
            });
        }

        const existingEmployeeId = await User.findByEmployeeId(employee_id);
        if (existingEmployeeId) {
            return res.status(400).json({
                success: false,
                message: 'Employee ID already exists'
            });
        }

        const password_hash = await bcrypt.hash(password, 10);

        const user = await User.create({
            employee_id,
            email,
            password_hash,
            first_name,
            last_name,
            phone,
            date_of_birth,
            address,
            role_id,
            department_id,
            designation,
            joining_date,
            is_active: is_active !== undefined ? is_active : true
        });

        delete user.password_hash;

        await logAction(req, 'USER_CREATED', 'users', user.id, null, { email, employee_id, role_id });

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            data: user
        });
    } catch (error) {
        next(error);
    }
};

export const updateUser = async (req, res, next) => {
    try {
        const { id } = req.params;
        const oldUser = await User.findById(id);

        if (!oldUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const {
            email, first_name, last_name, phone, date_of_birth,
            address, role_id, department_id, designation, is_active
        } = req.body;

        const updateData = {
            email, first_name, last_name, phone, date_of_birth,
            address, role_id, department_id, designation, is_active
        };

        // Remove undefined fields
        Object.keys(updateData).forEach(key => 
            updateData[key] === undefined && delete updateData[key]
        );

        const updatedUser = await User.update(id, updateData);
        delete updatedUser.password_hash;

        await logAction(req, 'USER_UPDATED', 'users', id, oldUser, updatedUser);

        res.json({
            success: true,
            message: 'User updated successfully',
            data: updatedUser
        });
    } catch (error) {
        next(error);
    }
};

export const deleteUser = async (req, res, next) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Soft delete by setting is_active to false
        await User.update(id, { is_active: false });

        await logAction(req, 'USER_DELETED', 'users', id, user, null);

        res.json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};

