import { useContext, useEffect, useState } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import { Menu, X, Home, LayoutGrid, Bell, BarChart3, LogOut } from 'lucide-react';
import { AppContext } from '../../context/AppContext';

export default function AgentLayout() {
  const { isAgent, user, getToken, navigate } = useContext(AppContext);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isAgent) {
      navigate('/');
    }
  }, [isAgent, navigate]);

  if (!isAgent) {
    return null;
  }

  const handleLogout = () => {
    navigate('/');
  };

  const navItems = [
    { name: 'Dashboard', path: '/agent', icon: Home },
    { name: 'Post Vacancy', path: '/agent/post-vacancy', icon: LayoutGrid },
    { name: 'My Leads', path: '/agent/leads', icon: Bell },
    { name: 'Analytics', path: '/agent/analytics', icon: BarChart3 },
  ];

  return (
    <div className='flex h-screen bg-gray-100 dark:bg-gray-900'>
      {/* Sidebar */}
      <div
        className={`fixed md:relative w-64 h-screen bg-white dark:bg-gray-800 shadow-lg transform transition-transform duration-300 z-40 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Header */}
        <div className='p-6 border-b border-gray-200 dark:border-gray-700'>
          <h1 className='text-2xl font-bold text-indigo-600'>PataKeja</h1>
          <p className='text-sm text-gray-600 dark:text-gray-400'>Agent Dashboard</p>
        </div>

        {/* Navigation */}
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

        {/* Footer */}
        <div className='p-6 border-t border-gray-200 dark:border-gray-700'>
          <div className='flex items-center gap-3 mb-4'>
            <div className='w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold'>
              {user?.firstName?.charAt(0)}
            </div>
            <div>
              <p className='font-semibold text-gray-900 dark:text-white'>{user?.firstName}</p>
              <p className='text-xs text-gray-600 dark:text-gray-400'>Agent</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className='w-full flex items-center gap-3 px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-gray-700 rounded-lg transition-colors'
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Mobile menu toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className='md:hidden fixed top-4 right-4 z-50 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg'
      >
        {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Main content */}
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
