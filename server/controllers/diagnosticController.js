import User from "../models/user.js";
import { createClerkClient } from "@clerk/express";

const clerk = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

// GET /api/diagnostic/user-role - Debug endpoint to see user role from both sources
export const getUserRoleDiagnostic = async (req, res) => {
  try {
    const userId = req.user._id; // Clerk user ID

    // Get from MongoDB
    const mongoUser = await User.findById(userId).select("_id username email role");
    
    // Get from Clerk
    let clerkUser = null;
    let clerkRole = null;
    try {
      clerkUser = await clerk.users.getUser(userId);
      clerkRole = clerkUser?.publicMetadata?.role || null;
    } catch (clerkErr) {
      console.error("Failed to fetch from Clerk:", clerkErr.message);
    }

    res.json({
      userId,
      mongodb: {
        found: !!mongoUser,
        role: mongoUser?.role || null,
        username: mongoUser?.username,
        email: mongoUser?.email,
      },
      clerk: {
        found: !!clerkUser,
        role: clerkRole,
        firstName: clerkUser?.firstName,
        lastName: clerkUser?.lastName,
        email: clerkUser?.emailAddresses?.[0]?.emailAddress,
        publicMetadata: clerkUser?.publicMetadata,
      },
      match: mongoUser?.role === clerkRole,
    });
  } catch (error) {
    console.error("Diagnostic error:", error);
    res.status(500).json({ error: error.message });
  }
};
