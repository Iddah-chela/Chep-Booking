import { useEffect, useMemo, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { ChevronLeft, MessageSquare, Phone, Mail, Loader, Check, ChevronDown, ChevronRight, MessageCircle, Eye, CalendarCheck2, MapPin, RotateCcw, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LeadInbox() {
  const { axios, getToken, navigate } = useAppContext();
  const [tab, setTab] = useState('vacancies'); // 'vacancies' or 'leads'
  const [vacancies, setVacancies] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedLead, setSelectedLead] = useState(null);
  const [updatingLead, setUpdatingLead] = useState(null);
  const [openVacancyIds, setOpenVacancyIds] = useState({});
  const [reopeningId, setReopeningId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    if (tab === 'vacancies') {
      fetchVacancies();
    } else {
      fetchLeads();
    }
  }, [tab, statusFilter]);

  const fetchVacancies = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const res = await axios.get('/api/agent/vacancies', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setVacancies(res.data.vacancies || []);
    } catch (error) {
      console.error('Error fetching vacancies:', error);
      toast.error('Failed to load vacancies');
    } finally {
      setLoading(false);
    }
  };

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

  const handleReopenVacancy = async (vacancyId) => {
    if (!window.confirm('Re-open this vacancy? Students can view it again.')) return;
    try {
      setReopeningId(vacancyId);
      const token = await getToken();
      await axios.put(
        `/api/agent/vacancies/${vacancyId}/reopen`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Vacancy reopened');
      fetchVacancies();
    } catch (error) {
      console.error('Error reopening vacancy:', error);
      toast.error(error.response?.data?.message || 'Failed to reopen vacancy');
    } finally {
      setReopeningId(null);
    }
  };

  const handleDeleteVacancy = async (vacancyId) => {
    if (!window.confirm('Deactivate this vacancy? It will no longer appear in the feed.')) return;
    try {
      setDeletingId(vacancyId);
      const token = await getToken();
      await axios.delete(`/api/agent/vacancies/${vacancyId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Vacancy deactivated');
      fetchVacancies();
    } catch (error) {
      console.error('Error deleting vacancy:', error);
      toast.error('Failed to deactivate vacancy');
    } finally {
      setDeletingId(null);
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
      open: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200',
      contacted: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200',
      booked: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200',
      expired: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200',
      new: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200',
      viewed: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200',
      pending: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200',
      'not-fit': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200',
      'no-response': 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-200',
    };
    return colors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-200';
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

  const filteredVacancies = vacancies.filter((v) => {
    if (statusFilter === 'all') return true;
    return v.status === statusFilter;
  });

  if (loading && (tab === 'vacancies' ? vacancies.length === 0 : leads.length === 0)) {
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
            <h1 className='text-3xl font-bold text-gray-900 dark:text-white'>My Vacancies & Leads</h1>
            <p className='text-gray-600 dark:text-gray-400 mt-1'>Manage your postings and track interest</p>
          </div>
        </div>

        {/* Tabs */}
        <div className='flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700'>
          <button
            onClick={() => setTab('vacancies')}
            className={`px-4 py-3 font-medium transition-colors border-b-2 ${
              tab === 'vacancies'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Vacancies ({vacancies.length})
          </button>
          <button
            onClick={() => setTab('leads')}
            className={`px-4 py-3 font-medium transition-colors border-b-2 ${
              tab === 'leads'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Leads ({leads.length})
          </button>
        </div>

        {/* Status Filters */}
        <div className='mb-6 flex flex-wrap gap-2'>
          {tab === 'vacancies'
            ? ['all', 'open', 'contacted', 'booked', 'expired'].map((filter) => (
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
              ))
            : ['all', 'new', 'contacted', 'viewed', 'pending', 'booked'].map((filter) => (
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

        {/* VACANCIES TAB */}
        {tab === 'vacancies' && (
          <>
            {filteredVacancies.length === 0 ? (
              <div className='bg-white dark:bg-gray-800 rounded-xl p-8 text-center shadow-sm border border-gray-200 dark:border-gray-700'>
                <MessageSquare size={40} className='mx-auto text-gray-400 mb-2' />
                <p className='text-gray-600 dark:text-gray-400'>No vacancies found</p>
              </div>
            ) : (
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                {filteredVacancies.map((vacancy) => (
                  <div
                    key={vacancy._id}
                    className='bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow'
                  >
                    {/* Header with Status */}
                    <div className='flex justify-between items-start mb-3'>
                      <div>
                        <h3 className='font-semibold text-gray-900 dark:text-white text-lg capitalize'>
                          {vacancy.title || vacancy.roomType}
                        </h3>
                        <p className='text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1'>
                          <MapPin size={12} />
                          {vacancy.location?.area}, {vacancy.location?.city}
                        </p>
                      </div>
                      <span className={`text-xs px-3 py-1 rounded-full font-semibold ${getStatusColor(vacancy.status)}`}>
                        {vacancy.status.charAt(0).toUpperCase() + vacancy.status.slice(1)}
                      </span>
                    </div>

                    {/* Stats */}
                    <div className='mb-4 p-3 bg-gray-50 dark:bg-gray-900/30 rounded-lg grid grid-cols-3 gap-2 text-center text-sm'>
                      <div>
                        <p className='font-semibold text-indigo-600'>{vacancy.stats?.leadCount || 0}</p>
                        <p className='text-xs text-gray-600 dark:text-gray-400'>Leads</p>
                      </div>
                      <div>
                        <p className='font-semibold text-indigo-600'>{vacancy.availableRooms}</p>
                        <p className='text-xs text-gray-600 dark:text-gray-400'>Available</p>
                      </div>
                      <div>
                        <p className='font-semibold text-indigo-600'>Ksh {vacancy.rent?.min?.toLocaleString()}</p>
                        <p className='text-xs text-gray-600 dark:text-gray-400'>Min Rent</p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className='space-y-2'>
                      <button
                        onClick={() => navigate(`/rooms/${vacancy._id}`)}
                        className='w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors'
                      >
                        View Public Listing
                      </button>
                      {vacancy.status === 'contacted' && (
                        <button
                          onClick={() => handleReopenVacancy(vacancy._id)}
                          disabled={reopeningId === vacancy._id}
                          className='w-full px-4 py-2 bg-yellow-100 dark:bg-yellow-900/30 hover:bg-yellow-200 dark:hover:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2'
                        >
                          <RotateCcw size={14} />
                          {reopeningId === vacancy._id ? 'Reopening...' : 'Reopen'}
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteVacancy(vacancy._id)}
                        disabled={deletingId === vacancy._id}
                        className='w-full px-4 py-2 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-800 dark:text-red-200 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2'
                      >
                        <Trash2 size={14} />
                        {deletingId === vacancy._id ? 'Deactivating...' : 'Deactivate'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* LEADS TAB */}
        {tab === 'leads' && (
          <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
            {/* Leads List */}
            <div className='lg:col-span-2'>
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
                      <div
                        key={vacancyId}
                        className='bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden'
                      >
                        <button
                          onClick={() => setOpenVacancyIds((prev) => ({ ...prev, [vacancyId]: !isOpen }))}
                          className='w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors'
                        >
                          <div>
                            <div className='flex flex-wrap items-center gap-2 mb-1'>
                              <h3 className='font-semibold text-gray-900 dark:text-white capitalize'>
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
                          <div className='flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400'>
                            <span className='inline-flex items-center gap-1 text-xs'>
                              <MessageCircle size={12} /> {contactCount}
                            </span>
                            <span className='inline-flex items-center gap-1 text-xs'>
                              <Eye size={12} /> {viewingCount}
                            </span>
                            <span className='inline-flex items-center gap-1 text-xs'>
                              <CalendarCheck2 size={12} /> {bookingCount}
                            </span>
                            {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                          </div>
                        </button>

                        {isOpen && (
                          <div className='border-t border-gray-200 dark:border-gray-700 p-4'>
                            <div className='grid grid-cols-1 gap-3'>
                              {group.leads.map((lead) => (
                                <button
                                  key={lead._id}
                                  onClick={() => setSelectedLead(lead)}
                                  className={`p-4 border rounded-lg text-left transition-all ${
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
                                    <span className={`text-xs px-2 py-1 rounded font-medium ${getStatusColor(lead.status)}`}>
                                      {lead.status}
                                    </span>
                                  </div>
                                  <div className='flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400'>
                                    <div className='flex items-center gap-1'>
                                      <Phone size={12} /> {lead.studentInfo.phone}
                                    </div>
                                    <div className='flex items-center gap-1'>
                                      <Mail size={12} /> {lead.studentInfo.email || 'N/A'}
                                    </div>
                                  </div>
                                  {lead.message && (
                                    <p className='text-xs text-gray-700 dark:text-gray-300 mt-2 line-clamp-1'>{lead.message}</p>
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Lead Details Panel */}
            <div className='lg:col-span-1'>
              {selectedLead ? (
                <div className='bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 sticky top-6'>
                  <h3 className='font-bold text-lg text-gray-900 dark:text-white mb-4'>Lead Details</h3>

                  <div className='mb-6'>
                    <h4 className='font-semibold text-gray-700 dark:text-gray-300 mb-2 text-sm'>Student</h4>
                    <p className='text-gray-900 dark:text-white font-medium'>{selectedLead.studentInfo.name}</p>
                    <p className='text-sm text-gray-600 dark:text-gray-400'>{selectedLead.studentInfo.phone}</p>
                    <p className='text-sm text-gray-600 dark:text-gray-400'>{selectedLead.studentInfo.email}</p>
                  </div>

                  <div className='mb-6 pb-6 border-b border-gray-200 dark:border-gray-700'>
                    <h4 className='font-semibold text-gray-700 dark:text-gray-300 mb-2 text-sm'>Vacancy</h4>
                    <p className='text-gray-900 dark:text-white font-medium capitalize'>
                      {selectedLead.vacancy?.title || selectedLead.vacancy?.roomType}
                    </p>
                    <p className='text-sm text-gray-600 dark:text-gray-400'>
                      {selectedLead.vacancy?.location.area}, {selectedLead.vacancy?.location.city}
                    </p>
                  </div>

                  <div className='mb-6 pb-6 border-b border-gray-200 dark:border-gray-700'>
                    <h4 className='font-semibold text-gray-700 dark:text-gray-300 mb-2 text-sm'>Intent</h4>
                    <p className='text-sm text-gray-600 dark:text-gray-400 capitalize'>{selectedLead.leadType || 'contact'}</p>
                  </div>

                  {selectedLead.message && (
                    <div className='mb-6 pb-6 border-b border-gray-200 dark:border-gray-700'>
                      <h4 className='font-semibold text-gray-700 dark:text-gray-300 mb-2 text-sm'>Message</h4>
                      <p className='text-sm text-gray-600 dark:text-gray-400'>{selectedLead.message}</p>
                    </div>
                  )}

                  <div className='mb-6 pb-6 border-b border-gray-200 dark:border-gray-700'>
                    <h4 className='font-semibold text-gray-700 dark:text-gray-300 mb-2 text-sm'>Status</h4>
                    <select
                      value={selectedLead.status}
                      onChange={(e) => handleUpdateLeadStatus(selectedLead._id, e.target.value)}
                      disabled={updatingLead === selectedLead._id}
                      className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg text-sm dark:text-gray-200'
                    >
                      <option value='new'>New</option>
                      <option value='contacted'>Contacted</option>
                      <option value='viewed'>Viewed</option>
                      <option value='pending'>Pending</option>
                    </select>
                  </div>

                  <div className='mb-6 pb-6 border-b border-gray-200 dark:border-gray-700'>
                    <h4 className='font-semibold text-gray-700 dark:text-gray-300 mb-3 text-sm'>Mark Outcome</h4>
                    <div className='space-y-2'>
                      {['viewed', 'booked', 'not-fit', 'no-response'].map((outcome) => (
                        <button
                          key={outcome}
                          onClick={() => handleMarkOutcome(selectedLead._id, outcome)}
                          disabled={updatingLead === selectedLead._id}
                          className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                            selectedLead.outcome === outcome
                              ? 'bg-green-600 text-white'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                        >
                          {selectedLead.outcome === outcome && <Check size={16} />}
                          {outcome.charAt(0).toUpperCase() + outcome.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <a
                    href={`https://wa.me/${selectedLead.studentInfo.phone.replace(/\D/g, '')}?text=Hi%20${encodeURIComponent(
                      selectedLead.studentInfo.name
                    )},%20I'm%20responding%20to%20your%20${encodeURIComponent(
                      selectedLead.leadType || 'contact'
                    )}%20request%20for%20the%20${encodeURIComponent(
                      selectedLead.vacancy?.title || selectedLead.vacancy?.roomType
                    )}%20vacancy.`}
                    target='_blank'
                    rel='noreferrer'
                    className='w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-center font-semibold transition-colors block text-sm'
                  >
                    Contact on WhatsApp
                  </a>
                </div>
              ) : (
                <div className='bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 text-center'>
                  <MessageSquare size={40} className='mx-auto text-gray-400 mb-2' />
                  <p className='text-gray-600 dark:text-gray-400 text-sm'>Select a lead to view details</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
