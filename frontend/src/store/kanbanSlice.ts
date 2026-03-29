// src/store/kanbanSlice.ts
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Organization, Tenant, Board, Task } from '../types';
import { fetchBoards } from './kanbanThunks';

interface KanbanState {
  activeOrganization: Organization | null;
  activeTenant: Tenant | null;
  boards: Board[];
  currentBoard: Board | null;
  loading: boolean;
  error: string | null;
}

const initialState: KanbanState = {
  // Hardcoded for testing, but in production this comes from Auth/User profile
  activeOrganization: { id: 'org-1', name: 'Acme Corp' },
  activeTenant: { id: 'tenant-1', name: 'New York Branch' }, 
  boards: [],
  currentBoard: null,
  loading: false,
  error: null,
};

const kanbanSlice = createSlice({
  name: 'kanban',
  initialState,
  reducers: {
    setActiveTenant: (state, action: PayloadAction<Tenant>) => {
      state.activeTenant = action.payload;
      state.currentBoard = null; // Reset board when tenant changes
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
      });
  },
});

export const { setActiveTenant, socketTaskMoved } = kanbanSlice.actions;
export default kanbanSlice.reducer;