import React, { useEffect, useState, useRef } from 'react';
import { useAppContext } from '../../context/AppContext';
import { toast } from 'react-hot-toast';
import { Check, XCircle } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

const ViewingRequests = () => {
  const { axios, getToken } = useAppContext();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightRef = useRef(null);

  useEffect(() => {
    // Delay slightly to allow Clerk token to hydrate before first request
    const timer = setTimeout(() => fetchRequests(), 300);
    return () => clearTimeout(timer);
  }, []);

  // Deep-link: auto-switch filter and scroll when arriving from a notification
  useEffect(() => {
    const viewingId = searchParams.get('viewingId');
    if (viewingId && requests.length > 0) {
      // Ensure the filter shows the target viewing
      const target = requests.find(r => r._id === viewingId);
      if (target && target.status !== filter && filter !== 'all') {
        setFilter(target.status);
      }
      if (highlightRef.current) {
        highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        searchParams.delete('viewingId');
        setSearchParams(searchParams, { replace: true });
      }
    }
  }, [requests, searchParams, filter]);

  const fetchRequests = async (retryCount = 0) => {
    try {
      const token = await getToken();
      if (!token) {
        // Token not ready yet — retry once after 1s
        if (retryCount < 3) {
          setTimeout(() => fetchRequests(retryCount + 1), 1000);
        } else {
          setLoading(false);
        }
        return;
      }
      const { data } = await axios.get('/api/viewing/owner', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (data.success) {
        setRequests(data.viewingRequests);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      if (error.response?.status === 401 && retryCount < 3) {
        // 401 = token not ready — retry
        setTimeout(() => fetchRequests(retryCount + 1), 1000);
        return;
      }
      toast.error('Could not load viewing requests. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResponse = async (requestId, status) => {
    const responses = {
      confirmed: 'Thank you for your interest! Looking forward to showing you the property.',
      declined: 'Sorry, this time slot is not available. Please request another time.'
    };

    try {
      const token = await getToken();
      const { data } = await axios.post('/api/viewing/respond', {
        requestId,
        status,
        ownerResponse: responses[status]
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (data.success) {
        toast.success(`Viewing request ${status}`);
        fetchRequests();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error('Something went wrong. Please try again.');
    }
  };


  const filteredRequests = requests.filter(req => {
    if (filter === 'all') return true;
    return req.status === filter;
  });

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700',
      confirmed: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-700',
      declined: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-700',
      completed: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-700',
      expired: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600'
    };
    return colors[status] || colors.pending;
  };

  if (loading) {
    return <div className="p-8">Loading viewing requests...</div>;
  }

  return (
    <div className="p-6 md:p-8 pb-20">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold mb-2">Viewing Requests</h1>
        <p className="text-gray-600">Manage viewing requests from potential renters</p>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {['pending', 'confirmed', 'declined', 'completed', 'all'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all ${
              filter === status
                ? 'bg-primary text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
            {status !== 'all' && (
              <span className="ml-2 text-xs">
                ({requests.filter(r => r.status === status).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Requests List */}
      {filteredRequests.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-gray-500 text-lg">No {filter !== 'all' ? filter : ''} viewing requests</p>
          <p className="text-gray-400 mt-2 text-sm">
            Requests from renters will appear here
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((request) => (
            <div
              key={request._id}
              ref={request._id === searchParams.get('viewingId') ? highlightRef : null}
              className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 ${request._id === searchParams.get('viewingId') ? 'ring-2 ring-indigo-500' : ''}`}
            >
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                {/* Renter Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <img
                      src={request.renter.image}
                      alt={request.renter.username}
                      className="w-14 h-14 rounded-full"
                    />
                    <div>
                      <h3 className="font-semibold text-lg">{request.renter.username}</h3>
                      <p className="text-sm text-gray-500">{request.renter.email}</p>
                    </div>
                    <span className={`ml-auto px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(request.status)}`}>
                      {request.status}
                    </span>
                  </div>

                  {/* Property Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Property</p>
                      <p className="font-medium">{request.property?.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Room</p>
                      <p className="font-medium">{request.roomDetails?.roomType} — {request.roomDetails?.buildingName}</p>
                    </div>
                    {!request.isDirectApply && request.viewingDate && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Viewing Date</p>
                        <p className="font-medium">{formatDate(request.viewingDate)}</p>
                      </div>
                    )}
                    {!request.isDirectApply && request.viewingTimeRange && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Time</p>
                        <p className="font-medium">{request.viewingTimeRange}</p>
                      </div>
                    )}
                    {request.preferredMoveInDate && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Preferred Move-in</p>
                        <p className="font-medium">{formatDate(request.preferredMoveInDate)}</p>
                      </div>
                    )}
                    {request.isDirectApply && (
                      <div className="md:col-span-2">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 text-xs font-medium">⚡ Direct Apply — no viewing needed</span>
                      </div>
                    )}
                  </div>

                  {/* Renter Message */}
                  {request.message && (
                    <div className="mb-4">
                      <p className="text-xs text-gray-500 mb-2">Renter's Message:</p>
                      <p className="text-gray-700 dark:text-gray-300 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm">
                        {request.message}
                      </p>
                    </div>
                  )}

                  {/* Owner Response */}
                  {request.ownerResponse && (
                    <div>
                      <p className="text-xs text-gray-500 mb-2">Your Response:</p>
                      <p className="text-gray-700 dark:text-gray-300 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-sm">
                        {request.ownerResponse}
                      </p>
                    </div>
                  )}

                  {/* Request Time */}
                  <p className="text-xs text-gray-400 mt-4">
                    Requested {new Date(request.createdAt).toLocaleString()}
                  </p>
                </div>

                {/* Actions */}
                {request.status === 'pending' && (
                  <div className="flex lg:flex-col gap-3">
                    <button
                      onClick={() => handleResponse(request._id, 'confirmed')}
                      className="flex-1 lg:flex-none px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all font-medium"
                    >
                      <span className='flex items-center justify-center gap-1'><Check className='w-4 h-4' /> Confirm</span>
                    </button>
                    <button
                      onClick={() => handleResponse(request._id, 'declined')}
                      className="flex-1 lg:flex-none px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all font-medium"
                    >
                      <span className='flex items-center justify-center gap-1'><XCircle className='w-4 h-4' /> Decline</span>
                    </button>
                  </div>
                )}

              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ViewingRequests;
