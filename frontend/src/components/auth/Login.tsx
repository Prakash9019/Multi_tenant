import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../store/store';
import { fetchMyTenants } from '../../store/kanbanThunks';
import apiClient from '../../api/client';
import { LayoutDashboard, Loader2 } from 'lucide-react';
import { useToast } from '../ui/ToastProvider';
import { getApiErrorMessage } from '../../utils/api';
import { clearStoredToken, setStoredToken } from '../../utils/auth';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { showToast } = useToast();

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data } = await apiClient.post('/auth/login', { email, password });
      setStoredToken(data.token);
      await dispatch(fetchMyTenants()).unwrap();
      showToast({
        title: 'Welcome back',
        description: 'You are signed in and ready to work.',
        tone: 'success',
      });
      navigate('/');
    } catch (err: any) {
      const message = getApiErrorMessage(err, 'Login failed. Check your credentials.');
      setError(message);
      clearStoredToken();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-[32px] border border-blue-100 bg-white p-8 shadow-xl shadow-blue-100/60">
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm">
            <LayoutDashboard className="h-6 w-6" />
          </div>
          <h1 className="mt-5 text-3xl font-semibold text-blue-950">Welcome back</h1>
          <p className="mt-2 text-sm text-blue-700/70">Sign in to continue collaborating with your team.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-blue-900">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-2xl border border-blue-200 px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              placeholder="you@example.com"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-blue-900">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-2xl border border-blue-200 px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              placeholder="Your password"
            />
          </div>

          {error ? <p className="text-sm text-blue-700">{error}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Sign In'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-blue-700/75">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="font-semibold text-blue-600 transition hover:text-blue-800">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
