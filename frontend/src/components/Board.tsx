// src/components/Board.tsx
import  { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../store/store';
import { fetchBoards, moveTask } from '../store/kanbanThunks';
import { useKanbanSocket } from '../hooks/useKanbanSocket';
import Column from './Column';
import { Plus, Loader2 } from 'lucide-react';
import { DndContext,type DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import apiClient from '../api/client';

export default function Board() {
  const dispatch = useDispatch<AppDispatch>();
  const { currentBoard, activeTenant, loading } = useSelector((state: RootState) => state.kanban);

  useKanbanSocket();

  useEffect(() => {
    if (activeTenant) dispatch(fetchBoards());
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

    // Dispatch API call to backend
    dispatch(moveTask({
      taskId: activeTask.id,
      newColumnId: targetColumnId,
      newPosition: newPosition,
      version: activeTask.version
    }));
  };

  if (loading) return <div className="flex-1 flex justify-center mt-20"><Loader2 className="animate-spin" /></div>;
  if (!currentBoard) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-10 bg-gray-50 text-center">
      <div className="bg-white p-8 rounded-2xl shadow-sm border max-w-sm">
        <h2 className="text-xl font-bold text-gray-800 mb-2">No board found</h2>
        <p className="text-gray-500 mb-6">Create a board to start collaborating with your team in this tenant.</p>
        <button 
          onClick={async () => {
             const name = prompt("Enter Board Name:");
             if (name) {
                await apiClient.post('/boards', { name });
                window.location.reload(); // Refresh to trigger fetchBoards thunk
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
        </div>

        <div className="flex-1 overflow-x-auto px-6 pb-6 pt-2 flex space-x-4">
          {currentBoard.columns.map((column) => (
            <Column key={column.id} column={column} />
          ))}
          <button className="shrink-0 w-68 bg-white/50 text-gray-600 flex items-center px-4 py-3 rounded-xl border">
            <Plus className="w-4 h-4 mr-2" /> Add another list
          </button>
        </div>
      </div>
    </DndContext>
  );
}