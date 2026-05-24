import React, { useEffect, useMemo, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import toast from 'react-hot-toast';
import { Loader, CalendarDays, MapPin, User, CheckCircle2, XCircle, Clock3, BadgeCheck } from 'lucide-react';

const tabConfig = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'denied', label: 'Denied' },
];

const getLeadType = (lead) => String(lead?.leadType || lead?.lead?.leadType || '').toLowerCase();
const getLeadStatus = (lead) => String(lead?.outcome || lead?.status || lead?.lead?.outcome || lead?.lead?.status || '').toLowerCase();
const getLeadId = (lead) => lead?._id || lead?.lead?._id;

const isBookingLead = (lead) => {
  const leadType = getLeadType(lead);
  return leadType === 'booking' || leadType === 'reserve';
};

const bucketBookingLead = (lead) => {
  const status = getLeadStatus(lead);
  if (status === 'booked') return 'confirmed';
  if (['not-fit', 'no-response', 'declined', 'cancelled'].includes(status)) return 'denied';
  return 'pending';
};

const statusStyles = {
  pending: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-700',
  confirmed: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border-green-200 dark:border-green-700',
  denied: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border-red-200 dark:border-red-700',
  booked: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border-green-200 dark:border-green-700',
  'no-response': 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700',
  'not-fit': 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border-red-200 dark:border-red-700',
};

