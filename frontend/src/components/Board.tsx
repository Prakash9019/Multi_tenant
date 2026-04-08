import { useDeferredValue, useEffect, useState, type FormEvent } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  DndContext,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { Loader2, Pencil, Plus, Save, SearchX, Trash2, Undo2 } from 'lucide-react';
import type { AppDispatch, RootState } from '../store/store';
import { fetchBoards, fetchMyTenants, moveTask, undoLastAction } from '../store/kanbanThunks';
import { setCurrentBoard } from '../store/kanbanSlice';
import type { Board as BoardType, Task } from '../types';
import apiClient from '../api/client';
import EmptyDashboard from './EmptyDashboard';
import TenantSelector from './TenantSelector';
import Column from './Column';
import Modal from './ui/Modal';
import { useToast } from './ui/ToastProvider';
import { getApiErrorMessage } from '../utils/api';
import { isAdminRole } from '../utils/roles';
import { useKanbanSocket } from '../hooks/useKanbanSocket';

type BoardModalMode = 'create-board' | 'rename-board' | 'create-column' | null;
type DeleteTarget = 'board' | 'task' | null;

interface TaskDraft {
  title: string;
  description: string;
}

const emptyTaskDraft: TaskDraft = {
  title: '',
  description: '',
};

const findTaskById = (board: BoardType | null, taskId: string | null) => {
  if (!board || !taskId) return null;

  for (const column of board.columns) {
    const task = column.tasks.find((item) => item.id === taskId);
    if (task) return task;
  }

  return null;
};

