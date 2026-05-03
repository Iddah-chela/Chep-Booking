import { useEffect, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { BarChart3, TrendingUp, Eye, CheckCircle, AlertCircle, MessageSquare, Loader } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AgentAnalytics() {
  const { axios, getToken } = useAppContext();
  const [stats, setStats] = useState(null);
  const [vacancies, setVacancies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('all'); // all, 30days, 7days

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const token = await getToken();

      // Fetch stats
      const statsRes = await axios.get('/api/agent/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStats(statsRes.data);

      // Fetch all vacancies to show performance
      const vacRes = await axios.get('/api/agent/vacancies?limit=100', {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      // Sort by lead count
      const sorted = (vacRes.data.vacancies || []).sort(
        (a, b) => (b.stats?.leadCount || 0) - (a.stats?.leadCount || 0)
      );
      setVacancies(sorted.slice(0, 10));
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load analytics');
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

  const conversionRate = stats?.totalLeads > 0 
    ? Math.round((stats?.outcomeStats?.booked / stats?.totalLeads) * 100) 
    : 0;

  return (
    <div className='p-6 md:p-8 bg-gray-50 dark:bg-gray-900 min-h-screen'>
      {/* Header */}
      <div className='mb-8'>
        <h1 className='text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3'>
          <BarChart3 size={32} className='text-indigo-600' />
          Analytics
        </h1>
        <p className='text-gray-600 dark:text-gray-400 mt-2'>Track your vacancy performance and leads</p>
      </div>

      {/* Period Filter */}
      <div className='flex gap-3 mb-8'>
        {[
          { value: 'all', label: 'All Time' },
          { value: '30days', label: 'Last 30 Days' },
          { value: '7days', label: 'Last 7 Days' },
        ].map((opt) => (
          <button
            key={opt.value}
            onClick={() => setPeriod(opt.value)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              period === opt.value
                ? 'bg-indigo-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Key Metrics Grid */}
      {stats && (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8'>
          {/* Active Vacancies */}
          <div className='bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm font-medium text-gray-600 dark:text-gray-400'>Active Vacancies</p>
                <p className='text-2xl font-bold text-gray-900 dark:text-white mt-2'>
                  {stats.activeVacancies}
                </p>
              </div>
              <div className='p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg'>
                <TrendingUp className='text-blue-600' size={24} />
              </div>
            </div>
          </div>

          {/* Total Leads */}
          <div className='bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm font-medium text-gray-600 dark:text-gray-400'>Total Leads</p>
                <p className='text-2xl font-bold text-gray-900 dark:text-white mt-2'>
                  {stats.totalLeads}
                </p>
              </div>
              <div className='p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg'>
                <MessageSquare className='text-indigo-600' size={24} />
              </div>
            </div>
          </div>

          {/* Conversion Rate */}
          <div className='bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm font-medium text-gray-600 dark:text-gray-400'>Conversion Rate</p>
                <p className='text-2xl font-bold text-gray-900 dark:text-white mt-2'>
                  {conversionRate}%
                </p>
              </div>
              <div className='p-3 bg-green-100 dark:bg-green-900/30 rounded-lg'>
                <CheckCircle className='text-green-600' size={24} />
              </div>
            </div>
          </div>

          {/* Unread Leads */}
          <div className='bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm font-medium text-gray-600 dark:text-gray-400'>Unread Leads</p>
                <p className='text-2xl font-bold text-gray-900 dark:text-white mt-2'>
                  {stats.unreadLeads}
                </p>
              </div>
              <div className='p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg'>
                <AlertCircle className='text-orange-600' size={24} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lead Outcomes */}
      {stats && (
        <div className='grid grid-cols-1 md:grid-cols-4 gap-4 mb-8'>
          <div className='bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6'>
            <p className='text-sm text-gray-600 dark:text-gray-400'>Viewed</p>
            <p className='text-3xl font-bold text-blue-600 mt-2'>{stats.outcomeStats?.viewed || 0}</p>
          </div>
          <div className='bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6'>
            <p className='text-sm text-gray-600 dark:text-gray-400'>Booked</p>
            <p className='text-3xl font-bold text-green-600 mt-2'>{stats.outcomeStats?.booked || 0}</p>
          </div>
          <div className='bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6'>
            <p className='text-sm text-gray-600 dark:text-gray-400'>Not Fit</p>
            <p className='text-3xl font-bold text-red-600 mt-2'>{stats.outcomeStats?.notFit || 0}</p>
          </div>
          <div className='bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6'>
            <p className='text-sm text-gray-600 dark:text-gray-400'>No Response</p>
            <p className='text-3xl font-bold text-gray-600 mt-2'>{stats.outcomeStats?.noResponse || 0}</p>
          </div>
        </div>
      )}

      {/* Top Performing Vacancies */}
      <div className='bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6'>
        <h2 className='text-xl font-bold text-gray-900 dark:text-white mb-4'>Top Performing Vacancies</h2>
        
        {vacancies.length === 0 ? (
          <p className='text-gray-500 dark:text-gray-400'>No vacancies yet</p>
        ) : (
          <div className='overflow-x-auto'>
            <table className='w-full'>
              <thead>
                <tr className='border-b border-gray-200 dark:border-gray-700'>
                  <th className='text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300'>Room Type</th>
                  <th className='text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300'>Location</th>
                  <th className='text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300'>Rent Range</th>
                  <th className='text-center py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300'>Leads</th>
                </tr>
              </thead>
              <tbody>
                {vacancies.map((vacancy) => (
                  <tr key={vacancy._id} className='border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'>
                    <td className='py-3 px-4'>
                      <span className='text-sm font-medium text-gray-900 dark:text-white capitalize'>
                        {vacancy.roomType}
                      </span>
                    </td>
                    <td className='py-3 px-4'>
                      <span className='text-sm text-gray-600 dark:text-gray-400'>
                        {vacancy.location?.area}, {vacancy.location?.city}
                      </span>
                    </td>
                    <td className='py-3 px-4'>
                      <span className='text-sm text-gray-600 dark:text-gray-400'>
                        Ksh {vacancy.rent?.min?.toLocaleString()} - {vacancy.rent?.max?.toLocaleString()}
                      </span>
                    </td>
                    <td className='py-3 px-4 text-center'>
                      <span className='inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'>
                        {vacancy.stats?.leadCount || 0}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
