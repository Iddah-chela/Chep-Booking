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
  const [phone, setPhone] = useState(user?.phone || '');
  const [loading, setLoading] = useState(false);
  const [reservedLead, setReservedLead] = useState(null);

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
    if (!phone || String(phone).trim() === '') {
      toast.error('Please provide a phone number so the agent can contact you');
      return;
    }

    setLoading(true);
    try {
      const token = await getToken();
      const payload = {
        vacancyId,
        leadType,
        message,
        preferredRoomType: room?.roomType || '',
        phone
      };
      if (room) {
        payload.roomDetails = {
          buildingId: room.buildingId,
          row: room.row,
          col: room.col,
          roomType: room.roomType,
        };
      }
      if (preferredViewingDate) payload.preferredViewingDate = preferredViewingDate;
      if (preferredMoveInDate) payload.preferredMoveInDate = preferredMoveInDate;

      const { data } = await axios.post('/api/agent/leads', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (data?.message) {
        // If booking/reserve, keep modal open and show hold info + cancel option
        if (leadType === 'booking' && data.lead) {
          setReservedLead(data.lead);
          toast.success('Room provisionally held. Confirm with the agent in your leads.');
          onSuccess && onSuccess(data);
        } else {
          toast.success('Agent notified. You will be contacted soon.');
          onSuccess && onSuccess(data);
          onClose();
        }
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

          {!reservedLead ? (
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

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Enter phone number"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 outline-none focus:border-primary dark:bg-gray-700 dark:text-gray-100"
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
          ) : (
            <div className="space-y-4">
              <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
                <p className="text-sm text-green-800 dark:text-green-200">Room provisionally held until:</p>
                <p className="font-semibold">{new Date(reservedLead.provisionalHoldUntil).toLocaleString()}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">The agent must confirm to finalize the booking. You can cancel this hold.</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    try {
                      setLoading(true);
                      const token = await getToken();
                      const { data } = await axios.put(`/api/agent/leads/${reservedLead._id}/cancel-hold`, {}, { headers: { Authorization: `Bearer ${token}` } });
                      if (data?.success) {
                        toast.success('Hold cancelled');
                        setReservedLead(null);
                        onClose();
                      } else {
                        toast.error(data?.message || 'Failed to cancel hold');
                      }
                    } catch (err) {
                      toast.error(err?.response?.data?.message || 'Failed to cancel hold');
                    } finally {
                      setLoading(false);
                    }
                  }}
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all"
                >
                  {loading ? 'Cancelling...' : 'Cancel Hold'}
                </button>
                <button onClick={() => { onClose(); }} className="flex-1 px-4 py-3 bg-white border border-gray-300 rounded-lg">Close</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AgentLeadModal;