export default function Board() {
  const dispatch = useDispatch<AppDispatch>();
  const { showToast } = useToast();
  const { tenants, activeTenant, boards, currentBoard, memberships, loading, error, searchQuery } = useSelector(
    (state: RootState) => state.kanban
  );

  useKanbanSocket();

  const currentMembership = memberships.find((membership) => membership.tenant.id === activeTenant?.id);
  const currentRole = currentMembership?.role;
  const canDeleteItems = isAdminRole(currentRole);
  const deferredSearchQuery = useDeferredValue(searchQuery.trim().toLowerCase());

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const [boardModalMode, setBoardModalMode] = useState<BoardModalMode>(null);
  const [boardFieldValue, setBoardFieldValue] = useState('');
  const [boardModalError, setBoardModalError] = useState('');
  const [boardSaving, setBoardSaving] = useState(false);

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [taskDraft, setTaskDraft] = useState<TaskDraft>(emptyTaskDraft);
  const [taskError, setTaskError] = useState('');
  const [taskSaving, setTaskSaving] = useState(false);
  const [taskDeleting, setTaskDeleting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);

  const selectedTask = findTaskById(currentBoard, selectedTaskId);

  useEffect(() => {
    if (!tenants.length && !loading) {
      dispatch(fetchMyTenants());
    }
  }, [dispatch, loading, tenants.length]);

  useEffect(() => {
    if (activeTenant?.id) {
      dispatch(fetchBoards());
    }
  }, [activeTenant?.id, dispatch]);

  useEffect(() => {
    if (selectedTaskId && !findTaskById(currentBoard, selectedTaskId)) {
      setSelectedTaskId(null);
      setTaskDraft(emptyTaskDraft);
      setTaskError('');
    }
  }, [currentBoard, selectedTaskId]);

  const visibleBoard = currentBoard
    ? {
        ...currentBoard,
        columns: currentBoard.columns.map((column) => ({
          ...column,
          tasks:
            deferredSearchQuery.length > 0
              ? column.tasks.filter((task) => {
                  const haystack = `${task.title} ${task.description ?? ''}`.toLowerCase();
                  return haystack.includes(deferredSearchQuery);
                })
              : column.tasks,
        })),
      }
    : null;

  const hasSearchResults =
    !deferredSearchQuery ||
    Boolean(visibleBoard?.columns.some((column) => {
      return column.tasks.length > 0;
    }));

  const openBoardModal = (mode: BoardModalMode) => {
    setBoardModalMode(mode);
    setBoardModalError('');

    if (mode === 'rename-board') {
      setBoardFieldValue(currentBoard?.name ?? '');
      return;
    }

    setBoardFieldValue('');
  };

  const resetBoardModal = () => {
    setBoardModalMode(null);
    setBoardFieldValue('');
    setBoardModalError('');
  };

  const closeBoardModal = () => {
    if (boardSaving) return;
    resetBoardModal();
  };

  const handleBoardSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!boardFieldValue.trim()) {
      setBoardModalError(
        boardModalMode === 'create-column' ? 'Column name is required.' : 'Board name is required.'
      );
      return;
    }

    try {
      setBoardSaving(true);
      setBoardModalError('');

      if (boardModalMode === 'create-board') {
        const response = await apiClient.post('/boards', { name: boardFieldValue.trim() });
        await dispatch(fetchBoards()).unwrap();
        if (response.data?.id) {
          dispatch(setCurrentBoard(response.data.id));
        }
        showToast({
          title: 'Board created',
          description: 'Your new board is ready.',
          tone: 'success',
        });
      }

      if (boardModalMode === 'rename-board' && currentBoard) {
        await apiClient.put(`/boards/${currentBoard.id}`, { name: boardFieldValue.trim() });
        await dispatch(fetchBoards()).unwrap();
        showToast({
          title: 'Board updated',
          description: 'Board name saved successfully.',
          tone: 'success',
        });
      }

      if (boardModalMode === 'create-column' && currentBoard) {
        await apiClient.post('/columns', {
          name: boardFieldValue.trim(),
          boardId: currentBoard.id,
          position: currentBoard.columns.length + 1,
        });
        await dispatch(fetchBoards()).unwrap();
        showToast({
          title: 'Column created',
          description: 'The column has been added to this board.',
          tone: 'success',
        });
      }

      resetBoardModal();
    } catch (requestError) {
      setBoardModalError(
        getApiErrorMessage(
          requestError,
          boardModalMode === 'create-column' ? 'Failed to create column' : 'Failed to save board'
        )
      );
    } finally {
      setBoardSaving(false);
    }
  };

  const openTaskModal = (task: Task) => {
    setSelectedTaskId(task.id);
    setTaskDraft({
      title: task.title,
      description: task.description ?? '',
    });
    setTaskError('');
  };

  const resetTaskModal = () => {
    setSelectedTaskId(null);
    setTaskDraft(emptyTaskDraft);
    setTaskError('');
  };

  const closeTaskModal = () => {
    if (taskSaving || taskDeleting) return;
    resetTaskModal();
  };

  const handleTaskSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedTask) return;

    if (!taskDraft.title.trim()) {
      setTaskError('Task title is required.');
      return;
    }

    try {
      setTaskSaving(true);
      setTaskError('');

      await apiClient.put(`/tasks/${selectedTask.id}`, {
        title: taskDraft.title.trim(),
        description: taskDraft.description.trim(),
        columnId: selectedTask.columnId,
        position: selectedTask.position,
        version: selectedTask.version,
      });

      await dispatch(fetchBoards()).unwrap();
      showToast({
        title: 'Card updated',
        description: 'Your changes have been saved.',
        tone: 'success',
      });
      resetTaskModal();
    } catch (requestError) {
      setTaskError(getApiErrorMessage(requestError, 'Failed to update card'));
    } finally {
      setTaskSaving(false);
    }
  };

  const handleTaskDelete = async () => {
    if (!selectedTask) return;

    try {
      setTaskDeleting(true);
      await apiClient.delete(`/tasks/${selectedTask.id}`);
      await dispatch(fetchBoards()).unwrap();
      setDeleteTarget(null);
      showToast({
        title: 'Card deleted',
        description: 'The card has been removed from this board.',
        tone: 'success',
      });
      resetTaskModal();
    } catch (requestError) {
      showToast({
        title: 'Unable to delete card',
        description: getApiErrorMessage(requestError, 'Failed to delete card'),
        tone: 'error',
      });
    } finally {
      setTaskDeleting(false);
    }
  };

  const handleBoardDelete = async () => {
    if (!currentBoard) return;

    try {
      setBoardSaving(true);
      await apiClient.delete(`/boards/${currentBoard.id}`);
      setDeleteTarget(null);
      await dispatch(fetchBoards()).unwrap();
      showToast({
        title: 'Board deleted',
        description: 'The board has been removed.',
        tone: 'success',
      });
    } catch (requestError) {
      showToast({
        title: 'Unable to delete board',
        description: getApiErrorMessage(requestError, 'Failed to delete board'),
        tone: 'error',
      });
    } finally {
      setBoardSaving(false);
    }
  };

  const handleUndo = async () => {
    try {
      await dispatch(undoLastAction()).unwrap();
      await dispatch(fetchBoards()).unwrap();
      showToast({
        title: 'Undo completed',
        description: 'Your latest action was reversed.',
        tone: 'success',
      });
    } catch (requestError) {
      showToast({
        title: 'Unable to undo',
        description: getApiErrorMessage(requestError, 'Failed to undo the last action'),
        tone: 'error',
      });
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || !currentBoard) return;
    if (active.id === over.id) return;

    const task = active.data.current?.task as Task | undefined;
    if (!task) return;

    const overTask = over.data.current?.task as Task | undefined;
    const overColumn = over.data.current?.column as { id: string; tasks?: Task[] } | undefined;
    const destinationColumnId = overTask?.columnId || overColumn?.id;

    if (!destinationColumnId) return;

    const destinationColumn = currentBoard.columns.find((column) => column.id === destinationColumnId);
    if (!destinationColumn) return;

    let newPosition = destinationColumn.tasks.length + 1;

    if (overTask) {
      newPosition = overTask.position;
    }

    try {
      await dispatch(
        moveTask({
          taskId: task.id,
          newColumnId: destinationColumnId,
          newPosition,
          version: task.version,
        })
      ).unwrap();

      await dispatch(fetchBoards()).unwrap();
    } catch (requestError) {
      showToast({
        title: 'Board updated elsewhere',
        description: getApiErrorMessage(
          requestError,
          'We refreshed the board because another user changed this card.'
        ),
        tone: 'info',
      });
      dispatch(fetchBoards());
    }
  };

  if (loading && !tenants.length) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="flex items-center gap-3 rounded-3xl border border-blue-100 bg-white px-5 py-4 text-blue-700 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading your workspace...
        </div>
      </div>
    );
  }

  if (!tenants.length) {
    return <EmptyDashboard />;
  }

  if (!activeTenant) {
    return <TenantSelector />;
  }

  if (loading && !boards.length) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
        <div className="flex items-center gap-3 rounded-3xl border border-blue-100 bg-white px-5 py-4 text-blue-700 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading board data...
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-[1600px] flex-col px-4 py-6 sm:px-6">
        <div className="rounded-[32px] border border-blue-100 bg-white/85 p-4 shadow-sm backdrop-blur sm:p-6">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-blue-600">{activeTenant.name}</p>
                  <h1 className="text-2xl font-semibold text-blue-950 sm:text-3xl">
                    {currentBoard?.name || 'Boards'}
                  </h1>
                  <p className="mt-1 text-sm text-blue-700/70">
                    Manage work across columns with real-time updates for your team.
                  </p>
                </div>

                {boards.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {boards.map((board) => {
                      const isActive = board.id === currentBoard?.id;
                      return (
                        <button
                          key={board.id}
                          type="button"
                          onClick={() => dispatch(setCurrentBoard(board.id))}
                          className={`rounded-2xl border px-4 py-2 text-sm font-medium transition ${
                            isActive
                              ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                              : 'border-blue-100 bg-blue-50 text-blue-700 hover:border-blue-200 hover:bg-blue-100'
                          }`}
                        >
                          {board.name}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => openBoardModal('create-board')}
                  className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.98]"
                >
                  <Plus className="h-4 w-4" />
                  New Board
                </button>

                {currentBoard ? (
                  <>
                    <button
                      type="button"
                      onClick={() => openBoardModal('create-column')}
                      className="inline-flex items-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-2.5 text-sm font-medium text-blue-700 transition hover:border-blue-200 hover:bg-blue-100 active:scale-[0.98]"
                    >
                      <Plus className="h-4 w-4" />
                      Add Column
                    </button>

                    <button
                      type="button"
                      onClick={() => openBoardModal('rename-board')}
                      className="inline-flex items-center gap-2 rounded-2xl border border-blue-100 bg-white px-4 py-2.5 text-sm font-medium text-blue-700 transition hover:border-blue-200 hover:bg-blue-50 active:scale-[0.98]"
                    >
                      <Pencil className="h-4 w-4" />
                      Rename Board
                    </button>

                    {canDeleteItems ? (
                      <button
                        type="button"
                        onClick={() => setDeleteTarget('board')}
                        className="inline-flex items-center gap-2 rounded-2xl border border-blue-100 bg-white px-4 py-2.5 text-sm font-medium text-blue-700 transition hover:border-blue-200 hover:bg-blue-50 active:scale-[0.98]"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete Board
                      </button>
                    ) : null}

                    <button
                      type="button"
                      onClick={handleUndo}
                      className="inline-flex items-center gap-2 rounded-2xl border border-blue-100 bg-white px-4 py-2.5 text-sm font-medium text-blue-700 transition hover:border-blue-200 hover:bg-blue-50 active:scale-[0.98]"
                    >
                      <Undo2 className="h-4 w-4" />
                      Undo
                    </button>
                  </>
                ) : null}
              </div>
            </div>

            {error ? (
              <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                {error}
              </div>
            ) : null}

            {!currentBoard ? (
              <div className="flex min-h-[360px] items-center justify-center rounded-[28px] border border-dashed border-blue-200 bg-blue-50/60 px-6 py-12 text-center">
                <div className="max-w-md space-y-3">
                  <h2 className="text-xl font-semibold text-blue-950">No boards available</h2>
                  <p className="text-sm leading-6 text-blue-700/75">
                    Create your first board to start organizing columns and cards for this branch.
                  </p>
                  <button
                    type="button"
                    onClick={() => openBoardModal('create-board')}
                    className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 active:scale-[0.98]"
                  >
                    <Plus className="h-4 w-4" />
                    Create Board
                  </button>
                </div>
              </div>
            ) : (
              <>
                {deferredSearchQuery && !hasSearchResults ? (
                  <div className="flex items-center gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                    <SearchX className="h-4 w-4 shrink-0" />
                    No cards match "{searchQuery}" in this board.
                  </div>
                ) : null}

                <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
                  <div className="minimal-scrollbar flex gap-4 overflow-x-auto pb-2">
                    {visibleBoard?.columns.map((column) => (
                      <Column
                        key={column.id}
                        column={column}
                        canDelete={canDeleteItems}
                        onRefresh={() => {
                          dispatch(fetchBoards());
                        }}
                        onTaskClick={openTaskModal}
                      />
                    ))}
                  </div>
                </DndContext>
              </>
            )}
          </div>
        </div>
      </div>

      <Modal
        open={boardModalMode !== null}
        title={
          boardModalMode === 'create-board'
            ? 'Create Board'
            : boardModalMode === 'rename-board'
              ? 'Rename Board'
              : 'Create Column'
        }
        description={
          boardModalMode === 'create-board'
            ? 'Add a new board for this branch.'
            : boardModalMode === 'rename-board'
              ? 'Update the board title shown to your team.'
              : 'Add a new column to the current board.'
        }
        onClose={closeBoardModal}
        footer={
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={closeBoardModal}
              className="rounded-2xl border border-blue-100 px-4 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="board-modal-form"
              disabled={boardSaving}
              className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {boardSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {boardModalMode === 'rename-board' ? 'Save Changes' : 'Continue'}
            </button>
          </div>
        }
      >
        <form id="board-modal-form" onSubmit={handleBoardSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-blue-900">
              {boardModalMode === 'create-column' ? 'Column name' : 'Board name'}
            </label>
            <input
              value={boardFieldValue}
              onChange={(event) => setBoardFieldValue(event.target.value)}
              className="w-full rounded-2xl border border-blue-200 px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              placeholder={boardModalMode === 'create-column' ? 'e.g. Blocked' : 'e.g. Product Roadmap'}
            />
            {boardModalError ? <p className="text-sm text-blue-700">{boardModalError}</p> : null}
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(selectedTask)}
        title="Card Details"
        description="Review and edit the selected card."
        onClose={closeTaskModal}
        size="lg"
        footer={
          <div className="flex items-center justify-between gap-3">
            <div>
              {canDeleteItems ? (
                <button
                  type="button"
                  onClick={() => setDeleteTarget('task')}
                  className="inline-flex items-center gap-2 rounded-2xl border border-blue-100 px-4 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Card
                </button>
              ) : null}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={closeTaskModal}
                className="rounded-2xl border border-blue-100 px-4 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="task-edit-form"
                disabled={taskSaving}
                className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {taskSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Card
              </button>
            </div>
          </div>
        }
      >
        <form id="task-edit-form" onSubmit={handleTaskSave} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-blue-900">Title</label>
            <input
              value={taskDraft.title}
              onChange={(event) => setTaskDraft((current) => ({ ...current, title: event.target.value }))}
              className="w-full rounded-2xl border border-blue-200 px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              placeholder="Card title"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-blue-900">Description</label>
            <textarea
              rows={6}
              value={taskDraft.description}
              onChange={(event) => setTaskDraft((current) => ({ ...current, description: event.target.value }))}
              className="w-full rounded-2xl border border-blue-200 px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              placeholder="Add more context for this card"
            />
          </div>

          {selectedTask ? (
            <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
              Version {selectedTask.version} in column {currentBoard?.columns.find((column) => column.id === selectedTask.columnId)?.name}
            </div>
          ) : null}

          {taskError ? <p className="text-sm text-blue-700">{taskError}</p> : null}
        </form>
      </Modal>

      <Modal
        open={deleteTarget !== null}
        title={deleteTarget === 'board' ? 'Delete Board' : 'Delete Card'}
        description={
          deleteTarget === 'board'
            ? 'This board will be removed for everyone in the current branch.'
            : 'This card will be permanently removed from the board.'
        }
        onClose={() => {
          if (!boardSaving && !taskDeleting) {
            setDeleteTarget(null);
          }
        }}
        size="sm"
        footer={
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
              className="rounded-2xl border border-blue-100 px-4 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={deleteTarget === 'board' ? handleBoardDelete : handleTaskDelete}
              disabled={boardSaving || taskDeleting}
              className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {boardSaving || taskDeleting ? 'Deleting...' : deleteTarget === 'board' ? 'Delete Board' : 'Delete Card'}
            </button>
          </div>
        }
      >
        <p className="text-sm leading-6 text-blue-800/80">
          {deleteTarget === 'board'
            ? `This will remove ${currentBoard?.name ?? 'this board'} and its contents.`
            : `This will remove ${selectedTask?.title ?? 'this card'} from the board.`}
        </p>
      </Modal>
    </>
  );
}
