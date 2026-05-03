import User from "../models/user.js";
import cloudinary from "../config/cloudinary.js";
import { createClerkClient } from '@clerk/express';

const clerk = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY
});

// Upload/Update Profile Picture
export const uploadProfilePicture = async (req, res) => {
    try {
        const userId = req.user._id;
        
        if (!req.file) {
            return res.json({ success: false, message: "No image file provided" });
        }

        // Upload to Cloudinary
        const result = await cloudinary.uploader.upload(req.file.path, {
            folder: "profile_pictures",
            transformation: [
                { width: 400, height: 400, crop: "fill", gravity: "face" },
                { quality: "auto:good" }
            ]
        });

        // Update user's image URL in database
        await User.findByIdAndUpdate(userId, {
            image: result.secure_url
        });

        res.json({
            success: true,
            message: "Profile picture updated successfully",
            imageUrl: result.secure_url
        });
    } catch (error) {
        console.error('Profile picture upload error:', error);
        res.json({ success: false, message: error.message });
    }
};

// Set Avatar (pick from preset cartoon avatars)
export const setAvatar = async (req, res) => {
    try {
        const userId = req.user._id;
        const { avatarUrl } = req.body;

        if (!avatarUrl || typeof avatarUrl !== 'string') {
            return res.json({ success: false, message: 'Invalid avatar URL' });
        }

        // Only allow known avatar origins
        const allowed = ['api.dicebear.com', 'avatar.iran.liara.run', 'ui-avatars.com'];
        const isAllowed = allowed.some(origin => avatarUrl.includes(origin));
        if (!isAllowed) {
            return res.json({ success: false, message: 'Avatar URL not allowed' });
        }

        await User.findByIdAndUpdate(userId, { image: avatarUrl });

        res.json({ success: true, imageUrl: avatarUrl, message: 'Avatar updated' });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Get User Profile
export const getUserProfile = async (req, res) => {
    try {
        const userId = req.user._id;
        const user = await User.findById(userId).select('-__v');
        
        if (!user) {
            return res.json({ success: false, message: "User not found" });
        }

        res.json({
            success: true,
            user: {
                _id: user._id,
                username: user.username,
                email: user.email,
                image: user.image,
                role: user.role,
                phoneNumber: user.phoneNumber,
                isPhoneVerified: user.isPhoneVerified
            }
        });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Delete the signed-in user's account
export const deleteMyAccount = async (req, res) => {
    try {
        const userId = req.user._id;

        await User.findByIdAndDelete(userId);

        try {
            await clerk.users.deleteUser(userId);
        } catch (clerkError) {
            console.warn('Clerk delete skipped or failed:', clerkError.message);
        }

        res.json({ success: true, message: 'Account deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
