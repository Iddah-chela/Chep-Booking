import AgentVacancy from '../models/agentVacancy.js';
import AgentLead from '../models/agentLead.js';
import User from '../models/user.js';
import mongoose from 'mongoose';

// POST: Create a new vacancy
export const postVacancy = async (req, res) => {
  try {
    const { location, rent, roomType, availableRooms, description, amenities, photos, moveInDate } = req.body;
    const agentId = req.user._id;

    // Validate required fields
    if (!location?.area || !location?.city || !rent?.min || !rent?.max || !roomType || !availableRooms) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    if (rent.min < 0 || rent.max < 0 || rent.min > rent.max) {
      return res.status(400).json({ message: 'Invalid rent range' });
    }

    if (availableRooms < 1) {
      return res.status(400).json({ message: 'Available rooms must be at least 1' });
    }

    const vacancy = new AgentVacancy({
      agent: agentId,
      location,
      rent,
      roomType,
      availableRooms,
      description: description || '',
      amenities: amenities || [],
      photos: photos || [],
      moveInDate: moveInDate ? new Date(moveInDate) : undefined,
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
    const agentId = req.user._id;
    const { status = 'all', page = 1, limit = 10 } = req.query;

    const query = { agent: agentId };
    if (status !== 'all') {
      query.isActive = status === 'active';
    }

    const skip = (page - 1) * limit;
    const vacancies = await AgentVacancy.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await AgentVacancy.countDocuments(query);

    res.json({
      vacancies,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
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
    const vacancy = await AgentVacancy.findById(req.params.id).populate('agent', 'firstName lastName email phone');

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
    const agentId = req.user._id;
    const { location, rent, roomType, availableRooms, description, amenities, photos, moveInDate } = req.body;

    const vacancy = await AgentVacancy.findById(id);

    if (!vacancy) {
      return res.status(404).json({ message: 'Vacancy not found' });
    }

    if (vacancy.agent.toString() !== agentId.toString()) {
      return res.status(403).json({ message: 'Unauthorized to update this vacancy' });
    }

    // Update allowed fields
    if (location) vacancy.location = location;
    if (rent) {
      if (rent.min < 0 || rent.max < 0 || rent.min > rent.max) {
        return res.status(400).json({ message: 'Invalid rent range' });
      }
      vacancy.rent = rent;
    }
    if (roomType) vacancy.roomType = roomType;
    if (availableRooms) {
      if (availableRooms < 1) {
        return res.status(400).json({ message: 'Available rooms must be at least 1' });
      }
      vacancy.availableRooms = availableRooms;
    }
    if (description !== undefined) vacancy.description = description;
    if (amenities) vacancy.amenities = amenities;
    if (photos) vacancy.photos = photos;
    if (moveInDate) vacancy.moveInDate = new Date(moveInDate);

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
    const agentId = req.user._id;

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

// GET: Get all leads for agent
export const getAgentLeads = async (req, res) => {
  try {
    const agentId = req.user._id;
    const { status = 'all', page = 1, limit = 10, unreadOnly = false } = req.query;

    const query = { agent: agentId };
    if (status !== 'all') {
      query.status = status;
    }
    if (unreadOnly === 'true') {
      query.isRead = false;
    }

    const skip = (page - 1) * limit;
    const leads = await AgentLead.find(query)
      .populate('student', 'firstName lastName email phone')
      .populate('vacancy', 'roomType rent location')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await AgentLead.countDocuments(query);

    res.json({
      leads,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
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
      .populate('vacancy', 'roomType rent location description amenities photos')
      .populate('agent', 'firstName lastName email phone');

    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    // Check authorization
    if (lead.agent._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized to view this lead' });
    }

    // Mark as read
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
    const agentId = req.user._id;
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
    const agentId = req.user._id;
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
    lead.status = 'pending'; // Mark as reviewed

    await lead.save();

    // Update vacancy stats if booked
    if (outcome === 'booked') {
      await AgentVacancy.findByIdAndUpdate(lead.vacancy, { $inc: { 'stats.leadCount': 1 } });
    }

    res.json({ message: 'Outcome marked successfully', lead });
  } catch (error) {
    console.error('Error marking outcome:', error);
    res.status(500).json({ message: 'Error marking outcome', error: error.message });
  }
};

// GET: Agent dashboard stats
export const getAgentStats = async (req, res) => {
  try {
    const agentId = req.user._id;

    const activeVacancies = await AgentVacancy.countDocuments({
      agent: agentId,
      isActive: true,
      expiresAt: { $gt: new Date() },
    });

    const totalLeads = await AgentLead.countDocuments({ agent: agentId });

    const unreadLeads = await AgentLead.countDocuments({
      agent: agentId,
      isRead: false,
    });

    const leadOutcomes = await AgentLead.aggregate([
      {
        $match: {
          agent: agentId, // Keep as string since agent field is String type
          outcome: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: '$outcome',
          count: { $sum: 1 },
        },
      },
    ]);

    const outcomeStats = {
      viewed: 0,
      booked: 0,
      notFit: 0,
      noResponse: 0,
    };

    leadOutcomes.forEach((item) => {
      if (item._id === 'viewed') outcomeStats.viewed = item.count;
      if (item._id === 'booked') outcomeStats.booked = item.count;
      if (item._id === 'not-fit') outcomeStats.notFit = item.count;
      if (item._id === 'no-response') outcomeStats.noResponse = item.count;
    });

    res.json({
      activeVacancies,
      totalLeads,
      unreadLeads,
      outcomeStats,
    });
  } catch (error) {
    console.error('Error fetching agent stats:', error);
    res.status(500).json({ message: 'Error fetching stats', error: error.message });
  }
};

// POST: Create lead (user expresses interest in vacancy)
export const createLead = async (req, res) => {
  try {
    const { vacancyId, message, preferredMoveInDate, preferredRoomType } = req.body;

    const vacancy = await AgentVacancy.findById(vacancyId);
    if (!vacancy) {
      return res.status(404).json({ message: 'Vacancy not found' });
    }

    // Get student info
    let studentInfo = {
      name: req.user.firstName + ' ' + req.user.lastName,
      phone: req.user.phone || '',
      email: req.user.email || '',
    };

    const lead = new AgentLead({
      agent: vacancy.agent,
      vacancy: vacancyId,
      student: req.user._id,
      studentInfo,
      message: message || '',
      preferredMoveInDate: preferredMoveInDate ? new Date(preferredMoveInDate) : undefined,
      preferredRoomType: preferredRoomType || '',
    });

    await lead.save();

    // Increment vacancy lead count
    await AgentVacancy.findByIdAndUpdate(vacancyId, { $inc: { 'stats.leadCount': 1 } });

    res.status(201).json({
      message: 'Interest expressed successfully',
      lead,
    });
  } catch (error) {
    console.error('Error creating lead:', error);
    res.status(500).json({ message: 'Error expressing interest', error: error.message });
  }
};
