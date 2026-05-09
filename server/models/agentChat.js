import mongoose from 'mongoose';

const messageSchema = mongoose.Schema({
  sender: {
    type: String,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  read: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

const agentChatSchema = mongoose.Schema({
  tenant: {
    type: String,
    ref: 'User',
    required: true
  },
  agent: {
    type: String,
    ref: 'User',
    required: true
  },
  vacancy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AgentVacancy',
    required: true
  },
  roomDetails: {
    buildingId: { type: String, required: true },
    buildingName: { type: String, required: true },
    row: { type: Number, required: true },
    col: { type: Number, required: true },
    roomType: { type: String, required: true }
  },
  messages: [messageSchema],
  lastMessage: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

const AgentChat = mongoose.model('AgentChat', agentChatSchema);

export default AgentChat;
