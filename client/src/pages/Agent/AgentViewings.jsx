import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { Loader, CalendarDays, Clock3, MapPin, User, CheckCircle2, XCircle, BadgeCheck } from 'lucide-react';
import toast from 'react-hot-toast';

const tabConfig = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'denied', label: 'Denied' },
];

const getLeadType = (lead) => String(lead?.leadType || lead?.lead?.leadType || '').toLowerCase();
const getLeadStatus = (lead) => String(lead?.outcome || lead?.status || lead?.lead?.outcome || lead?.lead?.status || '').toLowerCase();
const getLeadId = (lead) => lead?._id || lead?.lead?._id;

const isViewingLead = (lead) => getLeadType(lead) === 'viewing';

const bucketViewingLead = (lead) => {
  const status = getLeadStatus(lead);
  if (status === 'viewed' || status === 'confirmed') return 'confirmed';
  if (['not-fit', 'no-response', 'declined', 'cancelled'].includes(status)) return 'denied';
  return 'pending';
};

const statusStyles = {
  pending: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-700',
  confirmed: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border-green-200 dark:border-green-700',
  denied: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border-red-200 dark:border-red-700',
  viewed: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border-green-200 dark:border-green-700',
  'not-fit': 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border-red-200 dark:border-red-700',
  'no-response': 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700',
};

