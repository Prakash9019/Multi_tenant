import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../store/store';
import { setActiveTenant } from '../store/kanbanSlice';
import { ChevronRight, LayoutDashboard } from 'lucide-react';

export default function TenantSelector() {
  const dispatch = useDispatch<AppDispatch>();
  const { tenants, activeOrganization } = useSelector((state: RootState) => state.kanban);

  if (tenants.length <= 1) return null;

  return (
    <div className="flex min-h-full items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6 rounded-[32px] border border-blue-100 bg-white p-8 shadow-xl shadow-blue-100/60">
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <LayoutDashboard className="h-12 w-12 text-blue-600" />
          </div>
          <h1 className="text-3xl font-semibold text-blue-950">Select Your Workspace</h1>
          <p className="text-blue-700/70">
            Choose a branch inside <span className="font-semibold text-blue-950">{activeOrganization?.name}</span>
          </p>
        </div>

        <div className="space-y-3">
          {tenants.map((tenant) => (
            <button
              key={tenant.id}
              onClick={() => dispatch(setActiveTenant(tenant))}
              className="group flex w-full items-center justify-between rounded-3xl border border-blue-100 bg-blue-50/50 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50 hover:shadow-md"
            >
              <div className="flex-1">
                <p className="font-semibold text-blue-900 group-hover:text-blue-700">{tenant.name}</p>
                <p className="text-sm text-blue-700/60">Open board</p>
              </div>
              <ChevronRight className="h-5 w-5 text-blue-400 transition-colors group-hover:text-blue-600" />
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
          Select a branch to view its board and collaborate with your team.
        </div>
      </div>
    </div>
  );
}
