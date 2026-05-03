import { useEffect, useMemo, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { ChevronLeft, MessageSquare, Phone, Mail, Loader, Check, ChevronDown, ChevronRight, MessageCircle, Eye, CalendarCheck2, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LeadInbox() {
  const { axios, getToken, navigate } = useAppContext();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedLead, setSelectedLead] = useState(null);
  const [updatingLead, setUpdatingLead] = useState(null);
  const [openVacancyIds, setOpenVacancyIds] = useState({});

  useEffect(() => {
    fetchLeads();
  }, [statusFilter]);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const res = await axios.get(
        `/api/agent/leads?status=${statusFilter === 'all' ? 'all' : statusFilter}&limit=100`,
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

  const vacancyGroups = useMemo(() => {
    const grouped = leads.reduce((acc, lead) => {
      const key = lead.vacancy?._id || 'unknown';
      if (!acc[key]) {
        acc[key] = {
          vacancy: lead.vacancy,
          leads: [],
        };
      }
      acc[key].leads.push(lead);
      return acc;
    }, {});

    return Object.values(grouped);
  }, [leads]);

  if (loading && leads.length === 0) {
    return (
      <div className='flex items-center justify-center h-screen'>
        <Loader className='animate-spin' size={32} />
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900'>
      <div className='max-w-7xl mx-auto p-6 md:p-8'>
        <div className='flex items-center gap-4 mb-8'>
          <button
            onClick={() => navigate('/agent')}
            className='p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors'
          >
            <ChevronLeft size={24} />
          </button>
          <div>
            <h1 className='text-3xl font-bold text-gray-900 dark:text-white'>My Leads</h1>
            <p className='text-gray-600 dark:text-gray-400 mt-1'>Grouped by vacancy and intent</p>
          </div>
        </div>

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

        {leads.length === 0 ? (
          <div className='bg-white dark:bg-gray-800 rounded-xl p-8 text-center shadow-sm border border-gray-200 dark:border-gray-700'>
            <MessageSquare size={40} className='mx-auto text-gray-400 mb-2' />
            <p className='text-gray-600 dark:text-gray-400'>No leads found</p>
          </div>
        ) : (
          <div className='space-y-4'>
            {vacancyGroups.map((group) => {
              const vacancyId = group.vacancy?._id || 'unknown';
              const isOpen = openVacancyIds[vacancyId] ?? true;
              const contactCount = group.leads.filter((lead) => lead.leadType === 'contact').length;
              const viewingCount = group.leads.filter((lead) => lead.leadType === 'viewing').length;
              const bookingCount = group.leads.filter((lead) => lead.leadType === 'booking').length;

              return (
                <div key={vacancyId} className='bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden'>
                  <button
                    onClick={() => setOpenVacancyIds((prev) => ({ ...prev, [vacancyId]: !isOpen }))}
                    className='w-full flex items-center justify-between p-5 text-left'
                  >
                    <div>
                      <div className='flex flex-wrap items-center gap-2 mb-1'>
                        <h3 className='text-lg font-semibold text-gray-900 dark:text-white capitalize'>
                          {group.vacancy?.title || group.vacancy?.roomType || 'Vacancy'}
                        </h3>
                        <span className='px-2 py-0.5 rounded-full text-xs bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-200'>
                          {group.leads.length} leads
                        </span>
                      </div>
                      <p className='text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1'>
                        <MapPin size={14} />
                        {group.vacancy?.location?.area}, {group.vacancy?.location?.city}
                      </p>
                    </div>
                    <div className='flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400'>
                      <span className='inline-flex items-center gap-1'><MessageCircle size={14} /> {contactCount}</span>
                      <span className='inline-flex items-center gap-1'><Eye size={14} /> {viewingCount}</span>
                      <span className='inline-flex items-center gap-1'><CalendarCheck2 size={14} /> {bookingCount}</span>
                      {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </div>
                  </button>

                  {isOpen && (
                    <div className='border-t border-gray-200 dark:border-gray-700 p-5'>
                      <div className='grid grid-cols-1 md:grid-cols-3 gap-3 mb-5'>
                        <button
                          onClick={() => navigate('/agent/post-vacancy')}
                          className='rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors'
                        >
                          <p className='text-sm font-semibold text-gray-900 dark:text-white'>View details</p>
                          <p className='text-xs text-gray-500 dark:text-gray-400'>Open the vacancy editor</p>
                        </button>
                        <button
                          onClick={() => setSelectedLead(group.leads[0])}
                          className='rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors'
                        >
                          <p className='text-sm font-semibold text-gray-900 dark:text-white'>View leads</p>
                          <p className='text-xs text-gray-500 dark:text-gray-400'>Inspect all replies here</p>
                        </button>
                        <button
                          onClick={() => navigate('/agent/post-vacancy')}
                          className='rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors'
                        >
                          <p className='text-sm font-semibold text-gray-900 dark:text-white'>Update or delete</p>
                          <p className='text-xs text-gray-500 dark:text-gray-400'>Edit listing controls</p>
                        </button>
                      </div>

                      <div className='grid grid-cols-1 lg:grid-cols-2 gap-3'>
                        {group.leads.map((lead) => (
                          <div
                            key={lead._id}
                            onClick={() => setSelectedLead(lead)}
                            className={`p-4 border rounded-lg cursor-pointer transition-all ${
                              selectedLead?._id === lead._id
                                ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20'
                                : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 hover:shadow-sm'
                            }`}
                          >
                            <div className='flex justify-between items-start mb-2'>
                              <div>
                                <h4 className='font-semibold text-gray-900 dark:text-white'>{lead.studentInfo.name}</h4>
                                <p className='text-sm text-gray-600 dark:text-gray-400 capitalize'>{lead.leadType}</p>
                              </div>
                              <span className={`text-xs px-2 py-1 rounded ${getStatusColor(lead.status)}`}>
                                {lead.status}
                              </span>
                            </div>
                            <div className='flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400'>
                              <div className='flex items-center gap-1'><Phone size={14} /> {lead.studentInfo.phone}</div>
                              <div className='flex items-center gap-1'><Mail size={14} /> {lead.studentInfo.email || 'N/A'}</div>
                            </div>
                            {lead.message && (
                              <p className='text-sm text-gray-700 dark:text-gray-300 mt-3 line-clamp-2'>
                                {lead.message}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className='mt-6'>
          {selectedLead ? (
            <div className='bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 sticky top-6'>
              <h3 className='font-bold text-lg text-gray-900 dark:text-white mb-4'>Lead Details</h3>

              <div className='mb-6'>
                <h4 className='font-semibold text-gray-700 dark:text-gray-300 mb-2'>Student</h4>
                <p className='text-gray-900 dark:text-white'>{selectedLead.studentInfo.name}</p>
                <p className='text-sm text-gray-600 dark:text-gray-400'>{selectedLead.studentInfo.phone}</p>
                <p className='text-sm text-gray-600 dark:text-gray-400'>{selectedLead.studentInfo.email}</p>
              </div>

              <div className='mb-6 pb-6 border-b border-gray-200 dark:border-gray-700'>
                <h4 className='font-semibold text-gray-700 dark:text-gray-300 mb-2'>Vacancy</h4>
                <p className='text-gray-900 dark:text-white capitalize'>{selectedLead.vacancy?.title || selectedLead.vacancy?.roomType}</p>
                <p className='text-sm text-gray-600 dark:text-gray-400'>
                  {selectedLead.vacancy?.location.area}, {selectedLead.vacancy?.location.city}
                </p>
              </div>

              <div className='mb-6 pb-6 border-b border-gray-200 dark:border-gray-700'>
                <h4 className='font-semibold text-gray-700 dark:text-gray-300 mb-2'>Intent</h4>
                <p className='text-sm text-gray-600 dark:text-gray-400 capitalize'>{selectedLead.leadType || 'contact'}</p>
              </div>

              {selectedLead.message && (
                <div className='mb-6 pb-6 border-b border-gray-200 dark:border-gray-700'>
                  <h4 className='font-semibold text-gray-700 dark:text-gray-300 mb-2'>Message</h4>
                  <p className='text-sm text-gray-600 dark:text-gray-400'>{selectedLead.message}</p>
                </div>
              )}

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

              <div className='mt-6 pt-6 border-t border-gray-200 dark:border-gray-700'>
                <a
                  href={`https://wa.me/${selectedLead.studentInfo.phone.replace(/\D/g, '')}?text=Hi%20${encodeURIComponent(
                    selectedLead.studentInfo.name
                  )},%20I'm%20responding%20to%20your%20${encodeURIComponent(selectedLead.leadType || 'contact')}%20request%20for%20the%20${encodeURIComponent(
                    selectedLead.vacancy?.title || selectedLead.vacancy?.roomType
                  )}%20vacancy.`}
                  target='_blank'
                  rel='noreferrer'
                  className='w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-center font-semibold transition-colors block'
                >
                  Contact on WhatsApp
                </a>
              </div>
            </div>
          ) : (
            <div className='bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 text-center'>
              <MessageSquare size={40} className='mx-auto text-gray-400 mb-2' />
              <p className='text-gray-600 dark:text-gray-400'>Select a lead to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
