import { useState } from 'react';
import api from '../api';

export default function AuthModal({ onClose, onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const res = isLogin 
        ? await api.login(formData.email, formData.password)
        : await api.register(formData);

      localStorage.setItem('token', res.token);
      localStorage.setItem('customer', JSON.stringify(res.customer));
      onLoginSuccess(res.customer);
      onClose();
    } catch (err) {
      setError(err.message || 'Authentication failed');
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-tabs">
          <button onClick={() => setIsLogin(true)} className={isLogin ? 'active' : ''}>Login</button>
          <button onClick={() => setIsLogin(false)} className={!isLogin ? 'active' : ''}>Register</button>
        </div>

        {error && <p className="error">{error}</p>}

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <input 
              type="text" 
              placeholder="Name"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              required 
            />
          )}
          <input 
            type="email" 
            placeholder="Email"
            value={formData.email}
            onChange={e => setFormData({ ...formData, email: e.target.value })}
            required 
          />
          <input 
            type="password" 
            placeholder="Password"
            value={formData.password}
            onChange={e => setFormData({ ...formData, password: e.target.value })}
            required 
          />
          <button type="submit">{isLogin ? 'Log In' : 'Sign Up'}</button>
          <button type="button" onClick={onClose}>Cancel</button>
        </form>
      </div>
    </div>
  );
}