import ViewingRequest from "../models/viewingRequest.js";
import Room from "../models/room.js";
import Chat from "../models/chat.js";
import AgentLead from "../models/agentLead.js";
import AgentChat from "../models/agentChat.js";

// Expire provisional booking holds older than now
export const expireProvisionalHolds = async () => {
    try {
        const now = new Date();
        const expiredLeads = await AgentLead.find({
            leadType: 'booking',
            provisionalHoldUntil: { $lt: now }
        });

        for (const lead of expiredLeads) {
            // Remove provisional hold and mark as no-response
            lead.provisionalHoldUntil = undefined;
            lead.status = 'no-response';
            await lead.save();

            // Send an in-app agent chat message to tenant if exists
            try {
                const chat = await AgentChat.findOne({ tenant: lead.student, vacancy: lead.vacancy });
                if (chat) {
                    chat.messages.push({
                        sender: 'system',
                        content: 'Your provisional reservation has expired. You may try reserving again.',
                        timestamp: new Date(),
                        read: false
                    });
                    await chat.save();
                }
            } catch (_) {}
        }

        return { expired: expiredLeads.length };
    } catch (error) {
        console.error('Error expiring provisional holds:', error);
        return { error: error.message };
    }
};

// Auto-expire viewing requests older than 48 hours
export const expireViewingRequests = async () => {
    try {
        const expirationTime = new Date(Date.now() - 48 * 60 * 60 * 1000); // 48 hours ago

        // Find all pending requests older than 48 hours
        const expiredRequests = await ViewingRequest.find({
            status: 'pending',
            createdAt: { $lt: expirationTime }
        });

        for (const request of expiredRequests) {
            // Update request status
            request.status = 'expired';
            await request.save();

            // Reset room availability
            const room = await Room.findById(request.room);
            if (room && room.availabilityStatus === 'viewing_requested') {
                room.availabilityStatus = 'available';
                await room.save();
            }

            // Send auto-message to renter
            const chat = await Chat.findOne({
                tenant: request.renter,
                houseOwner: request.owner,
                room: request.room
            });

            if (chat) {
                chat.messages.push({
                    sender: 'system',
                    content: 'The owner did not respond to your viewing request within 48 hours. You can request another viewing.',
                    timestamp: new Date(),
                    read: false
                });
                await chat.save();
            }
        }

        return { expired: expiredRequests.length };
    } catch (error) {
        console.error('Error expiring viewing requests:', error);
        return { error: error.message };
    }
};

// Run expiration check (call this from a cron job or interval)
export const runExpirationCheck = async (req, res) => {
    try {
        const result = await expireViewingRequests();
        res.json({ success: true, result });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};
