import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Users, 
  UserCheck, 
  UserX, 
  BarChart3, 
  FileText, 
  Settings,
  Home,
  X,
  Calendar
} from 'lucide-react';

const Sidebar = ({ onClose, collapsed, onToggleCollapse }) => {
  const { isAdmin, isStaff } = useAuth();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Members', href: '/members', icon: Users },
    ...(isStaff() ? [
      { name: 'Check-In/Out', href: '/checkin', icon: UserCheck },
    ] : []),
    ...(isAdmin() ? [
      { name: 'Attendance', href: '/attendance', icon: Calendar },
      { name: 'Reports', href: '/reports', icon: BarChart3 },
      { name: 'Audit Logs', href: '/audit', icon: FileText },
      { name: 'Settings', href: '/settings', icon: Settings },
    ] : []),
  ];

  return (
    <div className={`bg-gray-800 text-white min-h-screen flex flex-col transition-all duration-300 ${
      collapsed ? 'w-16' : 'w-64'
    }`}>
      {/* Mobile close button */}
      <div className="lg:hidden flex justify-end p-4">
        <button
          onClick={onClose}
          className="p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
        >
          <X className="h-6 w-6" />
        </button>
      </div>
      
      <nav className="flex-1 px-2 pb-4">
        <div className="space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.name}
                to={item.href}
                onClick={onClose} // Close sidebar on mobile when navigating
                className={({ isActive }) =>
                  `group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`
                }
                title={collapsed ? item.name : undefined}
              >
                <Icon className={`h-5 w-5 ${collapsed ? 'mx-auto' : 'mr-3'}`} />
                {!collapsed && <span>{item.name}</span>}
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default Sidebar;
