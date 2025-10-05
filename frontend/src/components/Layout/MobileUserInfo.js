import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { User, Terminal } from 'lucide-react';

const MobileUserInfo = () => {
  const { user } = useAuth();

  return (
    <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-2">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center space-x-2 text-gray-600">
          <User className="h-4 w-4" />
          <span className="font-medium">{user?.username}</span>
          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
            {user?.role}
          </span>
        </div>
        
        {user?.terminalId && (
          <div className="flex items-center space-x-1 text-gray-500">
            <Terminal className="h-4 w-4" />
            <span className="text-xs">{user.terminalId}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileUserInfo;
