// src/hooks/useKanbanSocket.ts
import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../store/store';
import { socketTaskMoved, setPresence } from '../store/kanbanSlice';
import { fetchBoards } from '../store/kanbanThunks';

export const useKanbanSocket = () => {
  const socketRef = useRef<Socket | null>(null);
  const dispatch = useDispatch<AppDispatch>();
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
      console.log('Conflict detected:', data.message);
      // Reload board data to resolve inconsistencies
      dispatch(fetchBoards());
    });

    socket.on('presence:update', (users) => {
      dispatch(setPresence(users));
    });

    socket.on('task:created', (task) => {
      dispatch(socketTaskMoved(task));
    });

    socket.on('task:updated', (task) => {
      dispatch(socketTaskMoved(task));
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