import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom'
import {ClerkProvider} from '@clerk/clerk-react'
import {AppProvider} from './context/AppContext.jsx'

// Clerk keys from env
const PRIMARY_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
const FALLBACK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY_FALLBACK

if (!PRIMARY_PUBLISHABLE_KEY) {
  throw new Error('Add your Clerk Publishable key to the .env file')
}

const isLocalDevHost =
  typeof window !== 'undefined' &&
  ['localhost', '127.0.0.1'].includes(window.location.hostname)

const isLiveKey = (value) => String(value || '').startsWith('pk_live_')
const isTestKey = (value) => String(value || '').startsWith('pk_test_')

// Always force a test key on localhost to avoid Clerk custom-domain origin errors.
const TEST_KEY_CANDIDATE = [PRIMARY_PUBLISHABLE_KEY, FALLBACK_PUBLISHABLE_KEY].find(isTestKey)
const STARTUP_PUBLISHABLE_KEY = isLocalDevHost
  ? (TEST_KEY_CANDIDATE || PRIMARY_PUBLISHABLE_KEY)
  : PRIMARY_PUBLISHABLE_KEY

if (isLocalDevHost && !isTestKey(STARTUP_PUBLISHABLE_KEY)) {
  throw new Error('Localhost must use a Clerk test key (pk_test_...). Set VITE_CLERK_PUBLISHABLE_KEY in client/.env.local.')
}

const toErrorText = (reason) => {
  if (!reason) return ''
  if (typeof reason === 'string') return reason.toLowerCase()
  const message = typeof reason?.message === 'string' ? reason.message : ''
  const code = typeof reason?.code === 'string' ? reason.code : ''
  return `${message} ${code}`.toLowerCase()
}

const isClerkLoadFailure = (reason) => {
  const text = toErrorText(reason)
  return (
    text.includes('failed_to_load_clerk_js') ||
    text.includes('failed to load clerk') ||
    text.includes('failed to load script')
  )
}

const Root = () => {
  const [activePublishableKey, setActivePublishableKey] = useState(STARTUP_PUBLISHABLE_KEY)
  const [usingFallbackKey, setUsingFallbackKey] = useState(false)

  useEffect(() => {
    const tryFallback = (reason) => {
      if (!FALLBACK_PUBLISHABLE_KEY || activePublishableKey === FALLBACK_PUBLISHABLE_KEY) return
      if (!isClerkLoadFailure(reason)) return
      setActivePublishableKey(FALLBACK_PUBLISHABLE_KEY)
      setUsingFallbackKey(true)
    }

    const onUnhandledRejection = (event) => {
      tryFallback(event?.reason)
    }

    const onWindowError = (event) => {
      tryFallback(event?.error || event?.message)
    }

    window.addEventListener('unhandledrejection', onUnhandledRejection)
    window.addEventListener('error', onWindowError)

    return () => {
      window.removeEventListener('unhandledrejection', onUnhandledRejection)
      window.removeEventListener('error', onWindowError)
    }
  }, [activePublishableKey])

  useEffect(() => {
    if (isLocalDevHost && isLiveKey(activePublishableKey)) {
      console.warn('[Auth] Live Clerk key detected on localhost. Use VITE_CLERK_PUBLISHABLE_KEY=pk_test_... in local env.')
    }
  }, [activePublishableKey])

  return (
    <ClerkProvider key={activePublishableKey} publishableKey={activePublishableKey} afterSignOutUrl="/">
      <BrowserRouter>
        {usingFallbackKey && (
          <div className='fixed top-0 left-0 right-0 z-[99999] bg-amber-100 text-amber-900 border-b border-amber-300 px-3 py-2 text-xs md:text-sm text-center'>
            Auth fallback mode is active. Login remains available while primary auth domain recovers.
          </div>
        )}
        <AppProvider>
          <App />
        </AppProvider>
      </BrowserRouter>
    </ClerkProvider>
  )
}

createRoot(document.getElementById('root')).render(
  <Root />,
)
