import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSelector from '../components/LanguageSelector';
import { authService } from '../services/api';

export default function LoginPage({ setUser, setIsAdmin }: { setUser: (user: any) => void; setIsAdmin?: (isAdmin: boolean) => void }) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.email || !formData.password) {
      setError('Please enter email and password');
      return;
    }

    try {
      const resp = await authService.login(formData.email, formData.password);
      const data = resp.data || resp;
      if (!data.success && !data.token) {
        throw new Error(data.error || 'Login failed');
      }
      const token = data.token;
      const userData = data.user;
      localStorage.setItem('auth_token', token);
      localStorage.setItem('user_data', JSON.stringify(userData));
      setUser(userData);
      
      // Redirect based on role
      const role = (userData.role || 'citizen').toLowerCase();
      const isAdminRole = role !== 'citizen';
      if (setIsAdmin) {
        setIsAdmin(isAdminRole);
      }
      
      if (isAdminRole) {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      console.error('Error details:', {
        code: err.code,
        message: err.message,
        response: err.response?.data,
        config: err.config
      });
      
      let errorMsg = 'Login failed. Please try again.';
      
      if (err.code === 'ERR_NETWORK' || err.message?.includes('Network Error') || err.message?.includes('Failed to fetch')) {
        errorMsg = 'Cannot connect to backend server. Please ensure:\n1. Backend server is running on http://localhost:3000\n2. No firewall is blocking the connection\n3. Check browser console for details';
      } else if (err.response?.status === 401) {
        errorMsg = err.response.data?.error || 'Invalid email or password';
      } else if (err.response?.data?.error) {
        errorMsg = err.response.data.error;
      } else if (err.message) {
        errorMsg = err.message;
      }
      
      setError(errorMsg);
    }
  };

  return (
    <div className="min-h-screen bg-gray-light flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="card">
          <div className="text-center mb-8">
            <div className="flex justify-end mb-2">
              <LanguageSelector compact={true} showLabel={false} />
            </div>
            <div className="w-16 h-16 bg-primary-navy rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-2xl">V</span>
            </div>
            <h1 className="text-2xl font-heading font-bold text-gray-800">{t('login')}</h1>
            <p className="text-gray-600 mt-2">Access your voter dashboard</p>
          </div>

          {error && (
            <div className="bg-danger/10 border border-danger text-danger px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                className="input-field"
                placeholder="your.email@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                className="input-field"
                placeholder="Enter your password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
            </div>

            <button type="submit" className="btn-primary w-full">
              {t('login')}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600">
            <p>Login requires a registered email. Use a seeded admin account if available.</p>
          </div>

          <div className="mt-6 text-center">
            <Link to="/" className="text-primary-royal hover:underline">
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

