// src/components/Board.tsx
import  { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../store/store';
import { fetchBoards, moveTask, fetchMyTenants, fetchActivityLogs } from '../store/kanbanThunks';
import { socketTaskMoved, setActiveTenant } from '../store/kanbanSlice';
import { useKanbanSocket } from '../hooks/useKanbanSocket';
import EmptyDashboard from './EmptyDashboard';
import TenantSelector from './TenantSelector';
import Column from './Column';
import { Plus, Loader2 } from 'lucide-react';
import { DndContext,type DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import apiClient from '../api/client';

export default function Board() {
  const dispatch = useDispatch<AppDispatch>();
  const { currentBoard, activeTenant, loading, activityLogs, tenants } = useSelector((state: RootState) => state.kanban);
  const [selectedTask, setSelectedTask] = useState<any>(null);

  useKanbanSocket();

  useEffect(() => {
    if (!activeTenant) {
      dispatch(fetchMyTenants());
    }
  }, [activeTenant, dispatch]);

  useEffect(() => {
    if (tenants.length > 0 && !activeTenant) {
      dispatch(setActiveTenant(tenants[0]));
    }
  }, [tenants, activeTenant, dispatch]);

  useEffect(() => {
    if (activeTenant) {
      dispatch(fetchBoards());
      dispatch(fetchActivityLogs());
    }
  }, [activeTenant, dispatch]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || !currentBoard) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Find the task being moved and its current column
    let activeTask = null;
    let sourceColumn = null;
    for (const col of currentBoard.columns) {
      const task = col.tasks.find(t => t.id === activeId);
      if (task) {
        activeTask = task;
        sourceColumn = col;
        break;
      }
    }

    if (!activeTask || !sourceColumn) return;

    // Determine the destination column
    const isOverColumn = over.data.current?.type === 'Column';
    const targetColumnId = isOverColumn ? overId : over.data.current?.task?.columnId;
    
    if (!targetColumnId) return;

    // Calculate new position (simplified for example: appending to end)
    const targetColumn = currentBoard.columns.find(c => c.id === targetColumnId);
    const newPosition = targetColumn ? targetColumn.tasks.length + 1 : 1;

    // Optimistic UI update (local immediate state) before backend confirms
    const optimisticTask = { ...activeTask, columnId: targetColumnId, position: newPosition };
    dispatch(socketTaskMoved(optimisticTask));

    dispatch(moveTask({
      taskId: activeTask.id,
      newColumnId: targetColumnId,
      newPosition: newPosition,
      version: activeTask.version
    })).unwrap().catch((err: string) => {
      alert(err || 'Task move failed. Refreshing board.');
      dispatch(fetchBoards());
    });
  };

  if (loading) return <div className="flex-1 flex justify-center mt-20"><Loader2 className="animate-spin" /></div>;

  // ✅ Path 1: User with 0 tenants (show EmptyDashboard with 2 paths)
  if (tenants.length === 0) {
    return <EmptyDashboard />;
  }

  // ✅ Path 2: User with multiple tenants but hasn't selected one (show TenantSelector)
  if (tenants.length > 1 && !activeTenant) {
    return <TenantSelector />;
  }

  // ✅ Path 3: Auto-select first tenant if single tenant and not yet selected
  // This happens automatically in the useEffect below, so we show loading briefly
  if (tenants.length === 1 && !activeTenant) {
    return <div className="flex-1 flex justify-center mt-20"><Loader2 className="animate-spin" /></div>;
  }

  if (!currentBoard) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-10 bg-gray-50 text-center">
        <div className="bg-white p-8 rounded-2xl shadow-sm border max-w-sm">
          <h2 className="text-xl font-bold text-gray-800 mb-2">No board found</h2>
          <p className="text-gray-500 mb-6">Create a board to start collaborating with your team in this tenant.</p>
          <button
            onClick={async () => {
              const name = prompt('Enter Board Name:');
              if (!name) return;
              try {
                await apiClient.post('/boards', { name });
                dispatch(fetchBoards());
              } catch (error: any) {
                console.error('Failed to create board', error);
                alert(error?.response?.data?.error || 'Board creation failed');
              }
            }}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors"
          >
            + Create First Board
          </button>
        </div>
      </div>
    );
  }
  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800">{currentBoard.name}</h1>
          <div className="text-sm text-gray-500">Recent Activity: {activityLogs?.length ?? 0}</div>
        </div>

        <div className="flex-1 overflow-x-auto px-6 pb-6 pt-2 flex space-x-4">
          {currentBoard.columns.map((column) => (
            <Column key={column.id} column={column} onTaskClick={setSelectedTask} />
          ))}
          <button
            onClick={async () => {
              const name = prompt('Enter new column name');
              if (!name || !currentBoard) return;

              try {
                await apiClient.post('/columns', {
                  name,
                  boardId: currentBoard.id,
                  position: currentBoard.columns.length + 1,
                });
                dispatch(fetchBoards());
              } catch (error) {
                console.error('Failed to create column', error);
                alert('Failed to create column');
              }
            }}
            className="shrink-0 w-68 bg-white/50 text-gray-600 flex items-center px-4 py-3 rounded-xl border"
          >
            <Plus className="w-4 h-4 mr-2" /> Add another list
          </button>
        </div>
      </div>

      {selectedTask && (
        <div className="fixed right-0 top-14 bottom-0 w-80 bg-white border-l shadow-lg p-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Task Details</h3>
            <button onClick={() => setSelectedTask(null)} className="text-xs text-gray-500">Close</button>
          </div>
          <p className="font-bold">{selectedTask.title}</p>
          <p className="text-sm text-gray-600 mt-2">{selectedTask.description || 'No description'}</p>
          <p className="text-xs text-gray-400 mt-3">Position: {selectedTask.position}, Version: {selectedTask.version}</p>
        </div>
      )}
    </DndContext>
  );
}