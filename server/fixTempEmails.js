// One-time script: fix all users with @temp.clerk.dev emails in MongoDB
// Usage: node fixTempEmails.js

import mongoose from 'mongoose';
import { createClerkClient } from '@clerk/express';
import dotenv from 'dotenv';
dotenv.config();

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

const userSchema = new mongoose.Schema({
    _id: String,
    username: String,
    email: String,
    image: String,
    role: String
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

async function fixTempEmails() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const tempUsers = await User.find({ email: { $regex: /@temp\.clerk\.dev$/i } });
    console.log(`Found ${tempUsers.length} users with temp emails\n`);

    for (const user of tempUsers) {
        console.log(`Processing: ${user._id} — current email: ${user.email}`);
        try {
            const clerkUser = await clerk.users.getUser(user._id);
            const realEmail = clerkUser.emailAddresses?.[0]?.emailAddress || '';
            const realName = `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim();

            if (realEmail && !realEmail.endsWith('@temp.clerk.dev')) {
                user.email = realEmail;
                if (realName) user.username = realName;
                if (clerkUser.imageUrl) user.image = clerkUser.imageUrl;
                await user.save();
                console.log(`  ✅ Fixed → ${realEmail}`);
            } else {
                console.log(`  ⚠️  Clerk has no real email for this user (${realEmail || 'none'})`);
            }
        } catch (err) {
            console.log(`  ❌ Clerk API error: ${err.message}`);
        }
    }

    console.log('\nDone!');
    await mongoose.disconnect();
}

fixTempEmails().catch(console.error);
