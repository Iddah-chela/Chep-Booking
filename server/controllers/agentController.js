import AgentVacancy from '../models/agentVacancy.js';
import AgentLead from '../models/agentLead.js';
import AgentChat from '../models/agentChat.js';
import cloudinary from '../config/cloudinary.js';
import fs from 'fs/promises';
import { hasRole } from '../utils/roleUtils.js';
import User from '../models/user.js';
import { sendEmail } from '../utils/mailer.js';

const toUserId = (value) => value?.toString?.() || String(value || '');

const uploadAgentMedia = async (file, folder) => {
  if (!file) return null;
  console.info('[AgentUpload] starting upload', {
    filename: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
    path: file.path,
    folder,
  });
  try {
    const result = await cloudinary.uploader.upload(file.path, {
      folder,
      resource_type: file.mimetype.startsWith('video/') ? 'video' : 'image',
    });

    console.info('[AgentUpload] cloudinary response', {
      secure_url: result.secure_url,
      public_id: result.public_id,
      resource_type: result.resource_type,
    });

    await fs.unlink(file.path).catch((e) => {
      console.warn('[AgentUpload] failed to unlink temp file', file.path, e?.message || e);
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
      thumbnail: result.resource_type === 'video' ? result.thumbnail_url || '' : '',
      resourceType: result.resource_type,
    };
  } catch (err) {
    console.error('[AgentUpload] cloudinary upload failed', {
      filename: file.originalname,
      mimetype: file.mimetype,
      path: file.path,
      error: err?.message || err,
    });
    // Attempt to remove temp file even on failure
    await fs.unlink(file.path).catch(() => {});
    throw err;
  }
};

export const uploadMedia = async (req, res) => {
  try {
    const file = req.file;
    const mediaType = String(req.body?.mediaType || '').toLowerCase();

    console.info('[AgentUpload] request', {
      userId: req.user?._id,
      contentType: req.headers['content-type'] || req.headers['Content-Type'],
      bodyKeys: Object.keys(req.body || {}),
      hasFile: !!file,
    });

    if (!file) {
      console.warn('[AgentUpload] no file in request');
      return res.status(400).json({ message: 'No file provided' });
    }

    const folder = mediaType === 'video' || file.mimetype.startsWith('video/')
      ? 'agent_vacancies/videos'
      : 'agent_vacancies/photos';

    try {
      const media = await uploadAgentMedia(file, folder);
      return res.json({ success: true, media });
    } catch (err) {
      console.error('[AgentUpload] uploadAgentMedia threw', err?.message || err);
      return res.status(500).json({ success: false, message: 'Upload failed', error: err?.message || 'unknown' });
    }
  } catch (error) {
    console.error('Agent media upload error:', error?.message || error);
    return res.status(500).json({ success: false, message: error?.message || 'Agent upload error' });
  }
};

// POST: Create a new vacancy
export const postVacancy = async (req, res) => {
  try {
    const {
      title,
      location,
      rent,
      roomType,
      availableRooms,
      description,
      amenities,
      photos,
      videos,
      buildings,
      googleMapsUrl,
      moveInDate,
      availabilityFrom,
      availabilityTo,
      minBookingLeadDays,
    } = req.body;

    const agentId = toUserId(req.user._id);

    if (!location?.area || !location?.city || !rent?.min || !rent?.max || !roomType || !availableRooms) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    if (Number(rent.min) < 0 || Number(rent.max) < 0 || Number(rent.min) > Number(rent.max)) {
      return res.status(400).json({ message: 'Invalid rent range' });
    }

    if (Number(availableRooms) < 1) {
      return res.status(400).json({ message: 'Available rooms must be at least 1' });
    }

    // Parse buildings if provided as JSON string
    let parsedBuildings = [];
    if (buildings) {
      try {
        parsedBuildings = typeof buildings === 'string' ? (buildings.trim() ? JSON.parse(buildings) : []) : buildings;
      } catch (e) {
        return res.status(400).json({ message: 'Invalid buildings JSON' });
      }
    }

    const vacancy = new AgentVacancy({
      agent: agentId,
      title: String(title || '').trim(),
      location,
      rent: {
        min: Number(rent.min),
        max: Number(rent.max),
      },
      roomType,
      availableRooms: Number(availableRooms),
      description: description || '',
      amenities: amenities || [],
      photos: photos || [],
      videos: videos || [],
      buildings: parsedBuildings,
      googleMapsUrl: String(googleMapsUrl || '').trim(),
      moveInDate: moveInDate ? new Date(moveInDate) : undefined,
      availabilityFrom: availabilityFrom ? new Date(availabilityFrom) : undefined,
      availabilityTo: availabilityTo ? new Date(availabilityTo) : undefined,
      minBookingLeadDays: Number.isFinite(Number(minBookingLeadDays)) ? Number(minBookingLeadDays) : 2,
      expiresAt: availabilityTo ? new Date(availabilityTo) : undefined,
    });

    await vacancy.save();

    res.status(201).json({
      message: 'Vacancy posted successfully',
      vacancy,
    });
  } catch (error) {
    console.error('Error posting vacancy:', error);
    res.status(500).json({ message: 'Error posting vacancy', error: error.message });
  }
};

// GET: Get all agent's vacancies
export const getAgentVacancies = async (req, res) => {
  try {
    const agentId = toUserId(req.user._id);
    const { status = 'all', page = 1, limit = 10 } = req.query;

    const query = { agent: agentId };
    if (status !== 'all') {
      query.isActive = status === 'active';
    }

    const skip = (Number(page) - 1) * Number(limit);
    const vacancies = await AgentVacancy.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await AgentVacancy.countDocuments(query);

    res.json({
      vacancies,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching agent vacancies:', error);
    res.status(500).json({ message: 'Error fetching vacancies', error: error.message });
  }
};

// GET: Get single vacancy by ID
export const getVacancyById = async (req, res) => {
  try {
    const vacancy = await AgentVacancy.findOne({
      _id: req.params.id,
      isActive: true,
      expiresAt: { $gt: new Date() },
    }).populate('agent', 'firstName lastName email phone');

    if (!vacancy) {
      return res.status(404).json({ message: 'Vacancy not found' });
    }

    res.json(vacancy);
  } catch (error) {
    console.error('Error fetching vacancy:', error);
    res.status(500).json({ message: 'Error fetching vacancy', error: error.message });
  }
};

// PUT: Update vacancy
export const updateVacancy = async (req, res) => {
  try {
    const { id } = req.params;
    const agentId = toUserId(req.user._id);
    const { title, location, rent, roomType, availableRooms, description, amenities, photos, videos, buildings, googleMapsUrl, moveInDate, availabilityFrom, availabilityTo, minBookingLeadDays } = req.body;

    const vacancy = await AgentVacancy.findById(id);

    if (!vacancy) {
      return res.status(404).json({ message: 'Vacancy not found' });
    }

    if (vacancy.agent.toString() !== agentId.toString()) {
      return res.status(403).json({ message: 'Unauthorized to update this vacancy' });
    }

    if (location) vacancy.location = location;
    if (title !== undefined) vacancy.title = String(title || '').trim();
    if (rent) {
      if (Number(rent.min) < 0 || Number(rent.max) < 0 || Number(rent.min) > Number(rent.max)) {
        return res.status(400).json({ message: 'Invalid rent range' });
      }
      vacancy.rent = { min: Number(rent.min), max: Number(rent.max) };
    }
    if (roomType) vacancy.roomType = roomType;
    if (availableRooms !== undefined) {
      if (Number(availableRooms) < 1) {
        return res.status(400).json({ message: 'Available rooms must be at least 1' });
      }
      vacancy.availableRooms = Number(availableRooms);
    }
    if (description !== undefined) vacancy.description = description;
    if (amenities) vacancy.amenities = amenities;
    if (photos) vacancy.photos = photos;
    if (videos) vacancy.videos = videos;
    if (googleMapsUrl !== undefined) vacancy.googleMapsUrl = String(googleMapsUrl || '').trim();
    if (buildings !== undefined) {
      try {
        vacancy.buildings = typeof buildings === 'string' ? (buildings.trim() ? JSON.parse(buildings) : []) : buildings;
      } catch (e) {
        return res.status(400).json({ message: 'Invalid buildings JSON' });
      }
    }
    if (moveInDate !== undefined) vacancy.moveInDate = moveInDate ? new Date(moveInDate) : undefined;
    if (availabilityFrom !== undefined) vacancy.availabilityFrom = availabilityFrom ? new Date(availabilityFrom) : undefined;
    if (availabilityTo !== undefined) {
      vacancy.availabilityTo = availabilityTo ? new Date(availabilityTo) : undefined;
      vacancy.expiresAt = availabilityTo ? new Date(availabilityTo) : vacancy.expiresAt;
    }
    if (minBookingLeadDays !== undefined) vacancy.minBookingLeadDays = Number(minBookingLeadDays);

    await vacancy.save();
    res.json({ message: 'Vacancy updated successfully', vacancy });
  } catch (error) {
    console.error('Error updating vacancy:', error);
    res.status(500).json({ message: 'Error updating vacancy', error: error.message });
  }
};

// DELETE: Deactivate vacancy (soft delete)
export const deleteVacancy = async (req, res) => {
  try {
    const { id } = req.params;
    const agentId = toUserId(req.user._id);

    const vacancy = await AgentVacancy.findById(id);

    if (!vacancy) {
      return res.status(404).json({ message: 'Vacancy not found' });
    }

    if (vacancy.agent.toString() !== agentId.toString()) {
      return res.status(403).json({ message: 'Unauthorized to delete this vacancy' });
    }

    vacancy.isActive = false;
    await vacancy.save();

    res.json({ message: 'Vacancy deactivated successfully' });
  } catch (error) {
    console.error('Error deleting vacancy:', error);
    res.status(500).json({ message: 'Error deleting vacancy', error: error.message });
  }
};

// PUT: Re-open a "contacted" vacancy back to "open"
export const reopenVacancy = async (req, res) => {
  try {
    const { id } = req.params;
    const agentId = toUserId(req.user._id);

    const vacancy = await AgentVacancy.findById(id);

    if (!vacancy) {
      return res.status(404).json({ message: 'Vacancy not found' });
    }

    if (vacancy.agent.toString() !== agentId.toString()) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    if (vacancy.status === 'contacted') {
      vacancy.status = 'open';
      vacancy.contactedAt = null;
      await vacancy.save();
      res.json({ message: 'Vacancy reopened successfully', vacancy });
    } else {
      res.status(400).json({ message: 'Only "contacted" vacancies can be reopened' });
    }
  } catch (error) {
    console.error('Error reopening vacancy:', error);
    res.status(500).json({ message: 'Error reopening vacancy', error: error.message });
  }
};

// GET: Get all leads for agent
export const getAgentLeads = async (req, res) => {
  try {
    const agentId = toUserId(req.user._id);
    const { status = 'all', page = 1, limit = 10, unreadOnly = false } = req.query;

    const query = { agent: agentId };
    if (status !== 'all') {
      query.status = status;
    }
    if (unreadOnly === 'true') {
      query.isRead = false;
    }

    const skip = (Number(page) - 1) * Number(limit);
    const leads = await AgentLead.find(query)
      .populate('student', 'firstName lastName email phone')
      .populate('vacancy', 'title roomType rent location availabilityFrom availabilityTo minBookingLeadDays')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await AgentLead.countDocuments(query);

    // Also fetch anonymized agent chats and merge into the results so agents see chats alongside leads
    const chatQuery = { agent: agentId };
    if (unreadOnly === 'true') {
      chatQuery['messages.read'] = false; // simplistic unread filter
    }
    const chats = await AgentChat.find(chatQuery)
      .populate('tenant', 'firstName lastName email phone')
      .populate('vacancy', 'title roomType rent location')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    // Map chats into a unified shape similar to leads so frontend can render both
    const chatItems = chats.map((c) => ({
      _id: `chat_${c._id}`,
      type: 'chat',
      chat: c,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));

    const leadItems = leads.map((l) => ({
      _id: l._id,
      type: 'lead',
      lead: l,
      createdAt: l.createdAt,
      updatedAt: l.updatedAt,
    }));

    // Merge and sort by updatedAt desc
    const merged = [...leadItems, ...chatItems].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    console.log('[agentController] getAgentLeads returning', leadItems.length, 'leads and', chatItems.length, 'chats');
    chatItems.forEach(item => console.log('[agentController] chat item:', item._id, 'actual _id:', item.chat._id));

    res.json({
      leads: merged,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching agent leads:', error);
    res.status(500).json({ message: 'Error fetching leads', error: error.message });
  }
};

// GET: Get single lead
export const getLeadById = async (req, res) => {
  try {
    console.log('[agentController] getLeadById request id=', req.params.id);
    const lead = await AgentLead.findById(req.params.id)
      .populate('student', 'firstName lastName email phone')
      .populate('vacancy', 'title roomType rent location description amenities photos availabilityFrom availabilityTo minBookingLeadDays')
      .populate('agent', 'firstName lastName email phone');

    if (!lead) {
      console.warn('[agentController] lead not found for id=', req.params.id);
      return res.status(404).json({ message: 'Lead not found' });
    }

    if (lead.agent.toString() !== req.user._id.toString() && !hasRole(req.user, 'admin')) {
      return res.status(403).json({ message: 'Unauthorized to view this lead' });
    }

    if (!lead.isRead) {
      lead.isRead = true;
      await lead.save();
    }

    console.log('[agentController] returning lead id=', lead._id);
    res.json({ success: true, lead });
  } catch (error) {
    console.error('Error fetching lead:', error);
    // Include stack trace in logs and return concise message for client
    console.error(error.stack);
    res.status(500).json({ message: 'Error fetching lead', error: error.message });
  }
};

// PUT: Update lead status and add agent notes
export const updateLead = async (req, res) => {
  try {
    const { id } = req.params;
    const agentId = toUserId(req.user._id);
    const { status, agentNotes, contactMethod, lastContactedAt } = req.body;

    const lead = await AgentLead.findById(id);

    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    if (lead.agent.toString() !== agentId.toString()) {
      return res.status(403).json({ message: 'Unauthorized to update this lead' });
    }

    if (status) lead.status = status;
    if (agentNotes !== undefined) lead.agentNotes = agentNotes;
    if (contactMethod) lead.contactMethod = contactMethod;
    if (lastContactedAt) lead.lastContactedAt = new Date(lastContactedAt);

    await lead.save();
    res.json({ message: 'Lead updated successfully', lead });
  } catch (error) {
    console.error('Error updating lead:', error);
    res.status(500).json({ message: 'Error updating lead', error: error.message });
  }
};

// PUT: Mark lead outcome
export const markLeadOutcome = async (req, res) => {
  try {
    const { id } = req.params;
    const agentId = toUserId(req.user._id);
    const { outcome } = req.body;

    if (!outcome || !['viewed', 'booked', 'not-fit', 'no-response'].includes(outcome)) {
      return res.status(400).json({ message: 'Invalid outcome' });
    }

    const lead = await AgentLead.findById(id);

    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    if (lead.agent.toString() !== agentId.toString()) {
      return res.status(403).json({ message: 'Unauthorized to mark outcome' });
    }

    lead.outcome = outcome;
    lead.outcomeMarkedAt = new Date();
    lead.markedBy = agentId;
    // If agent marks as booked, finalize booking: mark lead as booked and update vacancy counts/room
    if (outcome === 'booked') {
      lead.status = 'booked';
      lead.provisionalHoldUntil = undefined;
      await lead.save();

      try {
        const vacancy = await AgentVacancy.findById(lead.vacancy);
        if (vacancy) {
          // decrement availableRooms safely
          if (typeof vacancy.availableRooms === 'number' && vacancy.availableRooms > 0) {
            vacancy.availableRooms = Math.max(0, vacancy.availableRooms - 1);
          }

          // If this lead had roomDetails, mark that cell as booked in the buildings grid
          if (lead.roomDetails && vacancy.buildings && Array.isArray(vacancy.buildings)) {
            const bIndex = vacancy.buildings.findIndex(b => String(b.id) === String(lead.roomDetails.buildingId));
            if (bIndex !== -1) {
              const r = Number(lead.roomDetails.row || 0);
              const c = Number(lead.roomDetails.col || 0);
              if (vacancy.buildings[bIndex].grid && vacancy.buildings[bIndex].grid[r] && vacancy.buildings[bIndex].grid[r][c]) {
                vacancy.buildings[bIndex].grid[r][c].isBooked = true;
                vacancy.buildings[bIndex].grid[r][c].isVacant = false;
              }
            }
          }

          // If no available rooms left, mark vacancy as booked
          if (typeof vacancy.availableRooms === 'number' && vacancy.availableRooms <= 0) {
            vacancy.status = 'booked';
          }

          // increment leadCount stat
          vacancy.stats = vacancy.stats || {};
          vacancy.stats.leadCount = (vacancy.stats.leadCount || 0) + 1;

          await vacancy.save();
        }
      } catch (err) {
        console.error('Error finalizing booking on vacancy:', err);
      }

      res.json({ message: 'Outcome marked successfully', lead });
      return;
    }

    // default behavior for other outcomes: set status to the outcome so UI can remove/reflect it
    lead.status = outcome;
    await lead.save();
    res.json({ message: 'Outcome marked successfully', lead });
  } catch (error) {
    console.error('Error marking outcome:', error);
    res.status(500).json({ message: 'Error marking outcome', error: error.message });
  }
};

// PUT: Cancel a provisional hold (tenant can cancel their booking hold)
export const cancelProvisionalHold = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = toUserId(req.user._id);

    const lead = await AgentLead.findById(id);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    const isTenant = String(lead.student) === String(userId);
    const isAgent = String(lead.agent) === String(userId);
    if (!isTenant && !isAgent && !hasRole(req.user, 'admin')) {
      return res.status(403).json({ message: 'Unauthorized to cancel this hold' });
    }

    if (lead.leadType !== 'booking' || !lead.provisionalHoldUntil) {
      return res.status(400).json({ message: 'No active provisional hold to cancel' });
    }

    lead.provisionalHoldUntil = undefined;
    lead.status = 'no-response';
    await lead.save();

    // Optionally notify other users via AgentChat
    try {
      const chat = await AgentChat.findOne({ tenant: lead.student, vacancy: lead.vacancy });
      if (chat) {
        chat.messages.push({ sender: 'system', content: 'Your reservation was cancelled.', timestamp: new Date(), read: false });
        await chat.save();
      }
    } catch (_) {}

    res.json({ success: true, message: 'Provisional hold cancelled', lead });
  } catch (error) {
    console.error('Error cancelling provisional hold:', error);
    res.status(500).json({ message: 'Error cancelling hold', error: error.message });
  }
};

// GET: Agent dashboard stats
export const getAgentStats = async (req, res) => {
  try {
    const agentId = toUserId(req.user._id);
    const now = new Date();

    const activeVacancies = await AgentVacancy.countDocuments({
      agent: agentId,
      isActive: true,
      expiresAt: { $gt: now },
    });

    const totalLeads = await AgentLead.countDocuments({ agent: agentId });

    const unreadLeads = await AgentLead.countDocuments({
      agent: agentId,
      isRead: false,
    });

    const leadTypeCounts = await AgentLead.aggregate([
      { $match: { agent: agentId } },
      { $group: { _id: '$leadType', count: { $sum: 1 } } },
    ]);

    const leadTypeStats = {
      contact: 0,
      viewing: 0,
      booking: 0,
    };

    leadTypeCounts.forEach((item) => {
      if (item._id && leadTypeStats[item._id] !== undefined) leadTypeStats[item._id] = item.count;
    });

    res.json({
      activeVacancies,
      totalLeads,
      unreadLeads,
      leadTypeStats,
    });
  } catch (error) {
    console.error('Error fetching agent stats:', error);
    res.status(500).json({ message: 'Error fetching stats', error: error.message });
  }
};

// GET: Public - active booking holds for a vacancy (non-sensitive)
export const getVacancyHolds = async (req, res) => {
  try {
    const vacancyId = req.params.id;
    const now = new Date();
    const holds = await AgentLead.find({
      vacancy: vacancyId,
      leadType: 'booking',
      provisionalHoldUntil: { $gt: now },
    }).select('roomDetails provisionalHoldUntil -_id').lean();

    const mapped = (holds || []).map(h => ({
      roomDetails: h.roomDetails || null,
      provisionalHoldUntil: h.provisionalHoldUntil,
    }));

    res.json({ success: true, holds: mapped });
  } catch (error) {
    console.error('Error fetching vacancy holds:', error);
    res.status(500).json({ success: false, message: 'Error fetching holds' });
  }
};

// POST: Create lead (user expresses interest in vacancy)
export const createLead = async (req, res) => {
  try {
    const { vacancyId, leadType = 'contact', message, preferredMoveInDate, preferredViewingDate, preferredRoomType, viewingTimeRange } = req.body;

    const vacancy = await AgentVacancy.findOne({
      _id: vacancyId,
      isActive: true,
      expiresAt: { $gt: new Date() },
    });
    if (!vacancy) {
      return res.status(404).json({ message: 'Vacancy not found' });
    }

    // Accept phone from request body (frontend) or fall back to authenticated user
    const providedPhone = (req.body?.phone) || (req.body?.studentInfo?.phone) || req.user.phone || '';
    if (!providedPhone || String(providedPhone).trim() === '') {
      return res.status(400).json({ message: 'Phone number is required to contact the agent' });
    }

    const studentInfo = {
      name: `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || (req.body?.studentInfo?.name || 'Student'),
      phone: String(providedPhone).trim(),
      email: req.user.email || (req.body?.studentInfo?.email || ''),
    };

    // Include optional roomDetails for booking/reserve flows
    const roomDetails = req.body?.roomDetails || undefined;

    // If booking/reserve, enforce roomDetails and check existing provisional holds
    const HOLD_MS = 2 * 60 * 60 * 1000; // 2 hours provisional hold
    let provisionalHoldUntil = undefined;
    if (leadType === 'booking') {
      if (!roomDetails || !roomDetails.buildingId) {
        return res.status(400).json({ message: 'Room details required to reserve a room' });
      }

      // Check for existing active provisional holds on this vacancy + room
      const now = new Date();
      const conflict = await AgentLead.findOne({
        vacancy: vacancyId,
        'roomDetails.buildingId': String(roomDetails.buildingId),
        'roomDetails.row': Number(roomDetails.row || 0),
        'roomDetails.col': Number(roomDetails.col || 0),
        provisionalHoldUntil: { $gt: now },
        leadType: 'booking',
      });
      if (conflict) {
        return res.status(409).json({ message: 'Room is currently held by another reservation. Try again later.' });
      }

      provisionalHoldUntil = new Date(Date.now() + HOLD_MS);
    }

    const lead = new AgentLead({
      agent: vacancy.agent,
      vacancy: vacancyId,
      student: toUserId(req.user._id),
      studentInfo,
      message: message || '',
      leadType,
      preferredMoveInDate: preferredMoveInDate ? new Date(preferredMoveInDate) : undefined,
      preferredViewingDate: preferredViewingDate ? new Date(preferredViewingDate) : undefined,
      preferredViewingTimeRange: viewingTimeRange || req.body.preferredViewingTimeRange || undefined,
      preferredRoomType: preferredRoomType || '',
      roomDetails: roomDetails ? {
        buildingId: String(roomDetails.buildingId),
        row: Number.isFinite(Number(roomDetails.row)) ? Number(roomDetails.row) : undefined,
        col: Number.isFinite(Number(roomDetails.col)) ? Number(roomDetails.col) : undefined,
        roomType: roomDetails.roomType || (preferredRoomType || ''),
      } : undefined,
      provisionalHoldUntil,
    });

    await lead.save();

    // Mark vacancy as "contacted" if it's currently "open" (first lead)
    const updatePayload = { $inc: { 'stats.leadCount': 1 } };
    if (vacancy.status === 'open') {
      updatePayload.status = 'contacted';
      updatePayload.contactedAt = new Date();
    }

    await AgentVacancy.findByIdAndUpdate(vacancyId, updatePayload);

    // Notify agent (and optionally caretakers) by email including student contact
    (async () => {
      try {
        const agentUser = await User.findById(vacancy.agent).select('firstName lastName email phone').lean();
        const studentContact = `${studentInfo.name} (${studentInfo.phone})`;
        const listingTitle = vacancy.title || vacancy.roomType || 'an agent listing';
        const html = `<div style="font-family:Arial,sans-serif;color:#222;max-width:520px;margin:auto;">
            <h2 style="background:#4F46E5;color:#fff;padding:12px;border-radius:6px;margin:0 0 12px;">New lead for ${listingTitle}</h2>
            <p style="margin:0 0 8px;">Student: <strong>${studentContact}</strong></p>
            <p style="margin:0 0 8px;">Message: ${message ? `<em>${message}</em>` : '—'}</p>
            <p style="margin:0 0 8px;">Vacancy: ${listingTitle}</p>
            <p style="margin:0 0 8px;">Open the agent dashboard to manage this lead.</p>
          </div>`;

        if (agentUser?.email) {
          sendEmail(agentUser.email, `New lead — ${listingTitle} — PataKeja`, html).catch(() => {});
        }
      } catch (_) {
        // ignore notification errors
      }
    })();

    res.status(201).json({
      message: 'Interest expressed successfully',
      lead,
    });
  } catch (error) {
    console.error('Error creating lead:', error);
    res.status(500).json({ message: 'Error expressing interest', error: error.message });
  }
};
