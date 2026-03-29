// src/components/Navbar.tsx
import { useSelector } from 'react-redux';
import type { RootState } from '../store/store';
import { LayoutDashboard, ChevronDown, Bell, Search } from 'lucide-react';

export default function Navbar() {
  const { activeOrganization, activeTenant } = useSelector((state: RootState) => state.kanban);

  return (
    <nav className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 sticky top-0 z-50">
      <div className="flex items-center space-x-6">
        {/* Logo */}
        <div className="flex items-center text-blue-600 font-bold text-lg tracking-tight">
          <LayoutDashboard className="w-5 h-5 mr-2" />
          TaskFlow
        </div>

        {/* Context Switchers */}
        <div className="flex items-center space-x-2 border-l border-gray-200 pl-6">
          <button className="flex items-center text-sm font-medium text-gray-700 hover:bg-gray-100 px-3 py-1.5 rounded-md transition-colors">
            {activeOrganization?.name || 'Select Org'}
            <ChevronDown className="w-4 h-4 ml-1 text-gray-400" />
          </button>
          <span className="text-gray-300">/</span>
          <button className="flex items-center text-sm font-medium text-gray-700 hover:bg-gray-100 px-3 py-1.5 rounded-md transition-colors">
            {activeTenant?.name || 'Select Tenant'}
            <ChevronDown className="w-4 h-4 ml-1 text-gray-400" />
          </button>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search..." 
            className="pl-9 pr-4 py-1.5 text-sm bg-gray-100 border-transparent rounded-md focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
          />
        </div>
        <button className="text-gray-500 hover:text-gray-700">
          <Bell className="w-5 h-5" />
        </button>
        {/* User Avatar */}
        <div className="w-8 h-8 rounded-full bg-linear-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold shadow-sm cursor-pointer">
          JD
        </div>
      </div>
    </nav>
  );
}