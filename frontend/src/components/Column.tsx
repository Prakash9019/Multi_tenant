import { useState, type FormEvent } from 'react';
import type { Column as ColumnType, Task } from '../types';
import TaskCard from './TaskCard';
import Modal from './ui/Modal';
import { useToast } from './ui/ToastProvider';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import apiClient from '../api/client';
import { getApiErrorMessage } from '../utils/api';

interface ColumnProps {
  column: ColumnType;
  canDelete: boolean;
  onRefresh: () => void;
  onTaskClick?: (task: Task) => void;
}

type ColumnModalMode = 'create-task' | 'rename-column' | null;

export default function Column({ column, canDelete, onRefresh, onTaskClick }: ColumnProps) {
  const { showToast } = useToast();
  const { setNodeRef } = useDroppable({
    id: column.id,
    data: { type: 'Column', column },
  });
  const [modalMode, setModalMode] = useState<ColumnModalMode>(null);
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const taskIds = (column.tasks ?? []).map((task) => task.id);

  const openCreateTask = () => {
    setModalMode('create-task');
    setInputValue('');
    setError('');
  };

  const openRenameColumn = () => {
    setModalMode('rename-column');
    setInputValue(column.name);
    setError('');
  };

  const closeModal = () => {
    if (saving) return;
    setModalMode(null);
    setInputValue('');
    setError('');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!inputValue.trim()) {
      setError(modalMode === 'create-task' ? 'Card title is required.' : 'Column name is required.');
      return;
    }

    try {
      setSaving(true);
      setError('');

      if (modalMode === 'create-task') {
        await apiClient.post('/tasks', {
          title: inputValue.trim(),
          description: '',
          columnId: column.id,
          position: column.tasks.length + 1,
        });
        showToast({ title: 'Card created', description: `Added to ${column.name}.`, tone: 'success' });
      }

      if (modalMode === 'rename-column') {
        await apiClient.put(`/columns/${column.id}`, {
          name: inputValue.trim(),
          position: column.position,
        });
        showToast({ title: 'Column updated', description: 'Column name saved.', tone: 'success' });
      }

      closeModal();
      onRefresh();
    } catch (error) {
      setError(
        getApiErrorMessage(error, modalMode === 'create-task' ? 'Failed to create card' : 'Failed to rename column')
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteColumn = async () => {
    try {
      setSaving(true);
      await apiClient.delete(`/columns/${column.id}`);
      setConfirmDelete(false);
      showToast({ title: 'Column deleted', description: `${column.name} was removed.`, tone: 'success' });
      onRefresh();
    } catch (error) {
      showToast({
        title: 'Unable to delete column',
        description: getApiErrorMessage(error, 'Failed to delete column'),
        tone: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="flex w-[320px] shrink-0 flex-col rounded-[28px] border border-blue-100 bg-white p-3 shadow-sm transition duration-200 hover:border-blue-200 hover:shadow-md">
        <div className="flex items-start justify-between gap-3 px-2 pb-3 pt-1">
          <div>
            <h3 className="text-sm font-semibold text-blue-950">{column.name}</h3>
            <p className="mt-1 text-xs text-blue-700/60">{column.tasks.length} card{column.tasks.length === 1 ? '' : 's'}</p>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={openRenameColumn}
              className="rounded-xl border border-transparent p-2 text-blue-500 transition hover:border-blue-100 hover:bg-blue-50 hover:text-blue-700"
              title="Rename column"
            >
              <Pencil className="h-4 w-4" />
            </button>
            {canDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="rounded-xl border border-transparent p-2 text-blue-500 transition hover:border-blue-100 hover:bg-blue-50 hover:text-blue-700"
                title="Delete column"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>

        <div
          ref={setNodeRef}
          className="minimal-scrollbar flex min-h-[220px] flex-1 overflow-y-auto rounded-[22px] bg-blue-50/60 px-2 py-2"
        >
          <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
            <div className="flex w-full flex-col gap-3">
              {(column.tasks ?? []).length > 0 ? (
                (column.tasks ?? []).map((task) => <TaskCard key={task.id} task={task} onClick={onTaskClick} />)
              ) : (
                <div className="rounded-2xl border border-dashed border-blue-200 bg-white/70 px-4 py-8 text-center text-sm text-blue-700/70">
                  <p>No cards available</p>
                  <p className="mt-1 text-xs text-blue-500">Create your first card in this column.</p>
                </div>
              )}
            </div>
          </SortableContext>
        </div>

        <div className="px-1 pt-3">
          <button
            type="button"
            onClick={openCreateTask}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-3 py-3 text-sm font-medium text-blue-700 transition hover:border-blue-200 hover:bg-blue-100 active:scale-[0.99]"
          >
            <Plus className="h-4 w-4" />
            Add Card
          </button>
        </div>
      </div>

      <Modal
        open={modalMode !== null}
        title={modalMode === 'create-task' ? 'Create Card' : 'Rename Column'}
        description={
          modalMode === 'create-task'
            ? `Add a new card to ${column.name}.`
            : 'Update the title shown at the top of this column.'
        }
        onClose={closeModal}
        footer={
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={closeModal}
              className="rounded-2xl border border-blue-100 px-4 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              form={`column-form-${column.id}`}
              disabled={saving}
              className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Saving...' : modalMode === 'create-task' ? 'Create Card' : 'Save Changes'}
            </button>
          </div>
        }
      >
        <form id={`column-form-${column.id}`} onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-blue-900">
              {modalMode === 'create-task' ? 'Card title' : 'Column name'}
            </label>
            <input
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              className="w-full rounded-2xl border border-blue-200 px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              placeholder={modalMode === 'create-task' ? 'e.g. Finalize onboarding copy' : 'e.g. In Review'}
            />
            {error ? <p className="text-sm text-blue-700">{error}</p> : null}
          </div>
        </form>
      </Modal>

      <Modal
        open={confirmDelete}
        title="Delete Column"
        description="Deleting a column will also remove its cards."
        onClose={() => {
          if (!saving) {
            setConfirmDelete(false);
          }
        }}
        size="sm"
        footer={
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="rounded-2xl border border-blue-100 px-4 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteColumn}
              disabled={saving}
              className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Deleting...' : 'Delete Column'}
            </button>
          </div>
        }
      >
        <p className="text-sm leading-6 text-blue-800/80">
          This action removes <span className="font-semibold">{column.name}</span> for everyone in the branch.
        </p>
      </Modal>
    </>
  );
}
