import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/student/login');
  };

  const roleColor = user?.role === 'admin' ? '#e74c3c' : user?.role === 'trainer' ? '#8e44ad' : '#2980b9';

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
      height: 56, background: '#0f0f1a',
      borderBottom: '1px solid #2a2a3e',
      display: 'flex', alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.3)'
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: 'linear-gradient(135deg, #00d4aa, #0099ff)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, fontWeight: 'bold', color: '#fff'
        }}>C</div>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: 18 }}>CodeMedha</span>
      </div>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: roleColor,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 700, fontSize: 14
            }}>
              {(user.name || user.email || 'U')[0].toUpperCase()}
            </div>
            <span style={{ color: '#94a3b8', fontSize: 14 }}>{user.name || user.email}</span>
          </div>
        )}
        <button onClick={handleLogout} style={{
          background: '#e74c3c', color: '#fff',
          border: 'none', borderRadius: 8,
          padding: '6px 16px', cursor: 'pointer',
          fontSize: 14, fontWeight: 600
        }}>Logout</button>
      </div>
    </div>
  );
}