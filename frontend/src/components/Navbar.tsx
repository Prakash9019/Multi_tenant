// src/components/Navbar.tsx
import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { RootState, AppDispatch } from '../store/store';
import { setActiveTenant, clearKanbanState } from '../store/kanbanSlice';
import { fetchMyTenants } from '../store/kanbanThunks';
import { LayoutDashboard, ChevronDown, Bell, Search, LogOut, UserPlus, Plus } from 'lucide-react';
import InviteUser from './InviteUser';
import { User } from "lucide-react";
import apiClient from '../api/client';

export default function Navbar() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { activeOrganization, activeTenant, tenants, presence } = useSelector((state: RootState) => state.kanban);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [creatingTenant, setCreatingTenant] = useState(false);

  const getApiErrorMessage = (error: any, fallback: string) =>
    error?.response?.data?.error ||
    error?.response?.data?.message ||
    error?.response?.data?.details ||
    fallback;

  const onTenantSwitch = () => {
    if (!tenants || tenants.length === 0) {
      return alert('No tenant context loaded yet.');
    }

    const requestedTenant = prompt(
      `Choose tenant by name: ${tenants.map((t) => t.name).join(', ')}`
    );

    if (!requestedTenant) return;

    const selected = tenants.find((t) => t.name.toLowerCase() === requestedTenant.toLowerCase());
    if (selected) {
      dispatch(setActiveTenant(selected));
    } else {
      alert('Tenant not found');
    }
  };

  const onOrgSwitch = () => {
    if (!activeOrganization) return;
    alert(`Current organization: ${activeOrganization.name}`);
  };

  const handleLogout = () => {
    dispatch(clearKanbanState());
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('token');
    navigate('/login');
  };

  const handleCreateTenant = async () => {
    if (!activeOrganization) {
      alert('Select an organization first.');
      return;
    }

    const tenantName = prompt('Enter new branch name');
    if (!tenantName?.trim()) return;

    try {
      setCreatingTenant(true);
      const response = await apiClient.post('/organizations/tenants', {
        organizationId: activeOrganization.id,
        tenantName: tenantName.trim(),
      });
      await dispatch(fetchMyTenants()).unwrap();
      if (response.data?.tenant) {
        dispatch(setActiveTenant(response.data.tenant));
      }
    } catch (error) {
      alert(getApiErrorMessage(error, 'Failed to create branch'));
    } finally {
      setCreatingTenant(false);
    }
  };

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
          <button
            onClick={onOrgSwitch}
            className="flex items-center text-sm font-medium text-gray-700 hover:bg-gray-100 px-3 py-1.5 rounded-md transition-colors"
          >
            {activeOrganization?.name || 'Select Org'}
            <ChevronDown className="w-4 h-4 ml-1 text-gray-400" />
          </button>
          <span className="text-gray-300">/</span>
          <button
            onClick={onTenantSwitch}
            className="flex items-center text-sm font-medium text-gray-700 hover:bg-gray-100 px-3 py-1.5 rounded-md transition-colors"
          >
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
        <div className="text-xs text-gray-500 mr-3">Presence: {presence.length} online</div>
        <button
          onClick={handleCreateTenant}
          disabled={creatingTenant || !activeOrganization}
          className="text-gray-500 hover:text-gray-700 p-1 rounded-md hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Create Branch"
        >
          <Plus className="w-5 h-5" />
        </button>
        {/* Invite User Button */}
        <button
          onClick={() => setShowInviteModal(true)}
          className="text-gray-500 hover:text-gray-700 p-1 rounded-md hover:bg-gray-100 transition-colors"
          title="Invite User"
        >
          <UserPlus className="w-5 h-5" />
        </button>
        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="text-gray-500 hover:text-gray-700 p-1 rounded-md hover:bg-gray-100 transition-colors"
          title="Logout"
        >
          <LogOut className="w-5 h-5" />
        </button>
        {/* User Avatar */}

<div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center shadow-md cursor-pointer">
  <User className="w-4 h-4 text-white" />
</div>
      </div>
      <InviteUser isOpen={showInviteModal} onClose={() => setShowInviteModal(false)} />
    </nav>
  );
}
