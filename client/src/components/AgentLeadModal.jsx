import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { toast } from 'react-hot-toast';

const leadTitles = {
  contact: 'Contact Agent',
  viewing: 'Request Viewing',
  booking: 'Reserve Room'
};

const AgentLeadModal = ({ vacancyId, leadType = 'contact', room, onClose, onSuccess }) => {
  const { axios, getToken, user } = useAppContext();
  const [message, setMessage] = useState('');
  const [preferredViewingDate, setPreferredViewingDate] = useState('');
  const [preferredMoveInDate, setPreferredMoveInDate] = useState('');
  const [loading, setLoading] = useState(false);

  const needsViewingDate = leadType === 'viewing';
  const needsMoveInDate = leadType !== 'contact';

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!user) {
      toast.error('Please sign in to contact the agent');
      return;
    }
    if (needsViewingDate && !preferredViewingDate) {
      toast.error('Please select a preferred viewing date');
      return;
    }
    if (needsMoveInDate && !preferredMoveInDate) {
      toast.error('Please select a preferred move-in date');
      return;
    }

    setLoading(true);
    try {
      const token = await getToken();
      const payload = {
        vacancyId,
        leadType,
        message,
        preferredRoomType: room?.roomType || ''
      };
      if (preferredViewingDate) payload.preferredViewingDate = preferredViewingDate;
      if (preferredMoveInDate) payload.preferredMoveInDate = preferredMoveInDate;

      const { data } = await axios.post('/api/agent/leads', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (data?.message) {
        toast.success('Agent notified. You will be contacted soon.');
        onSuccess && onSuccess(data);
        onClose();
      } else {
        toast.error('Unable to send request. Please try again.');
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Unable to send request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md my-auto max-h-[95vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold">{leadTitles[leadType] || 'Contact Agent'}</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl"
            >
              ×
            </button>
          </div>

          {room?.roomType && (
            <div className="mb-4 p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 rounded-lg">
              <p className="text-sm text-indigo-700 dark:text-indigo-200">
                Selected room type: <strong>{room.roomType}</strong>
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {needsViewingDate && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Preferred Viewing Date
                </label>
                <input
                  type="date"
                  value={preferredViewingDate}
                  onChange={(event) => setPreferredViewingDate(event.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  required
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 outline-none focus:border-primary dark:bg-gray-700 dark:text-gray-100"
                />
              </div>
            )}

            {needsMoveInDate && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Preferred Move-in Date
                </label>
                <input
                  type="date"
                  value={preferredMoveInDate}
                  onChange={(event) => setPreferredMoveInDate(event.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  required
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 outline-none focus:border-primary dark:bg-gray-700 dark:text-gray-100"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Message (Optional)
              </label>
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Share any details with the agent..."
                rows="4"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 outline-none focus:border-primary dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white py-3 rounded-lg hover:bg-primary-dull transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Sending...' : 'Send Request'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AgentLeadModal;
