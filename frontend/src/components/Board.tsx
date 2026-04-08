// src/components/Board.tsx
import  { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { Task } from '../types';
import type { RootState, AppDispatch } from '../store/store';
import { fetchBoards, moveTask, fetchMyTenants, fetchActivityLogs, undoLastAction } from '../store/kanbanThunks';
import { socketTaskMoved, setActiveTenant } from '../store/kanbanSlice';
import { useKanbanSocket } from '../hooks/useKanbanSocket';
import EmptyDashboard from './EmptyDashboard';
import TenantSelector from './TenantSelector';
import Column from './Column';
import { Plus, Loader2, Pencil, Save, Trash2 } from 'lucide-react';
import { DndContext,type DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import apiClient from '../api/client';

const getApiErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.error ||
  error?.response?.data?.message ||
  error?.response?.data?.details ||
  fallback;

export default function Board() {
  const dispatch = useDispatch<AppDispatch>();
  const { currentBoard, activeTenant, loading, activityLogs, tenants } = useSelector((state: RootState) => state.kanban);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [taskDraft, setTaskDraft] = useState({ title: '', description: '' });
  const [taskSaving, setTaskSaving] = useState(false);
  const [taskDeleting, setTaskDeleting] = useState(false);

  useKanbanSocket();

  let selectedTask: Task | null = null;
  if (currentBoard && selectedTaskId) {
    for (const column of currentBoard.columns) {
      const task = column.tasks.find((item) => item.id === selectedTaskId);
      if (task) {
        selectedTask = task;
        break;
      }
    }
  }

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

  useEffect(() => {
    if (!selectedTaskId) {
      setTaskDraft({ title: '', description: '' });
      return;
    }

    if (!selectedTask) {
      setSelectedTaskId(null);
      return;
    }

    setTaskDraft({
      title: selectedTask.title,
      description: selectedTask.description || '',
    });
  }, [selectedTaskId, selectedTask]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const refreshBoardData = () => {
    dispatch(fetchBoards());
    dispatch(fetchActivityLogs());
  };

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
    const optimisticTask = {
      ...activeTask,
      columnId: targetColumnId,
      position: newPosition,
      version: activeTask.version + 1,
    };
    dispatch(socketTaskMoved(optimisticTask));

    dispatch(moveTask({
      taskId: activeTask.id,
      newColumnId: targetColumnId,
      newPosition: newPosition,
      version: activeTask.version
    })).unwrap().catch((err: string) => {
      const message = err || 'Task move failed. Refreshing board.';
      if (message.toLowerCase().includes('conflict')) {
        console.warn(message);
      } else {
        alert(message);
      }
      dispatch(fetchBoards());
    });
  };

  const handleRenameBoard = async () => {
    if (!currentBoard) return;

    const name = prompt('Rename board', currentBoard.name);
    if (!name || name.trim() === currentBoard.name) return;

    try {
      await apiClient.put(`/boards/${currentBoard.id}`, { name: name.trim() });
      refreshBoardData();
    } catch (error) {
      alert(getApiErrorMessage(error, 'Failed to rename board'));
    }
  };

  const handleDeleteBoard = async () => {
    if (!currentBoard) return;

    const confirmed = confirm(`Delete board "${currentBoard.name}"?`);
    if (!confirmed) return;

    try {
      await apiClient.delete(`/boards/${currentBoard.id}`);
      setSelectedTaskId(null);
      refreshBoardData();
    } catch (error) {
      alert(getApiErrorMessage(error, 'Failed to delete board'));
    }
  };

  const handleSaveTask = async () => {
    if (!selectedTask) return;

    const title = taskDraft.title.trim();
    if (!title) {
      alert('Task title is required');
      return;
    }

    try {
      setTaskSaving(true);
      await apiClient.put(`/tasks/${selectedTask.id}`, {
        title,
        description: taskDraft.description.trim(),
        columnId: selectedTask.columnId,
        position: selectedTask.position,
        version: selectedTask.version,
      });
      refreshBoardData();
    } catch (error) {
      alert(getApiErrorMessage(error, 'Failed to update task'));
    } finally {
      setTaskSaving(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!selectedTask) return;

    const confirmed = confirm(`Delete task "${selectedTask.title}"?`);
    if (!confirmed) return;

    try {
      setTaskDeleting(true);
      await apiClient.delete(`/tasks/${selectedTask.id}`);
      setSelectedTaskId(null);
      refreshBoardData();
    } catch (error) {
      alert(getApiErrorMessage(error, 'Failed to delete task'));
    } finally {
      setTaskDeleting(false);
    }
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
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-800">{currentBoard.name}</h1>
            <button
              onClick={handleRenameBoard}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-white rounded-md transition-colors"
              title="Rename board"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={handleDeleteBoard}
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
              title="Delete board"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={async () => {
                try {
                  await dispatch(undoLastAction()).unwrap();
                  // Refresh board after undo
                  dispatch(fetchBoards());
                } catch (error: any) {
                  alert(error || 'Failed to undo last action');
                }
              }}
              className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-md transition-colors"
              title="Undo last action"
            >
              ↶ Undo
            </button>
            <div className="text-sm text-gray-500">Recent Activity: {activityLogs?.length ?? 0}</div>
          </div>
        </div>

        <div className="flex-1 overflow-x-auto px-6 pb-6 pt-2 flex space-x-4">
          {currentBoard.columns.map((column) => (
            <Column key={column.id} column={column} onTaskClick={(task) => setSelectedTaskId(task.id)} />
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
            <button onClick={() => setSelectedTaskId(null)} className="text-xs text-gray-500">Close</button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Title</label>
              <input
                value={taskDraft.title}
                onChange={(e) => setTaskDraft((current) => ({ ...current, title: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Task title"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Description</label>
              <textarea
                value={taskDraft.description}
                onChange={(e) => setTaskDraft((current) => ({ ...current, description: e.target.value }))}
                rows={6}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Add details for this task"
              />
            </div>

            <div className="text-xs text-gray-400">
              Position: {selectedTask.position}, Version: {selectedTask.version}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveTask}
                disabled={taskSaving || taskDeleting}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {taskSaving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={handleDeleteTask}
                disabled={taskSaving || taskDeleting}
                className="inline-flex items-center justify-center gap-2 bg-red-50 text-red-600 px-3 py-2 rounded-md text-sm font-medium hover:bg-red-100 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                {taskDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DndContext>
  );
}
