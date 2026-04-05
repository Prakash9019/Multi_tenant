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
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  useEffect(() => {
    const token = localStorage.getItem('jwt_token');

    // Only connect if we have a token and an active tenant
    if (!token || !activeTenant?.id) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    const connectSocket = () => {
      // Initialize Socket Connection
      socketRef.current = io(import.meta.env.VITE_API_URL || 'http://localhost:8080', {
        auth: { token },
        query: { tenantId: activeTenant.id },
        transports: ['websocket', 'polling'], // Fallback to polling if websocket fails
        timeout: 5000,
        reconnection: true,
        reconnectionAttempts: maxReconnectAttempts,
        reconnectionDelay: 1000,
      });

      const socket = socketRef.current;

      socket.on('connect', () => {
        console.log('🟢 Connected to real-time sync for tenant:', activeTenant.name);
        reconnectAttempts.current = 0;
        // ✅ Fetch fresh board data on every connection/reconnect
        // This ensures we didn't miss any events while offline
        dispatch(fetchBoards());
      });

      socket.on('connect_error', (error) => {
        console.error('🔴 Socket connection error:', error);
        reconnectAttempts.current++;
        if (reconnectAttempts.current >= maxReconnectAttempts) {
          console.error('Max reconnection attempts reached. Please refresh the page.');
        }
      });

      socket.on('reconnect', (attemptNumber) => {
        console.log(`🔄 Reconnected after ${attemptNumber} attempts`);
        // Fetch fresh data after reconnection
        dispatch(fetchBoards());
      });

      socket.on('reconnect_error', (error) => {
        console.error('Reconnection failed:', error);
      });

      socket.on('reconnect_failed', () => {
        console.error('Failed to reconnect after all attempts');
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

      socket.on('disconnect', (reason) => {
        console.log('🔴 Disconnected from real-time sync:', reason);
        if (reason === 'io server disconnect') {
          // Server disconnected, try to reconnect
          socket.connect();
        }
      });
    };

    connectSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [activeTenant?.id, dispatch]);

  return socketRef.current;
};