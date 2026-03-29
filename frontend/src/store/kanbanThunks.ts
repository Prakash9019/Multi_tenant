// src/store/kanbanThunks.ts
import { createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../api/client';
import type { Board } from '../types';

// Fetch boards for the currently active tenant
export const fetchBoards = createAsyncThunk(
  'kanban/fetchBoards',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get<Board[]>('/boards');
      // For this UI, we assume we auto-load the first board if it exists
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch boards');
    }
  }
);

// Move a task (Optimistic locking update)
export const moveTask = createAsyncThunk(
  'kanban/moveTask',
  async (
    payload: { taskId: string; newColumnId: string; newPosition: number; version: number },
    { rejectWithValue }
  ) => {
    try {
      const response = await apiClient.put(`/tasks/${payload.taskId}`, {
        columnId: payload.newColumnId,
        position: payload.newPosition,
        version: payload.version, // Required for concurrency handling
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 409) {
        return rejectWithValue('Conflict: Task was modified by another user.');
      }
      return rejectWithValue('Failed to move task');
    }
  }
);