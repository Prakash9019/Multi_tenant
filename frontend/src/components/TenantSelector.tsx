// src/components/TenantSelector.tsx
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../store/store';
import { setActiveTenant } from '../store/kanbanSlice';
import { LayoutDashboard, ChevronRight } from 'lucide-react';

export default function TenantSelector() {
  const dispatch = useDispatch();
  // Grab the safe, backend-verified list of assigned tenants
  const { tenants, activeOrganization } = useSelector((state: RootState) => state.kanban);

  const handleSelect = (tenant: any) => {
    // This updates Redux state, which triggers Board to load with the selected tenant
    dispatch(setActiveTenant(tenant));
  };

  // Only show this when user has multiple tenants but none selected
  if (tenants.length <= 1) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <LayoutDashboard className="w-12 h-12 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Select Your Workspace</h1>
          <p className="text-gray-600">
            You have access to multiple branches in <span className="font-semibold text-gray-900">{activeOrganization?.name}</span>
          </p>
        </div>

        {/* Tenant List */}
        <div className="space-y-3 mt-6">
          {tenants.map((tenant) => (
            <button
              key={tenant.id}
              onClick={() => handleSelect(tenant)}
              className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left group"
            >
              <div className="flex-1">
                <p className="font-bold text-gray-800 group-hover:text-blue-600">{tenant.name}</p>
                <p className="text-sm text-gray-500">Kanban Board</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
            </button>
          ))}
        </div>

        {/* Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
          💡 Select a branch to view its Kanban board and collaborate with your team.
        </div>
      </div>
    </div>
  );
}
