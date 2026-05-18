import React from 'react';
import { useNavigate } from 'react-router-dom';
import AttendanceCalendar from '../components/AttendanceCalendar';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function Attendance() {
  const { logout, user } = useAuth();
  const { isDark, toggleTheme, theme } = useTheme();
  const navigate = useNavigate();

  const todayDate = new Date().toISOString().split('T')[0];

  const navItems = [
    { icon: '⊞', label: 'Dashboard',     path: '/dashboard' },
    { icon: '📅', label: 'Attendance',    path: '/attendance',   active: true },
    { icon: '🎥', label: 'Classes',       path: '/courses' },
    { icon: '📚', label: 'My Course',     path: '/my-course' },
    { icon: '📝', label: 'Assignments',   path: `/assignment/${todayDate}` },
    { icon: '💬', label: 'Group Chat',    path: user?.enrolledCourse ? `/chat/${user.enrolledCourse}` : '/courses' },
    { icon: '🔔', label: 'Notifications', path: '/notifications' },
    { icon: '📊', label: 'Analytics',     path: '/analytics' },
    { icon: '🏆', label: 'Leaderboard',   path: '/leaderboard' },
    { icon: '👤', label: 'Profile',       path: '/profile' },
  ];

  return (
    <div style={{ ...styles.container, background: theme.pageBg, color: theme.textPrimary }}>

      {/* ── Sidebar ── */}
      <aside style={{ ...styles.sidebar, background: theme.sidebarBg, borderRight: `1px solid ${theme.border}` }}>
        <div style={styles.sidebarLogo}>
          <div style={styles.logoIcon}>⚡</div>
          <span style={{ ...styles.logoText, color: theme.textPrimary }}>LMS Pro</span>
        </div>

        <nav style={styles.nav}>
          {navItems.map(item => (
            <button
              key={item.label}
              style={{
                ...styles.navItem,
                color: item.active ? theme.navActiveColor : theme.navInactiveColor,
                background: item.active ? theme.navActiveBg : 'transparent',
              }}
              onClick={() => item.path && navigate(item.path)}
            >
              <span style={styles.navIcon}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div style={{ ...styles.sidebarUser, borderTop: `1px solid ${theme.border}` }}>
          <div style={styles.userAvatar}>
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div>
            <div style={{ ...styles.userName, color: theme.textSecondary }}>{user?.name || 'Student'}</div>
            <div style={{ ...styles.userRole, color: theme.textMuted }}>MERN Stack Developer</div>
          </div>
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          style={{
            margin: '0 16px 16px',
            padding: '8px 12px',
            borderRadius: 10,
            border: `1px solid ${theme.border}`,
            background: theme.toggleBg,
            color: theme.toggleColor,
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {isDark ? '☀️ Light Mode' : '🌙 Dark Mode'}
        </button>
      </aside>

      {/* ── Main ── */}
      <div style={{ ...styles.main, background: theme.pageBg }}>

        {/* Top bar */}
        <div style={styles.topBar}>
          <div>
            <h2 style={{ ...styles.pageTitle, color: theme.textPrimary }}>📅 Attendance</h2>
            <div style={{ ...styles.pageSubtitle, color: theme.textMuted }}>Track your daily class attendance</div>
          </div>
          <div style={{ ...styles.monthBadge, background: theme.cardBg, border: `1px solid ${theme.border}`, color: theme.accent }}>
            <span style={styles.monthDot} />
            This Month
          </div>
        </div>

        {/* Calendar */}
        <div style={styles.calendarWrapper}>
          <AttendanceCalendar />
        </div>

      </div>

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: var(--page-bg, #0e1117); }
        ::-webkit-scrollbar-thumb { background: var(--border, #2a2d3e); border-radius: 3px; }
      `}</style>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    height: '100vh',
    overflow: 'hidden',
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
  },
  sidebar: {
    width: 220,
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    padding: '24px 0',
    height: '100vh',
    overflowY: 'auto',
  },
  sidebarLogo: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '0 20px 28px',
  },
  logoIcon: {
    width: 34, height: 34,
    background: 'linear-gradient(135deg, #00d4aa, #7c6af5)',
    borderRadius: 10,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 16,
  },
  logoText: { fontSize: 18, fontWeight: 700, letterSpacing: '-0.5px' },
  nav: { flex: 1, display: 'flex', flexDirection: 'column', gap: 2, padding: '0 10px' },
  navItem: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 14px', borderRadius: 10, border: 'none',
    fontSize: 13.5, fontWeight: 500, cursor: 'pointer',
    textAlign: 'left', transition: 'all 0.2s', width: '100%',
  },
  navIcon: { fontSize: 16, width: 20, textAlign: 'center' },
  sidebarUser: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '20px', marginTop: 'auto',
  },
  userAvatar: {
    width: 36, height: 36, borderRadius: '50%',
    background: 'linear-gradient(135deg, #00d4aa, #7c6af5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 14, fontWeight: 700, flexShrink: 0,
  },
  userName: { fontSize: 13, fontWeight: 600 },
  userRole: { fontSize: 11, marginTop: 2 },
  main: {
    flex: 1, display: 'flex', flexDirection: 'column',
    padding: '28px 28px 20px', overflow: 'hidden', minWidth: 0,
  },
  topBar: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: 20, flexShrink: 0,
  },
  pageTitle: { fontSize: 22, fontWeight: 800, margin: 0, marginBottom: 4 },
  pageSubtitle: { fontSize: 13 },
  monthBadge: {
    display: 'flex', alignItems: 'center', gap: 7,
    padding: '8px 18px', borderRadius: 20,
    fontSize: 12, fontWeight: 600, letterSpacing: 0.5,
  },
  monthDot: {
    width: 7, height: 7, borderRadius: '50%',
    background: '#00d4aa', display: 'inline-block',
    boxShadow: '0 0 6px #00d4aa',
  },
  calendarWrapper: { flex: 1, minHeight: 0, overflow: 'hidden' },
};