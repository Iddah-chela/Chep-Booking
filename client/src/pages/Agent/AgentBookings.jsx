import React, { useEffect, useMemo, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import toast from 'react-hot-toast';
import { Loader, CalendarDays, MapPin, User, CheckCircle2, XCircle, Clock3, BadgeCheck, Phone } from 'lucide-react';
import {
  unwrapAgentLeadItem,
  resolveTenantName,
  resolveTenantPhone,
  formatVacancyLabel,
  formatRoomLabel,
} from '../../utils/normalizeAgentLead';

const tabConfig = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'denied', label: 'Denied' },
];

const getLeadStatus = (lead) =>
  String(lead?.outcome || lead?.status || '').toLowerCase();

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
      setLoading(true);
      const token = await getToken();
      const { data } = await axios.get('/api/agent/leads?status=all&limit=500', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const bookingLeads = (data.leads || [])
        .map(unwrapAgentLeadItem)
        .filter(Boolean)
        .filter((lead) => ['booking', 'reserve'].includes(String(lead.leadType || '').toLowerCase()))
        .map((lead) => ({
          ...lead,
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
    return items.reduce(
      (acc, item) => {
        acc.all += 1;
        acc[item._bucket] += 1;
        return acc;
      },
      { all: 0, pending: 0, confirmed: 0, denied: 0 }
    );
  }, [items]);

  const confirmBooking = async (id) => {
    if (!window.confirm('Confirm this booking? The tenant will be asked to confirm the placement for your reputation.')) return;
    try {
      setProcessingId(id);
      const token = await getToken();
      await axios.put(
        `/api/agent/leads/${id}/outcome`,
        { outcome: 'booked' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Booking confirmed — waiting for tenant placement confirm');
      await fetchBookings();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to confirm booking');
    } finally {
      setProcessingId(null);
    }
  };

  const cancelHold = async (id) => {
    if (!window.confirm('Cancel the reservation hold on this booking?')) return;
    try {
      setProcessingId(id);
      const token = await getToken();
      await axios.put(`/api/agent/leads/${id}/cancel-hold`, {}, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Hold cancelled');
      await fetchBookings();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to cancel hold');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className='flex items-center justify-center h-64'>
        <Loader className='animate-spin text-indigo-600' />
      </div>
    );
  }

  return (
    <div className='max-w-6xl mx-auto'>
      <div className='mb-6'>
        <h1 className='text-2xl md:text-3xl font-bold text-gray-900 dark:text-white'>Manage Bookings</h1>
        <p className='text-sm text-gray-600 dark:text-gray-400 mt-1'>
          Reserve holds stay until you confirm or cancel. Confirming asks the tenant to verify the placement for your reputation.
        </p>
      </div>

      <div className='flex gap-2 mb-6 overflow-x-auto pb-2'>
        {tabConfig.map((entry) => (
          <button
            key={entry.key}
            onClick={() => setTab(entry.key)}
            className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all ${
              tab === entry.key
                ? 'bg-indigo-600 text-white'
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
            const id = String(lead._id);
            const bookingStatus = lead._bucket;
            const name = resolveTenantName(lead);
            const phone = resolveTenantPhone(lead);
            const created = lead.createdAt ? new Date(lead.createdAt).toLocaleString() : '—';
            const vacancyLabel = formatVacancyLabel(lead.vacancy, 'Vacancy');
            const roomLabel = formatRoomLabel(lead);
            const isConfirmed = bookingStatus === 'confirmed';
            const isDenied = bookingStatus === 'denied';
            const hasHold = !!lead.provisionalHoldUntil && !isConfirmed && !isDenied;

            return (
              <div key={id} className='bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm'>
                <div className='flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4'>
                  <div className='flex-1 min-w-0'>
                    <div className='flex flex-wrap items-center gap-2 mb-3'>
                      <h3 className='font-semibold text-gray-900 dark:text-white text-lg'>{name}</h3>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${statusStyles[bookingStatus]}`}>
                        {bookingStatus}
                      </span>
                      <span className='px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'>
                        booking
                      </span>
                    </div>

                    <div className='grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600 dark:text-gray-300'>
                      <div className='flex items-center gap-2'>
                        <Phone className='w-4 h-4 text-gray-400 shrink-0' />
                        <span>{phone}</span>
                      </div>
                      <div className='flex items-center gap-2'>
                        <CalendarDays className='w-4 h-4 text-gray-400 shrink-0' />
                        <span>{created}</span>
                      </div>
                      <div className='flex items-center gap-2 md:col-span-2'>
                        <MapPin className='w-4 h-4 text-gray-400 shrink-0' />
                        <span>{vacancyLabel}{roomLabel ? ` · ${roomLabel}` : ''}</span>
                      </div>
                    </div>

                    {lead.message && (
                      <div className='mt-4 rounded-lg bg-gray-50 dark:bg-gray-700/60 p-3 text-sm text-gray-700 dark:text-gray-200'>
                        {lead.message}
                      </div>
                    )}

                    <div className='mt-4 flex flex-wrap gap-2'>
                      {isConfirmed && (
                        <span className='inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 text-sm font-medium'>
                          <BadgeCheck className='w-4 h-4' /> Confirmed booking
                          {lead.placementConfirmStatus === 'awaiting_tenant' && (
                            <span className='text-xs font-normal opacity-80'>· awaiting tenant confirm</span>
                          )}
                          {lead.placementConfirmStatus === 'confirmed' && (
                            <span className='text-xs font-normal opacity-80'>· placement counted</span>
                          )}
                          {lead.placementConfirmStatus === 'expired' && (
                            <span className='text-xs font-normal opacity-80'>· tenant confirm expired</span>
                          )}
                        </span>
                      )}
                      {isDenied && (
                        <span className='inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm font-medium'>
                          <XCircle className='w-4 h-4' /> Denied / cancelled
                        </span>
                      )}
                      {hasHold && (
                        <span className='inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 text-sm font-medium'>
                          <Clock3 className='w-4 h-4' /> Hold active until you confirm or cancel
                        </span>
                      )}
                    </div>
                  </div>

                  <div className='flex flex-col gap-3 lg:w-56 shrink-0'>
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
                    {hasHold && (
                      <button
                        disabled={processingId === id}
                        onClick={() => cancelHold(id)}
                        className='inline-flex items-center justify-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg border border-yellow-200 hover:bg-yellow-200 disabled:opacity-60 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-700'
                      >
                        <XCircle className='w-4 h-4' />
                        {processingId === id ? 'Cancelling…' : 'Cancel Hold'}
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
  );
};

export default AgentBookings;
