import { useEffect, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Loader, ChevronLeft, Check, X, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminAgentApplications() {
  const { axios, getToken, navigate } = useAppContext();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [selectedApp, setSelectedApp] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(null);

  useEffect(() => {
    fetchApplications();
  }, [statusFilter]);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const res = await axios.get(
        `/api/agent-applications?status=${statusFilter}&limit=50`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setApplications(res.data.applications || []);
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast.error('Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (appId) => {
    try {
      setProcessing(appId);
      const token = await getToken();
      await axios.put(
        `/api/agent-applications/${appId}/approve`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Application approved!');
      fetchApplications();
      setSelectedApp(null);
    } catch (error) {
      console.error('Error approving:', error);
      toast.error(error.response?.data?.message || 'Failed to approve');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (appId) => {
    if (!rejectReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    try {
      setProcessing(appId);
      const token = await getToken();
      await axios.put(
        `/api/agent-applications/${appId}/reject`,
        { reason: rejectReason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Application rejected');
      fetchApplications();
      setSelectedApp(null);
      setRejectReason('');
    } catch (error) {
      console.error('Error rejecting:', error);
      toast.error(error.response?.data?.message || 'Failed to reject');
    } finally {
      setProcessing(null);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    };
    return styles[status] || styles.pending;
  };

  if (loading && applications.length === 0) {
    return (
      <div className='flex items-center justify-center h-screen'>
        <Loader className='animate-spin' size={32} />
      </div>
    );
  }

  return (
    <div className='p-6 md:p-8'>
      {/* Header */}
      <div className='mb-8'>
        <h1 className='text-3xl font-bold text-gray-900 dark:text-white mb-2'>Agent Applications</h1>
        <p className='text-gray-600 dark:text-gray-400'>Review and approve new agent applications</p>
      </div>

      {/* Filters */}
      <div className='mb-6 flex flex-wrap gap-2'>
        {['pending', 'approved', 'rejected'].map((filter) => (
          <button
            key={filter}
            onClick={() => setStatusFilter(filter)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              statusFilter === filter
                ? 'bg-indigo-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600'
            }`}
          >
            {filter.charAt(0).toUpperCase() + filter.slice(1)}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        {/* Applications List */}
        <div className='lg:col-span-2'>
          {applications.length === 0 ? (
            <div className='bg-white dark:bg-gray-800 rounded-lg p-8 text-center'>
              <p className='text-gray-600 dark:text-gray-400'>No applications found</p>
            </div>
          ) : (
            <div className='space-y-3'>
              {applications.map((app) => (
                <div
                  key={app._id}
                  onClick={() => setSelectedApp(app)}
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    selectedApp?._id === app._id
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-md'
                  }`}
                >
                  <div className='flex justify-between items-start'>
                    <div>
                      <h3 className='font-semibold text-gray-900 dark:text-white'>
                        {app.firstName} {app.lastName}
                      </h3>
                      <p className='text-sm text-gray-600 dark:text-gray-400'>{app.email}</p>
                      <p className='text-sm text-gray-600 dark:text-gray-400 mt-1'>
                        {app.yearsExperience} years experience
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${getStatusBadge(app.status)}`}>
                      {app.status}
                    </span>
                  </div>
                  <div className='mt-2 flex gap-2 flex-wrap'>
                    {app.areasServed?.map((area) => (
                      <span
                        key={area}
                        className='text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded'
                      >
                        {area}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Details Panel */}
        <div>
          {selectedApp ? (
            <div className='bg-white dark:bg-gray-800 rounded-lg p-6 shadow sticky top-6'>
              <h3 className='font-bold text-lg text-gray-900 dark:text-white mb-4'>Application Details</h3>

              {/* Applicant Info */}
              <div className='mb-6'>
                <h4 className='font-semibold text-gray-700 dark:text-gray-300 mb-2'>Applicant</h4>
                <p className='text-gray-900 dark:text-white'>{selectedApp.firstName} {selectedApp.lastName}</p>
                <p className='text-sm text-gray-600 dark:text-gray-400'>{selectedApp.email}</p>
                <p className='text-sm text-gray-600 dark:text-gray-400'>{selectedApp.phone}</p>
              </div>

              {/* Experience */}
              <div className='mb-6 pb-6 border-b border-gray-200 dark:border-gray-700'>
                <h4 className='font-semibold text-gray-700 dark:text-gray-300 mb-2'>Experience</h4>
                <p className='text-gray-900 dark:text-white'>{selectedApp.yearsExperience} years</p>
              </div>

              {/* Areas */}
              <div className='mb-6 pb-6 border-b border-gray-200 dark:border-gray-700'>
                <h4 className='font-semibold text-gray-700 dark:text-gray-300 mb-2'>Service Areas</h4>
                <div className='flex flex-wrap gap-2'>
                  {selectedApp.areasServed?.map((area) => (
                    <span key={area} className='bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 px-2 py-1 rounded text-sm'>
                      {area}
                    </span>
                  ))}
                </div>
              </div>

              {/* Bio */}
              {selectedApp.bio && (
                <div className='mb-6 pb-6 border-b border-gray-200 dark:border-gray-700'>
                  <h4 className='font-semibold text-gray-700 dark:text-gray-300 mb-2'>About</h4>
                  <p className='text-sm text-gray-600 dark:text-gray-400'>{selectedApp.bio}</p>
                </div>
              )}

              {/* Reference */}
              {selectedApp.referenceLink && (
                <div className='mb-6 pb-6 border-b border-gray-200 dark:border-gray-700'>
                  <h4 className='font-semibold text-gray-700 dark:text-gray-300 mb-2'>Reference</h4>
                  <a
                    href={selectedApp.referenceLink}
                    target='_blank'
                    rel='noreferrer'
                    className='text-indigo-600 hover:text-indigo-700 text-sm break-all'
                  >
                    {selectedApp.referenceLink}
                  </a>
                </div>
              )}

              {/* Actions - Only for pending */}
              {selectedApp.status === 'pending' && (
                <div className='space-y-3'>
                  <button
                    onClick={() => handleApprove(selectedApp._id)}
                    disabled={processing === selectedApp._id}
                    className='w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2'
                  >
                    {processing === selectedApp._id && <Loader size={16} className='animate-spin' />}
                    <Check size={18} />
                    Approve
                  </button>

                  <div>
                    <textarea
                      placeholder='Rejection reason (if rejecting)'
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      rows='3'
                      className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg text-sm mb-2'
                    />
                    <button
                      onClick={() => handleReject(selectedApp._id)}
                      disabled={processing === selectedApp._id}
                      className='w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2'
                    >
                      {processing === selectedApp._id && <Loader size={16} className='animate-spin' />}
                      <X size={18} />
                      Reject
                    </button>
                  </div>
                </div>
              )}

              {/* View Details - For approved/rejected */}
              {selectedApp.status !== 'pending' && selectedApp.reviewedBy && (
                <div className='text-sm text-gray-600 dark:text-gray-400'>
                  <p>Reviewed by: {selectedApp.reviewedBy?.firstName}</p>
                  <p>{new Date(selectedApp.reviewedAt).toLocaleDateString()}</p>
                </div>
              )}
            </div>
          ) : (
            <div className='bg-white dark:bg-gray-800 rounded-lg p-6 text-center'>
              <p className='text-gray-600 dark:text-gray-400'>Select an application to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
