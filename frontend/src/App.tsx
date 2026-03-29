import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Board from './components/Board';
import Login from './components/auth/Login';
import Register from './components/auth/Register'; // (Similar to Login)
import ProtectedRoute from './components/auth/ProtectedRoute';

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected Dashboard Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={
            <Layout>
              <Board />
            </Layout>
          } />
        </Route>
      </Routes>
    </Router>
  );
}