import express from 'express';
import {
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser
} from '../controllers/userController.js';
import { authenticate, authorize } from '../middlewares/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Admin, HR Officer can access all user routes
router.get('/', authorize('admin', 'hr officer'), getAllUsers);
router.get('/:id', getUserById); // Employees can view their own profile, others can view any
router.post('/', authorize('admin', 'hr officer'), createUser);
router.put('/:id', authorize('admin', 'hr officer'), updateUser);
router.delete('/:id', authorize('admin'), deleteUser);

export default router;

