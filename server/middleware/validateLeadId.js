import mongoose from 'mongoose';

export default function validateLeadId(req, res, next) {
    try {
        const leadId = req.params.id || req.body.leadId || req.body._id;
        if (!leadId) return res.status(400).json({ success: false, message: 'lead id required' });
        if (String(leadId).startsWith('chat_')) {
            return res.status(400).json({ success: false, message: 'This endpoint accepts lead IDs, not chat IDs (use chat endpoints for messages).' });
        }
        if (!mongoose.isValidObjectId(String(leadId))) {
            return res.status(400).json({ success: false, message: 'Invalid lead id format' });
        }
        next();
    } catch (err) {
        return res.status(400).json({ success: false, message: 'Invalid lead id' });
    }
}
