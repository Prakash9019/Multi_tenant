// src/components/Column.tsx
import type { Column as ColumnType } from '../types';
import TaskCard from './TaskCard';
import { MoreHorizontal, Plus } from 'lucide-react';
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

export default function Column({ column, onTaskClick }: ColumnProps) {
  const dispatch = useDispatch<AppDispatch>();
  const { setNodeRef } = useDroppable({
    id: column.id,
    data: { type: 'Column', column },
  });

  const taskIds = (column.tasks ?? []).map((t) => t.id);

  return (
    <div className="flex flex-col shrink-0 w-68 bg-[#ebecf0] rounded-xl max-h-full">
      <div className="p-3 pb-2 flex items-center justify-between cursor-pointer group">
        <h3 className="font-semibold text-sm text-gray-700 pl-1">{column.name}</h3>
        <button className="p-1.5 rounded-md text-gray-500 hover:bg-gray-300 opacity-0 group-hover:opacity-100 transition-opacity">
          <MoreHorizontal className="w-4 h-4" />
        </button>
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