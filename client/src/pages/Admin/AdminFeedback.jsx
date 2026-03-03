import React, { useEffect, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { toast } from 'react-hot-toast';
import { Star, Trash2, CheckCircle, Eye, Filter, MessageCircle, Lightbulb, Bug, Frown } from 'lucide-react';

const AdminFeedback = () => {
  const { axios, getToken } = useAppContext();
  const [feedback, setFeedback] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => {
    fetchFeedback();
  }, []);

  const fetchFeedback = async () => {
    try {
      const token = await getToken();
      const { data } = await axios.get('/api/feedback/all', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (data.success) {
        setFeedback(data.feedback);
        setStats(data.stats);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (feedbackId, status) => {
    try {
      const token = await getToken();
      const { data } = await axios.post('/api/feedback/update-status', {
        feedbackId,
        status
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (data.success) {
        setFeedback(prev => prev.map(f => f._id === feedbackId ? { ...f, status } : f));
        toast.success('Status updated');
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleDelete = async (feedbackId) => {
    if (!window.confirm('Delete this feedback?')) return;
    try {
      const token = await getToken();
      const { data } = await axios.delete(`/api/feedback/${feedbackId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (data.success) {
        setFeedback(prev => prev.filter(f => f._id !== feedbackId));
        toast.success('Feedback deleted');
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const filteredFeedback = feedback.filter(f => {
    if (filter !== 'all' && f.status !== filter) return false;
    if (categoryFilter !== 'all' && f.category !== categoryFilter) return false;
    return true;
  });

  const categoryIcons = {
    general: MessageCircle,
    praise: Star,
    feature: Lightbulb,
    bug: Bug,
    complaint: Frown
  };

  const categoryColors = {
    general: 'text-blue-500',
    praise: 'text-amber-500',
    feature: 'text-purple-500',
    bug: 'text-red-500',
    complaint: 'text-orange-500'
  };

  const statusColors = {
    new: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
    reviewed: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
    resolved: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className='p-6'>
        <div className='h-8 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-6 animate-pulse' />
        <div className='grid grid-cols-1 md:grid-cols-4 gap-4 mb-6'>
          {[...Array(4)].map((_, i) => (
            <div key={i} className='h-24 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse' />
          ))}
        </div>
        <div className='space-y-4'>
          {[...Array(5)].map((_, i) => (
            <div key={i} className='h-32 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse' />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className='p-6'>
      <h1 className='text-2xl font-bold mb-6'>User Feedback</h1>

      {/* Stats */}
      {stats && (
        <div className='grid grid-cols-2 md:grid-cols-4 gap-4 mb-6'>
          <div className='bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700'>
            <p className='text-sm text-gray-500 dark:text-gray-400'>Total Feedback</p>
            <p className='text-2xl font-bold'>{stats.total}</p>
          </div>
          <div className='bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700'>
            <p className='text-sm text-gray-500 dark:text-gray-400'>Average Rating</p>
            <div className='flex items-center gap-2'>
              <p className='text-2xl font-bold'>{stats.avgRating}</p>
              <Star className='w-5 h-5 fill-amber-400 text-amber-400' />
            </div>
          </div>
          <div className='bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700'>
            <p className='text-sm text-gray-500 dark:text-gray-400'>New / Unreviewed</p>
            <p className='text-2xl font-bold text-blue-600 dark:text-blue-400'>{stats.statusBreakdown.new}</p>
          </div>
          <div className='bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700'>
            <p className='text-sm text-gray-500 dark:text-gray-400'>Resolved</p>
            <p className='text-2xl font-bold text-green-600 dark:text-green-400'>{stats.statusBreakdown.resolved}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className='flex flex-wrap gap-3 mb-6'>
        <div className='flex items-center gap-2'>
          <Filter className='w-4 h-4 text-gray-500' />
          <span className='text-sm font-medium text-gray-500 dark:text-gray-400'>Status:</span>
        </div>
        {['all', 'new', 'reviewed', 'resolved'].map(status => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
              filter === status
                ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-600'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}

        <div className='border-l border-gray-300 dark:border-gray-600 mx-1' />

        <span className='text-sm font-medium text-gray-500 dark:text-gray-400'>Category:</span>
        {['all', 'general', 'praise', 'feature', 'bug', 'complaint'].map(cat => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
              categoryFilter === cat
                ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-600'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {cat === 'all' ? 'All' : (
              <span className='flex items-center gap-1'>
                {(() => { const Icon = categoryIcons[cat]; return Icon ? <Icon className={`w-3 h-3 ${categoryColors[cat]}`} /> : null })()}
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Feedback List */}
      {filteredFeedback.length === 0 ? (
        <div className='text-center py-16 bg-gray-50 dark:bg-gray-800 rounded-lg'>
          <p className='text-gray-500 dark:text-gray-400 text-lg'>No feedback found</p>
        </div>
      ) : (
        <div className='space-y-4'>
          {filteredFeedback.map((item) => (
            <div key={item._id} className='bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5'>
              <div className='flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3'>
                {/* User + Message */}
                <div className='flex-1'>
                  <div className='flex items-center gap-3 mb-2'>
                    <img
                      src={item.userImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.username || 'U')}&background=6366f1&color=fff`}
                      alt={item.username}
                      className='w-8 h-8 rounded-full object-cover'
                    />
                    <div>
                      <span className='font-medium text-sm'>{item.username}</span>
                      <span className='text-xs text-gray-400 ml-2'>{formatDate(item.createdAt)}</span>
                    </div>
                  </div>

                  {/* Rating */}
                  <div className='flex items-center gap-1 mb-2'>
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star key={s} className={`w-4 h-4 ${s <= item.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300 dark:text-gray-600'}`} />
                    ))}
                    <span className='flex items-center gap-1 ml-2 px-2 py-0.5 rounded-full border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-xs font-medium text-gray-600 dark:text-gray-300'>
                      {(() => { const Icon = categoryIcons[item.category]; return Icon ? <Icon className={`w-3 h-3 ${categoryColors[item.category]}`} /> : null })()}
                      {item.category}
                    </span>
                  </div>

                  {/* Message */}
                  <p className='text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap'>{item.message}</p>
                </div>

                {/* Status & Actions */}
                <div className='flex flex-col items-end gap-2 min-w-[120px]'>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[item.status]}`}>
                    {item.status}
                  </span>

                  <div className='flex gap-1'>
                    {item.status === 'new' && (
                      <button
                        onClick={() => handleStatusUpdate(item._id, 'reviewed')}
                        className='p-1.5 text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded transition-colors'
                        title='Mark as Reviewed'
                      >
                        <Eye className='w-4 h-4' />
                      </button>
                    )}
                    {item.status !== 'resolved' && (
                      <button
                        onClick={() => handleStatusUpdate(item._id, 'resolved')}
                        className='p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors'
                        title='Mark as Resolved'
                      >
                        <CheckCircle className='w-4 h-4' />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(item._id)}
                      className='p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors'
                      title='Delete'
                    >
                      <Trash2 className='w-4 h-4' />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminFeedback;
