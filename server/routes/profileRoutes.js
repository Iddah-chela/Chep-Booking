import express from 'express';
import { uploadProfilePicture, getUserProfile, setAvatar, deleteMyAccount } from '../controllers/profileController.js';
import { protect } from '../middleware/authMiddleware.js';
import upload from '../middleware/uploadMiddleware.js';

const router = express.Router();

// Upload profile picture
router.post('/upload-picture', protect, upload.single('profilePicture'), uploadProfilePicture);

// Set avatar from preset list
router.post('/set-avatar', protect, setAvatar);

// Get user profile
router.get('/me', protect, getUserProfile);

// Delete signed-in user's account
router.delete('/delete-account', protect, deleteMyAccount);

export default router;
