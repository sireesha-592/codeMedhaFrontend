import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import axios from 'axios';

const API = 'http://localhost:5000';

const WeeklyReportPage = () => {
  const { user } = useAuth();
  const { isDark, toggleTheme, theme } = useTheme();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);

  const fetchReport = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API}/api/weekly-report`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReport(res.data);
    } catch (e) {
      console.error(e);
      // Fallback mock data if backend not ready
      const now = new Date();
      const days = [];
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        days.push({ date: d.toISOString().split('T')[0], day: dayNames[d.getDay()], status: 'no_data' });
      }
      setReport({
        period: { from: days[0].date, to: days[6].date },
        attendance: { days, present: 0, absent: 0, percentage: 0 },
        assignments: { submitted: 0, pending: 0, total: 0 },
        trend: [
          { week: 'Week 1', pct: 0, present: 0, total: 0 },
          { week: 'Week 2', pct: 0, present: 0, total: 0 },
          { week: 'Week 3', pct: 0, present: 0, total: 0 },
          { week: 'Week 4', pct: 0, present: 0, total: 0 },
        ]
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (user) fetchReport(); }, [user, fetchReport]);

  const downloadPDF = async () => {
    if (!report) return;
    setPdfLoading(true);
    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const W = doc.internal.pageSize.getWidth();
      const now = new Date();

      // Header
      doc.setFillColor(124, 106, 245);
      doc.rect(0, 0, W, 42, 'F');
      doc.setFillColor(0, 212, 170);
      doc.rect(0, 38, W, 5, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('LMS Pro — Weekly Report', W / 2, 17, { align: 'center' });
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`${user?.name || 'Student'}  |  ${report.period.from} to ${report.period.to}`, W / 2, 28, { align: 'center' });

      let y = 52;

      // Attendance summary
      doc.setFillColor(245, 247, 250);
      doc.roundedRect(10, y, W - 20, 36, 4, 4, 'F');
      doc.setTextColor(60, 60, 80);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('📅  Weekly Attendance', 16, y + 10);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      [
        ['Present', `${report.attendance.present} days`],
        ['Absent', `${report.attendance.absent} days`],
        ['Attendance %', `${report.attendance.percentage}%`],
      ].forEach(([label, val], i) => {
        const col = i < 2 ? 16 : 110;
        const row = i < 2 ? y + 20 + (i * 9) : y + 25;
        doc.setTextColor(100, 100, 120); doc.text(label + ':', col, row);
        doc.setTextColor(0, 180, 140); doc.setFont('helvetica', 'bold');
        doc.text(val, col + 42, row); doc.setFont('helvetica', 'normal');
      });

      y += 46;

      // Day-by-day attendance
      doc.setFillColor(245, 247, 250);
      doc.roundedRect(10, y, W - 20, 38, 4, 4, 'F');
      doc.setTextColor(60, 60, 80); doc.setFontSize(12); doc.setFont('helvetica', 'bold');
      doc.text('📆  Day-by-Day', 16, y + 10);
      doc.setFontSize(9); doc.setFont('helvetica', 'normal');
      report.attendance.days.forEach((d, i) => {
        const col = 16 + (i * 26);
        const isPresent = d.status === 'present';
        const isAbsent = d.status === 'absent';
        doc.setTextColor(100, 100, 120); doc.text(d.day, col, y + 20);
        if (isPresent) { doc.setFillColor(0, 180, 140); doc.setTextColor(0, 180, 140); }
        else if (isAbsent) { doc.setFillColor(245, 85, 85); doc.setTextColor(245, 85, 85); }
        else { doc.setFillColor(200, 200, 210); doc.setTextColor(160, 160, 180); }
        doc.circle(col + 5, y + 28, 4, 'F');
        doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold');
        doc.text(isPresent ? '✓' : isAbsent ? '✗' : '-', col + 3.2, y + 29.5);
        doc.setFont('helvetica', 'normal');
      });

      y += 48;

      // Assignment summary
      doc.setFillColor(245, 247, 250);
      doc.roundedRect(10, y, W - 20, 30, 4, 4, 'F');
      doc.setTextColor(60, 60, 80); doc.setFontSize(12); doc.setFont('helvetica', 'bold');
      doc.text('📝  Assignments This Week', 16, y + 10);
      doc.setFontSize(10); doc.setFont('helvetica', 'normal');
      [
        ['Submitted', `${report.assignments.submitted}`],
        ['Pending', `${report.assignments.pending}`],
        ['Total', `${report.assignments.total}`],
      ].forEach(([label, val], i) => {
        const col = 16 + (i * 60);
        doc.setTextColor(100, 100, 120); doc.text(label + ':', col, y + 22);
        doc.setTextColor(124, 106, 245); doc.setFont('helvetica', 'bold');
        doc.text(val, col + 28, y + 22); doc.setFont('helvetica', 'normal');
      });

      y += 40;

      // 4-week trend
      doc.setFillColor(245, 247, 250);
      doc.roundedRect(10, y, W - 20, 50, 4, 4, 'F');
      doc.setTextColor(60, 60, 80); doc.setFontSize(12); doc.setFont('helvetica', 'bold');
      doc.text('📈  4-Week Attendance Trend', 16, y + 10);
      doc.setFontSize(9); doc.setFont('helvetica', 'normal');
      const maxTrend = Math.max(...report.trend.map(t => t.pct), 1);
      report.trend.forEach((t, i) => {
        const barY = y + 20 + (i * 8);
        const barW = (t.pct / 100) * (W - 70);
        const col = t.pct >= 75 ? [0, 180, 140] : t.pct >= 50 ? [245, 166, 35] : [245, 85, 85];
        doc.setTextColor(100, 100, 120); doc.text(t.week, 16, barY);
        doc.setFillColor(...col); doc.rect(40, barY - 4, barW, 5, 'F');
        doc.setTextColor(...col); doc.setFont('helvetica', 'bold');
        doc.text(`${t.pct}%`, 42 + barW, barY); doc.setFont('helvetica', 'normal');
      });

      y += 60;

      // Footer
      doc.setFillColor(240, 242, 245); doc.rect(0, 277, W, 20, 'F');
      doc.setTextColor(140, 140, 160); doc.setFontSize(8);
      doc.text('LMS Pro — Weekly Student Report', W / 2, 287, { align: 'center' });
      doc.text(`Generated: ${now.toLocaleDateString('en-IN')}`, W - 15, 287, { align: 'right' });

      doc.save(`LMS_Weekly_${user?.name?.replace(/ /g,'_') || 'Student'}_${report.period.to}.pdf`);
    } catch (err) {
      console.error('PDF error:', err);
      alert('PDF generation failed.');
    } finally {
      setPdfLoading(false);
    }
  };

  const statusColor = (status, theme) => {
    if (status === 'present') return { bg: theme.accent + '22', border: theme.accent, text: theme.accent, icon: '✓' };
    if (status === 'absent')  return { bg: '#f5555522', border: '#f55555', text: '#f55555', icon: '✗' };
    if (status === 'no_class') return { bg: theme.border + '44', border: theme.border, text: theme.textMuted, icon: '—' };
    return { bg: theme.border + '22', border: theme.border, text: theme.textMuted, icon: '?' };
  };

  const SidebarNav = () => (
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
          { icon: '📝', label: 'Assignments',   path: '/assignments' },
          { icon: '🔔', label: 'Notifications', path: '/notifications' },
          { icon: '📊', label: 'Analytics',     path: '/analytics' },
          { icon: '🏆', label: 'Leaderboard',   path: '/leaderboard' },
          { icon: '📅', label: 'Weekly Report', path: '/weekly-report', active: true },
          { icon: '👤', label: 'Profile',       path: '/profile' },
        ].map(item => (
          <button key={item.path}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, border: 'none', background: item.active ? theme.navActiveBg : 'transparent', color: item.active ? theme.navActiveColor : theme.navInactiveColor, fontSize: 13.5, fontWeight: 500, cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s', width: '100%' }}
            onClick={() => navigate(item.path)}>
            <span style={{ fontSize: 16, width: 20, textAlign: 'center' }}>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '20px', borderTop: `1px solid ${theme.border}` }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #00d4aa, #7c6af5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, flexShrink: 0 }}>{user?.name?.charAt(0)?.toUpperCase() || 'U'}</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: theme.textSecondary }}>{user?.name || 'Student'}</div>
          <div style={{ fontSize: 11, color: theme.textMuted, marginTop: 2 }}>{user?.role === 'teacher' ? 'Teacher' : 'Student'}</div>
        </div>
      </div>
      <button onClick={toggleTheme} style={{ margin: '0 16px 16px', padding: '8px 12px', borderRadius: 10, border: `1px solid ${theme.border}`, background: theme.toggleBg, color: theme.toggleColor, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
        {isDark ? '☀️ Light Mode' : '🌙 Dark Mode'}
      </button>
    </aside>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: theme.pageBg, color: theme.textPrimary, fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }}>
      <SidebarNav />
      <main style={{ flex: 1, padding: '32px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: theme.textPrimary, marginBottom: 4 }}>📅 Weekly Report</div>
            <div style={{ fontSize: 13, color: theme.textMuted }}>
              {report ? `${report.period.from}  →  ${report.period.to}` : 'Loading period...'}
            </div>
          </div>
          <button
            onClick={downloadPDF}
            disabled={pdfLoading || !report}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 18px', borderRadius: 10, border: 'none', background: pdfLoading ? theme.border : 'linear-gradient(135deg, #7c6af5, #00d4aa)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: pdfLoading ? 'not-allowed' : 'pointer', boxShadow: pdfLoading ? 'none' : '0 4px 12px rgba(124,106,245,0.35)' }}>
            {pdfLoading ? '⏳ Generating...' : '📄 Download PDF'}
          </button>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <div style={{ width: 32, height: 32, border: `3px solid ${theme.border}`, borderTop: `3px solid ${theme.accent}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
          </div>
        ) : !report ? (
          <p style={{ color: theme.textMuted, textAlign: 'center', padding: 40 }}>Could not load report.</p>
        ) : (
          <>
            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
              {[
                { label: 'Days Present',     value: report.attendance.present,    icon: '✅', color: theme.accent },
                { label: 'Days Absent',      value: report.attendance.absent,     icon: '❌', color: '#f55555' },
                { label: 'Attendance %',     value: `${report.attendance.percentage}%`, icon: '📊', color: report.attendance.percentage >= 75 ? theme.accent : '#f5a623' },
                { label: 'Assignments Done', value: `${report.assignments.submitted}/${report.assignments.total}`, icon: '📝', color: theme.accentPurple },
              ].map((s, i) => (
                <div key={i} style={{ background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: 14, padding: '18px' }}>
                  <div style={{ fontSize: 22, marginBottom: 10 }}>{s.icon}</div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: s.color, marginBottom: 4 }}>{s.value}</div>
                  <div style={{ fontSize: 12, color: theme.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Day-by-Day Attendance */}
            <div style={{ background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: 16, padding: '20px' }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: theme.textSecondary, marginBottom: 16 }}>📆 Day-by-Day Attendance</div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {report.attendance.days.map((d, i) => {
                  const s = statusColor(d.status, theme);
                  return (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 52 }}>
                      <div style={{ fontSize: 10, color: theme.textMuted, fontWeight: 700, textTransform: 'uppercase' }}>{d.day}</div>
                      <div style={{ width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, background: s.bg, border: `2px solid ${s.border}`, color: s.text }}>
                        {s.icon}
                      </div>
                      <div style={{ fontSize: 10, color: theme.textMuted }}>{d.date?.slice(5)}</div>
                      <div style={{ fontSize: 9, color: s.text, fontWeight: 600, textTransform: 'capitalize' }}>{d.status === 'no_data' ? 'N/A' : d.status === 'no_class' ? 'Off' : d.status}</div>
                    </div>
                  );
                })}
              </div>
              <div style={{ display: 'flex', gap: 20, marginTop: 16, flexWrap: 'wrap' }}>
                {[
                  { color: theme.accent, label: '✓ Present' },
                  { color: '#f55555', label: '✗ Absent' },
                  { color: theme.textMuted, label: '— Off/No class' },
                ].map((l, i) => (
                  <span key={i} style={{ fontSize: 12, color: l.color, fontWeight: 500 }}>{l.label}</span>
                ))}
              </div>
            </div>

            {/* Assignment Status */}
            <div style={{ background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: 16, padding: '20px' }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: theme.textSecondary, marginBottom: 16 }}>📝 Assignment Status This Week</div>
              {report.assignments.total === 0 ? (
                <p style={{ color: theme.textMuted, fontSize: 13 }}>No assignments this week.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[
                    { label: 'Submitted', value: report.assignments.submitted, color: theme.accentPurple },
                    { label: 'Pending',   value: report.assignments.pending,   color: theme.accentOrange },
                  ].map((p, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{ fontSize: 13, color: theme.textSecondary, width: 80, flexShrink: 0 }}>{p.label}</div>
                      <div style={{ flex: 1, height: 10, background: theme.border, borderRadius: 6, overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 6, width: `${report.assignments.total > 0 ? (p.value / report.assignments.total) * 100 : 0}%`, background: p.color, transition: 'width 1s ease' }}></div>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: p.color, width: 28, textAlign: 'right' }}>{p.value}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 4-Week Trend */}
            <div style={{ background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: 16, padding: '20px' }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: theme.textSecondary, marginBottom: 16 }}>📈 4-Week Attendance Trend</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20, height: 160, padding: '0 8px' }}>
                {report.trend.map((t, i) => {
                  const barColor = t.pct >= 75 ? theme.accent : t.pct >= 50 ? '#f5a623' : '#f55555';
                  const maxPct = Math.max(...report.trend.map(x => x.pct), 1);
                  return (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: barColor }}>{t.pct}%</div>
                      <div style={{ width: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', height: 120, background: theme.pageBg, borderRadius: 8, overflow: 'hidden' }}>
                        <div style={{ width: '80%', borderRadius: '6px 6px 0 0', minHeight: 4, height: `${(t.pct / maxPct) * 120}px`, background: `linear-gradient(to top, ${barColor}, ${barColor}80)`, transition: 'height 1s ease' }}></div>
                      </div>
                      <div style={{ fontSize: 11, color: theme.textMuted, fontWeight: 600 }}>{t.week}</div>
                      <div style={{ fontSize: 10, color: theme.textMuted }}>{t.present}/{t.total} days</div>
                    </div>
                  );
                })}
              </div>
              {/* 75% threshold marker */}
              <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 24, height: 2, background: '#f5a623', borderRadius: 2 }}></div>
                <span style={{ fontSize: 11, color: theme.textMuted }}>75% attendance threshold</span>
              </div>
            </div>

            {/* Motivational tip */}
            <div style={{
              background: report.attendance.percentage >= 75
                ? 'linear-gradient(135deg, #00d4aa18, #7c6af518)'
                : 'linear-gradient(135deg, #f5a62318, #f5555518)',
              border: `1px solid ${report.attendance.percentage >= 75 ? '#00d4aa44' : '#f5a62344'}`,
              borderRadius: 14, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14
            }}>
              <div style={{ fontSize: 28 }}>{report.attendance.percentage >= 75 ? '🎉' : '💪'}</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: theme.textPrimary, marginBottom: 4 }}>
                  {report.attendance.percentage >= 75 ? 'Excellent week!' : 'Keep pushing!'}
                </div>
                <div style={{ fontSize: 13, color: theme.textMuted }}>
                  {report.attendance.percentage >= 75
                    ? `You attended ${report.attendance.percentage}% of classes this week. Keep up the great work!`
                    : `Your attendance was ${report.attendance.percentage}% this week. Try to attend more classes next week to stay on track.`}
                </div>
              </div>
            </div>
          </>
        )}
      </main>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default WeeklyReportPage;
