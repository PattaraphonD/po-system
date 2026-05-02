import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/api';
import { ShoppingCart, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      toast.error(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = (role: string) => {
    const accounts: Record<string, [string, string]> = {
      buyer:    ['waraporn@microchip.co.th',   'demo'],
      approver: ['manager@microchip.co.th',     'demo'],
      admin:    ['admin@microchip.co.th',        'demo'],
    };
    const [e, p] = accounts[role];
    setEmail(e); setPassword(p);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto mb-4">
            <ShoppingCart size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">PO System</h1>
          <p className="text-sm text-gray-500 mt-1">Microchip Technology Thailand</p>
        </div>

        {/* Demo accounts */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <p className="text-xs font-medium text-amber-700 mb-2">Demo Accounts (any password)</p>
          <div className="flex gap-2 flex-wrap">
            {['buyer', 'approver', 'admin'].map(role => (
              <button key={role} onClick={() => quickLogin(role)}
                className="px-3 py-1 bg-white border border-amber-200 rounded-lg text-xs text-amber-700 hover:bg-amber-50 capitalize font-medium">
                {role}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={email}
              onChange={e => setEmail(e.target.value)} placeholder="your@email.com" required />
          </div>
          <div>
            <label className="label">Password</label>
            <div className="relative">
              <input className="input pr-10" type={showPw ? 'text' : 'password'}
                value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" required />
              <button type="button" onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <button type="submit" className="btn-primary w-full justify-center py-2.5" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
