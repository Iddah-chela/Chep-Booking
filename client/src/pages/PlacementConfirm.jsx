import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { Check, X, Star, Home } from 'lucide-react';
import toast from 'react-hot-toast';
import AgentReputationBadge from '../components/AgentReputationBadge';

export default function PlacementConfirm() {
  const { id } = useParams();
  const { axios, getToken, user } = useAppContext();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [lead, setLead] = useState(null);
  const [agent, setAgent] = useState(null);
  const [canConfirm, setCanConfirm] = useState(false);
  const [canRate, setCanRate] = useState(false);
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const { data } = await axios.get(`/api/agent/placements/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) {
        setLead(data.lead);
        setAgent(data.agent);
        setCanConfirm(!!data.canConfirm);
        setCanRate(!!data.canRate);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not load placement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && id) load();
  }, [user, id]);

  const respond = async (confirmed) => {
    setActing(true);
    try {
      const token = await getToken();
      const { data } = await axios.post(
        `/api/agent/placements/${id}/confirm`,
        { confirmed },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (data.success) {
        toast.success(data.message);
        setCanConfirm(false);
        setCanRate(!!data.canRate);
        setLead(data.lead);
        if (!data.canRate) navigate('/my-bookings');
      } else {
        toast.error(data.message || 'Failed');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setActing(false);
    }
  };

  const submitRating = async (e) => {
    e.preventDefault();
    setActing(true);
    try {
      const token = await getToken();
      const { data } = await axios.post(
        `/api/agent/placements/${id}/rate`,
        { stars, comment },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (data.success) {
        toast.success(data.message);
        setCanRate(false);
        if (data.reputation) setAgent(data.reputation);
        navigate('/rooms');
      } else {
        toast.error(data.message || 'Failed');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setActing(false);
    }
  };

  if (!user) {
    return (
      <div className='pt-28 px-4 text-center'>
        <p className='text-gray-600 dark:text-gray-300'>Please sign in to confirm this placement.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className='pt-28 flex justify-center'>
        <div className='w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin' />
      </div>
    );
  }

  const title = lead?.vacancy?.title || 'House placement';

  return (
    <div className='pt-24 md:pt-28 px-4 md:px-16 lg:px-24 xl:px-32 pb-16 max-w-xl mx-auto'>
      <div className='bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm'>
        <div className='flex items-center gap-2 text-indigo-600 dark:text-indigo-300 mb-3'>
          <Home className='w-5 h-5' />
          <h1 className='text-xl font-semibold text-gray-900 dark:text-white'>Placement confirmation</h1>
        </div>
        <p className='text-sm text-gray-600 dark:text-gray-400 mb-4'>
          Did you get <span className='font-medium text-gray-800 dark:text-gray-100'>{title}</span>?
        </p>

        {agent && (
          <div className='mb-5 p-3 rounded-xl bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-700'>
            <AgentReputationBadge reputation={agent} showImage />
          </div>
        )}

        {canConfirm && (
          <div className='flex flex-col sm:flex-row gap-2'>
            <button
              type='button'
              disabled={acting}
              onClick={() => respond(true)}
              className='flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium disabled:opacity-60'
            >
              <Check className='w-4 h-4' /> Yes, I got the house
            </button>
            <button
              type='button'
              disabled={acting}
              onClick={() => respond(false)}
              className='flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200 disabled:opacity-60'
            >
              <X className='w-4 h-4' /> No
            </button>
          </div>
        )}

        {canRate && (
          <form onSubmit={submitRating} className='mt-6 space-y-4 border-t border-gray-200 dark:border-gray-700 pt-5'>
            <p className='text-sm font-medium text-gray-800 dark:text-gray-100'>Rate this agent</p>
            <div className='flex gap-1'>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type='button'
                  onClick={() => setStars(n)}
                  className='p-1'
                  aria-label={`${n} stars`}
                >
                  <Star
                    className={`w-7 h-7 ${n <= stars ? 'fill-amber-400 text-amber-400' : 'text-gray-300 dark:text-gray-600'}`}
                  />
                </button>
              ))}
            </div>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder='Optional comment'
              className='w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm'
            />
            <button
              type='submit'
              disabled={acting}
              className='w-full px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium disabled:opacity-60'
            >
              Submit rating
            </button>
          </form>
        )}

        {!canConfirm && !canRate && (
          <p className='text-sm text-gray-500 dark:text-gray-400 mt-2'>
            Status: {lead?.placementConfirmStatus || 'n/a'}
            {lead?.rating?.stars ? ` · You rated ${lead.rating.stars}★` : ''}
          </p>
        )}
      </div>
    </div>
  );
}
