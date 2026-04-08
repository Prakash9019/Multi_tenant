import type { Task } from '../types';
import { AlignLeft, GripVertical } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface TaskCardProps {
  task: Task;
  onClick?: (task: Task) => void;
}

export default function TaskCard({ task, onClick }: TaskCardProps) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
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
        className="h-28 rounded-3xl border-2 border-dashed border-blue-300 bg-blue-100/60"
      />
    );
  }

  return (
    <button
      ref={setNodeRef}
      style={style}
      type="button"
      {...attributes}
      {...listeners}
      onClick={() => onClick?.(task)}
      className="group w-full rounded-3xl border border-blue-100 bg-white p-4 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="truncate text-sm font-semibold text-blue-950">{task.title}</h4>
          {task.description ? (
            <p className="mt-2 line-clamp-2 text-sm leading-5 text-blue-700/75">{task.description}</p>
          ) : (
            <p className="mt-2 text-sm text-blue-400">Open card to add details</p>
          )}
        </div>
        <div className="rounded-2xl bg-blue-50 p-2 text-blue-400 transition group-hover:bg-blue-100 group-hover:text-blue-600">
          <GripVertical className="h-4 w-4" />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
          <AlignLeft className="h-3.5 w-3.5" />
          {task.description ? 'Details added' : 'No details'}
        </div>

        {task.assignees && task.assignees.length > 0 ? (
          <div className="flex -space-x-2">
            {task.assignees.slice(0, 3).map((user) => (
              <div
                key={user.id}
                className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-blue-600 text-[11px] font-semibold text-white"
                title={user.email || user.name}
              >
                {(user.name || user.email || '?').charAt(0).toUpperCase()}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </button>
  );
}
