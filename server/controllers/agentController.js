import AgentVacancy from '../models/agentVacancy.js';
import AgentLead from '../models/agentLead.js';
import AgentChat from '../models/agentChat.js';
import cloudinary from '../config/cloudinary.js';
import fs from 'fs/promises';
import { hasRole } from '../utils/roleUtils.js';

const toUserId = (value) => value?.toString?.() || String(value || '');

const uploadAgentMedia = async (file, folder) => {
  if (!file) return null;
  const result = await cloudinary.uploader.upload(file.path, {
    folder,
    resource_type: file.mimetype.startsWith('video/') ? 'video' : 'image',
  });
  await fs.unlink(file.path).catch(() => {});
  return {
    url: result.secure_url,
    publicId: result.public_id,
    thumbnail: result.resource_type === 'video' ? result.thumbnail_url || '' : '',
    resourceType: result.resource_type,
  };
};

export const uploadMedia = async (req, res) => {
  try {
    const file = req.file;
    const mediaType = String(req.body?.mediaType || '').toLowerCase();
    if (!file) {
      return res.status(400).json({ message: 'No file provided' });
    }

    const folder = mediaType === 'video' || file.mimetype.startsWith('video/')
      ? 'agent_vacancies/videos'
      : 'agent_vacancies/photos';

    const media = await uploadAgentMedia(file, folder);
    return res.json({ success: true, media });
  } catch (error) {
    console.error('Agent media upload error:', error);
    return res.status(500).json({ success: false, message: error.message });
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
    const lead = await AgentLead.findById(req.params.id)
      .populate('student', 'firstName lastName email phone')
      .populate('vacancy', 'title roomType rent location description amenities photos availabilityFrom availabilityTo minBookingLeadDays')
      .populate('agent', 'firstName lastName email phone');

    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    if (lead.agent.toString() !== req.user._id.toString() && !hasRole(req.user, 'admin')) {
      return res.status(403).json({ message: 'Unauthorized to view this lead' });
    }

    if (!lead.isRead) {
      lead.isRead = true;
      await lead.save();
    }

    res.json(lead);
  } catch (error) {
    console.error('Error fetching lead:', error);
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

    // default behavior for other outcomes
    lead.status = 'pending';
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

// POST: Create lead (user expresses interest in vacancy)
export const createLead = async (req, res) => {
  try {
    const { vacancyId, leadType = 'contact', message, preferredMoveInDate, preferredViewingDate, preferredRoomType } = req.body;

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

    res.status(201).json({
      message: 'Interest expressed successfully',
      lead,
    });
  } catch (error) {
    console.error('Error creating lead:', error);
    res.status(500).json({ message: 'Error expressing interest', error: error.message });
  }
};
