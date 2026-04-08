import { useState, type FormEvent } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { RootState, AppDispatch } from '../store/store';
import { clearKanbanState, setActiveTenant, setSearchQuery } from '../store/kanbanSlice';
import { fetchMyTenants } from '../store/kanbanThunks';
import { LayoutDashboard, LogOut, Plus, Search, UserPlus } from 'lucide-react';
import InviteUser from './InviteUser';
import Modal from './ui/Modal';
import Avatar from './ui/Avatar';
import { useToast } from './ui/ToastProvider';
import apiClient from '../api/client';
import { getApiErrorMessage } from '../utils/api';
import { getUserFromToken } from '../utils/auth';
import { isAdminRole, isOrgAdminRole } from '../utils/roles';

export default function Navbar() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { activeOrganization, activeTenant, tenants, memberships, presence, searchQuery } = useSelector(
    (state: RootState) => state.kanban
  );
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showCreateTenantModal, setShowCreateTenantModal] = useState(false);
  const [tenantName, setTenantName] = useState('');
  const [tenantError, setTenantError] = useState('');
  const [creatingTenant, setCreatingTenant] = useState(false);

  const currentMembership = memberships.find((membership) => membership.tenant.id === activeTenant?.id);
  const currentRole = currentMembership?.role;
  const canInviteUsers = isAdminRole(currentRole);
  const canCreateBranch = isOrgAdminRole(currentRole);
  const currentUser = getUserFromToken();

  const handleLogout = () => {
    dispatch(clearKanbanState());
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('token');
    navigate('/login');
  };

  const handleCreateTenant = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!activeOrganization) {
      setTenantError('Select an organization before creating a branch.');
      return;
    }

    if (!tenantName.trim()) {
      setTenantError('Branch name is required.');
      return;
    }

    try {
      setCreatingTenant(true);
      setTenantError('');
      const response = await apiClient.post('/organizations/tenants', {
        organizationId: activeOrganization.id,
        tenantName: tenantName.trim(),
      });
      await dispatch(fetchMyTenants()).unwrap();
      if (response.data?.tenant) {
        dispatch(setActiveTenant(response.data.tenant));
      }
      setTenantName('');
      setShowCreateTenantModal(false);
      showToast({
        title: 'Branch created',
        description: 'The new branch is ready to use.',
        tone: 'success',
      });
    } catch (error) {
      setTenantError(getApiErrorMessage(error, 'Failed to create branch'));
    } finally {
      setCreatingTenant(false);
    }
  };

  return (
    <>
      <nav className="sticky top-0 z-50 border-b border-blue-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-4 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm">
              <LayoutDashboard className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold tracking-wide text-blue-950">TaskFlow</p>
              <p className="truncate text-xs text-blue-700/70">
                {activeOrganization?.name || 'Workspace board'}
              </p>
            </div>
          </div>

          <div className="hidden min-w-0 flex-1 items-center gap-3 lg:flex">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => dispatch(setSearchQuery(event.target.value))}
                placeholder="Search cards by title or description"
                className="w-full rounded-2xl border border-blue-100 bg-blue-50/70 py-2.5 pl-10 pr-4 text-sm text-blue-950 outline-none transition focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <div className="hidden items-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-3 py-2 sm:flex">
              <span className="text-xs font-medium uppercase tracking-wide text-blue-500">Branch</span>
              <select
                value={activeTenant?.id || ''}
                onChange={(event) => {
                  const selected = tenants.find((tenant) => tenant.id === event.target.value);
                  if (selected) {
                    dispatch(setActiveTenant(selected));
                  }
                }}
                className="bg-transparent text-sm font-medium text-blue-950 outline-none"
              >
                {tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="hidden rounded-2xl border border-blue-100 bg-white px-3 py-2 text-xs font-medium text-blue-700 sm:block">
              {presence.length} online
            </div>

            {canCreateBranch ? (
              <button
                type="button"
                onClick={() => setShowCreateTenantModal(true)}
                className="inline-flex items-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 transition hover:border-blue-300 hover:bg-blue-100 active:scale-[0.98]"
                title="Create a new branch"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">New Branch</span>
              </button>
            ) : null}

            {canInviteUsers ? (
              <button
                type="button"
                onClick={() => setShowInviteModal(true)}
                className="inline-flex items-center gap-2 rounded-2xl border border-blue-600 bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.98]"
                title="Invite users"
              >
                <UserPlus className="h-4 w-4" />
                <span className="hidden sm:inline">Invite</span>
              </button>
            ) : null}

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-2xl border border-blue-100 bg-white px-3 py-2 text-sm font-medium text-blue-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-900 active:scale-[0.98]"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>

            <Avatar email={currentUser?.email} />
          </div>
        </div>

        <div className="border-t border-blue-50 px-4 py-3 lg:hidden">
          <div className="mx-auto flex max-w-[1600px] flex-col gap-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => dispatch(setSearchQuery(event.target.value))}
                placeholder="Search cards by title or description"
                className="w-full rounded-2xl border border-blue-100 bg-blue-50/70 py-2.5 pl-10 pr-4 text-sm text-blue-950 outline-none transition focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 rounded-2xl border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-900">
                <span className="mr-2 text-xs uppercase tracking-wide text-blue-500">Branch</span>
                <select
                  value={activeTenant?.id || ''}
                  onChange={(event) => {
                    const selected = tenants.find((tenant) => tenant.id === event.target.value);
                    if (selected) {
                      dispatch(setActiveTenant(selected));
                    }
                  }}
                  className="bg-transparent font-medium outline-none"
                >
                  {tenants.map((tenant) => (
                    <option key={tenant.id} value={tenant.id}>
                      {tenant.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="rounded-2xl border border-blue-100 bg-white px-3 py-2 text-xs font-medium text-blue-700">
                {presence.length} online
              </div>
            </div>
          </div>
        </div>
      </nav>

      <Modal
        open={showCreateTenantModal}
        title="Create Branch"
        description="Add another branch inside the current organization."
        onClose={() => {
          if (!creatingTenant) {
            setShowCreateTenantModal(false);
            setTenantError('');
            setTenantName('');
          }
        }}
        footer={
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setShowCreateTenantModal(false);
                setTenantError('');
                setTenantName('');
              }}
              className="rounded-2xl border border-blue-100 px-4 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="create-tenant-form"
              disabled={creatingTenant}
              className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {creatingTenant ? 'Creating...' : 'Create Branch'}
            </button>
          </div>
        }
      >
        <form id="create-tenant-form" onSubmit={handleCreateTenant} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-blue-900">Branch name</label>
            <input
              value={tenantName}
              onChange={(event) => setTenantName(event.target.value)}
              className="w-full rounded-2xl border border-blue-200 px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              placeholder="e.g. Bangalore, Design, East Coast"
            />
            {tenantError ? <p className="text-sm text-blue-700">{tenantError}</p> : null}
          </div>
        </form>
      </Modal>

      {canInviteUsers ? <InviteUser isOpen={showInviteModal} onClose={() => setShowInviteModal(false)} /> : null}
    </>
  );
}
