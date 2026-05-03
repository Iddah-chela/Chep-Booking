import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { Plus, BarChart3, Users, Package, MessageSquare, Loader, TrendingUp, CheckCircle, Eye, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AgentDashboard() {
  const { axios, getToken } = useAppContext();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recentLeads, setRecentLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const token = await getToken();

      const statsRes = await axios.get('/api/agent/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStats(statsRes.data);

      const leadsRes = await axios.get('/api/agent/leads?status=all&limit=5', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRecentLeads(leadsRes.data.leads || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className='flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900'>
        <Loader className='animate-spin text-indigo-600' size={40} />
      </div>
    );
  }

  const conversionRate = stats?.totalLeads > 0 ? Math.round((stats?.outcomeStats?.booked / stats?.totalLeads) * 100) : 0;

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900'>
      <div className='bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700'>
        <div className='max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-8'>
          <div className='flex flex-col md:flex-row md:items-center md:justify-between gap-4'>
            <div>
              <h1 className='text-3xl md:text-4xl font-bold text-gray-900 dark:text-white'>Agent Dashboard</h1>
              <p className='text-gray-600 dark:text-gray-400 mt-2'>Manage your vacancies and track leads</p>
            </div>
            <button
              onClick={() => navigate('/agent/post-vacancy')}
              className='inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors shadow-sm hover:shadow-md'
            >
              <Plus size={20} />
              Post Vacancy
            </button>
          </div>
        </div>
      </div>

      <div className='max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-8'>
        {stats && (
          <>
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8'>
              <div className='bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow'>
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-sm font-medium text-gray-600 dark:text-gray-400'>Active Vacancies</p>
                    <p className='text-3xl font-bold text-gray-900 dark:text-white mt-3'>{stats.activeVacancies}</p>
                  </div>
                  <div className='p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg'>
                    <Package className='text-indigo-600' size={28} />
                  </div>
                </div>
              </div>

              <div className='bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow'>
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-sm font-medium text-gray-600 dark:text-gray-400'>Total Leads</p>
                    <p className='text-3xl font-bold text-gray-900 dark:text-white mt-3'>{stats.totalLeads}</p>
                  </div>
                  <div className='p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg'>
                    <Users className='text-blue-600' size={28} />
                  </div>
                </div>
              </div>

              <div className='bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow'>
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-sm font-medium text-gray-600 dark:text-gray-400'>Conversion Rate</p>
                    <p className='text-3xl font-bold text-gray-900 dark:text-white mt-3'>{conversionRate}%</p>
                  </div>
                  <div className='p-3 bg-green-50 dark:bg-green-900/30 rounded-lg'>
                    <TrendingUp className='text-green-600' size={28} />
                  </div>
                </div>
              </div>

              <div className='bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow'>
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-sm font-medium text-gray-600 dark:text-gray-400'>Unread Leads</p>
                    <p className='text-3xl font-bold text-gray-900 dark:text-white mt-3'>{stats.unreadLeads}</p>
                  </div>
                  <div className='p-3 bg-orange-50 dark:bg-orange-900/30 rounded-lg'>
                    <MessageSquare className='text-orange-600' size={28} />
                  </div>
                </div>
              </div>
            </div>

            <div className='bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8'>
              <h2 className='text-lg font-semibold text-gray-900 dark:text-white mb-6'>Lead Outcomes</h2>
              <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
                <div className='p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800'>
                  <div className='flex items-center gap-2 mb-2'>
                    <Eye className='text-blue-600' size={18} />
                    <p className='text-sm text-gray-600 dark:text-gray-400'>Viewed</p>
                  </div>
                  <p className='text-2xl font-bold text-blue-600'>{stats.outcomeStats?.viewed || 0}</p>
                </div>

                <div className='p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800'>
                  <div className='flex items-center gap-2 mb-2'>
                    <CheckCircle className='text-green-600' size={18} />
                    <p className='text-sm text-gray-600 dark:text-gray-400'>Booked</p>
                  </div>
                  <p className='text-2xl font-bold text-green-600'>{stats.outcomeStats?.booked || 0}</p>
                </div>

                <div className='p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800'>
                  <div className='flex items-center gap-2 mb-2'>
                    <Clock className='text-red-600' size={18} />
                    <p className='text-sm text-gray-600 dark:text-gray-400'>Not Fit</p>
                  </div>
                  <p className='text-2xl font-bold text-red-600'>{stats.outcomeStats?.notFit || 0}</p>
                </div>

                <div className='p-4 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600'>
                  <div className='flex items-center gap-2 mb-2'>
                    <Clock className='text-gray-600 dark:text-gray-400' size={18} />
                    <p className='text-sm text-gray-600 dark:text-gray-400'>No Response</p>
                  </div>
                  <p className='text-2xl font-bold text-gray-600 dark:text-gray-300'>{stats.outcomeStats?.noResponse || 0}</p>
                </div>
              </div>
            </div>
          </>
        )}

        <div className='bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6'>
          <div className='flex items-center justify-between mb-6'>
            <h2 className='text-lg font-semibold text-gray-900 dark:text-white'>Recent Leads</h2>
            <button
              onClick={() => navigate('/agent/leads')}
              className='text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium'
            >
              View All
            </button>
          </div>

          {recentLeads.length === 0 ? (
            <div className='text-center py-12'>
              <MessageSquare className='mx-auto text-gray-400 mb-4' size={40} />
              <p className='text-gray-600 dark:text-gray-400'>No leads yet. Post a vacancy to get started!</p>
            </div>
          ) : (
            <div className='overflow-x-auto'>
              <table className='w-full'>
                <thead>
                  <tr className='border-b border-gray-200 dark:border-gray-700'>
                    <th className='text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300'>Student</th>
                    <th className='text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300'>Room Type</th>
                    <th className='text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300'>Status</th>
                    <th className='text-center py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300'>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentLeads.map((lead) => (
                    <tr key={lead._id} className='border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors'>
                      <td className='py-3 px-4'>
                        <div>
                          <p className='text-sm font-medium text-gray-900 dark:text-white'>
                            {lead.student?.firstName} {lead.student?.lastName}
                          </p>
                          <p className='text-xs text-gray-500 dark:text-gray-400'>{lead.student?.email}</p>
                        </div>
                      </td>
                      <td className='py-3 px-4'>
                        <span className='text-sm text-gray-600 dark:text-gray-300 capitalize'>
                          {lead.vacancy?.roomType}
                        </span>
                      </td>
                      <td className='py-3 px-4'>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          lead.status === 'new'
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
                            : lead.status === 'pending'
                            ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                        }`}>
                          {lead.status}
                        </span>
                      </td>
                      <td className='py-3 px-4 text-center'>
                        <button
                          onClick={() => navigate('/agent/leads')}
                          className='text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium'
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className='grid grid-cols-1 md:grid-cols-3 gap-4 mt-8'>
          <button
            onClick={() => navigate('/agent/post-vacancy')}
            className='p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow text-left'
          >
            <div className='flex items-center gap-4'>
              <div className='p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg'>
                <Plus className='text-indigo-600' size={24} />
              </div>
              <div>
                <h3 className='font-semibold text-gray-900 dark:text-white'>Post Vacancy</h3>
                <p className='text-sm text-gray-600 dark:text-gray-400'>Add a new room vacancy</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => navigate('/agent/leads')}
            className='p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow text-left'
          >
            <div className='flex items-center gap-4'>
              <div className='p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg'>
                <MessageSquare className='text-blue-600' size={24} />
              </div>
              <div>
                <h3 className='font-semibold text-gray-900 dark:text-white'>View Leads</h3>
                <p className='text-sm text-gray-600 dark:text-gray-400'>Check your student leads</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => navigate('/agent/analytics')}
            className='p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow text-left'
          >
            <div className='flex items-center gap-4'>
              <div className='p-3 bg-green-50 dark:bg-green-900/30 rounded-lg'>
                <BarChart3 className='text-green-600' size={24} />
              </div>
              <div>
                <h3 className='font-semibold text-gray-900 dark:text-white'>Analytics</h3>
                <p className='text-sm text-gray-600 dark:text-gray-400'>View your performance</p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
