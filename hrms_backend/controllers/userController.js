import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { logAction } from '../utils/auditLogger.js';
import { SystemSetting } from '../models/SystemSetting.js';
import { generateEmployeeId } from '../utils/employeeIdGenerator.js';
import { generatePassword } from '../utils/passwordGenerator.js';
import { sendWelcomeEmail } from '../utils/emailService.js';

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
        // Get company name for employee ID generation
        const companySetting = await SystemSetting.findByCompanyName();
        const companyName = companySetting?.value || 'OI'; // Default to 'OI' if not set

        // Extract and validate required fields (password is auto-generated, not required)
        const {
            email, first_name, last_name,
            phone, date_of_birth, address, role_id, department_id,
            designation, joining_date, is_active
        } = req.body;

        // Validation: Required fields
        if (!email || !first_name || !last_name || !role_id || !joining_date) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: email, first_name, last_name, role_id, and joining_date are required'
            });
        }

        // Validation: Email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email format'
            });
        }

        // Validation: Name fields (should not be empty after trim)
        if (!first_name.trim() || !last_name.trim()) {
            return res.status(400).json({
                success: false,
                message: 'First name and last name cannot be empty'
            });
        }

        // Validation: Joining date (should be a valid date and not in the future)
        const joiningDate = new Date(joining_date);
        if (isNaN(joiningDate.getTime())) {
            return res.status(400).json({
                success: false,
                message: 'Invalid joining date format'
            });
        }

        const today = new Date();
        today.setHours(23, 59, 59, 999); // End of today
        if (joiningDate > today) {
            return res.status(400).json({
                success: false,
                message: 'Joining date cannot be in the future'
            });
        }

        // Validation: Date of birth (if provided, should be valid and not in the future)
        if (date_of_birth) {
            const dob = new Date(date_of_birth);
            if (isNaN(dob.getTime())) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid date of birth format'
                });
            }
            if (dob > today) {
                return res.status(400).json({
                    success: false,
                    message: 'Date of birth cannot be in the future'
                });
            }
            // Check if age is reasonable (at least 18 years old)
            const age = today.getFullYear() - dob.getFullYear();
            const monthDiff = today.getMonth() - dob.getMonth();
            if (age < 18 || (age === 18 && monthDiff < 0) || (age === 18 && monthDiff === 0 && today.getDate() < dob.getDate())) {
                return res.status(400).json({
                    success: false,
                    message: 'Employee must be at least 18 years old'
                });
            }
        }

        // Validation: Phone number format (if provided)
        if (phone && phone.trim()) {
            const phoneRegex = /^[\d\s\-\+\(\)]+$/;
            if (!phoneRegex.test(phone) || phone.replace(/\D/g, '').length < 10) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid phone number format'
                });
            }
        }

        // Check if user with this email already exists
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User with this email already exists'
            });
        }

        // Auto-generate employee ID
        const employee_id = await generateEmployeeId(companyName, first_name, last_name, joining_date);
        
        // Check if generated employee ID already exists (unlikely but possible)
        const existingEmployeeId = await User.findByEmployeeId(employee_id);
        if (existingEmployeeId) {
            return res.status(500).json({
                success: false,
                message: 'Error generating unique employee ID. Please try again.'
            });
        }

        // Auto-generate secure password
        const generatedPassword = generatePassword(12);
        console.log("🚀 ~ createUser ~ generatedPassword:", generatedPassword)
        const password_hash = await bcrypt.hash(generatedPassword, 10);

        // Create user
        const user = await User.create({
            employee_id,
            email,
            password_hash,
            first_name: first_name.trim(),
            last_name: last_name.trim(),
            phone: phone?.trim() || null,
            date_of_birth: date_of_birth || null,
            address: address?.trim() || null,
            role_id,
            department_id: department_id || null,
            designation: designation?.trim() || null,
            joining_date,
            is_active: is_active !== undefined ? is_active : true
        });

        // Send welcome email with credentials
        const emailSent = await sendWelcomeEmail(
            email,
            first_name.trim(),
            employee_id,
            generatedPassword
        );
        console.log("🚀 ~ createUser ~ emailSent:", emailSent)

        if (!emailSent) {
            console.warn(`Failed to send welcome email to ${email}, but user was created successfully`);
        }

        // Remove password hash from response
        delete user.password_hash;

        await logAction(req, 'USER_CREATED', 'users', user.id, null, { 
            email, 
            employee_id, 
            role_id,
            email_sent: emailSent 
        });

        res.status(201).json({
            success: true,
            message: 'User created successfully. Login credentials have been sent to the employee\'s email.',
            data: {
                ...user,
                email_sent: emailSent
            }
        });
    } catch (error) {
        console.error('Error creating user:', error);
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
            address, role_id, department_id, designation, joining_date, is_active
        } = req.body;

        // Validation: Email format (if provided)
        if (email !== undefined) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid email format'
                });
            }

            // Check if email is already taken by another user
            const existingUser = await User.findByEmail(email);
            if (existingUser && existingUser.id !== parseInt(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Email is already in use by another user'
                });
            }
        }

        // Validation: Name fields (if provided)
        if (first_name !== undefined && (!first_name.trim())) {
            return res.status(400).json({
                success: false,
                message: 'First name cannot be empty'
            });
        }

        if (last_name !== undefined && (!last_name.trim())) {
            return res.status(400).json({
                success: false,
                message: 'Last name cannot be empty'
            });
        }

        // Validation: Date of birth (if provided)
        if (date_of_birth) {
            const dob = new Date(date_of_birth);
            if (isNaN(dob.getTime())) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid date of birth format'
                });
            }

            const today = new Date();
            today.setHours(23, 59, 59, 999);
            if (dob > today) {
                return res.status(400).json({
                    success: false,
                    message: 'Date of birth cannot be in the future'
                });
            }

            // Check if age is reasonable (at least 18 years old)
            const age = today.getFullYear() - dob.getFullYear();
            const monthDiff = today.getMonth() - dob.getMonth();
            if (age < 18 || (age === 18 && monthDiff < 0) || (age === 18 && monthDiff === 0 && today.getDate() < dob.getDate())) {
                return res.status(400).json({
                    success: false,
                    message: 'Employee must be at least 18 years old'
                });
            }
        }

        // Validation: Joining date (if provided)
        if (joining_date !== undefined) {
            const joiningDate = new Date(joining_date);
            if (isNaN(joiningDate.getTime())) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid joining date format'
                });
            }

            const today = new Date();
            today.setHours(23, 59, 59, 999);
            if (joiningDate > today) {
                return res.status(400).json({
                    success: false,
                    message: 'Joining date cannot be in the future'
                });
            }
        }

        // Validation: Phone number format (if provided)
        if (phone !== undefined && phone && phone.trim()) {
            const phoneRegex = /^[\d\s\-\+\(\)]+$/;
            if (!phoneRegex.test(phone) || phone.replace(/\D/g, '').length < 10) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid phone number format'
                });
            }
        }

        const updateData = {
            email, first_name, last_name, phone, date_of_birth,
            address, role_id, department_id, designation, joining_date, is_active
        };

        // Remove undefined fields and trim string fields
        Object.keys(updateData).forEach(key => {
            if (updateData[key] === undefined) {
                delete updateData[key];
            } else if (typeof updateData[key] === 'string' && key !== 'email') {
                updateData[key] = updateData[key].trim();
            }
        });

        const updatedUser = await User.update(id, updateData);
        delete updatedUser.password_hash;

        await logAction(req, 'USER_UPDATED', 'users', id, oldUser, updatedUser);

        res.json({
            success: true,
            message: 'User updated successfully',
            data: updatedUser
        });
    } catch (error) {
        console.error('Error updating user:', error);
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

