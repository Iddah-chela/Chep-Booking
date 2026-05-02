import { useEffect, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { ChevronLeft, MessageSquare, Phone, Mail, Loader, Check } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LeadInbox() {
  const { axios, getToken, navigate } = useAppContext();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedLead, setSelectedLead] = useState(null);
  const [updatingLead, setUpdatingLead] = useState(null);

  useEffect(() => {
    fetchLeads();
  }, [statusFilter]);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const res = await axios.get(
        `/api/agent/leads?status=${statusFilter === 'all' ? 'all' : statusFilter}&limit=50`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setLeads(res.data.leads || []);
    } catch (error) {
      console.error('Error fetching leads:', error);
      toast.error('Failed to load leads');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateLeadStatus = async (leadId, newStatus) => {
    try {
      setUpdatingLead(leadId);
      const token = await getToken();
      await axios.put(
        `/api/agent/leads/${leadId}`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Lead status updated');
      fetchLeads();
    } catch (error) {
      console.error('Error updating lead:', error);
      toast.error('Failed to update lead');
    } finally {
      setUpdatingLead(null);
    }
  };

  const handleMarkOutcome = async (leadId, outcome) => {
    try {
      setUpdatingLead(leadId);
      const token = await getToken();
      await axios.put(
        `/api/agent/leads/${leadId}/outcome`,
        { outcome },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Marked as ${outcome}`);
      fetchLeads();
      setSelectedLead(null);
    } catch (error) {
      console.error('Error marking outcome:', error);
      toast.error('Failed to mark outcome');
    } finally {
      setUpdatingLead(null);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      new: 'bg-blue-100 text-blue-800',
      contacted: 'bg-yellow-100 text-yellow-800',
      viewed: 'bg-purple-100 text-purple-800',
      pending: 'bg-orange-100 text-orange-800',
      booked: 'bg-green-100 text-green-800',
      'not-fit': 'bg-red-100 text-red-800',
      'no-response': 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading && leads.length === 0) {
    return (
      <div className='flex items-center justify-center h-screen'>
        <Loader className='animate-spin' size={32} />
      </div>
    );
  }

  return (
    <div className='max-w-6xl mx-auto p-6 md:p-8'>
      {/* Header */}
      <div className='flex items-center gap-4 mb-8'>
        <button
          onClick={() => navigate('/agent')}
          className='p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors'
        >
          <ChevronLeft size={24} />
        </button>
        <div>
          <h1 className='text-3xl font-bold text-gray-900 dark:text-white'>Your Leads</h1>
          <p className='text-gray-600 dark:text-gray-400 mt-1'>Manage student interest in your vacancies</p>
        </div>
      </div>

      {/* Filters */}
      <div className='mb-6 flex flex-wrap gap-2'>
        {['all', 'new', 'contacted', 'viewed', 'pending', 'booked'].map((filter) => (
          <button
            key={filter}
            onClick={() => setStatusFilter(filter)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              statusFilter === filter
                ? 'bg-indigo-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            {filter.charAt(0).toUpperCase() + filter.slice(1)}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        {/* Leads List */}
        <div className='lg:col-span-2'>
          {leads.length === 0 ? (
            <div className='bg-white dark:bg-gray-800 rounded-lg p-8 text-center shadow'>
              <MessageSquare size={40} className='mx-auto text-gray-400 mb-2' />
              <p className='text-gray-600 dark:text-gray-400'>No leads found</p>
            </div>
          ) : (
            <div className='space-y-3'>
              {leads.map((lead) => (
                <div
                  key={lead._id}
                  onClick={() => setSelectedLead(lead)}
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    selectedLead?._id === lead._id
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-md'
                  }`}
                >
                  <div className='flex justify-between items-start mb-2'>
                    <div>
                      <h3 className='font-semibold text-gray-900 dark:text-white'>
                        {lead.studentInfo.name}
                      </h3>
                      <p className='text-sm text-gray-600 dark:text-gray-400'>
                        {lead.vacancy?.roomType} • {lead.vacancy?.location.area}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${getStatusColor(lead.status)}`}>
                      {lead.status}
                    </span>
                  </div>
                  <div className='flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400'>
                    <div className='flex items-center gap-1'>
                      <Phone size={14} />
                      {lead.studentInfo.phone}
                    </div>
                    <div className='flex items-center gap-1'>
                      <Mail size={14} />
                      {lead.studentInfo.email || 'N/A'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Lead Details */}
        <div>
          {selectedLead ? (
            <div className='bg-white dark:bg-gray-800 rounded-lg p-6 shadow sticky top-6'>
              <h3 className='font-bold text-lg text-gray-900 dark:text-white mb-4'>Lead Details</h3>

              {/* Student Info */}
              <div className='mb-6'>
                <h4 className='font-semibold text-gray-700 dark:text-gray-300 mb-2'>Student</h4>
                <p className='text-gray-900 dark:text-white'>{selectedLead.studentInfo.name}</p>
                <p className='text-sm text-gray-600 dark:text-gray-400'>{selectedLead.studentInfo.phone}</p>
                <p className='text-sm text-gray-600 dark:text-gray-400'>{selectedLead.studentInfo.email}</p>
              </div>

              {/* Vacancy Info */}
              <div className='mb-6 pb-6 border-b border-gray-200 dark:border-gray-700'>
                <h4 className='font-semibold text-gray-700 dark:text-gray-300 mb-2'>Vacancy</h4>
                <p className='text-gray-900 dark:text-white'>{selectedLead.vacancy?.roomType}</p>
                <p className='text-sm text-gray-600 dark:text-gray-400'>
                  {selectedLead.vacancy?.location.area}, {selectedLead.vacancy?.location.city}
                </p>
              </div>

              {/* Message */}
              {selectedLead.message && (
                <div className='mb-6 pb-6 border-b border-gray-200 dark:border-gray-700'>
                  <h4 className='font-semibold text-gray-700 dark:text-gray-300 mb-2'>Message</h4>
                  <p className='text-sm text-gray-600 dark:text-gray-400'>{selectedLead.message}</p>
                </div>
              )}

              {/* Status Update */}
              <div className='mb-6 pb-6 border-b border-gray-200 dark:border-gray-700'>
                <h4 className='font-semibold text-gray-700 dark:text-gray-300 mb-2'>Status</h4>
                <select
                  value={selectedLead.status}
                  onChange={(e) => handleUpdateLeadStatus(selectedLead._id, e.target.value)}
                  disabled={updatingLead === selectedLead._id}
                  className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg text-sm'
                >
                  <option value='new'>New</option>
                  <option value='contacted'>Contacted</option>
                  <option value='viewed'>Viewed</option>
                  <option value='pending'>Pending</option>
                </select>
              </div>

              {/* Mark Outcome */}
              <div>
                <h4 className='font-semibold text-gray-700 dark:text-gray-300 mb-3'>Mark Outcome</h4>
                <div className='space-y-2'>
                  {['viewed', 'booked', 'not-fit', 'no-response'].map((outcome) => (
                    <button
                      key={outcome}
                      onClick={() => handleMarkOutcome(selectedLead._id, outcome)}
                      disabled={updatingLead === selectedLead._id}
                      className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        selectedLead.outcome === outcome
                          ? 'bg-green-600 text-white flex items-center justify-center gap-2'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {selectedLead.outcome === outcome && <Check size={16} />}
                      {outcome.charAt(0).toUpperCase() + outcome.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* WhatsApp Action */}
              <div className='mt-6 pt-6 border-t border-gray-200 dark:border-gray-700'>
                <a
                  href={`https://wa.me/${selectedLead.studentInfo.phone.replace(/\D/g, '')}?text=Hi%20${encodeURIComponent(
                    selectedLead.studentInfo.name
                  )},%20I'm%20responding%20to%20your%20interest%20in%20our%20${encodeURIComponent(
                    selectedLead.vacancy?.roomType
                  )}%20room.`}
                  target='_blank'
                  rel='noreferrer'
                  className='w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-center font-semibold transition-colors'
                >
                  Contact on WhatsApp
                </a>
              </div>
            </div>
          ) : (
            <div className='bg-white dark:bg-gray-800 rounded-lg p-6 shadow text-center'>
              <MessageSquare size={40} className='mx-auto text-gray-400 mb-2' />
              <p className='text-gray-600 dark:text-gray-400'>Select a lead to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
