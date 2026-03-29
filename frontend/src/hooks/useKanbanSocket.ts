// src/hooks/useKanbanSocket.ts
import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../store/store';
import { socketTaskMoved } from '../store/kanbanSlice';

export const useKanbanSocket = () => {
  const socketRef = useRef<Socket | null>(null);
  const dispatch = useDispatch();
  const activeTenant = useSelector((state: RootState) => state.kanban.activeTenant);

  useEffect(() => {
    const token = localStorage.getItem('jwt_token');

    // Only connect if we have a token and an active tenant
    if (!token || !activeTenant?.id) return;

    // Initialize Socket Connection
    socketRef.current = io(import.meta.env.VITE_API_URL || 'http://localhost:8080', {
      auth: { token },
      query: { tenantId: activeTenant.id },
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('🟢 Connected to real-time sync for tenant:', activeTenant.name);
    });

    // Listen for events emitted from the backend `taskHandlers.ts`
    socket.on('task:moved', (updatedTask) => {
      // Dispatch to Redux to update UI instantly
      dispatch(socketTaskMoved(updatedTask));
    });

    socket.on('task:conflict', (data) => {
      alert(`Conflict: ${data.message}`);
      // Ideally, dispatch a thunk here to re-fetch the board to fix the UI state
    });

    socket.on('disconnect', () => {
      console.log('🔴 Disconnected from real-time sync');
    });

    return () => {
      socket.disconnect();
    };
  }, [activeTenant?.id, dispatch]);

  return socketRef.current;
};