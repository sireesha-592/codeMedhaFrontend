import Sidebar from '../components/Sidebar';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AttendanceCalendar from '../components/AttendanceCalendar';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function Attendance() {
  const { user } = useAuth();
  const { toggleTheme, theme } = useTheme();
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const todayDate = new Date().toISOString().split('T')[0];

  return (
    <div style={{
      display: 'flex',
      /* KEY FIX: use minHeight instead of height so content isn't clipped
         on small screens or when virtual keyboard is open */
      minHeight: '100vh',
      background: theme.pageBg,
      color: theme.textPrimary,
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      overflowX: 'hidden',
    }}>
      {/* ── Sidebar ── */}
      <Sidebar activePath="/attendance" courseId={user && user.enrolledCourse} />

      {/* ── Main ── */}
      <div style={{
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        /* Mobile: top padding for hamburger, bottom for bottom nav */
        padding: isMobile ? '60px 12px 80px' : '28px 28px 20px',
        background: theme.pageBg,
        overflowX: 'hidden',
        boxSizing: 'border-box',
      }}>
        {/* Top bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 20,
          flexWrap: 'wrap',
          gap: 8,
          flexShrink: 0,
        }}>
          <div>
            <h2 style={{ fontSize: isMobile ? 18 : 22, fontWeight: 800, margin: 0, marginBottom: 4, color: theme.textPrimary }}>
              📅 Attendance
            </h2>
            <div style={{ fontSize: 13, color: theme.textMuted }}>Track your daily class attendance</div>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '8px 18px', borderRadius: 20,
            fontSize: 12, fontWeight: 600, letterSpacing: 0.5,
            background: theme.cardBg, border: `1px solid ${theme.border}`, color: theme.accent,
          }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#00d4aa', display: 'inline-block', boxShadow: '0 0 6px #00d4aa' }} />
            This Month
          </div>
        </div>

        {/* Calendar wrapper — KEY FIX: don't use overflow:hidden, use a natural flow so
            the calendar can grow to fit its content on small screens */}
        <div style={{
          flex: 1,
          minWidth: 0,
          /* Allow natural scrolling instead of clipping */
          overflowY: 'auto',
          overflowX: 'hidden',
          /* Minimum height so calendar is usable */
          minHeight: isMobile ? 'auto' : 400,
          WebkitOverflowScrolling: 'touch',
        }}>
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
