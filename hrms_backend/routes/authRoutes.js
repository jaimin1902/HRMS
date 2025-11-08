import express from 'express';
import {
    register,
    login,
    getProfile,
    updateProfile,
    changePassword
} from '../controllers/authController.js';
import { authenticate } from '../middlewares/auth.js';

const router = express.Router();

// Public routes
// Note: Registration is disabled for public use. Only Admin/HR can create users via /api/users endpoint
// router.post('/register', register); // Disabled - users can only be created by Admin/HR
router.post('/login', login);

// Protected routes
router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, updateProfile);
router.put('/change-password', authenticate, changePassword);

export default router;


