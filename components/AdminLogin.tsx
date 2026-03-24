
import React, { useState } from 'react';
import { Button } from './ui/Button';
import { apiService } from '../services/apiService';

interface AdminLoginProps {
  onLoginSuccess: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const success = await apiService.login(password);
      if (success) {
        sessionStorage.setItem('isAdminAuthenticated', 'true');
        onLoginSuccess();
      } else {
        setError('Неверный пароль доступа');
      }
    } catch (err) {
      setError('Ошибка при авторизации. Попробуйте снова.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center py-20 px-4 animate-in fade-in zoom-in duration-300">
      <div className="bg-white rounded-3xl p-8 shadow-2xl border border-gray-100 max-w-sm w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">🔐</div>
          <h2 className="text-2xl font-black text-gray-800">Вход для админа</h2>
          <p className="text-gray-500 text-sm mt-2">Введите пароль для доступа к заказам</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">Пароль</label>
            <input 
              type="password" 
              className={`w-full p-4 bg-gray-50 border rounded-2xl outline-none focus:ring-2 ring-indigo-400 transition-all ${error ? 'border-red-400' : 'border-gray-200'}`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoFocus
            />
            {error && <p className="text-red-500 text-xs mt-2 ml-1 font-medium">{error}</p>}
          </div>

          <Button 
            variant="primary" 
            fullWidth 
            type="submit" 
            disabled={loading || !password}
          >
            {loading ? 'Проверка...' : 'Войти в панель'}
          </Button>

          <p className="text-center text-[10px] text-gray-400 uppercase tracking-widest">
            PrintMaster Pro Security
          </p>
        </form>
      </div>
    </div>
  );
};
