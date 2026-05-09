import express from 'express';
import {
  getOrCreateAgentChat,
  sendAgentMessage,
  getAgentChats,
  markAgentMessagesAsRead,
  getAgentChatById
} from '../controllers/agentChatController.js';
import { protect } from '../middleware/authMiddleware.js';

const agentChatRouter = express.Router();

agentChatRouter.post('/get-or-create', protect, getOrCreateAgentChat);
agentChatRouter.post('/send', protect, sendAgentMessage);
agentChatRouter.get('/user-chats', protect, getAgentChats);
agentChatRouter.post('/mark-read', protect, markAgentMessagesAsRead);
agentChatRouter.get('/:chatId', protect, getAgentChatById);

export default agentChatRouter;
