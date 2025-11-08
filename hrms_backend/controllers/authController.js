import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { Role } from '../models/Role.js';
import { generateToken } from '../utils/jwt.js';
import { logAction } from '../utils/auditLogger.js';

export const register = async (req, res, next) => {
    try {
        const {
            employee_id, email, password, first_name, last_name,
            phone, date_of_birth, address, role_id, department_id,
            designation, joining_date
        } = req.body;

        // Validate required fields
        if (!employee_id || !email || !password || !first_name || !last_name || !role_id || !joining_date) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        // Check if user already exists
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

        // Hash password
        const password_hash = await bcrypt.hash(password, 10);

        // Create user
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
            joining_date
        });

        // Remove password from response
        delete user.password_hash;

        await logAction(req, 'USER_REGISTERED', 'users', user.id, null, { email, employee_id });

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: user
        });
    } catch (error) {
        next(error);
    }
};

export const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        // Find user
        const user = await User.findByEmail(email);
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Check if user is active
        if (!user.is_active) {
            return res.status(401).json({
                success: false,
                message: 'Account is inactive. Please contact administrator.'
            });
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Generate token
        const token = generateToken({
            userId: user.id,
            email: user.email,
            role: user.role_name
        });

        // Remove password from response
        delete user.password_hash;

        await logAction(req, 'USER_LOGIN', 'users', user.id);

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                user,
                token
            }
        });
    } catch (error) {
        next(error);
    }
};

export const getProfile = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
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

export const updateProfile = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const {
            first_name, last_name, phone, date_of_birth,
            address, profile_picture
        } = req.body;

        const oldUser = await User.findById(userId);
        const updatedUser = await User.update(userId, {
            first_name,
            last_name,
            phone,
            date_of_birth,
            address,
            profile_picture
        });

        delete updatedUser.password_hash;

        await logAction(req, 'PROFILE_UPDATED', 'users', userId, oldUser, updatedUser);

        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: updatedUser
        });
    } catch (error) {
        next(error);
    }
};

export const changePassword = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { current_password, new_password } = req.body;

        if (!current_password || !new_password) {
            return res.status(400).json({
                success: false,
                message: 'Current password and new password are required'
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Verify current password
        const isPasswordValid = await bcrypt.compare(current_password, user.password_hash);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        // Hash new password
        const password_hash = await bcrypt.hash(new_password, 10);
        await User.update(userId, { password_hash });

        await logAction(req, 'PASSWORD_CHANGED', 'users', userId);

        res.json({
            success: true,
            message: 'Password changed successfully'
        });
    } catch (error) {
        next(error);
    }
};