const AgentBookings = () => {
  const { axios, getToken } = useAppContext();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [tab, setTab] = useState('all');

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const token = await getToken();
      const { data } = await axios.get('/api/agent/leads?status=all&limit=500', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const leads = data.leads || [];
      const bookingLeads = leads.filter(isBookingLead).map((lead) => ({
        ...lead,
        _leadType: getLeadType(lead),
        _leadStatus: getLeadStatus(lead),
        _bucket: bucketBookingLead(lead),
      }));
      setItems(bookingLeads);
    } catch (err) {
      console.error('Could not load booking leads:', err);
      toast.error('Could not load bookings');
    } finally {
      setLoading(false);
    }
  };

  const visibleItems = useMemo(() => {
    if (tab === 'all') return items;
    return items.filter((item) => item._bucket === tab);
  }, [items, tab]);

  const counts = useMemo(() => {
    return items.reduce((acc, item) => {
      acc.all += 1;
      acc[item._bucket] += 1;
      return acc;
    }, { all: 0, pending: 0, confirmed: 0, denied: 0 });
  }, [items]);

  const confirmBooking = async (id) => {
    if (!window.confirm('Confirm this booking? This will finalize the booking.')) return;
    try {
      setProcessingId(id);
      const token = await getToken();
      await axios.put(`/api/agent/leads/${id}/outcome`, { outcome: 'booked' }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Booking confirmed');
      await fetchBookings();
    } catch (err) {
      console.error('Failed to confirm booking:', err);
      toast.error(err?.response?.data?.message || 'Failed to confirm booking');
    } finally {
      setProcessingId(null);
    }
  };

  const cancelHold = async (id) => {
    if (!window.confirm('Cancel temporary hold on this booking?')) return;
    try {
      setProcessingId(id);
      const token = await getToken();
      await axios.put(`/api/agent/leads/${id}/cancel-hold`, {}, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Temporary hold cancelled');
      await fetchBookings();
    } catch (err) {
      console.error('Failed to cancel hold:', err);
      toast.error(err?.response?.data?.message || 'Failed to cancel hold');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className='flex items-center justify-center h-screen'>
        <Loader className='animate-spin' />
      </div>
    );
  }

  return (
    <div className='py-28 px-4 md:px-16 lg:px-24 xl:px-32 min-h-screen'>
      <div className='max-w-6xl mx-auto'>
        <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6'>
          <div>
            <h1 className='text-3xl font-bold text-gray-900 dark:text-white'>Manage Bookings</h1>
            <p className='text-sm text-gray-600 dark:text-gray-400 mt-0.5'>Confirmed bookings stay visible in their own tab, while denied leads remain for reference.</p>
          </div>
        </div>

        <div className='flex gap-2 mb-6 overflow-x-auto pb-2'>
          {tabConfig.map((entry) => (
            <button
              key={entry.key}
              onClick={() => setTab(entry.key)}
              className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all ${
                tab === entry.key
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {entry.label}
              <span className='ml-2 text-xs opacity-80'>({counts[entry.key]})</span>
            </button>
          ))}
        </div>

        {visibleItems.length === 0 ? (
          <div className='text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700'>
            <CalendarDays className='w-10 h-10 mx-auto mb-3 text-gray-400 opacity-60' />
            <p className='text-gray-500 dark:text-gray-400'>No {tab !== 'all' ? tab : ''} booking leads found</p>
          </div>
        ) : (
          <div className='space-y-4'>
            {visibleItems.map((lead) => {
              const id = getLeadId(lead);
              const status = lead._leadStatus || 'pending';
              const bookingStatus = lead._bucket;
              const phone = lead.studentInfo?.phone || lead.lead?.studentInfo?.phone || 'N/A';
              const name = lead.studentInfo?.name || lead.lead?.studentInfo?.name || 'Tenant';
              const created = new Date(lead.createdAt || lead.lead?.createdAt || Date.now()).toLocaleString();
              const vacancy = lead.vacancy || lead.lead?.vacancy || {};
              const roomType = lead.roomDetails?.roomType || lead.lead?.roomDetails?.roomType || vacancy.roomType || 'room';
              const buildingName = lead.roomDetails?.buildingName || lead.lead?.roomDetails?.buildingName || 'Main Building';
              const isConfirmed = bookingStatus === 'confirmed';
              const isDenied = bookingStatus === 'denied';

              return (
                <div key={id} className='bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm'>
                  <div className='flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4'>
                    <div className='flex-1'>
                      <div className='flex flex-wrap items-center gap-2 mb-3'>
                        <h3 className='font-semibold text-gray-900 dark:text-white text-lg'>{name}</h3>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${statusStyles[status] || statusStyles.pending}`}>
                          {isConfirmed ? 'confirmed' : isDenied ? 'denied' : status || 'pending'}
                        </span>
                        <span className='px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 capitalize'>
                          booking
                        </span>
                      </div>

                      <div className='grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600 dark:text-gray-300'>
                        <div className='flex items-center gap-2'>
                          <User className='w-4 h-4 text-gray-400' />
                          <span>{phone}</span>
                        </div>
                        <div className='flex items-center gap-2'>
                          <CalendarDays className='w-4 h-4 text-gray-400' />
                          <span>{created}</span>
                        </div>
                        <div className='flex items-center gap-2 md:col-span-2'>
                          <MapPin className='w-4 h-4 text-gray-400' />
                          <span>{vacancy?.title || vacancy?.roomType || 'Vacancy'} · {buildingName} · {roomType}</span>
                        </div>
                      </div>

                      {lead.message && (
                        <div className='mt-4 rounded-lg bg-gray-50 dark:bg-gray-700/60 p-3 text-sm text-gray-700 dark:text-gray-200'>
                          {lead.message}
                        </div>
                      )}

                      <div className='mt-4 flex flex-wrap gap-2'>
                        {bookingStatus === 'confirmed' ? (
                          <span className='inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 text-sm font-medium'>
                            <BadgeCheck className='w-4 h-4' /> Confirmed booking
                          </span>
                        ) : bookingStatus === 'denied' ? (
                          <span className='inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm font-medium'>
                            <XCircle className='w-4 h-4' /> Denied booking
                          </span>
                        ) : lead.provisionalHoldUntil ? (
                          <span className='inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 text-sm font-medium'>
                            <Clock3 className='w-4 h-4' /> Temporary hold until {new Date(lead.provisionalHoldUntil).toLocaleString()}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className='flex flex-col gap-3 lg:w-64'>
                      {!isConfirmed && !isDenied && (
                        <button
                          disabled={processingId === id}
                          onClick={() => confirmBooking(id)}
                          className='inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-60'
                        >
                          <CheckCircle2 className='w-4 h-4' />
                          {processingId === id ? 'Confirming…' : 'Confirm Booking'}
                        </button>
                      )}

                      {!isDenied && (
                        <button
                          disabled={processingId === id}
                          onClick={() => cancelHold(id)}
                          className='inline-flex items-center justify-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg border border-yellow-200 hover:bg-yellow-200 disabled:opacity-60 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-700'
                        >
                          <XCircle className='w-4 h-4' />
                          {processingId === id ? 'Cancelling…' : 'Cancel Temporary Hold'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentBookings;
