import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../api';

const API = process.env.REACT_APP_API_URL || "";
const NotificationsPage = () => {
  const { user } = useAuth();
  const { isDark, toggleTheme, theme } = useTheme();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (user) fetchNotifications(); }, [user]);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [classRes, subRes] = await Promise.allSettled([
        api.get(`${API}/api/classes/all`, { headers }),
        api.get(`${API}/api/submissions/all`, { headers }),
      ]);

      const notifs = [];
      const todayStr = new Date().toISOString().split('T')[0];

      if (classRes.status === 'fulfilled') {
        const classes = classRes.value.data || [];
        classes.slice(0, 15).forEach(cls => {
          const classDateStr = (cls.date || cls.createdAt || '').split('T')[0];
          const isToday = classDateStr === todayStr;
          notifs.push({
            id:          `class_${cls._id}`,
            type:        'class',
            icon:        '🎥',
            title:       isToday ? '🔴 New Class Available Today!' : 'Class Uploaded',
            message:     cls.title || 'A new class has been uploaded by your trainer',
            time:        new Date(cls.createdAt || cls.date),
            color:       '#00d4aa',
            read:        !isToday,
            action:      () => navigate('/courses'),
            actionLabel: 'Watch Now',
          });
        });
      }

      if (subRes.status === 'fulfilled') {
        const allSubs = subRes.value.data || [];
        const subs = allSubs.filter(s => s.date <= todayStr);
        subs.forEach(s => {
          if (s.status !== 'submitted') {
            const answered = (s.secA?.answered || 0) + (s.secB?.answered || 0) + (s.secC?.answered || 0);
            const total    = (s.secA?.total || 20) + (s.secB?.total || 20) + (s.secC?.total || 10);
            notifs.push({
              id:          `sub_${s._id}`,
              type:        'assignment',
              icon:        '📝',
              title:       'Assignment Pending',
              message:     `Assignment (${s.date}) — ${answered}/${total} questions answered. Do not forget to submit!`,
              time:        new Date(s.date),
              color:       '#f5a623',
              read:        false,
              urgent:      answered === 0,
              action:      () => navigate(`/assignment/${s.date}`),
              actionLabel: 'Continue Now',
            });
          } else {
            notifs.push({
              id:          `sub_done_${s._id}`,
              type:        'assignment',
              icon:        '✅',
              title:       'Assignment Submitted!',
              message:     `Assignment (${s.date}) successfully submitted. Score: ${(s.secA?.score||0)+(s.secB?.score||0)+(s.secC?.score||0)}`,
              time:        new Date(s.submittedAt || s.date),
              color:       '#7c6af5',
              read:        true,
              action:      () => navigate('/analytics'),
              actionLabel: 'View Analytics',
            });
          }
        });
      }

      notifs.sort((a, b) => new Date(b.time) - new Date(a.time));
      setNotifications(notifs);
    } catch (e) {
      console.error(e);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const markAllRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  const markRead   = (id) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));

  const filtered = notifications.filter(n => {
    if (filter === 'all')        return true;
    if (filter === 'unread')     return !n.read;
    if (filter === 'class')      return n.type === 'class';
    if (filter === 'assignment') return n.type === 'assignment';
    return true;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const formatTime = (time) => {
    const diff = Math.floor((new Date() - new Date(time)) / 1000);
    if (diff < 60)    return 'Just now';
    if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: theme.pageBg, color: theme.textPrimary, fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }}>
      <aside style={{ width: 220, background: theme.sidebarBg, borderRight: `1px solid ${theme.border}`, display: 'flex', flexDirection: 'column', padding: '24px 0', position: 'sticky', top: 0, height: '100vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 20px 28px' }}>
          <div style={{ width: 34, height: 34, background: 'linear-gradient(135deg, #00d4aa, #7c6af5)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>⚡</div>
          <span style={{ fontSize: 18, fontWeight: 700, color: theme.textPrimary }}>LMS Pro</span>
        </div>
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, padding: '0 10px' }}>
          {[
            { icon: '⊞', label: 'Dashboard',     path: '/dashboard' },
            { icon: '📅', label: 'Attendance',    path: '/attendance' },
            { icon: '🎥', label: 'Classes',       path: '/courses' },
            { icon: '📚', label: 'My Course',     path: '/my-course' },
            { icon: '📝', label: 'Assignments',   path: '/assignments' },
            { icon: '🔔', label: 'Notifications', path: '/notifications', active: true },
            { icon: '📊', label: 'Analytics',     path: '/analytics' },
          { icon: '🏆', label: 'Leaderboard',   path: '/leaderboard' },
            { icon: '👤', label: 'Profile',       path: '/profile' },
            { icon: '💬', label: 'Group Chat',    path: user?.enrolledCourse ? `/chat/${user.enrolledCourse}` : '/courses' },
          ].map(item => (
            <button
              key={item.path}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px', borderRadius: 10, border: 'none',
                background: item.active ? theme.navActiveBg : 'transparent',
                color: item.active ? theme.navActiveColor : theme.navInactiveColor,
                fontSize: 13.5, fontWeight: 500, cursor: 'pointer',
                textAlign: 'left', transition: 'all 0.2s', width: '100%', position: 'relative',
              }}
              onClick={() => navigate(item.path)}
            >
              <span style={{ fontSize: 16, width: 20, textAlign: 'center' }}>{item.icon}</span>
              <span>{item.label}</span>
              {item.active && unreadCount > 0 && (
                <span style={{ marginLeft: 'auto', background: '#f55', color: '#fff', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10 }}>{unreadCount}</span>
              )}
            </button>
          ))}
        </nav>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '20px', borderTop: `1px solid ${theme.border}` }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #00d4aa, #7c6af5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, flexShrink: 0 }}>{user?.name?.charAt(0)?.toUpperCase() || 'U'}</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: theme.textSecondary }}>{user?.name || 'Student'}</div>
            <div style={{ fontSize: 11, color: theme.textMuted, marginTop: 2 }}>{user?.role === 'teacher' ? 'Teacher' : 'MERN Stack Developer'}</div>
          </div>
        </div>
        <button
          onClick={toggleTheme}
          style={{ margin: '0 16px 16px', padding: '8px 12px', borderRadius: 10, border: `1px solid ${theme.border}`, background: theme.toggleBg, color: theme.toggleColor, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
        >
          {isDark ? '☀️ Light Mode' : '🌙 Dark Mode'}
        </button>
      </aside>

      <main style={{ flex: 1, padding: '32px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: theme.textPrimary, marginBottom: 4 }}>🔔 Notifications</div>
            <div style={{ fontSize: 13, color: theme.textMuted }}>
              {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
            </div>
          </div>
          {unreadCount > 0 && (
            <button style={{ background: 'transparent', border: `1px solid ${theme.border}`, color: theme.textSecondary, fontSize: 13, fontWeight: 600, padding: '8px 16px', borderRadius: 10, cursor: 'pointer' }} onClick={markAllRead}>✓ Mark all as read</button>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { key: 'all',        label: 'All',            count: notifications.length },
            { key: 'unread',     label: 'Unread',         count: unreadCount },
            { key: 'class',      label: '🎥 Classes',     count: notifications.filter(n => n.type === 'class').length },
            { key: 'assignment', label: '📝 Assignments',  count: notifications.filter(n => n.type === 'assignment').length },
          ].map(f => (
            <button
              key={f.key}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', borderRadius: 10,
                border: `1px solid ${filter === f.key ? theme.accent + '44' : theme.border}`,
                background: filter === f.key ? theme.accent + '15' : theme.cardBg,
                color: filter === f.key ? theme.accent : theme.textMuted,
                fontSize: 13, fontWeight: 500, cursor: 'pointer',
              }}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
              <span style={{ background: filter === f.key ? theme.accent + '22' : theme.border, color: filter === f.key ? theme.accent : theme.textMuted, fontSize: 11, fontWeight: 700, padding: '1px 6px', borderRadius: 8 }}>
                {f.count}
              </span>
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div style={{ width: 32, height: 32, border: `3px solid ${theme.border}`, borderTop: `3px solid ${theme.accent}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div></div>
        ) : filtered.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 0', gap: 8 }}>
            <div style={{ fontSize: 48, opacity: 0.3 }}>🔕</div>
            <div style={{ fontSize: 16, color: theme.textMuted, fontWeight: 500 }}>No notifications here</div>
            <div style={{ fontSize: 13, color: theme.textMuted, textAlign: 'center', maxWidth: 300, lineHeight: 1.6, opacity: 0.7 }}>
              {notifications.length === 0
                ? 'Notifications will appear when admin uploads a class or you have pending assignments.'
                : "You're all caught up!"}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map(notif => (
              <div
                key={notif.id}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 14,
                  padding: '16px 18px', borderRadius: 14,
                  border: `1px solid ${notif.read ? theme.border : notif.color + '44'}`,
                  background: notif.read ? theme.cardBg : notif.color + '08',
                  cursor: 'pointer', transition: 'all 0.2s', position: 'relative',
                }}
                onClick={() => markRead(notif.id)}
              >
                {!notif.read && <div style={{ position: 'absolute', top: 18, right: 18, width: 7, height: 7, borderRadius: '50%', background: notif.color }}></div>}
                <div style={{ width: 42, height: 42, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0, background: notif.color + '20', color: notif.color }}>
                  {notif.icon}
                </div>
                <div style={{ flex: 1, paddingRight: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: theme.textPrimary }}>{notif.title}</div>
                    {notif.urgent && <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 4, background: '#f5515122', color: '#f55', border: '1px solid #f5555544', letterSpacing: '0.5px' }}>URGENT</span>}
                  </div>
                  <div style={{ fontSize: 13, color: theme.textSecondary, marginBottom: 8, lineHeight: 1.5 }}>{notif.message}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 11, color: theme.textMuted }}>{formatTime(notif.time)}</span>
                    {notif.action && (
                      <button
                        style={{ fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 7, border: `1px solid ${notif.color + '44'}`, background: 'transparent', cursor: 'pointer', color: notif.color }}
                        onClick={e => { e.stopPropagation(); notif.action(); }}
                      >
                        {notif.actionLabel} →
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default NotificationsPage;