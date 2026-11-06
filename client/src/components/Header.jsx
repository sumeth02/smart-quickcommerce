import { useState, useEffect } from 'react';
import AuthModal from './AuthModal';
import './Header.css'; // Assuming you have a CSS file

export default function Header() {
  const [showAuth, setShowAuth] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('customer');
    if (storedUser) setUser(JSON.parse(storedUser));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('customer');
    setUser(null);
  };

  return (
    <header className="app-header">
      <div className="logo">
        <h1>Smart QuickCommerce</h1>
      </div>
      
      <div className="header-actions">
        {user ? (
          <div className="user-menu">
            <span>Welcome, {user.name}</span>
            <button onClick={handleLogout} className="logout-btn">Log out</button>
          </div>
        ) : (
          <button onClick={() => setShowAuth(true)} className="login-btn">Log in</button>
        )}
        
        {/* Placeholder for cart icon/button */}
        <button className="cart-btn">Cart</button>
      </div>

      {showAuth && (
        <AuthModal 
          onClose={() => setShowAuth(false)} 
          onLoginSuccess={setUser} 
        />
      )}
    </header>
  );
}