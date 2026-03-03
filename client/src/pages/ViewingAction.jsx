import React, { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Check, X, CalendarCheck, Home, Loader2 } from 'lucide-react'

// Token-based action page — called from email links (no auth needed).
// URL formats:
//   /viewing/action?type=owner&token=X&answer=confirm|decline
//   /viewing/action?type=nudge&token=X&answer=yes|no

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'

const ViewingAction = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [state, setState] = useState('loading') // loading | success | error | already | booked | declined_nudge
  const [message, setMessage] = useState('')
  const [propertyName, setPropertyName] = useState('')

  const type   = searchParams.get('type')   // owner | nudge
  const token  = searchParams.get('token')
  const answer = searchParams.get('answer') // confirm|decline|yes|no

  useEffect(() => {
    if (!token || !type || !answer) {
      setState('error')
      setMessage('This link is invalid or incomplete.')
      return
    }

    const call = async () => {
      try {
        const endpoint = type === 'nudge'
          ? `/api/viewing/nudge-response`
          : `/api/viewing/owner-action`

        const { data } = await axios.get(`${BACKEND}${endpoint}`, {
          params: { token, answer, json: '1' },
          headers: { 'ngrok-skip-browser-warning': 'true' }
        })

        if (data.propertyName) setPropertyName(data.propertyName)

        if (!data.success) {
          if (data.already) {
            setState('already')
            setMessage(data.message || 'This request was already actioned.')
          } else {
            setState('error')
            setMessage(data.message || 'Something went wrong.')
          }
          return
        }

        if (type === 'nudge' && answer === 'yes') {
          setState('booked')
          setMessage(data.message || 'Your booking has been confirmed!')
        } else if (type === 'nudge' && answer === 'no') {
          setState('declined_nudge')
          setMessage(data.message || "Got it! We'll keep searching for the right place.")
        } else {
          setState('success')
          setMessage(data.message || (answer === 'confirm' ? 'You accepted the request.' : 'You declined the request.'))
        }
      } catch (err) {
        setState('error')
        setMessage('Could not connect. Please try again or open the app.')
      }
    }

    call()
  }, [])

  const configs = {
    loading: {
      icon: <Loader2 className='w-14 h-14 text-indigo-500 animate-spin mx-auto mb-4' />,
      title: 'Processing…',
      bg: 'from-indigo-50 to-slate-100 dark:from-gray-800 dark:to-gray-900',
      badge: ''
    },
    success: {
      icon: <Check className='w-14 h-14 text-green-500 mx-auto mb-4' />,
      title: answer === 'confirm' ? '✔ Request Accepted' : '✗ Request Declined',
      bg: answer === 'confirm'
        ? 'from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-gray-900'
        : 'from-red-50 to-rose-50 dark:from-red-900/20 dark:to-gray-900',
      badge: answer === 'confirm' ? 'text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/40' : 'text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/40'
    },
    booked: {
      icon: <CalendarCheck className='w-14 h-14 text-green-500 mx-auto mb-4' />,
      title: '🎉 Room Booked!',
      bg: 'from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-gray-900',
      badge: 'text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/40'
    },
    declined_nudge: {
      icon: <Home className='w-14 h-14 text-gray-400 mx-auto mb-4' />,
      title: 'Thanks for letting us know',
      bg: 'from-gray-50 to-slate-100 dark:from-gray-800 dark:to-gray-900',
      badge: ''
    },
    already: {
      icon: <Check className='w-14 h-14 text-blue-400 mx-auto mb-4' />,
      title: 'Already Done',
      bg: 'from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-gray-900',
      badge: 'text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/40'
    },
    error: {
      icon: <X className='w-14 h-14 text-red-400 mx-auto mb-4' />,
      title: 'Something Went Wrong',
      bg: 'from-red-50 to-rose-50 dark:from-red-900/20 dark:to-gray-900',
      badge: 'text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/40'
    }
  }

  const cfg = configs[state] || configs.loading

  const appUrl = state === 'booked'
    ? '/my-bookings'
    : type === 'nudge'
      ? '/my-viewings'
      : '/owner/viewing-requests'

  const appLabel = state === 'booked'
    ? 'View My Bookings'
    : type === 'nudge'
      ? 'View My Viewings'
      : 'Go to Dashboard'

  return (
    <div className={`min-h-screen bg-gradient-to-br ${cfg.bg} flex items-center justify-center p-6`}>
      <div className='bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-8 text-center'>
        {cfg.icon}
        <h1 className='text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2'>{cfg.title}</h1>
        {propertyName && (
          <p className='text-sm text-indigo-600 dark:text-indigo-400 font-medium mb-3'>{propertyName}</p>
        )}
        {message && (
          <p className='text-gray-600 dark:text-gray-400 text-sm mb-6 leading-relaxed'>{message}</p>
        )}
        {state !== 'loading' && (
          <div className='flex flex-col gap-3'>
            <button
              onClick={() => navigate(appUrl)}
              className='w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-all'
            >
              {appLabel}
            </button>
            <button
              onClick={() => navigate('/')}
              className='w-full py-2.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm transition-all'
            >
              Go to Home
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default ViewingAction
