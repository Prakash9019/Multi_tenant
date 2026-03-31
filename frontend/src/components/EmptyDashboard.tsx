// src/components/EmptyDashboard.tsx
import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../store/store';
import { fetchMyTenants } from '../store/kanbanThunks';
import apiClient from '../api/client';
import { LayoutDashboard, Loader2, RefreshCw, Building2 } from 'lucide-react';

export default function EmptyDashboard() {
  const dispatch = useDispatch<AppDispatch>();
  const { tenants } = useSelector((state: RootState) => state.kanban);
  const [orgName, setOrgName] = useState('');
  const [tenantName, setTenantName] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // If they already have tenants, this component shouldn't render
  if (tenants.length > 0) return null;

  const handleCreateOrg = async () => {
    if (!orgName.trim() || !tenantName.trim()) {
      alert('Please fill in both organization and branch names');
      return;
    }

    setLoading(true);
    try {
      // Calls the POST / endpoint (protected with ORG_ADMIN check, but creator becomes ORG_ADMIN)
      await apiClient.post('/organizations', { orgName, tenantName });
      // Refresh their memberships—they are now an ORG_ADMIN!
      await dispatch(fetchMyTenants()).unwrap();
      setOrgName('');
      setTenantName('');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error creating organization');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await dispatch(fetchMyTenants()).unwrap();
    } catch (err) {
      console.error('Failed to refresh memberships');
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <LayoutDashboard className="w-12 h-12 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to TaskFlow!</h2>
          <p className="text-gray-600">You don't belong to any workspaces yet.</p>
        </div>

        {/* Path 1: The Joiner (Person X) - Waiting for invitation */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg mb-6 border border-blue-200">
          <h3 className="font-bold text-blue-900 mb-2">👥 Waiting for an invite?</h3>
          <p className="text-sm text-blue-800 mb-4">
            Ask your administrator to invite your email address to their workspace.
          </p>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {refreshing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Check for Invites
              </>
            )}
          </button>
        </div>

        {/* Divider */}
        <div className="relative flex py-4 items-center mb-6">
          <div className="flex-grow border-t border-gray-300"></div>
          <span className="flex-shrink-0 mx-4 text-gray-400 text-sm font-medium">OR</span>
          <div className="flex-grow border-t border-gray-300"></div>
        </div>

        {/* Path 2: The Creator - Create new organization */}
        <div className="mt-6">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-5 h-5 text-green-600" />
            <h3 className="font-bold text-gray-900">Create a New Workspace</h3>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Organization Name
              </label>
              <input
                type="text"
                placeholder="e.g. Acme Corp, TechStartup"
                className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Branch/Location Name
              </label>
              <input
                type="text"
                placeholder="e.g. Bangalore, HQ, New York"
                className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                value={tenantName}
                onChange={(e) => setTenantName(e.target.value)}
              />
            </div>

            <button
              onClick={handleCreateOrg}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Building2 className="w-5 h-5" />
                  Create Organization
                </>
              )}
            </button>
          </div>
        </div>

        {/* Info text */}
        <p className="text-xs text-gray-500 text-center mt-6">
          As the creator, you'll be an admin and can invite teammates to your workspace.
        </p>
      </div>
    </div>
  );
}
