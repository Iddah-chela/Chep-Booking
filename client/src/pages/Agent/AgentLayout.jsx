import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu, X, Home, LayoutGrid, Bell } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

export default function AgentLayout() {
  const { isAgent, navigate, fetchUser, authLoading } = useAppContext();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const refreshUser = async () => {
      if (authLoading) return;
      await fetchUser();
      if (!cancelled) setCheckingAccess(false);
    };

    refreshUser();

    return () => {
      cancelled = true;
    };
  }, [authLoading, fetchUser]);

  useEffect(() => {
    if (!checkingAccess && !authLoading && !isAgent) {
      navigate('/');
    }
  }, [checkingAccess, isAgent, authLoading, navigate]);

  if (authLoading || checkingAccess) {
    return (
      <div className='flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900'>
        <div className='w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin' />
      </div>
    );
  }

  if (!isAgent) {
    return null;
  }

  const navItems = [
    { name: 'Dashboard', path: '/agent', icon: Home },
    { name: 'Post Vacancy', path: '/agent/post-vacancy', icon: LayoutGrid },
    { name: 'My Leads', path: '/agent/leads', icon: Bell },
  ];

  return (
    <div className='flex min-h-screen bg-gray-100 dark:bg-gray-900'>
      <div
        className={`fixed md:relative w-64 h-screen bg-white dark:bg-gray-800 shadow-lg transform transition-transform duration-300 z-40 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className='p-6 border-b border-gray-200 dark:border-gray-700'>
          <h1 className='text-2xl font-bold text-indigo-600'>PataKeja</h1>
          <p className='text-sm text-gray-600 dark:text-gray-400'>Agent Dashboard</p>
        </div>

        <nav className='flex-1 p-6 space-y-4'>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.name}
                onClick={() => {
                  navigate(item.path);
                  setSidebarOpen(false);
                }}
                className='w-full flex items-center gap-3 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-gray-700 rounded-lg transition-colors'
              >
                <Icon size={20} />
                <span>{item.name}</span>
              </button>
            );
          })}
        </nav>

        <div className='p-6 border-t border-gray-200 dark:border-gray-700'>
          <p className='text-xs text-gray-500 dark:text-gray-400'>Use the profile menu in the main site header for logout and account actions.</p>
        </div>
      </div>

      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className='md:hidden fixed top-4 right-4 z-50 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg'
      >
        {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <div className='flex-1 overflow-auto'>
        {sidebarOpen && (
          <div
            className='fixed inset-0 bg-black bg-opacity-50 md:hidden z-30'
            onClick={() => setSidebarOpen(false)}
          />
        )}
        <Outlet />
      </div>
    </div>
  );
}
