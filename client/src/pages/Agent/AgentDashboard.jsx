import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { Plus, TrendingUp, Users, Package, MessageSquare, Loader } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AgentDashboard() {
  const { axios, getToken } = useAppContext();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [vacancies, setVacancies] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      
      // Fetch stats
      const statsRes = await axios.get('/api/agent/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStats(statsRes.data);

      // Fetch vacancies
      const vacRes = await axios.get('/api/agent/vacancies?status=active&limit=5', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setVacancies(vacRes.data.vacancies || []);

      // Fetch leads
      const leadsRes = await axios.get('/api/agent/leads?status=new&limit=5', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLeads(leadsRes.data.leads || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className='flex items-center justify-center h-screen'>
        <Loader className='animate-spin' size={32} />
      </div>
    );
  }

  return (
    <div className='p-6 md:p-8'>
      {/* Header */}
      <div className='flex justify-between items-center mb-8'>
        <div>
          <h1 className='text-3xl font-bold text-gray-900 dark:text-white'>Welcome back!</h1>
          <p className='text-gray-600 dark:text-gray-400 mt-2'>Manage your vacancies and leads</p>
        </div>
        <button
          onClick={() => navigate('/agent/post-vacancy')}
          className='bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-colors'
        >
          <Plus size={20} />
          Post Vacancy
        </button>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className='grid grid-cols-1 md:grid-cols-4 gap-4 mb-8'>
          <div className='bg-white dark:bg-gray-800 rounded-lg p-6 shadow'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-gray-600 dark:text-gray-400 text-sm'>Active Vacancies</p>
                <p className='text-3xl font-bold text-gray-900 dark:text-white mt-1'>
                  {stats.activeVacancies}
                </p>
              </div>
              <Package className='text-indigo-600' size={32} />
            </div>
          </div>

          <div className='bg-white dark:bg-gray-800 rounded-lg p-6 shadow'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-gray-600 dark:text-gray-400 text-sm'>Total Leads</p>
                <p className='text-3xl font-bold text-gray-900 dark:text-white mt-1'>
                  {stats.totalLeads}
                </p>
              </div>
              <Users className='text-blue-600' size={32} />
            </div>
          </div>

          <div className='bg-white dark:bg-gray-800 rounded-lg p-6 shadow'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-gray-600 dark:text-gray-400 text-sm'>Unread</p>
                <p className='text-3xl font-bold text-gray-900 dark:text-white mt-1'>
                  {stats.unreadLeads}
                </p>
              </div>
              <MessageSquare className='text-green-600' size={32} />
            </div>
          </div>

          <div className='bg-white dark:bg-gray-800 rounded-lg p-6 shadow'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-gray-600 dark:text-gray-400 text-sm'>Booked</p>
                <p className='text-3xl font-bold text-gray-900 dark:text-white mt-1'>
                  {stats.outcomeStats.booked}
                </p>
              </div>
              <TrendingUp className='text-purple-600' size={32} />
            </div>
          </div>
        </div>
      )}

      {/* Two column layout */}
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-8'>
        {/* Recent Vacancies */}
        <div className='bg-white dark:bg-gray-800 rounded-lg p-6 shadow'>
          <div className='flex justify-between items-center mb-4'>
            <h2 className='text-xl font-bold text-gray-900 dark:text-white'>Recent Vacancies</h2>
            <button
              onClick={() => navigate('/agent/post-vacancy')}
              className='text-indigo-600 hover:text-indigo-700 text-sm font-semibold'
            >
              View All
            </button>
          </div>

          {vacancies.length === 0 ? (
            <div className='text-center py-8'>
              <Package size={40} className='mx-auto text-gray-400 mb-2' />
              <p className='text-gray-600 dark:text-gray-400'>No vacancies posted yet</p>
              <button
                onClick={() => navigate('/agent/post-vacancy')}
                className='text-indigo-600 hover:text-indigo-700 mt-2 font-semibold text-sm'
              >
                Post your first vacancy
              </button>
            </div>
          ) : (
            <div className='space-y-4'>
              {vacancies.map((vacancy) => (
                <div
                  key={vacancy._id}
                  className='p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md transition-shadow'
                >
                  <div className='flex justify-between items-start mb-2'>
                    <div>
                      <h3 className='font-semibold text-gray-900 dark:text-white'>
                        {vacancy.roomType} • {vacancy.location.area}
                      </h3>
                      <p className='text-sm text-gray-600 dark:text-gray-400'>
                        Ksh {vacancy.rent.min.toLocaleString()} - {vacancy.rent.max.toLocaleString()}
                      </p>
                    </div>
                    <span className='bg-green-100 text-green-800 text-xs px-2 py-1 rounded'>
                      Active
                    </span>
                  </div>
                  <div className='flex justify-between text-sm text-gray-600 dark:text-gray-400'>
                    <span>{vacancy.availableRooms} rooms available</span>
                    <span>{vacancy.stats.leadCount} leads</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Leads */}
        <div className='bg-white dark:bg-gray-800 rounded-lg p-6 shadow'>
          <div className='flex justify-between items-center mb-4'>
            <h2 className='text-xl font-bold text-gray-900 dark:text-white'>Recent Leads</h2>
            <button
              onClick={() => navigate('/agent/leads')}
              className='text-indigo-600 hover:text-indigo-700 text-sm font-semibold'
            >
              View All
            </button>
          </div>

          {leads.length === 0 ? (
            <div className='text-center py-8'>
              <Users size={40} className='mx-auto text-gray-400 mb-2' />
              <p className='text-gray-600 dark:text-gray-400'>No new leads yet</p>
              <p className='text-xs text-gray-500 mt-1'>Students will appear here when interested</p>
            </div>
          ) : (
            <div className='space-y-4'>
              {leads.map((lead) => (
                <div
                  key={lead._id}
                  className='p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md transition-shadow cursor-pointer'
                  onClick={() => navigate(`/agent/leads/${lead._id}`)}
                >
                  <div className='flex justify-between items-start mb-2'>
                    <div>
                      <h3 className='font-semibold text-gray-900 dark:text-white'>
                        {lead.studentInfo.name}
                      </h3>
                      <p className='text-sm text-gray-600 dark:text-gray-400'>
                        {lead.studentInfo.phone}
                      </p>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        lead.isRead
                          ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {lead.isRead ? 'Read' : 'New'}
                    </span>
                  </div>
                  <p className='text-xs text-gray-500 dark:text-gray-400'>
                    {new Date(lead.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
