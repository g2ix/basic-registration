import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { LogOut, User, Terminal, Menu, ChevronLeft, ChevronRight } from 'lucide-react';

const Header = ({ onMenuClick, onToggleSidebar, sidebarCollapsed }) => {
  const { user, logout } = useAuth();

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            {/* Mobile menu button */}
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
            >
              <Menu className="h-6 w-6" />
            </button>
            
            {/* Desktop sidebar toggle button */}
            <button
              onClick={onToggleSidebar}
              className="hidden lg:flex p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? (
                <ChevronRight className="h-6 w-6" />
              ) : (
                <ChevronLeft className="h-6 w-6" />
              )}
            </button>
            
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 ml-2 lg:ml-0">
              <span className="hidden sm:inline">Cooperative Gathering Registration</span>
              <span className="sm:hidden">CGRS</span>
            </h1>
          </div>
          
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* User info - hidden on very small screens */}
            <div className="hidden sm:flex items-center space-x-2 text-sm text-gray-600">
              <User className="h-4 w-4" />
              <span>{user?.username}</span>
              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                {user?.role}
              </span>
            </div>
            
            {/* Terminal ID - hidden on small screens */}
            {user?.terminalId && (
              <div className="hidden md:flex items-center space-x-1 text-sm text-gray-500">
                <Terminal className="h-4 w-4" />
                <span>{user.terminalId}</span>
              </div>
            )}
            
            {/* Logout button */}
            <button
              onClick={logout}
              className="flex items-center space-x-1 text-sm text-gray-600 hover:text-gray-900 transition-colors p-2 rounded-md hover:bg-gray-100"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
