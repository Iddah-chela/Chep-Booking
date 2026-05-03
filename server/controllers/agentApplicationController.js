import AgentApplication from '../models/agentApplication.js';
import User from '../models/user.js';
import { createClerkClient } from '@clerk/express';

const clerk = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

// POST: User submits agent application
export const submitAgentApplication = async (req, res) => {
  try {
    const { yearsExperience, areasServed, referenceLink, bio } = req.body;
    const userId = req.user._id;

    // Validation
    if (yearsExperience === undefined || !areasServed || areasServed.length === 0) {
      return res.status(400).json({
        message: 'Missing required fields: yearsExperience, areasServed',
      });
    }

    if (yearsExperience < 0) {
      return res.status(400).json({ message: 'Years of experience cannot be negative' });
    }

    // Check if user already has a pending/approved application
    const existing = await AgentApplication.findOne({
      user: userId,
      status: { $in: ['pending', 'approved'] },
    });

    if (existing) {
      return res.status(409).json({
        message:
          existing.status === 'approved'
            ? 'You are already an agent!'
            : 'Application already submitted. Please wait for admin review.',
      });
    }

    // Create application
    const application = new AgentApplication({
      user: userId,
      firstName: req.user.firstName || '',
      lastName: req.user.lastName || '',
      email: req.user.email || '',
      phone: req.user.phone || '',
      yearsExperience: parseInt(yearsExperience),
      areasServed,
      referenceLink: referenceLink || '',
      bio: bio || '',
    });

    await application.save();

    res.status(201).json({
      message: 'Application submitted successfully. Admin will review it shortly.',
      application,
    });
  } catch (error) {
    console.error('Error submitting agent application:', error);
    res.status(500).json({
      message: 'Error submitting application',
      error: error.message,
    });
  }
};

// GET: Check user's application status
export const getMyApplicationStatus = async (req, res) => {
  try {
    const userId = req.user._id;

    const application = await AgentApplication.findOne({ user: userId });

    if (!application) {
      return res.json({
        hasApplication: false,
        status: null,
      });
    }

    res.json({
      hasApplication: true,
      status: application.status,
      application,
    });
  } catch (error) {
    console.error('Error fetching application status:', error);
    res.status(500).json({
      message: 'Error fetching application status',
      error: error.message,
    });
  }
};

// GET: Admin - List all agent applications
export const getAgentApplications = async (req, res) => {
  try {
    const { status = 'pending', page = 1, limit = 20 } = req.query;

    const query = status === 'all' ? {} : { status };
    const skip = (page - 1) * limit;

    const applications = await AgentApplication.find(query)
      .populate('reviewedBy', 'firstName lastName email')
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await AgentApplication.countDocuments(query);

    res.json({
      applications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching agent applications:', error);
    res.status(500).json({
      message: 'Error fetching applications',
      error: error.message,
    });
  }
};

// PUT: Admin - Approve agent application
export const approveAgentApplication = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const adminId = req.user._id;

    console.log(`[Agent Approval] Starting approval for application: ${applicationId}`);

    const application = await AgentApplication.findById(applicationId);
    console.log(`[Agent Approval] Found application:`, application ? `yes, userId=${application.user}` : 'no');

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    if (application.status !== 'pending') {
      return res.status(400).json({
        message: `Cannot approve a ${application.status} application`,
      });
    }

    // Update MongoDB first so the approval is not blocked by Clerk sync issues.
    console.log(`[Agent Approval] Updating application status to approved`);
    application.status = 'approved';
    application.reviewedBy = adminId;
    application.reviewedAt = new Date();
    await application.save();
    console.log(`[Agent Approval] Application saved successfully`);

    // Verify user exists in MongoDB before updating
    const userExists = await User.findById(application.user);
    if (!userExists) {
      console.error(`[Agent Approval] User ${application.user} NOT found in MongoDB!`);
      return res.status(500).json({
        message: 'User not found in database. User must have logged in at least once.',
        error: 'USER_NOT_IN_DB'
      });
    }

    console.log(`[Agent Approval] Updating user ${application.user} role to agent`);
    const updateResult = await User.findByIdAndUpdate(application.user, { role: 'agent' }, { new: true });
    console.log(`[Agent Approval] User update result: role=${updateResult?.role}`);

    res.json({
      message: 'Agent application approved successfully',
      application,
      updatedUser: {
        _id: updateResult?._id,
        role: updateResult?.role,
        username: updateResult?.username
      }
    });

    // Sync Clerk metadata (block on this so role is consistent)
    console.log(`[Agent Approval] Syncing Clerk metadata for user ${application.user}`);
    try {
      await clerk.users.updateUser(application.user, {
        publicMetadata: {
          role: 'agent',
        },
      });
      console.log(`[Agent Approval] Clerk metadata synced successfully`);
    } catch (clerkError) {
      console.error('Clerk metadata sync failed (non-blocking):', clerkError.message);
      // Don't fail the approval if Clerk is slow - MongoDB is already updated
    }
  } catch (error) {
    console.error('Error approving application:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({
      message: 'Error approving application',
      error: error.message,
    });
  }
};

// PUT: Admin - Reject agent application
export const rejectAgentApplication = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { reason } = req.body;
    const adminId = req.user._id;

    if (!reason) {
      return res.status(400).json({ message: 'Rejection reason is required' });
    }

    const application = await AgentApplication.findById(applicationId);

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    if (application.status !== 'pending') {
      return res.status(400).json({
        message: `Cannot reject a ${application.status} application`,
      });
    }

    application.status = 'rejected';
    application.rejectionReason = reason;
    application.reviewedBy = adminId;
    application.reviewedAt = new Date();
    await application.save();

    res.json({
      message: 'Agent application rejected',
      application,
    });
  } catch (error) {
    console.error('Error rejecting application:', error);
    res.status(500).json({
      message: 'Error rejecting application',
      error: error.message,
    });
  }
};
