// src/components/TaskCard.tsximport React from 'react';

import type { Task } from '../types';
import { AlignLeft } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface TaskCardProps {
  task: Task;
}

export default function TaskCard({ task }: TaskCardProps) {
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: { type: 'Task', task },
  });

  const style = {
    transition,
    transform: CSS.Transform.toString(transform),
  };

  if (isDragging) {
    return (
      <div 
        ref={setNodeRef} 
        style={style} 
        className="opacity-30 bg-gray-100 p-3 rounded-lg border-2 border-dashed border-blue-400 h-25" 
      />
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="group relative bg-white p-3 rounded-lg shadow-sm border border-gray-200 hover:shadow-md hover:border-gray-300 transition-all duration-200 cursor-grab active:cursor-grabbing hover:-translate-y-0.5"
    >
      <div className="text-sm text-gray-800 font-medium leading-snug wrap-break-word">
        {task.title}
      </div>
      
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center text-gray-400">
          {task.description && <AlignLeft className="w-4 h-4" />}
        </div>
        
        {task.assignees && task.assignees.length > 0 && (
          <div className="flex -space-x-1.5">
            {task.assignees.map((user) => (
              <div 
                key={user.id} 
                className="w-6 h-6 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-blue-700"
              >
                {user.name.charAt(0)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}