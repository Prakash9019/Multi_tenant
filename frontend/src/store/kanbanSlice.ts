// src/store/kanbanSlice.ts
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Organization, Tenant, Board, Task } from '../types';
import { fetchBoards, fetchMyTenants, fetchActivityLogs, moveTask } from './kanbanThunks';

interface KanbanState {
  activeOrganization: Organization | null;
  activeTenant: Tenant | null;
  tenants: Tenant[];
  boards: Board[];
  currentBoard: Board | null;
  activityLogs: any[];
  presence: { id: string; name: string; email?: string }[];
  loading: boolean;
  error: string | null;
}

const initialState: KanbanState = {
  activeOrganization: null,
  activeTenant: null,
  tenants: [],
  boards: [],
  currentBoard: null,
  activityLogs: [],
  presence: [],
  loading: false,
  error: null,
};

const kanbanSlice = createSlice({
  name: 'kanban',
  initialState,
  reducers: {
    setActiveOrganization: (state, action: PayloadAction<Organization>) => {
      state.activeOrganization = action.payload;
    },
    setActiveTenant: (state, action: PayloadAction<Tenant>) => {
      state.activeTenant = action.payload;
      state.currentBoard = null; // Reset board when tenant changes
    },
    setPresence: (state, action: PayloadAction<{ id: string; name: string; email?: string }[]>) => {
      state.presence = action.payload;
    },
    setActivityLogs: (state, action: PayloadAction<any[]>) => {
      state.activityLogs = action.payload;
    },
    // --- WEBSOCKET REAL-TIME ACTIONS ---
    socketTaskMoved: (state, action: PayloadAction<Task>) => {
      const updatedTask = action.payload;
      if (!state.currentBoard) return;
      
      // Remove task from old column and add to new column (or update position in same column)
      state.currentBoard.columns.forEach(col => {
        // Remove old instance
        col.tasks = col.tasks.filter(t => t.id !== updatedTask.id);
        // Add to new column
        if (col.id === updatedTask.columnId) {
          col.tasks.push(updatedTask);
          col.tasks.sort((a, b) => a.position - b.position);
        }
      });
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBoards.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBoards.fulfilled, (state, action) => {
        state.loading = false;
        state.boards = action.payload;
        // Auto-select the first board
        if (action.payload.length > 0) {
          state.currentBoard = action.payload[0];
        } else {
          state.currentBoard = null;
        }
      })
      .addCase(fetchBoards.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(moveTask.pending, (state) => {
        state.error = null;
      })
      .addCase(moveTask.fulfilled, (state) => {
        state.error = null;
      })
      .addCase(moveTask.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      .addCase(fetchMyTenants.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMyTenants.fulfilled, (state, action) => {
        state.loading = false;
        const memberships = action.payload;
        state.tenants = memberships.map((m: any) => m.tenant);
        const org = memberships[0]?.organization;
        if (org) state.activeOrganization = org;
        const selectedTenant = memberships[0]?.tenant;
        if (selectedTenant) state.activeTenant = selectedTenant;
      })
      .addCase(fetchMyTenants.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchActivityLogs.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchActivityLogs.fulfilled, (state, action) => {
        state.loading = false;
        state.activityLogs = action.payload;
      })
      .addCase(fetchActivityLogs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setActiveOrganization, setActiveTenant, setPresence, setActivityLogs, socketTaskMoved } = kanbanSlice.actions;
export default kanbanSlice.reducer;