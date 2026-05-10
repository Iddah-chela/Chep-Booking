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
  const [leadFilter, setLeadFilter] = useState('all'); // 'all' | 'contacts' | 'viewing' | 'bookings'
  const [selectedLead, setSelectedLead] = useState(null);
  const [updatingLead, setUpdatingLead] = useState(null);
  const [openVacancyIds, setOpenVacancyIds] = useState({});
  const [reopeningId, setReopeningId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    // When viewing vacancies, also fetch recent leads so each vacancy can show its contacts
    if (tab === 'vacancies') {
      fetchVacancies();
      fetchLeads();
    } else {
      fetchLeads();
    }
  }, [tab, leadFilter]);

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
      // Always fetch all leads and filter client-side for richer categories
      const res = await axios.get(
        `/api/agent/leads?status=all&limit=100`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const raw = res.data.leads || [];
      // Normalize server-side merged items (leads + chats) into a consistent shape
      const normalized = raw.map((item) => {
        if (!item) return null;
        // Server returns merged items with `type: 'lead'|'chat'` and containers
        if (item.type === 'chat' && item.chat) {
          const c = item.chat;
          const lastMsg = c.messages && c.messages.length ? c.messages[c.messages.length - 1].content : '';
          return {
            _id: item._id || `chat_${c._id}`,
            leadType: 'chat',
            studentInfo: {
              name: (c.tenant?.firstName || '') + (c.tenant?.lastName ? ' ' + c.tenant.lastName : ''),
              phone: c.tenant?.phone || '',
              email: c.tenant?.email || '',
            },
            message: lastMsg,
            vacancy: c.vacancy,
            chatId: c._id,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
          };
        }

        // If item.type === 'lead' or legacy lead object
        const leadObj = item.type === 'lead' && item.lead ? item.lead : item.lead ? item.lead : item;
        return {
          _id: leadObj._id,
          leadType: leadObj.leadType || 'contact',
          studentInfo: leadObj.studentInfo || { name: '', phone: '', email: '' },
          message: leadObj.message || '',
          vacancy: leadObj.vacancy || {},
          createdAt: leadObj.createdAt,
          updatedAt: leadObj.updatedAt,
          raw: leadObj,
        };
      }).filter(Boolean);

      setLeads(normalized);
    } catch (error) {
      console.error('Error fetching leads:', error);
      toast.error('Failed to load leads');
    } finally {
      setLoading(false);
    }
  };

  const filteredLeads = useMemo(() => {
    if (!leads) return [];
    if (leadFilter === 'all') return leads;
    if (leadFilter === 'contacts') return leads.filter((l) => Boolean(l.message));
    if (leadFilter === 'viewing') return leads.filter((l) => l.leadType === 'viewing');
    if (leadFilter === 'bookings') return leads.filter((l) => l.leadType === 'booking' || l.leadType === 'reserve');
    return leads;
  }, [leads, leadFilter]);

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
    // If this is a chat item (merged from chats), don't call lead endpoints
    if (String(leadId).startsWith('chat_')) {
      toast('This item is a chat. Open messages to manage conversations.');
      setUpdatingLead(null);
      navigate('/my-chats');
      return;
    }

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
    // Avoid marking outcome on chat items
    if (String(leadId).startsWith('chat_')) {
      toast('Open the chat to continue the conversation.');
      navigate('/my-chats');
      return;
    }

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

  const formatDate = (v) => {
    try {
      return v ? new Date(v).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';
    } catch (_) { return '—'; }
  };

  const vacancyGroups = useMemo(() => {
    const grouped = filteredLeads.reduce((acc, lead) => {
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
  }, [filteredLeads]);


  const filteredVacancies = vacancies;

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

        {/* Status Filters (only for Leads tab). Vacancies intentionally show per-vacancy contacts instead of global filters */}
        {tab === 'leads' && (
          <div className='mb-6 flex flex-wrap gap-2'>
            {[
              { key: 'all', label: 'All' },
              { key: 'contacts', label: 'Contacts' },
              { key: 'viewing', label: 'Viewing Requests' },
              { key: 'bookings', label: 'Bookings' },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setLeadFilter(f.key)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  leadFilter === f.key
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}

        {/* VACANCIES TAB - show vacancy details + expandable contacts per vacancy */}
        {tab === 'vacancies' && (
          <>
            {filteredVacancies.length === 0 ? (
              <div className='bg-white dark:bg-gray-800 rounded-xl p-8 text-center shadow-sm border border-gray-200 dark:border-gray-700'>
                <MessageSquare size={40} className='mx-auto text-gray-400 mb-2' />
                <p className='text-gray-600 dark:text-gray-400'>No vacancies found</p>
              </div>
            ) : (
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                {filteredVacancies.map((vacancy) => {
                  const vacancyId = vacancy._id;
                  const isOpen = openVacancyIds[vacancyId] ?? false;
                  const group = vacancyGroups.find((g) => g.vacancy?._id === vacancyId) || { leads: [] };
                  return (
                    <div
                      key={vacancyId}
                      className='bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow'
                    >
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

                      <div className='space-y-2 mb-3'>
                        <button
                          onClick={() => navigate(`/rooms/${vacancy._id}`)}
                          className='w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors'
                        >
                          View Public Listing
                        </button>
                        <div className='flex gap-2'>
                          <button
                            onClick={() => setOpenVacancyIds((prev) => ({ ...prev, [vacancyId]: !isOpen }))}
                            className='flex-1 px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm'
                          >
                            {isOpen ? 'Hide Contacts' : `Show Contacts (${group.leads.length})`}
                          </button>
                          <button
                            onClick={() => navigate(`/agent/vacancies/${vacancy._id}/edit`)}
                            className='px-4 py-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 rounded-lg text-sm'
                          >
                            Edit
                          </button>
                        </div>
                      </div>

                      {isOpen && (
                        <div className='border-t border-gray-200 dark:border-gray-700 p-3'>
                          {group.leads.length === 0 ? (
                            <p className='text-sm text-gray-600 dark:text-gray-400'>No contacts yet for this vacancy.</p>
                          ) : (
                            <div className='space-y-3'>
                              {group.leads.map((lead) => (
                                <div key={lead._id} className='p-3 bg-gray-50 dark:bg-gray-900/30 rounded-lg flex items-center justify-between'>
                                  <div className='text-left'>
                                    <p className='font-semibold text-gray-900 dark:text-white'>{lead.studentInfo.name}</p>
                                    <p className='text-xs text-gray-500 dark:text-gray-400'>{lead.leadType} • {lead.studentInfo.phone}</p>
                                    {lead.message && <p className='text-xs text-gray-600 dark:text-gray-300 mt-1 line-clamp-2'>{lead.message}</p>}
                                  </div>
                                  <div className='flex flex-col items-end gap-2'>
                                    <button
                                      onClick={() => {
                                        toast.success('Opening chat...');
                                        if (lead.leadType === 'chat' && lead.chatId) {
                                          navigate(`/chat/agent/${lead.chatId}`);
                                        } else {
                                          navigate('/my-chats');
                                        }
                                      }}
                                      className='px-3 py-1 bg-indigo-600 text-white rounded-md text-sm'
                                    >
                                      Open Chat
                                    </button>
                                    <a
                                      href={`https://wa.me/?text=${encodeURIComponent(`Hi, I have a ${lead.leadType} request from ${lead.studentInfo.name} (${lead.studentInfo.phone}) for the vacancy "${vacancy.title}". Please advise.`)}`}
                                      target='_blank'
                                      rel='noreferrer'
                                      className='px-3 py-1 bg-green-600 text-white rounded-md text-sm block'
                                    >
                                      WhatsApp to Caretaker
                                    </a>
                                    <button
                                      onClick={() => setSelectedLead(lead)}
                                      className='px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md text-sm'
                                    >
                                      Details
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
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
                selectedLead.leadType === 'chat' ? (
                  <div className='bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 sticky top-6'>
                    <h3 className='font-bold text-lg text-gray-900 dark:text-white mb-4'>Chat</h3>
                    <div className='mb-4'>
                      <h4 className='font-semibold text-gray-700 dark:text-gray-300 mb-2 text-sm'>Participant</h4>
                      <p className='text-gray-900 dark:text-white font-medium'>{selectedLead.studentInfo?.name || 'Tenant'}</p>
                      <p className='text-sm text-gray-600 dark:text-gray-400'>{selectedLead.studentInfo?.phone}</p>
                    </div>
                    <div className='mb-4'>
                      <h4 className='font-semibold text-gray-700 dark:text-gray-300 mb-2 text-sm'>Listing</h4>
                      <p className='text-gray-900 dark:text-white font-medium'>{selectedLead.vacancy?.title || selectedLead.vacancy?.roomType}</p>
                    </div>
                    <div className='mb-4'>
                      <h4 className='font-semibold text-gray-700 dark:text-gray-300 mb-2 text-sm'>Latest Message</h4>
                      <p className='text-sm text-gray-600 dark:text-gray-400 line-clamp-3'>{selectedLead.message || ''}</p>
                    </div>
                    <div className='space-y-2'>
                      <button onClick={() => navigate(`/chat/agent/${selectedLead.chatId || ''}`)} className='w-full px-4 py-2 bg-indigo-600 text-white rounded-lg'>Open Chat</button>
                      <button onClick={() => navigate('/my-chats')} className='w-full px-4 py-2 bg-white border border-gray-300 rounded-lg'>My Chats</button>
                    </div>
                  </div>
                ) : selectedLead.leadType === 'viewing' ? (
                  <div className='bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 sticky top-6 text-sm'>
                    <h3 className='font-bold text-lg text-gray-900 dark:text-white mb-4'>Viewing Request</h3>
                    <div className='mb-3'>
                      <p className='font-semibold'>{selectedLead.studentInfo?.name || 'Tenant'}</p>
                      <p className='text-xs text-gray-600 dark:text-gray-400'>{selectedLead.studentInfo?.phone}</p>
                    </div>
                    <div className='mb-3'>
                      <p className='font-medium'>Listing</p>
                      <p className='text-gray-900 dark:text-white'>{selectedLead.vacancy?.title || selectedLead.vacancy?.roomType}</p>
                    </div>
                    <div className='mb-2'>
                      <p className='font-medium'>Requested Date</p>
                      <p className='text-gray-700 dark:text-gray-300'>{formatDate(selectedLead.raw?.viewingDate || selectedLead.raw?.viewingDateTime)}</p>
                    </div>
                    <div className='mb-2'>
                      <p className='font-medium'>Requested Time</p>
                      <p className='text-gray-700 dark:text-gray-300'>{selectedLead.raw?.viewingTimeRange || selectedLead.raw?.viewingTime || 'Any'}</p>
                    </div>
                    {selectedLead.message && (
                      <div className='mb-3'>
                        <p className='font-medium'>Message</p>
                        <p className='text-gray-700 dark:text-gray-300'>{selectedLead.message}</p>
                      </div>
                    )}
                    <div className='space-y-2'>
                      <button onClick={() => navigate(`/owner/viewing-requests?viewingId=${selectedLead.raw?._id || ''}`)} className='w-full px-4 py-2 bg-indigo-600 text-white rounded-lg'>Open Viewing</button>
                      <button onClick={() => navigate('/my-viewings')} className='w-full px-4 py-2 bg-white border border-gray-300 rounded-lg'>My Viewings</button>
                    </div>
                  </div>
                ) : (selectedLead.leadType === 'booking' || selectedLead.leadType === 'reserve') ? (
                  <div className='bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 sticky top-6 text-sm'>
                    <h3 className='font-bold text-lg text-gray-900 dark:text-white mb-4'>Booking / Reserve</h3>
                    <div className='mb-3'>
                      <p className='font-semibold'>{selectedLead.studentInfo?.name || 'Tenant'}</p>
                      <p className='text-xs text-gray-600 dark:text-gray-400'>{selectedLead.studentInfo?.phone}</p>
                    </div>
                    <div className='mb-3'>
                      <p className='font-medium'>Listing</p>
                      <p className='text-gray-900 dark:text-white'>{selectedLead.vacancy?.title || selectedLead.vacancy?.roomType}</p>
                    </div>
                    <div className='mb-2'>
                      <p className='font-medium'>Preferred Move-in</p>
                      <p className='text-gray-700 dark:text-gray-300'>{formatDate(selectedLead.raw?.preferredMoveInDate || selectedLead.raw?.moveInDate)}</p>
                    </div>
                    <div className='mb-2'>
                      <p className='font-medium'>Provisional Hold Until</p>
                      <p className='text-gray-700 dark:text-gray-300'>{formatDate(selectedLead.raw?.provisionalHoldUntil)}</p>
                    </div>
                    {selectedLead.message && (
                      <div className='mb-3'>
                        <p className='font-medium'>Message</p>
                        <p className='text-gray-700 dark:text-gray-300'>{selectedLead.message}</p>
                      </div>
                    )}
                    <div className='space-y-2'>
                      <a
                        className='block w-full text-center px-4 py-2 bg-green-600 text-white rounded-lg'
                        href={`https://wa.me/?text=${encodeURIComponent(`${selectedLead.studentInfo?.name || 'Tenant'} is ready to book the house and move in on ${formatDate(selectedLead.raw?.preferredMoveInDate || selectedLead.raw?.moveInDate)}.`)}`}
                        target='_blank'
                        rel='noreferrer'
                      >
                        WhatsApp to Caretaker
                      </a>
                      <button onClick={() => navigate('/agent/bookings')} className='w-full px-4 py-2 bg-indigo-600 text-white rounded-lg'>Manage Bookings</button>
                    </div>
                  </div>
                ) : (
                  <div className='bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 text-center'>
                    <MessageSquare size={40} className='mx-auto text-gray-400 mb-2' />
                    <p className='text-gray-600 dark:text-gray-400 text-sm'>Select a lead to view details</p>
                  </div>
                )
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

