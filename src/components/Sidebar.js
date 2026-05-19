import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const NAV_ITEMS = [
  { label: 'Dashboard',     path: '/dashboard' },
  { label: 'Attendance',    path: '/attendance' },
  { label: 'Classes',       path: '/courses' },
  { label: 'My Course',     path: '/my-course' },
  { label: 'Assignments',   path: '/assignments' },
  { label: 'Notifications', path: '/notifications' },
  { label: 'Analytics',     path: '/analytics' },
  { label: 'Leaderboard',   path: '/leaderboard' },
  { label: 'Group Chat',    path: '/chat' },
  { label: 'Weekly Report', path: '/weekly-report' },
  { label: 'Profile',       path: '/profile' },
];

const BOTTOM_NAV = [
  { label: 'Home',   path: '/dashboard' },
  { label: 'Attend', path: '/attendance' },
  { label: 'Tasks',  path: '/assignments' },
  { label: 'Stats',  path: '/analytics' },
  { label: 'Me',     path: '/profile' },
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

  const navBtn = (isActive) => ({
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

  if (isMobile) {
    return (
      <>
        <button
          onClick={() => setMenuOpen(o => !o)}
          style={{
            position: 'fixed', top: 10, left: 12, zIndex: 1200,
            background: theme.sidebarBg, border: `1px solid ${theme.border}`,
            borderRadius: 8, width: 38, height: 38,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 5, cursor: 'pointer', padding: 0,
          }}
        >
          <span style={{ display: 'block', width: 18, height: 2, background: theme.textPrimary, borderRadius: 2 }} />
          <span style={{ display: 'block', width: 18, height: 2, background: theme.textPrimary, borderRadius: 2 }} />
          <span style={{ display: 'block', width: 18, height: 2, background: theme.textPrimary, borderRadius: 2 }} />
        </button>

        {menuOpen && (
          <div
            onClick={() => setMenuOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1100 }}
          />
        )}

        <div style={{
          position: 'fixed', top: 0, left: 0, bottom: 0, width: 240,
          background: theme.sidebarBg, borderRight: `1px solid ${theme.border}`,
          zIndex: 1150,
          transform: menuOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.25s ease',
          display: 'flex', flexDirection: 'column',
          padding: '16px 0', overflowY: 'auto',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 20px 24px' }}>
            <div style={{ width: 34, height: 34, background: 'linear-gradient(135deg, #00d4aa, #7c6af5)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: '#fff', fontWeight: 700 }}>C</div>
            <span style={{ fontSize: 18, fontWeight: 700, color: theme.textPrimary }}>CodeMedha</span>
          </div>

          <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, padding: '0 10px' }}>
            {resolvedNav.map(item => {
              const isActive = currentPath === item.path || location.pathname === item.path;
              return (
                <button key={item.label} style={navBtn(isActive)} onClick={() => navigate(item.path)}>
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 20px', borderTop: `1px solid ${theme.border}`, marginTop: 'auto' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #00d4aa, #7c6af5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#fff' }}>
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: theme.textPrimary }}>{user?.name || 'Student'}</div>
              <div style={{ fontSize: 11, color: theme.textMuted }}>MERN Stack Developer</div>
            </div>
          </div>
        </div>

        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, height: 60,
          background: theme.sidebarBg, borderTop: `1px solid ${theme.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-around',
          zIndex: 1000,
        }}>
          {BOTTOM_NAV.map(item => {
            const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
            return (
              <button key={item.label} onClick={() => navigate(item.path)} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                border: 'none', background: 'transparent', cursor: 'pointer',
                padding: '6px 8px', flex: 1,
              }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: isActive ? theme.navActiveColor : theme.textMuted }}>{item.label}</span>
                {isActive && <div style={{ width: 4, height: 4, borderRadius: '50%', background: theme.navActiveColor }} />}
              </button>
            );
          })}
        </div>
      </>
    );
  }

  return (
    <aside style={{
      width: 220, background: theme.sidebarBg, borderRight: `1px solid ${theme.border}`,
      display: 'flex', flexDirection: 'column', padding: '24px 0',
      position: 'sticky', top: 0, height: '100vh', overflowY: 'auto', flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 20px 28px' }}>
        <div style={{ width: 34, height: 34, background: 'linear-gradient(135deg, #00d4aa, #7c6af5)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: '#fff', fontWeight: 700 }}>C</div>
        <span style={{ fontSize: 18, fontWeight: 700, color: theme.textPrimary }}>CodeMedha</span>
      </div>
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, padding: '0 10px' }}>
        {resolvedNav.map(item => {
          const isActive = currentPath === item.path || location.pathname === item.path;
          return (
            <button key={item.label} style={navBtn(isActive)} onClick={() => navigate(item.path)}>
              {item.label}
            </button>
          );
        })}
      </nav>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '20px', borderTop: `1px solid ${theme.border}`, marginTop: 'auto' }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #00d4aa, #7c6af5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#fff' }}>
          {user?.name?.charAt(0)?.toUpperCase() || 'U'}
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: theme.textPrimary }}>{user?.name || 'Student'}</div>
          <div style={{ fontSize: 11, color: theme.textMuted }}>MERN Stack Developer</div>
        </div>
      </div>
    </aside>
  );
}