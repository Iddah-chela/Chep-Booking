import React, { useEffect, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import toast from 'react-hot-toast';
import { Loader } from 'lucide-react';

const AgentBookings = () => {
  const { axios, getToken } = useAppContext();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const token = await getToken();
      const { data } = await axios.get('/api/agent/leads?status=all&limit=500', { headers: { Authorization: `Bearer ${token}` } });
      const leads = data.leads || [];
      const bookingLeads = leads.filter(l => (l.leadType === 'booking' || (l.lead && l.lead.leadType === 'booking')));
      setBookings(bookingLeads);
    } catch (err) {
      toast.error('Could not load bookings');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className='flex items-center justify-center h-screen'><Loader className='animate-spin' /></div>;

  return (
    <div className='py-28 px-4 md:px-16 lg:px-24 xl:px-32 min-h-screen'>
      <h1 className='text-3xl mb-6'>Manage Bookings</h1>
      {bookings.length === 0 ? (
        <div className='text-center py-16'>No booking leads found</div>
      ) : (
        <div className='space-y-4'>
          {bookings.map(b => {
            const id = b._id || b.lead?._id;
            const phone = (b.studentInfo && b.studentInfo.phone) || (b.lead && b.lead.studentInfo?.phone);
            const name = (b.studentInfo && b.studentInfo.name) || (b.lead && b.lead.studentInfo?.name) || 'Tenant';
            const created = new Date((b.createdAt || (b.lead && b.lead.createdAt)) || Date.now()).toLocaleString();
            return (
              <div key={id} className='bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700'>
                <div className='flex justify-between items-center'>
                  <div>
                    <p className='font-semibold'>{name}</p>
                    <p className='text-sm text-gray-600'>{phone}</p>
                  </div>
                  <div className='text-sm text-gray-500'>{created}</div>
                </div>
                <div className='mt-4 flex gap-3'>
                  <button
                    disabled={processingId === id}
                    onClick={async () => {
                      if (!window.confirm('Confirm this booking? This will finalize the booking.')) return;
                      try {
                        setProcessingId(id);
                        const token = await getToken();
                        await axios.put(`/api/agent/leads/${id}/outcome`, { outcome: 'booked' }, { headers: { Authorization: `Bearer ${token}` } });
                        toast.success('Booking confirmed');
                        fetchBookings();
                      } catch (err) {
                        toast.error('Failed to confirm booking');
                      } finally {
                        setProcessingId(null);
                      }
                    }}
                    className='px-4 py-2 bg-green-600 text-white rounded-lg'
                  >
                    Confirm Booking
                  </button>

                  <button
                    disabled={processingId === id}
                    onClick={async () => {
                      if (!window.confirm('Cancel provisional hold on this booking?')) return;
                      try {
                        setProcessingId(id);
                        const token = await getToken();
                        await axios.put(`/api/agent/leads/${id}/cancel-hold`, {}, { headers: { Authorization: `Bearer ${token}` } });
                        toast.success('Provisional hold cancelled');
                        fetchBookings();
                      } catch (err) {
                        toast.error('Failed to cancel hold');
                      } finally {
                        setProcessingId(null);
                      }
                    }}
                    className='px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg border border-yellow-200'
                  >
                    Cancel Hold
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AgentBookings;
