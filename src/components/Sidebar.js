import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const NAV_ITEMS = [
  { icon: '⊞', label: 'Dashboard',     path: '/dashboard' },
  { icon: '📅', label: 'Attendance',    path: '/attendance' },
  { icon: '🎥', label: 'Classes',       path: '/courses' },
  { icon: '📚', label: 'My Course',     path: '/my-course' },
  { icon: '📝', label: 'Assignments',   path: '/assignments' },
  { icon: '🔔', label: 'Notifications', path: '/notifications' },
  { icon: '📊', label: 'Analytics',     path: '/analytics' },
  { icon: '🏆', label: 'Leaderboard',  path: '/leaderboard' },
  { icon: '💬', label: 'Group Chat',    path: '/chat' },
  { icon: '📅', label: 'Weekly Report', path: '/weekly-report' },
  { icon: '👤', label: 'Profile',       path: '/profile' },
];

// Bottom nav items (most important for mobile)
const BOTTOM_NAV = [
  { icon: '⊞', label: 'Home',    path: '/dashboard' },
  { icon: '📅', label: 'Attend', path: '/attendance' },
  { icon: '📝', label: 'Tasks',  path: '/assignments' },
  { icon: '📊', label: 'Stats',  path: '/analytics' },
  { icon: '👤', label: 'Me',     path: '/profile' },
];

export default function Sidebar({ activePath, courseId }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { theme } = useTheme();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close menu on route change
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  const currentPath = activePath || location.pathname;

  const resolvedNav = NAV_ITEMS.map(item => {
    if (item.path === '/chat') {
      return { ...item, path: courseId ? `/chat/${courseId}` : '/courses' };
    }
    if (item.path === '/assignments') {
      const today = new Date().toISOString().split('T')[0];
      return { ...item, path: `/assignment/${today}` };
    }
    return item;
  });

  const sidebarStyle = {
    width: 220,
    background: theme.sidebarBg,
    borderRight: `1px solid ${theme.border}`,
    display: 'flex',
    flexDirection: 'column',
    padding: '24px 0',
    position: 'sticky',
    top: 0,
    height: '100vh',
    overflowY: 'auto',
    flexShrink: 0,
    zIndex: 100,
  };

  const navButtonStyle = (isActive) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 14px',
    borderRadius: 10,
    border: 'none',
    background: isActive ? theme.navActiveBg : 'transparent',
    color: isActive ? theme.navActiveColor : theme.navInactiveColor,
    fontSize: 13.5,
    fontWeight: 500,
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.2s',
    width: '100%',
  });

  // ── MOBILE: hamburger + slide-in drawer + bottom nav ──
  if (isMobile) {
    return (
      <>
        {/* Hamburger button */}
        <button
          onClick={() => setMenuOpen(o => !o)}
          style={{
            position: 'fixed',
            top: 10,
            left: 12,
            zIndex: 1200,
            background: theme.sidebarBg,
            border: `1px solid ${theme.border}`,
            borderRadius: 8,
            width: 38,
            height: 38,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 5,
            cursor: 'pointer',
            padding: 0,
          }}
          aria-label="Menu"
        >
          {menuOpen ? (
            <span style={{ fontSize: 18, color: theme.textPrimary, lineHeight: 1 }}>✕</span>
          ) : (
            <>
              <span style={{ display: 'block', width: 18, height: 2, background: theme.textPrimary, borderRadius: 2 }} />
              <span style={{ display: 'block', width: 18, height: 2, background: theme.textPrimary, borderRadius: 2 }} />
              <span style={{ display: 'block', width: 18, height: 2, background: theme.textPrimary, borderRadius: 2 }} />
            </>
          )}
        </button>

        {/* Overlay */}
        {menuOpen && (
          <div
            onClick={() => setMenuOpen(false)}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(0,0,0,0.5)',
              zIndex: 1100,
            }}
          />
        )}

        {/* Slide-in drawer */}
        <div style={{
          position: 'fixed',
          top: 0, left: 0, bottom: 0,
          width: 240,
          background: theme.sidebarBg,
          borderRight: `1px solid ${theme.border}`,
          zIndex: 1150,
          transform: menuOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.25s ease',
          display: 'flex',
          flexDirection: 'column',
          padding: '16px 0',
          overflowY: 'auto',
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 20px 24px' }}>
            <div style={{ width: 34, height: 34, background: 'linear-gradient(135deg, #00d4aa, #7c6af5)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>⚡</div>
            <span style={{ fontSize: 18, fontWeight: 700, color: theme.textPrimary }}>CodeMedha</span>
          </div>

          {/* Nav */}
          <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, padding: '0 10px' }}>
            {resolvedNav.map(item => {
              const isActive = currentPath === item.path || location.pathname === item.path;
              return (
                <button
                  key={item.label}
                  style={navButtonStyle(isActive)}
                  onClick={() => navigate(item.path)}
                >
                  <span style={{ fontSize: 16, width: 20, textAlign: 'center' }}>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* User */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 20px', borderTop: `1px solid ${theme.border}`, marginTop: 'auto' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #00d4aa, #7c6af5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, flexShrink: 0, color: '#fff' }}>
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: theme.textPrimary }}>{user?.name || 'Student'}</div>
              <div style={{ fontSize: 11, color: theme.textMuted, marginTop: 2 }}>MERN Stack Developer</div>
            </div>
          </div>
        </div>

        {/* Bottom Navigation Bar */}
        <div style={{
          position: 'fixed',
          bottom: 0, left: 0, right: 0,
          height: 60,
          background: theme.sidebarBg,
          borderTop: `1px solid ${theme.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          zIndex: 1000,
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}>
          {BOTTOM_NAV.map(item => {
            const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
            return (
              <button
                key={item.label}
                onClick={() => navigate(item.path)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 3,
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  padding: '6px 12px',
                  borderRadius: 8,
                  flex: 1,
                }}
              >
                <span style={{ fontSize: 20 }}>{item.icon}</span>
                <span style={{ fontSize: 10, fontWeight: 600, color: isActive ? theme.navActiveColor : theme.textMuted }}>
                  {item.label}
                </span>
                {isActive && (
                  <div style={{ width: 4, height: 4, borderRadius: '50%', background: theme.navActiveColor, marginTop: -2 }} />
                )}
              </button>
            );
          })}
        </div>
      </>
    );
  }

  // ── DESKTOP: normal sidebar ──
  return (
    <aside style={sidebarStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 20px 28px' }}>
        <div style={{ width: 34, height: 34, background: 'linear-gradient(135deg, #00d4aa, #7c6af5)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>⚡</div>
        <span style={{ fontSize: 18, fontWeight: 700, color: theme.textPrimary }}>CodeMedha</span>
      </div>

      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, padding: '0 10px' }}>
        {resolvedNav.map(item => {
          const isActive = currentPath === item.path || location.pathname === item.path;
          return (
            <button
              key={item.label}
              style={navButtonStyle(isActive)}
              onClick={() => navigate(item.path)}
            >
              <span style={{ fontSize: 16, width: 20, textAlign: 'center' }}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '20px', borderTop: `1px solid ${theme.border}`, marginTop: 'auto' }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #00d4aa, #7c6af5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, flexShrink: 0, color: '#fff' }}>
          {user?.name?.charAt(0)?.toUpperCase() || 'U'}
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: theme.textPrimary }}>{user?.name || 'Student'}</div>
          <div style={{ fontSize: 11, color: theme.textMuted, marginTop: 2 }}>MERN Stack Developer</div>
        </div>
      </div>
    </aside>
  );
}
