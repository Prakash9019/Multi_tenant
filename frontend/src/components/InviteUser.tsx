import { useState, type FormEvent } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store/store';
import apiClient from '../api/client';
import Modal from './ui/Modal';
import { useToast } from './ui/ToastProvider';
import { getApiErrorMessage } from '../utils/api';

interface InviteUserProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function InviteUser({ isOpen, onClose }: InviteUserProps) {
  const { activeTenant } = useSelector((state: RootState) => state.kanban);
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('MEMBER');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const resetForm = () => {
    setEmail('');
    setRole('MEMBER');
    setError('');
  };

  const handleClose = () => {
    if (loading) return;
    resetForm();
    onClose();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!activeTenant) {
      setError('Select a branch before inviting users.');
      return;
    }

    if (!email.trim()) {
      setError('Email is required.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await apiClient.post('/organizations/invite', {
        email: email.trim(),
        role,
      });
      showToast({
        title: 'Invitation sent',
        description: `${email.trim()} can now join ${activeTenant.name}.`,
        tone: 'success',
      });
      resetForm();
      onClose();
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Failed to send invitation'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      title="Invite User"
      description="Invite a teammate to the current branch."
      onClose={handleClose}
      footer={
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-2xl border border-blue-100 px-4 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="invite-user-form"
            disabled={loading}
            className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Sending...' : 'Send Invitation'}
          </button>
        </div>
      }
    >
      <form id="invite-user-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-blue-900">Email address</label>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-2xl border border-blue-200 px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            placeholder="user@example.com"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-blue-900">Access level</label>
          <select
            value={role}
            onChange={(event) => setRole(event.target.value)}
            className="w-full rounded-2xl border border-blue-200 px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          >
            <option value="MEMBER">Member</option>
            <option value="TENANT_ADMIN">Admin</option>
          </select>
        </div>

        {error ? <p className="text-sm text-blue-700">{error}</p> : null}
      </form>
    </Modal>
  );
}
