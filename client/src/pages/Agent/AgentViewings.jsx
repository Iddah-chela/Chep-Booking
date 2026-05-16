import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { Loader } from 'lucide-react';
import toast from 'react-hot-toast';

const AgentViewings = () => {
  const [searchParams] = useSearchParams();
  const leadId = searchParams.get('leadId');
  const { axios, getToken } = useAppContext();
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  console.log('[AgentViewings] Component mounted, leadId:', leadId);
  console.log('[AgentViewings] Render', { leadId, loading, lead });

  useEffect(() => {
    if (leadId) {
      console.log('[AgentViewings] useEffect: leadId is', leadId);
      fetchLead();
    } else {
      console.log('[AgentViewings] useEffect: no leadId provided');
      setLoading(false);
    }
  }, [leadId]);

  const fetchLead = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      console.log('[AgentViewings] Fetching lead:', leadId);
      const { data } = await axios.get(`/api/agent/leads/${leadId}`, { headers: { Authorization: `Bearer ${token}` }, timeout: 10000 });
      console.log('[AgentViewings] Response received:', data);
      const leadData = data?.lead || data;
      if (leadData && (leadData._id || leadData.studentInfo)) {
        setLead(leadData);
      } else {
        toast.error(data.message || 'Could not load viewing');
      }
    } catch (err) {
      console.error('[AgentViewings] Error fetching lead:', err?.response?.status, err?.response?.data, err?.message);
      if (err?.code === 'ECONNABORTED') {
        toast.error('Request timeout — server took too long to respond');
      } else if (err?.response?.status === 401) {
        toast.error('Unauthorized — please sign in again');
      } else {
        toast.error(err?.response?.data?.message || 'Could not load viewing');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className='flex items-center justify-center h-screen'><Loader className='animate-spin' /></div>;

  if (!lead) return <div className='py-28 px-4 md:px-16'>No viewing found</div>;

  return (
    <div className='py-28 px-4 md:px-16 lg:px-24 xl:px-32 min-h-screen'>
      <h1 className='text-3xl mb-6'>Viewing Request</h1>
      <div className='bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700'>
        <p className='font-semibold'>{lead.studentInfo?.name}</p>
        <p className='text-sm text-gray-600'>{lead.studentInfo?.phone}</p>

        <div className='mt-4'>
          <p className='font-medium'>Listing</p>
          <p className='text-gray-900'>{lead.vacancy?.title || lead.vacancy?.roomType}</p>
        </div>

        <div className='mt-4'>
          <p className='font-medium'>Requested Date</p>
          <p className='text-gray-700'>{lead.preferredViewingDate ? new Date(lead.preferredViewingDate).toLocaleDateString() : '—'}</p>
        </div>

        <div className='mt-2'>
          <p className='font-medium'>Requested Time</p>
          <p className='text-gray-700'>{lead.preferredViewingTimeRange || 'Any'}</p>
        </div>

        {lead.message && (
          <div className='mt-4'>
            <p className='font-medium'>Message</p>
            <p className='text-gray-700'>{lead.message}</p>
          </div>
        )}

        <div className='mt-6 flex gap-3'>
          <button
            disabled={processing}
            onClick={async () => {
              if (!window.confirm('Mark this viewing as completed?')) return;
              try {
                setProcessing(true);
                const token = await getToken();
                await axios.put(`/api/agent/leads/${leadId}/outcome`, { outcome: 'viewed' }, { headers: { Authorization: `Bearer ${token}` } });
                toast.success('Viewing marked as completed');
                fetchLead();
              } catch (err) {
                toast.error('Failed to mark viewing');
              } finally {
                setProcessing(false);
              }
            }}
            className='px-4 py-2 bg-green-600 text-white rounded-lg'
          >
            Confirm Viewed
          </button>

          <button
            disabled={processing}
            onClick={async () => {
              if (!window.confirm('Decline this viewing / mark as not-fit?')) return;
              try {
                setProcessing(true);
                const token = await getToken();
                await axios.put(`/api/agent/leads/${leadId}/outcome`, { outcome: 'not-fit' }, { headers: { Authorization: `Bearer ${token}` } });
                toast.success('Viewing declined');
                fetchLead();
              } catch (err) {
                toast.error('Failed to decline viewing');
              } finally {
                setProcessing(false);
              }
            }}
            className='px-4 py-2 bg-red-100 text-red-700 rounded-lg border border-red-200'
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  );
};

export default AgentViewings;