const AgentViewings = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const leadId = searchParams.get('leadId');
  const { axios, getToken, navigate } = useAppContext();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [tab, setTab] = useState('all');
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    fetchViewings();
  }, []);

  useEffect(() => {
    if (!leadId || items.length === 0) return;
    const target = items.find((item) => getLeadId(item) === leadId);
    if (target) {
      setSelectedId(getLeadId(target));
      const targetTab = target._bucket || bucketViewingLead(target);
      setTab((current) => (current === 'all' ? targetTab : current));
      searchParams.delete('leadId');
      setSearchParams(searchParams, { replace: true });
    }
  }, [leadId, items, searchParams, setSearchParams]);

  const fetchViewings = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const { data } = await axios.get('/api/agent/leads?status=all&limit=500', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const raw = data.leads || [];
      const viewingLeads = raw.filter(isViewingLead).map((lead) => ({
        ...lead,
        _leadType: getLeadType(lead),
        _leadStatus: getLeadStatus(lead),
        _bucket: bucketViewingLead(lead),
      }));
      setItems(viewingLeads);
      if (!selectedId && viewingLeads.length > 0) {
        setSelectedId(getLeadId(viewingLeads[0]));
      }
    } catch (error) {
      console.error('Error fetching viewings:', error);
      toast.error('Could not load viewings');
    } finally {
      setLoading(false);
    }
  };

  const visibleItems = useMemo(() => {
    if (tab === 'all') return items;
    return items.filter((item) => item._bucket === tab);
  }, [items, tab]);

  const selectedLead = useMemo(() => visibleItems.find((item) => getLeadId(item) === selectedId) || visibleItems[0] || null, [visibleItems, selectedId]);

  const counts = useMemo(() => {
    return items.reduce((acc, item) => {
      acc.all += 1;
      acc[item._bucket] += 1;
      return acc;
    }, { all: 0, pending: 0, confirmed: 0, denied: 0 });
  }, [items]);

  const markOutcome = async (id, outcome) => {
    if (!window.confirm(outcome === 'viewed' ? 'Mark this viewing as completed?' : 'Decline this viewing / mark as not-fit?')) return;
    try {
      setProcessingId(id);
      const token = await getToken();
      await axios.put(`/api/agent/leads/${id}/outcome`, { outcome }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(outcome === 'viewed' ? 'Viewing marked as completed' : 'Viewing declined');
      await fetchViewings();
      setSelectedId(id);
    } catch (err) {
      console.error('Error marking viewing outcome:', err);
      toast.error(err?.response?.data?.message || 'Failed to update viewing');
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
      <div className='max-w-7xl mx-auto'>
        <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6'>
          <div>
            <h1 className='text-3xl font-semibold mb-2'>Viewing Requests</h1>
            <p className='text-gray-500 text-sm mt-1'>Manage viewing requests from potential renters</p>
          </div>
          <div>
            <button onClick={() => navigate('/agent')} className='text-sm text-indigo-600 hover:underline'>Back to dashboard</button>
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

        {selectedLead && (
          <div id='agent-viewing-details' className='mb-6 bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm'>
            <div className='flex flex-wrap items-center gap-2 mb-3'>
              <h2 className='text-xl font-semibold text-gray-900 dark:text-white'>{selectedLead.studentInfo?.name || 'Tenant'}</h2>
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${statusStyles[selectedLead._leadStatus] || statusStyles.pending}`}>
                {selectedLead._bucket === 'confirmed' ? 'confirmed' : selectedLead._bucket === 'denied' ? 'denied' : selectedLead._leadStatus || 'pending'}
              </span>
              <span className='px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'>
                viewing
              </span>
            </div>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600 dark:text-gray-300'>
              <div className='flex items-center gap-2'>
                <User className='w-4 h-4 text-gray-400' />
                <span>{selectedLead.studentInfo?.phone || 'N/A'}</span>
              </div>
              <div className='flex items-center gap-2'>
                <CalendarDays className='w-4 h-4 text-gray-400' />
                <span>{new Date(selectedLead.createdAt || Date.now()).toLocaleString()}</span>
              </div>
              <div className='flex items-center gap-2 md:col-span-2'>
                <MapPin className='w-4 h-4 text-gray-400' />
                <span>{selectedLead.vacancy?.title || selectedLead.vacancy?.roomType || 'Viewing request'} · {selectedLead.vacancy?.location?.area}, {selectedLead.vacancy?.location?.city}</span>
              </div>
              <div className='flex items-center gap-2'>
                <Clock3 className='w-4 h-4 text-gray-400' />
                <span>{selectedLead.preferredViewingDate ? new Date(selectedLead.preferredViewingDate).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</span>
              </div>
              <div className='flex items-center gap-2'>
                <CalendarDays className='w-4 h-4 text-gray-400' />
                <span>{selectedLead.preferredViewingTimeRange || 'Any time'}</span>
              </div>
            </div>

            {selectedLead.message && (
              <div className='mt-4 rounded-lg bg-gray-50 dark:bg-gray-700/60 p-3 text-sm text-gray-700 dark:text-gray-200'>
                {selectedLead.message}
              </div>
            )}

            <div className='mt-5 flex flex-wrap gap-3'>
              {selectedLead._bucket !== 'confirmed' && (
                <button
                  disabled={processingId === getLeadId(selectedLead)}
                  onClick={() => markOutcome(getLeadId(selectedLead), 'viewed')}
                  className='inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-60'
                >
                  <CheckCircle2 className='w-4 h-4' />
                  {processingId === getLeadId(selectedLead) ? 'Processing…' : 'Confirm Viewed'}
                </button>
              )}
              {selectedLead._bucket !== 'denied' && (
                <button
                  disabled={processingId === getLeadId(selectedLead)}
                  onClick={() => markOutcome(getLeadId(selectedLead), 'not-fit')}
                  className='inline-flex items-center justify-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg border border-red-200 hover:bg-red-200 disabled:opacity-60 dark:bg-red-900/20 dark:text-red-300 dark:border-red-700'
                >
                  <XCircle className='w-4 h-4' />
                  {processingId === getLeadId(selectedLead) ? 'Processing…' : 'Decline'}
                </button>
              )}
            </div>
          </div>
        )}

        {visibleItems.length === 0 ? (
          <div className='text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700'>
            <CalendarDays className='w-10 h-10 mx-auto mb-3 text-gray-400 opacity-60' />
            <p className='text-gray-500 dark:text-gray-400'>No {tab !== 'all' ? tab : ''} viewing requests found</p>
          </div>
        ) : (
          <div className='space-y-4'>
            {visibleItems.map((lead) => {
              const id = getLeadId(lead);
              const status = lead._leadStatus || 'pending';
              const bucket = lead._bucket;
              const isSelected = id === selectedId;
              const isConfirmed = bucket === 'confirmed';
              const isDenied = bucket === 'denied';

              return (
                <button
                  key={id}
                  onClick={() => setSelectedId(id)}
                  className={`w-full text-left bg-white dark:bg-gray-800 rounded-xl p-5 border shadow-sm transition-all ${
                    isSelected ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-gray-200 dark:border-gray-700 hover:shadow-md'
                  }`}
                >
                  <div className='flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4'>
                    <div className='flex-1'>
                      <div className='flex flex-wrap items-center gap-2 mb-3'>
                        <h3 className='font-semibold text-gray-900 dark:text-white text-lg'>{lead.studentInfo?.name || 'Tenant'}</h3>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${statusStyles[status] || statusStyles.pending}`}>
                          {isConfirmed ? 'confirmed' : isDenied ? 'denied' : status || 'pending'}
                        </span>
                        <span className='px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'>
                          viewing
                        </span>
                      </div>

                      <div className='grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600 dark:text-gray-300'>
                        <div className='flex items-center gap-2'>
                          <User className='w-4 h-4 text-gray-400' />
                          <span>{lead.studentInfo?.phone || 'N/A'}</span>
                        </div>
                        <div className='flex items-center gap-2'>
                          <CalendarDays className='w-4 h-4 text-gray-400' />
                          <span>{new Date(lead.createdAt || Date.now()).toLocaleString()}</span>
                        </div>
                        <div className='flex items-center gap-2 md:col-span-2'>
                          <MapPin className='w-4 h-4 text-gray-400' />
                          <span>{lead.vacancy?.title || lead.vacancy?.roomType || 'Viewing request'} · {lead.vacancy?.location?.area}, {lead.vacancy?.location?.city}</span>
                        </div>
                      </div>
                    </div>

                    <div className='flex flex-col gap-3 lg:w-64'>
                      {!isConfirmed && (
                        <button
                          disabled={processingId === id}
                          onClick={(event) => {
                            event.stopPropagation();
                            markOutcome(id, 'viewed');
                          }}
                          className='inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-60'
                        >
                          <CheckCircle2 className='w-4 h-4' />
                          Confirm Viewed
                        </button>
                      )}

                      {!isDenied && (
                        <button
                          disabled={processingId === id}
                          onClick={(event) => {
                            event.stopPropagation();
                            markOutcome(id, 'not-fit');
                          }}
                          className='inline-flex items-center justify-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg border border-red-200 hover:bg-red-200 disabled:opacity-60 dark:bg-red-900/20 dark:text-red-300 dark:border-red-700'
                        >
                          <XCircle className='w-4 h-4' />
                          Decline
                        </button>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentViewings;
