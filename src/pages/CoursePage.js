import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const API = 'http://localhost:5000';

export default function CoursePage() {
  const { user, token } = useAuth();
  const { isDark, toggleTheme, theme } = useTheme();
  const navigate = useNavigate();
  const headers = { Authorization: `Bearer ${token}` };
  const videoRef = useRef(null);

  const [dailyClass, setDailyClass] = useState(null);
  const [loading, setLoading] = useState(true);
  const [classStatus, setClassStatus] = useState('active');
  const [attendanceMarked, setAttendanceMarked] = useState(false);
  const [attendanceStatus, setAttendanceStatus] = useState(null);

  const courseId = user?.enrolledCourse;
  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    loadTodayClass();
    checkAttendanceAlreadyMarked();
  }, []);

  const loadTodayClass = async () => {
    try {
      setLoading(true);
      let res;
      try {
        res = await axios.get(`${API}/api/classes/today/${courseId}`, { headers });
      } catch {
        res = await axios.get(`${API}/api/classes/today`, { headers });
      }
      const cls = res.data;
      setDailyClass(cls);
      if (cls && cls.date) {
        const clsDate = cls.date.split('T')[0];
        if (clsDate < todayStr) setClassStatus('expired');
        else if (clsDate > todayStr) setClassStatus('upcoming');
        else setClassStatus('active');
      }
    } catch (err) {
      console.error('Failed to load class', err);
    } finally {
      setLoading(false);
    }
  };

  const checkAttendanceAlreadyMarked = async () => {
    try {
      const res = await axios.get(`${API}/api/attendance/${user._id}/${todayStr}`, { headers });
      const records = res.data || [];
      if (records.some(r => r.status === 'present')) {
        setAttendanceMarked(true);
        setAttendanceStatus('already');
      }
    } catch (e) {}
  };

  const handleVideoPlay = async () => {
    if (attendanceMarked || classStatus !== 'active') return;
    try {
      setAttendanceStatus('marking');
      await axios.post(`${API}/api/attendance/mark`, {
        studentId: user._id,
        courseId: courseId,
        date: todayStr,
        status: 'present',
      }, { headers });
      setAttendanceMarked(true);
      setAttendanceStatus('done');
      window.dispatchEvent(new Event('attendance-marked'));
    } catch (err) {
      console.error('Attendance mark failed', err);
      setAttendanceStatus('error');
    }
  };

  const handleContextMenu = (e) => e.preventDefault();

  useEffect(() => {
    const handleKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && ['s', 'u', 'a'].includes(e.key.toLowerCase())) e.preventDefault();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: theme.pageBg, fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }}>
      {/* Sidebar */}
      <div style={{ width: 220, flexShrink: 0, background: theme.sidebarBg, borderRight: `1px solid ${theme.border}`, display: 'flex', flexDirection: 'column', padding: '20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 20px 28px' }}>
          <div style={{ width: 34, height: 34, background: 'linear-gradient(135deg, #00d4aa, #7c6af5)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>⚡</div>
          <span style={{ fontSize: 18, fontWeight: 700, color: theme.textPrimary }}>LMS Pro</span>
        </div>
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, padding: '0 10px' }}>
          {[
            { icon: '⊞', label: 'Dashboard',     path: '/dashboard' },
            { icon: '📅', label: 'Attendance',    path: '/attendance' },
            { icon: '🎥', label: 'Classes',       path: '/courses', active: true },
            { icon: '📝', label: 'Assignments',   path: `/assignment/${todayStr}` },
            { icon: '🔔', label: 'Notifications', path: '/notifications' },
            { icon: '📊', label: 'Analytics',     path: '/analytics' },
          { icon: '🏆', label: 'Leaderboard',   path: '/leaderboard' },
            { icon: '👤', label: 'Profile',       path: '/profile' },
          ].map(item => (
            <button key={item.label}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, border: 'none', background: item.active ? theme.navActiveBg : 'transparent', color: item.active ? theme.navActiveColor : theme.navInactiveColor, fontSize: 13.5, fontWeight: 500, cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s', width: '100%' }}
              onClick={() => navigate(item.path)}>
              <span style={{ fontSize: 16, width: 20, textAlign: 'center' }}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 20px', borderTop: `1px solid ${theme.border}` }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#00d4aa,#7c6af5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{user?.name?.charAt(0)?.toUpperCase() || 'U'}</div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: theme.textSecondary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name || 'Student'}</div>
            <div style={{ fontSize: 10, color: theme.textMuted, marginTop: 1 }}>Trainee</div>
          </div>
        </div>
        <button onClick={toggleTheme} style={{ margin: '0 16px 16px', padding: '8px 12px', borderRadius: 10, border: `1px solid ${theme.border}`, background: theme.toggleBg, color: theme.toggleColor, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          {isDark ? '☀️ Light Mode' : '🌙 Dark Mode'}
        </button>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 24, overflow: 'auto', background: theme.pageBg }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ color: theme.textPrimary, fontSize: 22, fontWeight: 700, margin: 0 }}>📺 Today's Class</h2>
          <span style={{ background: theme.accent, color: '#fff', padding: '6px 16px', borderRadius: 20, fontSize: 13 }}>MERN Stack Developer</span>
        </div>

        {attendanceStatus && (
          <div style={{
            padding: '10px 16px', borderRadius: 10, border: '1px solid', fontSize: 13, fontWeight: 600, marginBottom: 16,
            background: attendanceStatus === 'done' ? '#10b98122' : attendanceStatus === 'already' ? '#3b82f622' : attendanceStatus === 'marking' ? '#f59e0b22' : '#ef444422',
            borderColor: attendanceStatus === 'done' ? '#10b981' : attendanceStatus === 'already' ? '#3b82f6' : attendanceStatus === 'marking' ? '#f59e0b' : '#ef4444',
            color: attendanceStatus === 'done' ? '#10b981' : attendanceStatus === 'already' ? '#3b82f6' : attendanceStatus === 'marking' ? '#f59e0b' : '#ef4444',
          }}>
            {attendanceStatus === 'done'    && '✅ Attendance marked — You are present today!'}
            {attendanceStatus === 'already' && '✅ Already marked present for today'}
            {attendanceStatus === 'marking' && '⏳ Marking attendance...'}
            {attendanceStatus === 'error'   && '❌ Could not mark attendance — please try again'}
          </div>
        )}

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
            <div style={{ width: 32, height: 32, border: `3px solid ${theme.border}`, borderTop: `3px solid ${theme.accent}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ color: theme.textMuted, marginTop: 12 }}>Loading class...</p>
          </div>
        ) : !dailyClass ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 12 }}>
            <div style={{ fontSize: 48 }}>📅</div>
            <h3 style={{ fontSize: 20, color: theme.textPrimary, fontWeight: 700, margin: 0 }}>No class today</h3>
            <p style={{ fontSize: 14, color: theme.textMuted, margin: 0 }}>Today's class has not been uploaded yet. Check back later!</p>
          </div>
        ) : (
          <div style={{ flex: 1 }}>
            <div style={{ background: theme.cardBg, borderRadius: 16, overflow: 'hidden', border: `1px solid ${theme.border}` }}>
              <div style={{ padding: '20px 24px', borderBottom: `1px solid ${theme.border}` }}>
                <h3 style={{ fontSize: 18, color: theme.textPrimary, fontWeight: 700, margin: '0 0 10px 0' }}>{dailyClass.title}</h3>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, background: theme.hoverBg, color: theme.textSecondary, padding: '4px 12px', borderRadius: 20 }}>📅 {dailyClass.date}</span>
                  <span style={{ fontSize: 12, background: theme.hoverBg, color: theme.textSecondary, padding: '4px 12px', borderRadius: 20 }}>⏰ Expires at midnight</span>
                  {classStatus === 'active' && <span style={{ fontSize: 12, background: '#E1F5EE', color: '#1D9E75', padding: '4px 12px', borderRadius: 20 }}>🔴 Live now</span>}
                  {!attendanceMarked && classStatus === 'active' && <span style={{ fontSize: 12, background: '#fef3c7', color: '#92400e', padding: '4px 12px', borderRadius: 20 }}>▶ Play video to mark attendance</span>}
                  {attendanceMarked && <span style={{ fontSize: 12, background: '#d1fae5', color: '#065f46', padding: '4px 12px', borderRadius: 20 }}>✅ Present marked</span>}
                </div>
              </div>

              <div style={{ position: 'relative', background: '#000', userSelect: 'none' }} onContextMenu={handleContextMenu}>
                <div style={{ position: 'absolute', top: 16, right: 16, color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: 600, zIndex: 10, pointerEvents: 'none', letterSpacing: 1 }}>{user?.name} • {user?.email}</div>
                {classStatus === 'expired' ? (
                  <div style={{ width: '100%', minHeight: '40vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0f172a', padding: '40px 24px', textAlign: 'center' }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
                    <div style={{ color: '#ef4444', fontSize: 18, fontWeight: 700, marginBottom: 10 }}>This Class Has Expired</div>
                    <div style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.6, marginBottom: 16, maxWidth: 300 }}>This class recording is no longer available for playback.</div>
                    <div style={{ background: '#ef444422', color: '#ef4444', fontSize: 12, fontWeight: 600, padding: '6px 18px', borderRadius: 8 }}>Please Contact Admin</div>
                  </div>
                ) : classStatus === 'upcoming' ? (
                  <div style={{ width: '100%', minHeight: '40vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0f172a', padding: '40px 24px', textAlign: 'center' }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>🔜</div>
                    <div style={{ color: '#ef4444', fontSize: 18, fontWeight: 700, marginBottom: 10 }}>Class Not Yet Active</div>
                    <div style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.6, maxWidth: 300 }}>This class will be available on its scheduled date.</div>
                  </div>
                ) : (
                  <video ref={videoRef} style={{ width: '100%', maxHeight: '60vh', display: 'block' }} controls
                    controlsList="nodownload nofullscreen noremoteplayback"
                    disablePictureInPicture
                    onContextMenu={handleContextMenu}
                    onPlay={handleVideoPlay}
                    src={`${API}/api/classes/stream/${dailyClass._id}`}>
                    Your browser does not support video.
                  </video>
                )}
              </div>
              <div style={{ padding: '12px 24px', background: isDark ? '#1a0a00' : '#FFF8E1', fontSize: 12, color: isDark ? '#f5a623' : '#E65100' }}>
                🔒 This video is protected. Downloading, screenshots, and screen recording are not permitted.
              </div>
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}