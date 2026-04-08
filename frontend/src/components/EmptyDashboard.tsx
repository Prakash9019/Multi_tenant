import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../store/store';
import { fetchMyTenants } from '../store/kanbanThunks';
import apiClient from '../api/client';
import { LayoutDashboard, Loader2, RefreshCw, Building2 } from 'lucide-react';
import { useToast } from './ui/ToastProvider';
import { getApiErrorMessage } from '../utils/api';

export default function EmptyDashboard() {
  const dispatch = useDispatch<AppDispatch>();
  const { tenants } = useSelector((state: RootState) => state.kanban);
  const { showToast } = useToast();
  const [orgName, setOrgName] = useState('');
  const [tenantName, setTenantName] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  if (tenants.length > 0) return null;

  const handleCreateOrg = async () => {
    if (!orgName.trim() || !tenantName.trim()) {
      setError('Please fill in both organization and branch names.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await apiClient.post('/organizations', { orgName, tenantName });
      await dispatch(fetchMyTenants()).unwrap();
      setOrgName('');
      setTenantName('');
      showToast({
        title: 'Workspace created',
        description: 'Your organization and first branch are ready.',
        tone: 'success',
      });
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Error creating organization'));
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await dispatch(fetchMyTenants()).unwrap();
    } catch {
      showToast({
        title: 'Unable to refresh',
        description: 'We could not check invitations right now.',
        tone: 'error',
      });
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="flex min-h-full w-full items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
      <div className="w-full max-w-xl rounded-[32px] border border-blue-100 bg-white p-6 shadow-xl shadow-blue-100/60 sm:p-8 md:p-10">
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <LayoutDashboard className="h-12 w-12 text-blue-600" />
          </div>
          <h2 className="mb-2 text-3xl font-semibold text-blue-950">Welcome to TaskFlow</h2>
          <p className="text-blue-700/70">You don&apos;t have any memberships yet.</p>
          <p className="mt-2 text-sm text-blue-700/70">
            Create a new organization to become its admin, or wait for an invite to an existing branch.
          </p>
        </div>

        <div className="mb-6 rounded-3xl border border-blue-200 bg-blue-50 p-5">
          <h3 className="mb-2 font-semibold text-blue-900">Waiting for an invite?</h3>
          <p className="mb-4 text-sm text-blue-800">
            Ask an admin to invite the same email address you used to register. As soon as a membership is added,
            you&apos;ll be able to access that branch and its boards.
          </p>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {refreshing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Check for Invites
              </>
            )}
          </button>
        </div>

        <div className="relative mb-6 flex items-center py-4">
          <div className="flex-grow border-t border-blue-100"></div>
          <span className="mx-4 flex-shrink-0 text-sm font-medium text-blue-400">OR</span>
          <div className="flex-grow border-t border-blue-100"></div>
        </div>

      <div className="mt-6">
          <div className="mb-4 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-blue-950">Create a New Organization</h3>
          </div>

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-blue-900">Organization Name</label>
              <input
                type="text"
                placeholder="e.g. Acme Corp"
                className="w-full rounded-2xl border border-blue-200 p-3 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                value={orgName}
                onChange={(event) => setOrgName(event.target.value)}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-blue-900">Branch / Location Name</label>
              <input
                type="text"
                placeholder="e.g. Bangalore, HQ, New York"
                className="w-full rounded-2xl border border-blue-200 p-3 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                value={tenantName}
                onChange={(event) => setTenantName(event.target.value)}
              />
            </div>

            {error ? <p className="text-sm text-blue-700">{error}</p> : null}

            <button
              onClick={handleCreateOrg}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-3 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Building2 className="h-5 w-5" />
                  Create Organization
                </>
              )}
            </button>
          </div>
        </div>

      <p className="mt-6 text-center text-xs text-blue-700/60">
          When you create the organization and first branch, you automatically become the admin for that workspace.
        </p>
      </div>
    </div>
  );
}
