import AgentChat from '../models/agentChat.js';
import AgentVacancy from '../models/agentVacancy.js';
import User from '../models/user.js';
import { sendEmail } from '../utils/mailer.js';
import { sendPushNotification } from '../utils/pushNotifier.js';

const normalizeRoomDetails = (roomDetails) => {
  const parsedRow = Number(roomDetails?.row);
  const parsedCol = Number(roomDetails?.col);
  return {
    buildingId: roomDetails?.buildingId || 'agent-listing',
    buildingName: roomDetails?.buildingName || 'Main Building',
    row: Number.isFinite(parsedRow) ? parsedRow : 0,
    col: Number.isFinite(parsedCol) ? parsedCol : 0,
    roomType: roomDetails?.roomType || 'vacancy'
  };
};

export const getOrCreateAgentChat = async (req, res) => {
  try {
    const { vacancyId, roomDetails } = req.body;
    const tenantId = req.user._id;

    const vacancy = await AgentVacancy.findOne({
      _id: vacancyId,
      isActive: true,
      expiresAt: { $gt: new Date() }
    });

    if (!vacancy) {
      return res.json({ success: false, message: 'Vacancy not found' });
    }

    const agentId = vacancy.agent;
    if (!agentId) {
      return res.json({ success: false, message: 'Agent not found' });
    }

    const normalizedRoomDetails = normalizeRoomDetails(roomDetails);

    let chat = await AgentChat.findOne({
      tenant: tenantId,
      agent: agentId,
      vacancy: vacancyId,
      'roomDetails.buildingId': normalizedRoomDetails.buildingId,
      'roomDetails.row': normalizedRoomDetails.row,
      'roomDetails.col': normalizedRoomDetails.col
    }).populate('tenant agent vacancy');

    if (!chat) {
      chat = await AgentChat.create({
        tenant: tenantId,
        agent: agentId,
        vacancy: vacancyId,
        roomDetails: normalizedRoomDetails,
        messages: []
      });
      chat = await AgentChat.findById(chat._id).populate('tenant agent vacancy');
    }

    res.json({ success: true, chat });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const sendAgentMessage = async (req, res) => {
  try {
    const { chatId, content } = req.body;
    const senderId = req.user._id;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.json({ success: false, message: 'Message cannot be empty' });
    }
    if (content.length > 5000) {
      return res.json({ success: false, message: 'Message is too long (max 5000 characters)' });
    }

    const chat = await AgentChat.findById(chatId);
    if (!chat) {
      return res.json({ success: false, message: 'Chat not found' });
    }

    const isTenant = String(chat.tenant) === String(senderId);
    const isAgent = String(chat.agent) === String(senderId);
    if (!isTenant && !isAgent) {
      return res.json({ success: false, message: 'Unauthorized' });
    }

    chat.messages.push({
      sender: senderId,
      content,
      timestamp: new Date(),
      read: false
    });
    chat.lastMessage = new Date();

    await chat.save();

    const updatedChat = await AgentChat.findById(chatId).populate('tenant agent vacancy');
    res.json({ success: true, chat: updatedChat });

    (async () => {
      try {
        const recipientId = isTenant ? chat.agent : chat.tenant;
        const [sender, recipient, vacancy] = await Promise.all([
          User.findById(senderId),
          User.findById(recipientId),
          AgentVacancy.findById(chat.vacancy).select('title').lean()
        ]);

        const listingTitle = vacancy?.title || 'an agent listing';

        if (recipient?.email) {
          sendEmail(
            recipient.email,
            `New message from ${sender?.username || 'someone'} — PataKeja`,
            `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#222;">
                <div style="background:#4F46E5;padding:20px;text-align:center;border-radius:8px 8px 0 0;">
                    <h2 style="color:#fff;margin:0;font-size:18px;">New Message on PataKeja</h2>
                </div>
                <div style="padding:20px;background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
                    <p style="font-size:14px;line-height:1.6;margin:0 0 12px;">You have a new message about <strong>${listingTitle}</strong>:</p>
                    <div style="background:#f3f4f6;border-radius:8px;padding:12px 16px;margin:0 0 12px;">
                        <p style="margin:0;font-size:14px;color:#333;">${content.length > 200 ? content.substring(0, 200) + '...' : content}</p>
                    </div>
                    <p style="font-size:13px;color:#888;margin:0;">Open PataKeja to reply.</p>
                </div>
            </div>`
          ).catch(() => {});
        }

        sendPushNotification(recipientId, {
          title: 'New agent chat message',
          body: content.length > 100 ? content.substring(0, 100) + '...' : content,
          url: `/rooms/${chat.vacancy}`,
          tag: `agent-chat-${chatId}`
        });
      } catch (_) {
        // Ignore notification errors
      }
    })();
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const getAgentChats = async (req, res) => {
  try {
    const userId = req.user._id;

    const chats = await AgentChat.find({
      $or: [
        { tenant: userId },
        { agent: userId }
      ]
    }).populate('tenant agent vacancy').sort({ lastMessage: -1 });

    res.json({ success: true, chats });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const getAgentChatById = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user._id;

    const chat = await AgentChat.findById(chatId).populate('tenant agent vacancy');
    if (!chat) {
      return res.json({ success: false, message: 'Chat not found' });
    }

    if (String(chat.tenant) !== String(userId) && String(chat.agent) !== String(userId)) {
      return res.json({ success: false, message: 'Unauthorized' });
    }

    res.json({ success: true, chat });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const markAgentMessagesAsRead = async (req, res) => {
  try {
    const { chatId } = req.body;
    const userId = req.user._id;

    const chat = await AgentChat.findById(chatId);
    if (!chat) {
      return res.json({ success: false, message: 'Chat not found' });
    }

    chat.messages.forEach((message) => {
      if (String(message.sender) !== String(userId) && !message.read) {
        message.read = true;
      }
    });

    await chat.save();
    res.json({ success: true });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};
