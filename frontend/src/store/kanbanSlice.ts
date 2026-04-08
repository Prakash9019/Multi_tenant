// src/store/kanbanSlice.ts
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Organization, Tenant, Board, Task, Membership } from '../types';
import { fetchBoards, fetchMyTenants, fetchActivityLogs, moveTask, undoLastAction } from './kanbanThunks';

interface KanbanState {
  activeOrganization: Organization | null;
  activeTenant: Tenant | null;
  memberships: Membership[];
  tenants: Tenant[];
  boards: Board[];
  currentBoard: Board | null;
  activityLogs: any[];
  presence: { id: string; name: string; email?: string }[];
  loading: boolean;
  error: string | null;
  searchQuery: string;
}

const initialState: KanbanState = {
  activeOrganization: null,
  activeTenant: null,
  memberships: [],
  tenants: [],
  boards: [],
  currentBoard: null,
  activityLogs: [],
  presence: [],
  loading: false,
  error: null,
  searchQuery: '',
};

const applyTaskToCurrentBoard = (state: KanbanState, updatedTask: Task) => {
  if (!state.currentBoard) return;

  state.currentBoard.columns.forEach((col) => {
    col.tasks = col.tasks.filter((t) => t.id !== updatedTask.id);

    if (col.id === updatedTask.columnId) {
      col.tasks.push(updatedTask);
      col.tasks.sort((a, b) => a.position - b.position);
    }
  });
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
      state.activeOrganization =
        state.memberships.find((membership) => membership.tenant.id === action.payload.id)?.organization ||
        state.activeOrganization;
      state.currentBoard = null; // Reset board when tenant changes
      state.searchQuery = '';
    },
    setCurrentBoard: (state, action: PayloadAction<string>) => {
      state.currentBoard = state.boards.find((board) => board.id === action.payload) || null;
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    setPresence: (state, action: PayloadAction<{ id: string; name: string; email?: string }[]>) => {
      state.presence = action.payload;
    },
    setActivityLogs: (state, action: PayloadAction<any[]>) => {
      state.activityLogs = action.payload;
    },
    clearKanbanState: (state) => {
      state.activeOrganization = null;
      state.activeTenant = null;
      state.memberships = [];
      state.tenants = [];
      state.boards = [];
      state.currentBoard = null;
      state.activityLogs = [];
      state.presence = [];
      state.loading = false;
      state.error = null;
      state.searchQuery = '';
    },
    // --- WEBSOCKET REAL-TIME ACTIONS ---
    socketTaskMoved: (state, action: PayloadAction<Task>) => {
      applyTaskToCurrentBoard(state, action.payload);
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
        const currentBoardId = state.currentBoard?.id;
        const matchingBoard = action.payload.find((board) => board.id === currentBoardId);
        if (matchingBoard) {
          state.currentBoard = matchingBoard;
        } else if (action.payload.length > 0) {
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
      .addCase(moveTask.fulfilled, (state, action) => {
        state.error = null;
        applyTaskToCurrentBoard(state, action.payload);
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
        const memberships = action.payload as Membership[];
        state.memberships = memberships;
        state.tenants = memberships.map((membership) => membership.tenant);
        const selectedMembership =
          memberships.find((membership) => membership.tenant.id === state.activeTenant?.id) ||
          memberships[0];
        state.activeOrganization = selectedMembership?.organization || null;
        state.activeTenant = selectedMembership?.tenant || null;
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
      })
      .addCase(undoLastAction.pending, (state) => {
        state.error = null;
      })
      .addCase(undoLastAction.fulfilled, (_state) => {
        // After undo, the board will be updated via socket events
        // No need to modify state here as real-time updates handle it
      })
      .addCase(undoLastAction.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const {
  setActiveOrganization,
  setActiveTenant,
  setCurrentBoard,
  setSearchQuery,
  setPresence,
  setActivityLogs,
  socketTaskMoved,
  clearKanbanState,
} = kanbanSlice.actions;
export default kanbanSlice.reducer;
