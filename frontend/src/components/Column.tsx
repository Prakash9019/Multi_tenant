// src/components/Column.tsx
import type { Column as ColumnType } from '../types';
import TaskCard from './TaskCard';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../store/store';
import apiClient from '../api/client';
import { fetchBoards } from '../store/kanbanThunks';

interface ColumnProps {
  column: ColumnType;
  onTaskClick?: (task: any) => void;
}

const getApiErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.error ||
  error?.response?.data?.message ||
  error?.response?.data?.details ||
  fallback;

export default function Column({ column, onTaskClick }: ColumnProps) {
  const dispatch = useDispatch<AppDispatch>();
  const { setNodeRef } = useDroppable({
    id: column.id,
    data: { type: 'Column', column },
  });

  const taskIds = (column.tasks ?? []).map((t) => t.id);

  const handleRenameColumn = async () => {
    const name = prompt('Rename column', column.name);
    if (!name || name.trim() === column.name) return;

    try {
      await apiClient.put(`/columns/${column.id}`, {
        name: name.trim(),
        position: column.position,
      });
      dispatch(fetchBoards());
    } catch (error) {
      alert(getApiErrorMessage(error, 'Failed to rename column'));
    }
  };

  const handleDeleteColumn = async () => {
    const confirmed = confirm(`Delete "${column.name}"? All cards in this column will be removed too.`);
    if (!confirmed) return;

    try {
      await apiClient.delete(`/columns/${column.id}`);
      dispatch(fetchBoards());
    } catch (error) {
      alert(getApiErrorMessage(error, 'Failed to delete column'));
    }
  };

  return (
    <div className="flex flex-col shrink-0 w-68 bg-[#ebecf0] rounded-xl max-h-full">
      <div className="p-3 pb-2 flex items-center justify-between cursor-pointer group">
        <h3 className="font-semibold text-sm text-gray-700 pl-1">{column.name}</h3>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleRenameColumn}
            className="p-1.5 rounded-md text-gray-500 hover:bg-gray-300 hover:text-gray-700"
            title="Rename column"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={handleDeleteColumn}
            className="p-1.5 rounded-md text-gray-500 hover:bg-red-100 hover:text-red-600"
            title="Delete column"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Drop Zone for Tasks */}
      <div ref={setNodeRef} className="flex-1 overflow-y-auto overflow-x-hidden px-2 pb-2 minimal-scrollbar min-h-37">
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {(column.tasks ?? []).map((task) => (
              <TaskCard key={task.id} task={task} onClick={onTaskClick} />
            ))}
          </div>
        </SortableContext>
      </div>

      <div className="p-2">
        <button
          onClick={async () => {
            const title = prompt('Enter task title');
            if (!title) return;
            try {
              await apiClient.post('/tasks', {
                title,
                description: '',
                columnId: column.id,
                position: column.tasks.length + 1,
              });
              dispatch(fetchBoards());
            } catch (error) {
              console.error('Failed to create task', error);
              alert('Failed to create task');
            }
          }}
          className="w-full flex items-center text-gray-500 hover:bg-gray-300 hover:text-gray-700 px-2 py-1.5 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Add a card
        </button>
      </div>
    </div>
  );
}
