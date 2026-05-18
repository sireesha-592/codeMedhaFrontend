import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../api';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import { useTheme } from '../context/ThemeContext';

const API      = process.env.REACT_APP_API_URL || '/api';
const SOCKET_URL = '';

const token   = () =>
  localStorage.getItem('lms_token_trainer') ||
  localStorage.getItem('lms_token_admin')   ||
  localStorage.getItem('token');
const headers = () => ({ headers: { Authorization: `Bearer ${token()}` } });

const roleColor = (role) =>
  role === 'admin' ? '#f59e0b' : role === 'trainer' || role === 'teacher' ? '#a78bfa' : '#60a5fa';

const roleLabel = (role) =>
  role === 'admin' ? '👑 Admin' : role === 'trainer' || role === 'teacher' ? '🎓 Trainer' : '👤 Student';

const VIS_OPTIONS = [
  { value: 'everyone', label: '🌐 Everyone',     desc: 'All students + trainer + admin', color: '#10b981' },
  { value: 'trainer',  label: '👨‍🏫 Trainer only', desc: 'Only trainer & admin see this',  color: '#a78bfa' },
  { value: 'admin',    label: '🔒 Admin only',    desc: 'Only admin sees this',            color: '#f59e0b' },
];

const canSee = (msg, user) => {
  if (!user) return false;
  const role = user.role || 'student';
  const uid  = (user._id || user.id)?.toString();
  if (role === 'admin') return true;
  if (msg.visibility === 'everyone') return true;
  if (msg.visibility === 'trainer' && (role === 'teacher' || role === 'trainer')) return true;
  if ((msg.visibility === 'trainer' || msg.visibility === 'admin') && msg.senderId?.toString() === uid) return true;
  return false;
};

const fmtTime = (d) => {
  const dt = new Date(d);
  return dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
};

// ─── Design tokens (theme-aware, updated per render) ─────────────────────────
const makeC = (isDark) => ({
  bg:         isDark ? '#0f0f1a' : '#f0f4f8',
  sidebar:    isDark ? '#13131f' : '#ffffff',
  card:       isDark ? '#1a1a2e' : '#ffffff',
  cardHover:  isDark ? '#1e1e35' : '#f8fafc',
  border:     isDark ? 'rgba(255,255,255,0.07)' : '#e2e8f0',
  accent:     '#7c3aed',
  accentSoft: isDark ? 'rgba(124,58,237,0.15)' : 'rgba(124,58,237,0.08)',
  green:      '#10b981',
  red:        '#ef4444',
  yellow:     '#f59e0b',
  blue:       '#3b82f6',
  text:       isDark ? '#f1f5f9' : '#1e293b',
  textMuted:  isDark ? '#64748b' : '#94a3b8',
  textSub:    isDark ? '#94a3b8' : '#64748b',
});

// static fallback (overridden per-component via useTheme)
const C = makeC(true);

// ════════════════════════════════════════════════════════════
//  MAIN TRAINER PANEL
// ════════════════════════════════════════════════════════════
export default function TrainerPanel() {
  const [tab, setTab] = useState('dashboard');
  const { user: authUser } = useAuth();
  const user = authUser || JSON.parse(localStorage.getItem('lms_user_trainer') || localStorage.getItem('user') || '{}');

  const { isDark, toggleTheme } = useTheme();
  const C = makeC(isDark);
  const [courseId, setCourseId] = useState('');
  const [courses,  setCourses]  = useState([]);

  useEffect(() => {
    api.get(`${API}/chat/active-course`, headers())
      .then(r => { if (r.data?.courseId) setCourseId(r.data.courseId); })
      .catch(() => {});
    api.get(`${API}/courses`, headers())
      .then(r => setCourses(r.data || []))
      .catch(() => {});
  }, []);

  const tabs = [
    { id: 'dashboard', icon: '⊞',  label: 'Dashboard'    },
    { id: 'grading',   icon: '📝', label: 'Grading'      },
    { id: 'students',  icon: '👥', label: 'Students'     },
    { id: 'chat',      icon: '💬', label: 'Group Chat'   },
    { id: 'notes',     icon: '🗒️', label: 'Session Notes' },
    { id: 'doubts',    icon: '❓', label: 'Doubt Tracker' },
    { id: 'planner',   icon: '📅', label: 'Daily Planner' },
    { id: 'resources', icon: '📚', label: 'Resources'     },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: C.bg, fontFamily: "'Inter','Segoe UI',sans-serif", color: C.text, paddingTop: 56 }}>
      <Navbar />

      {/* ── Sidebar ── */}
      <aside style={{
        width: 230, background: C.sidebar,
        borderRight: `1px solid ${C.border}`,
        display: 'flex', flexDirection: 'column',
        position: 'sticky', top: 0, height: '100vh', flexShrink: 0,
      }}>
        {/* Logo */}
        <div style={{ padding: '28px 20px 24px', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg,#7c3aed,#10b981)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, fontWeight: 700,
            }}>⚡</div>
            <span style={{ fontSize: 17, fontWeight: 700, color: C.text }}>CodeMedha</span>
          </div>

          {/* Profile */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              background: 'linear-gradient(135deg,#7c3aed,#a78bfa)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, fontWeight: 700, color: '#fff', flexShrink: 0,
            }}>{(user.name || 'T')[0].toUpperCase()}</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{user.name || 'Trainer'}</div>
              <div style={{ fontSize: 11, color: C.accentSoft.replace('0.15','1'), background: C.accentSoft, borderRadius: 20, padding: '1px 8px', marginTop: 3, display: 'inline-block', fontWeight: 600 }}>
                {roleLabel(user.role)}
              </div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '16px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {tabs.map(t => {
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                width: '100%', padding: '11px 14px',
                borderRadius: 10, border: 'none',
                background: active ? C.accentSoft : 'transparent',
                color: active ? '#a78bfa' : C.textSub,
                fontSize: 14, fontWeight: active ? 600 : 400,
                cursor: 'pointer', textAlign: 'left',
                borderLeft: active ? '3px solid #7c3aed' : '3px solid transparent',
                transition: 'all 0.15s',
              }}>
                <span style={{ fontSize: 16, width: 20, textAlign: 'center' }}>{t.icon}</span>
                {t.label}
              </button>
            );
          })}
        </nav>

        {/* Course picker */}
        {courses.length >= 1 && (
          <div style={{ padding: '14px 14px', borderTop: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 10, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6, fontWeight: 600 }}>Active Course</div>
            <select value={courseId} onChange={e => setCourseId(e.target.value)} style={{
              width: '100%', padding: '8px 10px', borderRadius: 8,
              border: `1px solid ${C.border}`, background: C.card,
              color: C.text, fontSize: 12, cursor: 'pointer', outline: 'none',
            }}>
              {courses.map(c => <option key={c._id} value={c._id}>{c.title}</option>)}
            </select>
          </div>
        )}
      {/* Theme toggle */}
        <div style={{ padding: '12px 14px', borderTop: `1px solid ${C.border}` }}>
          <button onClick={toggleTheme} style={{
            width: '100%', padding: '10px', borderRadius: 10, border: `1px solid ${C.border}`,
            background: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9',
            color: C.textSub, fontSize: 13, fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            {isDark ? '☀️ Light Mode' : '🌙 Dark Mode'}
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={{ flex: 1, padding: '32px 36px', overflowY: 'auto', maxHeight: '100vh' }}>
        {tab === 'dashboard' && <Dashboard user={user} />}
        {tab === 'grading'   && <GradingTab courseId={courseId} />}
        {tab === 'students'  && <StudentsTab courseId={courseId} />}
        {tab === 'notes'     && <SessionNotes courseId={courseId} />}
        {tab === 'doubts'    && <DoubtTracker courseId={courseId} />}
        {tab === 'planner'   && <DailyPlanner />}
        {tab === 'resources' && <ResourcesTab courseId={courseId} />}
        <div style={{ display: tab === 'chat' ? 'block' : 'none' }}>
          <GroupChat user={user} initialCourseId={courseId} />
        </div>
      </main>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  DASHBOARD
// ════════════════════════════════════════════════════════════
function Dashboard({ user }) {
  const { isDark } = useTheme();
  const C = makeC(isDark);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`${API}/trainer/dashboard`, headers())
      .then(r => setStats(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader />;

  const { totalStudents, attendance, submissions, today, hasAssignment } = stats || {};
  const present   = attendance?.present ?? 0;
  const total     = totalStudents ?? 0;
  const pct       = total > 0 ? Math.round((present / total) * 100) : 0;
  const r         = 40;
  const circ      = 2 * Math.PI * r;
  const offset    = circ - (pct / 100) * circ;
  const hour      = new Date().getHours();
  const greeting  = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const statCards = [
    { color: '#3b82f6', icon: '👥', label: 'Total Students', value: totalStudents ?? '—', bg: 'rgba(59,130,246,0.1)' },
    { color: '#10b981', icon: '✅', label: 'Present Today',   value: attendance?.present ?? '—', bg: 'rgba(16,185,129,0.1)' },
    { color: '#ef4444', icon: '❌', label: 'Absent Today',    value: attendance?.absent ?? '—',  bg: 'rgba(239,68,68,0.1)'  },
    { color: '#f59e0b', icon: '⏳', label: 'Not Marked',     value: attendance?.notMarked ?? '—', bg: 'rgba(245,158,11,0.1)' },
  ];

  return (
    <div>
      {/* Welcome Banner */}
      <div style={{
        background: 'linear-gradient(135deg,#7c3aed 0%,#5b21b6 40%,#1e1b4b 100%)',
        borderRadius: 20, padding: '28px 32px', marginBottom: 28,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -30, right: 120, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -40, right: 60, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
        <div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 4, fontWeight: 500 }}>{greeting} 👋</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#fff', marginBottom: 6 }}>{user?.name || 'Trainer'}</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)' }}>
            {today ? `Today is ${today}` : new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
            {hasAssignment ? ' · 📋 Assignment active' : ' · No assignment today'}
          </div>
        </div>
        {/* Attendance ring */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <svg width={100} height={100} viewBox="0 0 100 100">
            <circle cx={50} cy={50} r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={10} />
            <circle cx={50} cy={50} r={r} fill="none"
              stroke={pct >= 75 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444'}
              strokeWidth={10} strokeDasharray={circ} strokeDashoffset={offset}
              strokeLinecap="round" transform="rotate(-90 50 50)"
              style={{ transition: 'stroke-dashoffset 1s ease' }}
            />
            <text x="50" y="54" textAnchor="middle" fill="#fff" fontSize="17" fontWeight="800">{pct}%</text>
          </svg>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>Attendance</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 16, marginBottom: 32 }}>
        {statCards.map(s => <StatCard key={s.label} {...s} />)}
      </div>

      {hasAssignment ? (
        <>
          <SectionTitle>📋 Today's Assignment</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 16 }}>
            <StatCard color="#a78bfa" icon="📤" label="Submitted" value={submissions?.submitted ?? 0} bg="rgba(167,139,250,0.1)" />
            <StatCard color="#f97316" icon="📭" label="Pending"   value={submissions?.pending ?? 0}   bg="rgba(249,115,22,0.1)"  />
            <StatCard color="#ef4444" icon="🔖" label="Ungraded"  value={submissions?.ungraded ?? 0}  bg="rgba(239,68,68,0.1)"   />
          </div>
        </>
      ) : (
        <EmptyState icon="📭" text="No assignment for today" />
      )}
    </div>
  );
}

function StatCard({ color, icon, label, value, bg }) {
  return (
    <div style={{
      background: C.card, borderRadius: 14, padding: '22px 20px',
      border: `1px solid ${C.border}`, position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: `linear-gradient(90deg, ${color}, ${color}88)`,
      }} />
      <div style={{
        width: 42, height: 42, borderRadius: 12, background: bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 20, marginBottom: 14,
      }}>{icon}</div>
      <div style={{ fontSize: 30, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, color: C.textSub, marginTop: 6, fontWeight: 500 }}>{label}</div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  GRADING TAB
// ════════════════════════════════════════════════════════════
function GradingTab({ courseId }) {
  const { isDark } = useTheme();
  const C = makeC(isDark);
  const [date,     setDate]     = useState(new Date().toISOString().split('T')[0]);
  const [data,     setData]     = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [selected, setSelected] = useState(null);
  const [toast,    setToast]    = useState('');

  const load = useCallback(() => {
    setLoading(true); setSelected(null);
    const params = `date=${date}${courseId ? `&courseId=${courseId}` : ''}`;
    api.get(`${API}/trainer/submissions?${params}`, headers())
      .then(r => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [date, courseId]);

  useEffect(() => { load(); }, [load]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const onGraded = (updatedSub) => {
    setData(prev => ({ ...prev, submissions: prev.submissions.map(s => s._id === updatedSub._id ? updatedSub : s) }));
    showToast('✅ Graded & saved!');
    setSelected(null);
  };

  if (loading) return <Loader />;

  return (
    <div>
      <PageHeader title="Assignment Grading" subtitle="Review and grade trainee submissions" icon="📝" />

      {toast && (
        <div style={{
          position: 'fixed', top: 24, right: 24, zIndex: 9999,
          background: '#10b981', color: '#fff', padding: '12px 20px',
          borderRadius: 12, fontWeight: 600, fontSize: 14,
          boxShadow: '0 8px 32px rgba(16,185,129,0.4)',
        }}>{toast}</div>
      )}

      {/* Date picker */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24,
        background: C.card, borderRadius: 14, padding: '16px 20px',
        border: `1px solid ${C.border}`,
      }}>
        <span style={{ fontSize: 13, color: C.textSub, fontWeight: 500 }}>📅 Select Date:</span>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{
          padding: '8px 14px', borderRadius: 8, border: `1px solid ${C.border}`,
          background: C.bg, color: C.text, fontSize: 14, cursor: 'pointer',
          outline: 'none', colorScheme: isDark ? 'dark' : 'light',
        }} />
      </div>

      {!data?.assignment ? (
        <EmptyState icon="📭" text={`No assignment found for ${date}`} sub="Admin add questions from Questions tab first, or no trainee submitted yet." />
      ) : selected ? (
        <GradeForm submission={selected} questions={data.assignment.questions} onBack={() => setSelected(null)} onSaved={onGraded} />
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{
              background: C.accentSoft, border: `1px solid rgba(124,58,237,0.3)`,
              borderRadius: 10, padding: '8px 16px', fontSize: 13, color: '#a78bfa', fontWeight: 600,
            }}>
              📋 {data.assignment.title} — {data.submissions.length} submissions
            </div>
          </div>

          {/* Table */}
          <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: `1px solid ${C.border}` }}>
                  {['#', 'Student', 'Submitted', 'Score', 'Status', 'Action'].map(h => (
                    <th key={h} style={{ padding: '14px 18px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.submissions.map((sub, i) => (
                  <tr key={sub._id} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: '14px 18px', color: C.textMuted, fontSize: 13 }}>{i + 1}</td>
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 34, height: 34, borderRadius: '50%',
                          background: 'linear-gradient(135deg,#3b82f6,#a78bfa)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 14, fontWeight: 700, color: '#fff', flexShrink: 0,
                        }}>{(sub.userId?.name || '?')[0].toUpperCase()}</div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{sub.userId?.name}</div>
                          <div style={{ fontSize: 12, color: C.textMuted }}>{sub.userId?.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '14px 18px', fontSize: 13, color: C.textSub }}>
                      {sub.submittedAt ? new Date(sub.submittedAt).toLocaleTimeString() : '—'}
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      {sub.manualScore !== null && sub.manualScore !== undefined
                        ? <span style={{ fontSize: 16, fontWeight: 700, color: '#10b981' }}>{sub.manualScore}</span>
                        : <span style={{ color: C.textMuted }}>—</span>}
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      {sub.gradedAt
                        ? <Chip color="#10b981">✅ Graded</Chip>
                        : sub.status === 'submitted'
                        ? <Chip color="#f59e0b">⏳ Pending</Chip>
                        : <Chip color="#64748b">📝 In Progress</Chip>}
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      {sub.status === 'submitted' && (
                        <button onClick={() => setSelected(sub)} style={{
                          padding: '7px 16px', borderRadius: 8, border: 'none',
                          background: C.accentSoft, color: '#a78bfa',
                          fontSize: 13, fontWeight: 600, cursor: 'pointer',
                          border: '1px solid rgba(124,58,237,0.3)',
                        }}>
                          {sub.gradedAt ? '✏️ Re-grade' : '📋 Grade'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function GradeForm({ submission, questions, onBack, onSaved }) {
  const [scores,      setScores]      = useState(() => {
    const s = {};
    (submission.questionScores || []).forEach((qs, i) => {
      const q = questions[qs.questionIndex ?? i];
      if (q) s[q._id] = qs.score;
    });
    return s;
  });
  const [feedback,    setFeedback]    = useState(submission.trainerFeedback || '');
  const [manualScore, setManualScore] = useState(submission.manualScore ?? '');
  const [autoTotal,   setAutoTotal]   = useState(false);
  const [saving,      setSaving]      = useState(false);

  const answerMap = {};
  (submission.answers || []).forEach(a => { if (a.questionId) answerMap[a.questionId] = a.answer; });

  useEffect(() => {
    if (autoTotal) {
      const t = Object.values(scores).reduce((a, b) => a + (Number(b) || 0), 0);
      setManualScore(t);
    }
  }, [scores, autoTotal]);

  const save = async () => {
    setSaving(true);
    try {
      const questionScores = questions.map((q, i) => ({
        questionIndex: i, score: Number(scores[q._id]) || 0, maxScore: q.marks || 10, feedback: '',
      }));
      const res = await api.patch(
        `${API}/trainer/submissions/${submission._id}/grade`,
        { manualScore: Number(manualScore) || 0, trainerFeedback: feedback, questionScores },
        headers()
      );
      onSaved(res.data.submission);
    } catch (e) { alert('Error saving: ' + (e.response?.data?.message || e.message)); }
    setSaving(false);
  };

  const totalMax = questions.reduce((s, q) => s + (q.marks || 10), 0);
  const sections = ['A', 'B', 'C'];
  const secColors = { A: '#10b981', B: '#3b82f6', C: '#a78bfa' };

  return (
    <div>
      <button onClick={onBack} style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '8px 16px', borderRadius: 8, border: `1px solid ${C.border}`,
        background: C.card, color: C.textSub, fontSize: 13, cursor: 'pointer', marginBottom: 20,
      }}>← Back to list</button>

      {/* Student header card */}
      <div style={{
        background: C.card, borderRadius: 16, padding: '20px 24px',
        border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24,
      }}>
        <div style={{
          width: 52, height: 52, borderRadius: '50%',
          background: 'linear-gradient(135deg,#3b82f6,#a78bfa)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, fontWeight: 700, color: '#fff',
        }}>{(submission.userId?.name || '?')[0].toUpperCase()}</div>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700 }}>{submission.userId?.name}</div>
          <div style={{ fontSize: 12, color: C.textMuted }}>{submission.userId?.email}</div>
          <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>
            Submitted: {submission.submittedAt ? new Date(submission.submittedAt).toLocaleString() : '—'}
          </div>
        </div>
      </div>

      {/* Section cards */}
      {sections.map(sec => {
        const secQs = questions.filter(q => q.section === sec);
        if (!secQs.length) return null;
        const color = secColors[sec];
        const secEarned = secQs.reduce((s, q) => s + (Number(scores[q._id]) || 0), 0);
        const secMax    = secQs.reduce((s, q) => s + (q.marks || 0), 0);

        return (
          <div key={sec} style={{ marginBottom: 24 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12,
              padding: '12px 18px', background: `${color}12`,
              borderLeft: `4px solid ${color}`, borderRadius: '0 12px 12px 0',
            }}>
              <span style={{ fontWeight: 700, color, fontSize: 15 }}>Section {sec}</span>
              <span style={{ fontSize: 12, color: C.textMuted }}>{secQs.length} question{secQs.length > 1 ? 's' : ''} · {secMax} marks</span>
              <span style={{ marginLeft: 'auto', fontWeight: 800, color, fontSize: 16 }}>{secEarned} / {secMax}</span>
            </div>

            {secQs.map((q, qi) => {
              const answer = answerMap[q._id?.toString()] || answerMap[q._id] || '';
              const hasAnswer = answer && answer.trim().length > 0;
              return (
                <div key={q._id} style={{
                  background: C.card, borderRadius: 12, padding: 18, marginBottom: 12,
                  border: `1px solid ${C.border}`, borderLeft: `3px solid ${color}`,
                }}>
                  <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                    <span style={{
                      background: color, color: '#fff', fontWeight: 700,
                      fontSize: 11, borderRadius: 6, padding: '3px 9px', flexShrink: 0, height: 'fit-content',
                    }}>Q{qi + 1}</span>
                    <div style={{ fontSize: 14, fontWeight: 600, color: C.text, lineHeight: 1.5 }}>{q.text || ''}</div>
                  </div>

                  <div style={{
                    background: hasAnswer ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)',
                    borderLeft: `3px solid ${hasAnswer ? '#10b981' : '#ef4444'}`,
                    borderRadius: '0 8px 8px 0', padding: '10px 14px', marginBottom: 12,
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: hasAnswer ? '#10b981' : '#ef4444', marginBottom: 6 }}>
                      {hasAnswer ? '✅ Trainee Answer' : '❌ No Answer Provided'}
                    </div>
                    <p style={{ margin: 0, fontSize: 13, color: hasAnswer ? C.textSub : C.textMuted, lineHeight: 1.6, whiteSpace: 'pre-wrap', fontStyle: hasAnswer ? 'normal' : 'italic' }}>
                      {hasAnswer ? answer : 'The trainee did not answer this question.'}
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 13, color: C.textSub, fontWeight: 500 }}>Score:</span>
                    <input
                      type="number" min="0" max={q.marks || 10}
                      value={scores[q._id] ?? ''}
                      onChange={e => setScores(prev => ({ ...prev, [q._id]: e.target.value }))}
                      style={{
                        width: 64, padding: '6px 10px', borderRadius: 8,
                        border: `1px solid ${C.border}`, background: C.bg,
                        color: C.text, fontSize: 14, textAlign: 'center', outline: 'none',
                      }}
                      placeholder="0"
                    />
                    <span style={{ fontSize: 13, color: C.textMuted }}>/ {q.marks || 10} marks</span>
                    {scores[q._id] !== undefined && scores[q._id] !== '' && (() => {
                      const pct = Math.round((Number(scores[q._id]) / (q.marks || 10)) * 100);
                      const cl  = pct >= 70 ? '#10b981' : pct >= 40 ? '#f59e0b' : '#ef4444';
                      return <span style={{ fontSize: 12, fontWeight: 700, color: cl, background: `${cl}18`, borderRadius: 20, padding: '2px 10px' }}>{pct}%</span>;
                    })()}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}

      {/* Grade summary */}
      <div style={{ background: C.card, borderRadius: 16, padding: 24, border: `1px solid ${C.border}`, marginBottom: 20 }}>
        <SectionTitle>📊 Grade Summary</SectionTitle>

        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          {sections.map(sec => {
            const secQs = questions.filter(q => q.section === sec);
            if (!secQs.length) return null;
            const earned = secQs.reduce((s, q) => s + (Number(scores[q._id]) || 0), 0);
            const max    = secQs.reduce((s, q) => s + (q.marks || 0), 0);
            const color  = secColors[sec];
            const pct    = max > 0 ? Math.round((earned / max) * 100) : 0;
            return (
              <div key={sec} style={{
                flex: 1, minWidth: 90, borderRadius: 12, padding: '14px 16px', textAlign: 'center',
                background: `${color}10`, border: `1px solid ${color}30`,
              }}>
                <div style={{ fontSize: 11, color, fontWeight: 700, marginBottom: 4 }}>Section {sec}</div>
                <div style={{ fontSize: 24, fontWeight: 800, color }}>
                  {earned}<span style={{ fontSize: 13, color: C.textMuted, fontWeight: 400 }}>/{max}</span>
                </div>
                <div style={{ fontSize: 11, color: C.textMuted }}>{pct}%</div>
              </div>
            );
          })}
          <div style={{
            flex: 1, minWidth: 90, borderRadius: 12, padding: '14px 16px', textAlign: 'center',
            background: C.accentSoft, border: '1px solid rgba(124,58,237,0.3)',
          }}>
            <div style={{ fontSize: 11, color: '#a78bfa', fontWeight: 700, marginBottom: 4 }}>Total</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#a78bfa' }}>
              {Object.values(scores).reduce((a, b) => a + (Number(b) || 0), 0)}
              <span style={{ fontSize: 13, color: C.textMuted, fontWeight: 400 }}>/{totalMax}</span>
            </div>
            <div style={{ fontSize: 11, color: C.textMuted }}>
              {totalMax > 0 ? Math.round((Object.values(scores).reduce((a, b) => a + (Number(b) || 0), 0) / totalMax) * 100) : 0}%
            </div>
          </div>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, fontSize: 13, color: C.textSub, cursor: 'pointer' }}>
          <input type="checkbox" checked={autoTotal} onChange={e => setAutoTotal(e.target.checked)} style={{ accentColor: '#7c3aed', width: 16, height: 16 }} />
          Auto-calculate total from section scores
        </label>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: C.textSub }}>Final Score:</label>
          <input
            type="number" value={manualScore} disabled={autoTotal}
            onChange={e => setManualScore(e.target.value)}
            style={{
              width: 80, padding: '8px 12px', borderRadius: 8,
              border: `1px solid ${C.border}`, background: autoTotal ? C.bg : C.bg,
              color: autoTotal ? '#a78bfa' : C.text, fontSize: 15, fontWeight: 700,
              textAlign: 'center', outline: 'none',
              opacity: autoTotal ? 0.7 : 1,
            }}
            placeholder="0"
          />
          <span style={{ color: C.textMuted, fontSize: 13 }}>/ {totalMax}</span>
          {autoTotal && <Chip color="#10b981">✅ Auto-calculated</Chip>}
        </div>

        <div style={{ marginBottom: 4, fontSize: 13, fontWeight: 600, color: C.textSub }}>💬 Feedback to Trainee:</div>
        <textarea
          value={feedback} rows={4}
          onChange={e => setFeedback(e.target.value)}
          placeholder="Write detailed feedback — strengths, areas to improve, specific comments per section…"
          style={{
            width: '100%', borderRadius: 10, border: `1px solid ${C.border}`,
            background: C.bg, color: C.text, padding: '12px 14px',
            fontSize: 14, resize: 'vertical', boxSizing: 'border-box',
            outline: 'none', lineHeight: 1.6,
          }}
        />
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onBack} style={{
          padding: '12px 20px', borderRadius: 10, border: `1px solid ${C.border}`,
          background: C.card, color: C.textSub, fontSize: 14, fontWeight: 600, cursor: 'pointer',
        }}>← Cancel</button>
        <button onClick={save} disabled={saving} style={{
          flex: 1, padding: '12px 20px', borderRadius: 10, border: 'none',
          background: saving ? '#374151' : 'linear-gradient(135deg,#7c3aed,#10b981)',
          color: '#fff', fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s',
        }}>
          {saving ? '💾 Saving…' : '💾 Save Grade & Feedback'}
        </button>
      </div>
      <div style={{ marginTop: 10, fontSize: 12, color: C.textMuted, textAlign: 'center' }}>
        After saving, Admin will review and publish the score to the trainee.
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  STUDENTS TAB
// ════════════════════════════════════════════════════════════
function StudentsTab({ courseId }) {
  const [students, setStudents] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    setLoading(true);
    const params = courseId ? `?courseId=${courseId}` : '';
    api.get(`${API}/trainer/students${params}`, headers())
      .then(r => setStudents(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [courseId]);

  const filtered = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <Loader />;

  const avatarColors = ['#3b82f6','#10b981','#a78bfa','#f59e0b','#ef4444','#ec4899','#06b6d4'];

  return (
    <div>
      <PageHeader title="Students" subtitle={`${students.length} enrolled students`} icon="👥" />

      {selected ? (
        <StudentDetail student={selected} onBack={() => setSelected(null)} />
      ) : (
        <>
          {/* Search */}
          <div style={{ position: 'relative', maxWidth: 420, marginBottom: 24 }}>
            <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: C.textMuted, fontSize: 16 }}>🔍</span>
            <input
              placeholder="Search by name or email…"
              value={search} onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%', padding: '11px 16px 11px 40px',
                borderRadius: 10, border: `1px solid ${C.border}`,
                background: C.card, color: C.text, fontSize: 14,
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 16 }}>
            {filtered.map((s, idx) => {
              const color = avatarColors[idx % avatarColors.length];
              return (
                <div key={s._id} onClick={() => setSelected(s)} style={{
                  background: C.card, borderRadius: 16, padding: '24px 20px',
                  border: `1px solid ${C.border}`, textAlign: 'center',
                  cursor: 'pointer', transition: 'all 0.2s',
                }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#7c3aed'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
                >
                  <div style={{
                    width: 56, height: 56, borderRadius: '50%',
                    background: `linear-gradient(135deg,${color},${color}88)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 22, fontWeight: 700, color: '#fff', margin: '0 auto 14px',
                  }}>{s.name[0].toUpperCase()}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 4 }}>{s.name}</div>
                  <div style={{ fontSize: 12, color: C.textMuted }}>{s.email}</div>
                  {s.phone && <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>📞 {s.phone}</div>}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function StudentDetail({ student, onBack }) {
  const [subs,    setSubs]    = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`${API}/trainer/submissions/student/${student._id}`, headers())
      .then(r => setSubs(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [student._id]);

  return (
    <div>
      <button onClick={onBack} style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '8px 16px', borderRadius: 8, border: `1px solid ${C.border}`,
        background: C.card, color: C.textSub, fontSize: 13, cursor: 'pointer', marginBottom: 20,
      }}>← Back to students</button>

      <div style={{
        background: C.card, borderRadius: 16, padding: '24px',
        border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 20, marginBottom: 28,
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: 'linear-gradient(135deg,#3b82f6,#a78bfa)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 26, fontWeight: 700, color: '#fff', flexShrink: 0,
        }}>{student.name[0].toUpperCase()}</div>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{student.name}</div>
          <div style={{ fontSize: 13, color: C.textMuted, marginTop: 4 }}>{student.email}</div>
          {student.phone && <div style={{ fontSize: 13, color: C.textMuted, marginTop: 2 }}>📞 {student.phone}</div>}
        </div>
      </div>

      <SectionTitle>📋 Assignment History</SectionTitle>
      {loading ? <Loader /> : subs.length === 0 ? (
        <EmptyState icon="📭" text="No submissions yet" />
      ) : (
        <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: `1px solid ${C.border}` }}>
                {['Assignment', 'Date', 'Status', 'Score', 'Feedback'].map(h => (
                  <th key={h} style={{ padding: '14px 18px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {subs.map((sub, i) => (
                <tr key={sub._id} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: '14px 18px', fontSize: 14, color: C.text }}>{sub.assignmentId?.title || `Assignment (${sub.date})`}</td>
                  <td style={{ padding: '14px 18px', fontSize: 13, color: C.textSub }}>{sub.date || sub.assignmentId?.date || '—'}</td>
                  <td style={{ padding: '14px 18px' }}>
                    {sub.status === 'submitted'
                      ? <Chip color="#10b981">✅ Submitted</Chip>
                      : <Chip color="#f59e0b">⏳ In Progress</Chip>}
                  </td>
                  <td style={{ padding: '14px 18px', fontSize: 14, fontWeight: 700, color: sub.manualScore != null ? '#10b981' : C.textMuted }}>
                    {sub.manualScore != null ? sub.manualScore : '—'}
                  </td>
                  <td style={{ padding: '14px 18px', fontSize: 13, color: C.textSub }}>{sub.trainerFeedback || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  GROUP CHAT
// ════════════════════════════════════════════════════════════
function GroupChat({ user, initialCourseId }) {
  const [courses,    setCourses]    = useState([]);
  const [courseId,   setCourseId]   = useState(initialCourseId || '');
  const [messages,   setMessages]   = useState([]);
  const [text,       setText]       = useState('');
  const [visibility, setVisibility] = useState('everyone');
  const [loading,    setLoading]    = useState(false);
  const [sending,    setSending]    = useState(false);
  const [connected,  setConnected]  = useState(false);
  const [typing,     setTyping]     = useState(null);
  const [showVis,    setShowVis]    = useState(false);

  const bottomRef = useRef(null);
  const inputRef  = useRef(null);
  const typTimer  = useRef(null);
  const socketRef = useRef(null);

  const myId   = user._id || user.id;
  const myName = user.name || 'Trainer';
  const myRole = user.role || 'trainer';

  useEffect(() => { if (initialCourseId) setCourseId(initialCourseId); }, [initialCourseId]);

  useEffect(() => {
    api.get(`${API}/courses`, headers()).then(r => setCourses(r.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!courseId) return;
    setLoading(true);
    api.get(`${API}/chat/${courseId}`, headers())
      .then(r => setMessages(r.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [courseId]);

  useEffect(() => {
    if (!courseId || !myId) return;
    const s = io(SOCKET_URL, { transports: ['websocket'], reconnection: true, reconnectionAttempts: 10, auth: { token: token() } });
    socketRef.current = s;
    const joinRoom     = () => s.emit('join-course-chat', { courseId, userId: myId, userName: myName, userRole: myRole });
    const onConnect    = () => { setConnected(true); joinRoom(); };
    const onDisconnect = () => setConnected(false);
    const onMsg        = (msg) => { if (canSee(msg, user)) setMessages(prev => prev.some(m => m._id === msg._id) ? prev : [...prev, msg]); };
    const onDeleted    = ({ _id }) => setMessages(prev => prev.filter(m => m._id !== _id));
    const onTyping     = ({ userName: n }) => { if (n !== myName) { setTyping(n); clearTimeout(typTimer.current); typTimer.current = setTimeout(() => setTyping(null), 3000); } };
    const onStopTyping = () => setTyping(null);
    s.on('connect', onConnect); s.on('disconnect', onDisconnect);
    s.on('chat-message', onMsg); s.on('chat-message-deleted', onDeleted);
    s.on('user-typing', onTyping); s.on('user-stop-typing', onStopTyping);
    if (s.connected) { setConnected(true); joinRoom(); }
    return () => { s.emit('leave-course-chat', { courseId }); s.disconnect(); socketRef.current = null; };
  }, [courseId, myId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, typing]);

  const send = () => {
    const msg = text.trim();
    if (!msg || sending || !courseId) return;
    setSending(true);
    socketRef.current?.emit('send-chat-message', { courseId, senderId: myId, senderName: myName, senderRole: myRole, message: msg, visibility });
    socketRef.current?.emit('stop-typing', { courseId });
    setText(''); setSending(false);
    inputRef.current?.focus();
  };

  const deleteMsg = async (msgId) => {
    if (!window.confirm('Delete this message?')) return;
    try { await api.delete(`${API}/chat/${courseId}/${msgId}`, headers()); }
    catch { alert('Cannot delete'); }
  };

  const handleTyping = (e) => {
    setText(e.target.value);
    socketRef.current?.emit('typing', { courseId, userName: myName });
    clearTimeout(typTimer.current);
    typTimer.current = setTimeout(() => socketRef.current?.emit('stop-typing', { courseId }), 1500);
  };

  const currentVis = VIS_OPTIONS.find(v => v.value === visibility);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)' }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16,
        background: C.card, borderRadius: 16, padding: '16px 20px',
        border: `1px solid ${C.border}`,
      }}>
        <div style={{
          width: 42, height: 42, borderRadius: 12,
          background: 'linear-gradient(135deg,#7c3aed,#a78bfa)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
        }}>💬</div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>Group Chat</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: C.textMuted, marginTop: 2 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: connected ? '#10b981' : '#ef4444', display: 'inline-block' }} />
            {connected ? 'Live — real-time' : 'Connecting…'}
            <span>· {messages.length} messages</span>
          </div>
        </div>

        {courses.length >= 1 && (
          <select value={courseId} onChange={e => setCourseId(e.target.value)} style={{
            marginLeft: 'auto', padding: '8px 12px', borderRadius: 8,
            border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 13, outline: 'none',
          }}>
            <option value="">— Select course —</option>
            {courses.map(c => <option key={c._id} value={c._id}>{c.title}</option>)}
          </select>
        )}
      </div>

      {!courseId ? (
        <EmptyState icon="⏳" text="Loading chat…" />
      ) : (
        <>
          {/* Messages */}
          <div style={{
            flex: 1, overflowY: 'auto', background: C.card,
            borderRadius: 16, padding: 16, marginBottom: 12,
            border: `1px solid ${C.border}`,
          }}>
            {loading ? <Loader /> : messages.length === 0 ? (
              <EmptyState icon="💬" text="No messages yet. Say hello! 👋" />
            ) : messages.map((msg, i) => {
              const isMe     = msg.senderId?.toString() === myId?.toString();
              const prev     = messages[i - 1];
              const showMeta = !prev || prev.senderId?.toString() !== msg.senderId?.toString() || new Date(msg.createdAt) - new Date(prev.createdAt) > 300000;
              const visBadge = msg.visibility !== 'everyone' ? VIS_OPTIONS.find(v => v.value === msg.visibility) : null;
              const rColor   = roleColor(msg.senderRole);

              return (
                <div key={msg._id || i} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', marginTop: showMeta ? 14 : 2, alignItems: 'flex-end', gap: 8 }}>
                  {!isMe && showMeta && (
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: rColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                      {(msg.senderName || '?')[0].toUpperCase()}
                    </div>
                  )}
                  {!isMe && !showMeta && <div style={{ width: 32, flexShrink: 0 }} />}

                  <div style={{ maxWidth: '65%' }}>
                    {showMeta && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexDirection: isMe ? 'row-reverse' : 'row' }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: rColor }}>{isMe ? 'You' : msg.senderName}</span>
                        {msg.senderRole !== 'student' && (
                          <span style={{ fontSize: 10, background: `${rColor}22`, color: rColor, border: `1px solid ${rColor}44`, borderRadius: 10, padding: '1px 7px', fontWeight: 600 }}>
                            {msg.senderRole}
                          </span>
                        )}
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, flexDirection: isMe ? 'row-reverse' : 'row' }}>
                      <div style={{
                        padding: '10px 14px', borderRadius: isMe ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                        background: isMe ? 'linear-gradient(135deg,#7c3aed,#a78bfa)' : 'rgba(255,255,255,0.06)',
                        color: C.text, fontSize: 14, lineHeight: 1.5, wordBreak: 'break-word',
                        border: isMe ? 'none' : `1px solid ${C.border}`,
                        position: 'relative',
                      }}>
                        {msg.message}
                        <button onClick={() => deleteMsg(msg._id)} style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          fontSize: 15, color: 'rgba(255,255,255,0.3)', padding: '0 0 0 8px',
                          verticalAlign: 'middle', lineHeight: 1,
                        }} title="Delete">×</button>
                      </div>
                      <div style={{ fontSize: 10, color: C.textMuted, whiteSpace: 'nowrap', paddingBottom: 2 }}>{fmtTime(msg.createdAt)}</div>
                    </div>
                    {visBadge && (
                      <div style={{ fontSize: 10, color: visBadge.color, marginTop: 4, textAlign: isMe ? 'right' : 'left' }}>{visBadge.label}</div>
                    )}
                  </div>
                </div>
              );
            })}
            {typing && (
              <div style={{ fontSize: 12, color: C.textMuted, padding: '8px 4px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ display: 'flex', gap: 3 }}>
                  {[0,1,2].map(i => <span key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: C.textMuted, display: 'inline-block', animation: `bounce 1.2s ${i*0.2}s infinite` }} />)}
                </div>
                {typing} is typing…
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input area */}
          <div style={{ background: C.card, borderRadius: 16, padding: '14px 16px', border: `1px solid ${C.border}` }}>
            {/* Visibility */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, position: 'relative' }}>
              <span style={{ fontSize: 12, color: C.textMuted }}>Send to:</span>
              <button onClick={() => setShowVis(v => !v)} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '4px 12px', borderRadius: 20,
                border: `1px solid ${currentVis.color}44`,
                background: `${currentVis.color}15`, color: currentVis.color,
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}>{currentVis.label} ▾</button>
              <span style={{ fontSize: 11, color: C.textMuted }}>{currentVis.desc}</span>

              {showVis && (
                <div style={{
                  position: 'absolute', bottom: '130%', left: 60,
                  background: C.card, border: `1px solid ${C.border}`,
                  borderRadius: 14, padding: 8, zIndex: 999, minWidth: 250,
                  boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
                }}>
                  {VIS_OPTIONS.map(opt => (
                    <button key={opt.value} onClick={() => { setVisibility(opt.value); setShowVis(false); }} style={{
                      display: 'block', width: '100%', padding: '10px 14px', border: 'none',
                      background: visibility === opt.value ? `${opt.color}15` : 'transparent',
                      color: visibility === opt.value ? opt.color : C.textSub,
                      fontSize: 13, cursor: 'pointer', textAlign: 'left',
                      fontWeight: visibility === opt.value ? 700 : 400, borderRadius: 10, marginBottom: 2,
                    }}>
                      {opt.label}
                      <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 400 }}>{opt.desc}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <input
                ref={inputRef}
                value={text}
                onChange={handleTyping}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send())}
                placeholder="Type a message… (Enter to send)"
                style={{
                  flex: 1, padding: '12px 16px', borderRadius: 12,
                  border: `1px solid ${C.border}`, background: C.bg,
                  color: C.text, fontSize: 14, outline: 'none',
                }}
                disabled={sending}
              />
              <button onClick={send} disabled={sending || !text.trim()} style={{
                width: 46, height: 46, borderRadius: 12, border: 'none',
                background: !text.trim() ? C.border : 'linear-gradient(135deg,#7c3aed,#a78bfa)',
                color: '#fff', fontSize: 18, cursor: !text.trim() ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                transition: 'all 0.2s',
              }}>➤</button>
            </div>
          </div>
        </>
      )}

      <style>{`@keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-5px)} }`}</style>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  SESSION NOTES
// ════════════════════════════════════════════════════════════
function SessionNotes({ courseId }) {
  const { isDark } = useTheme();
  const C = makeC(isDark);
  const todayStr = new Date().toISOString().split('T')[0];
  const [notes,   setNotes]   = useState([]);
  const [expandedNotes, setExpandedNotes] = useState({});
  const [loading, setLoading] = useState(true);
  const [date,    setDate]    = useState(todayStr);
  const [topic,   setTopic]   = useState('');
  const [content, setContent] = useState('');
  const [tags,    setTags]    = useState('');
  const [shared,  setShared]  = useState(true);
  const [editing, setEditing] = useState(null); // note _id being edited
  const [saving,  setSaving]  = useState(false);
  const [toast,   setToast]   = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = courseId ? `?courseId=${courseId}` : '';
      const res = await api.get(`${API}/session-notes${params}`, headers());
      setNotes(res.data || []);
    } catch { showToast('⚠️ Failed to load notes'); }
    setLoading(false);
  }, [courseId]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!topic.trim() || !content.trim()) return showToast('⚠️ Topic and content required');
    if (!courseId) return showToast('⚠️ No course selected');
    setSaving(true);
    try {
      const payload = {
        courseId, date, topic: topic.trim(), content: content.trim(),
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        sharedWithStudents: shared,
      };
      if (editing) {
        await api.patch(`${API}/session-notes/${editing}`, payload, headers());
        showToast('✅ Note updated!');
      } else {
        await api.post(`${API}/session-notes`, payload, headers());
        showToast('✅ Session note saved!');
      }
      setTopic(''); setContent(''); setTags(''); setEditing(null); setShared(true); setDate(todayStr);
      load();
    } catch (e) { showToast('⚠️ ' + (e.response?.data?.message || e.message)); }
    setSaving(false);
  };

  const deleteNote = async (id) => {
    if (!window.confirm('Delete this note?')) return;
    try {
      await api.delete(`${API}/session-notes/${id}`, headers());
      showToast('🗑️ Note deleted');
      load();
    } catch { showToast('⚠️ Delete failed'); }
  };

  const startEdit = (n) => {
    setEditing(n._id); setDate(n.date); setTopic(n.topic);
    setContent(n.content); setTags((n.tags || []).join(', '));
    setShared(n.sharedWithStudents || false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleShare = async (n) => {
    try {
      const updated = await api.patch(`${API}/session-notes/${n._id}`, { sharedWithStudents: !n.sharedWithStudents }, headers());
      setNotes(prev => prev.map(x => x._id === n._id ? updated.data : x));
      showToast(updated.data.sharedWithStudents ? '✅ Shared with students!' : '🔒 Hidden from students');
    } catch { showToast('⚠️ Failed to update'); }
  };

  const shareAllNotes = async () => {
    const privateNotes = notes.filter(n => !n.sharedWithStudents);
    if (privateNotes.length === 0) return showToast('ℹ️ All notes already shared!');
    try {
      await Promise.all(privateNotes.map(n => api.patch(`${API}/session-notes/${n._id}`, { sharedWithStudents: true }, headers())));
      setNotes(prev => prev.map(n => ({ ...n, sharedWithStudents: true })));
      showToast(`✅ ${privateNotes.length} notes shared with students!`);
    } catch { showToast('⚠️ Failed to share all'); }
  };

  const tagColors = ['#3b82f6','#10b981','#a78bfa','#f59e0b','#ec4899','#06b6d4'];

  return (
    <div>
      {toast && <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 9999, background: '#10b981', color: '#fff', padding: '12px 20px', borderRadius: 12, fontWeight: 600, fontSize: 14, boxShadow: '0 8px 32px rgba(16,185,129,0.4)' }}>{toast}</div>}
      <PageHeader title="Session Notes" subtitle="Log what you covered — share with students" icon="🗒️" />

      {notes.some(n => !n.sharedWithStudents) && (
        <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 12, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ fontSize: 13, color: '#ef4444', fontWeight: 600 }}>🔒 {notes.filter(n => !n.sharedWithStudents).length} note(s) are Private — Students cannot see them!</div>
          <button onClick={shareAllNotes} style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: '#10b981', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>👁️ Share All</button>
        </div>
      )}

      {/* Add / Edit form */}
      <div style={{ background: C.card, borderRadius: 18, padding: 24, border: `1px solid ${C.border}`, marginBottom: 28 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 16 }}>
          {editing ? '✏️ Edit Note' : '➕ New Session Note'}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={{ fontSize: 12, color: C.textMuted, fontWeight: 600, display: 'block', marginBottom: 6 }}>📅 Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 13, outline: 'none', boxSizing: 'border-box', colorScheme: isDark ? 'dark' : 'light' }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: C.textMuted, fontWeight: 600, display: 'block', marginBottom: 6 }}>🏷️ Tags (comma-separated)</label>
            <input value={tags} onChange={e => setTags(e.target.value)} placeholder="e.g. Python, OOP, Loops" style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, color: C.textMuted, fontWeight: 600, display: 'block', marginBottom: 6 }}>📌 Topic / Title</label>
          <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. Introduction to Functions in Python" style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, color: C.textMuted, fontWeight: 600, display: 'block', marginBottom: 6 }}>📝 Session Notes</label>
          <textarea value={content} onChange={e => setContent(e.target.value)} rows={5} placeholder="What did you cover? Key points, examples explained, exercises done, homework given…" style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 14, resize: 'vertical', outline: 'none', lineHeight: 1.6, boxSizing: 'border-box' }} />
        </div>

        {/* Share toggle */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, cursor: 'pointer', padding: '10px 14px', borderRadius: 10, background: shared ? 'rgba(16,185,129,0.08)' : C.bg, border: `1px solid ${shared ? 'rgba(16,185,129,0.3)' : C.border}`, transition: 'all 0.2s' }}>
          <input type="checkbox" checked={shared} onChange={e => setShared(e.target.checked)} style={{ accentColor: '#10b981', width: 16, height: 16 }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: shared ? '#10b981' : C.text }}>👁️ Share with students</div>
            <div style={{ fontSize: 11, color: C.textMuted }}>Students will see this note in their MyCourse page</div>
          </div>
        </label>

        <div style={{ display: 'flex', gap: 10 }}>
          {editing && (
            <button onClick={() => { setEditing(null); setTopic(''); setContent(''); setTags(''); setDate(todayStr); setShared(true); }} style={{ padding: '10px 20px', borderRadius: 10, border: `1px solid ${C.border}`, background: C.bg, color: C.textSub, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
          )}
          <button onClick={save} disabled={saving} style={{ flex: 1, padding: '11px 20px', borderRadius: 10, border: 'none', background: saving ? '#374151' : 'linear-gradient(135deg,#7c3aed,#a78bfa)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? '💾 Saving…' : editing ? '💾 Update Note' : '💾 Save Note'}
          </button>
        </div>
      </div>

      {loading ? <Loader /> : notes.length === 0 ? (
        <EmptyState icon="🗒️" text="No session notes yet" sub="Start logging what you cover each day." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {notes.map(n => {
            const isExpanded = !!expandedNotes[n._id];
            return (
            <div key={n._id} style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, borderLeft: `4px solid ${n.sharedWithStudents ? '#10b981' : '#7c3aed'}`, overflow: 'hidden' }}>
              {/* ── Collapsed header — always visible ── */}
              <div
                onClick={() => setExpandedNotes(prev => ({ ...prev, [n._id]: !prev[n._id] }))}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', cursor: 'pointer', userSelect: 'none' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>{isExpanded ? '📖' : '📄'}</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 260 }}>{n.topic}</div>
                    <div style={{ fontSize: 11, color: C.textMuted }}>{n.date}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
                  <button onClick={e => { e.stopPropagation(); toggleShare(n); }} title={n.sharedWithStudents ? 'Hide from students' : 'Share with students'} style={{ padding: '4px 10px', borderRadius: 8, border: `1px solid ${n.sharedWithStudents ? 'rgba(16,185,129,0.4)' : C.border}`, background: n.sharedWithStudents ? 'rgba(16,185,129,0.12)' : C.bg, color: n.sharedWithStudents ? '#10b981' : C.textMuted, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                    {n.sharedWithStudents ? '👁️ Shared' : '🔒 Private'}
                  </button>
                  <button onClick={e => { e.stopPropagation(); startEdit(n); }} style={{ padding: '4px 10px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.accentSoft, color: '#a78bfa', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>✏️</button>
                  <button onClick={e => { e.stopPropagation(); deleteNote(n._id); }} style={{ padding: '4px 10px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#ef4444', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>🗑️</button>
                  <span style={{ color: C.textMuted, fontSize: 13, marginLeft: 2 }}>{isExpanded ? '▲' : '▼'}</span>
                </div>
              </div>
              {/* ── Expanded body ── */}
              {isExpanded && (
                <div style={{ padding: '0 20px 16px 20px', borderTop: `1px solid ${C.border}` }}>
                  {(n.tags || []).length > 0 && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12, marginBottom: 10 }}>
                      {n.tags.map((t, i) => (
                        <span key={t} style={{ fontSize: 11, fontWeight: 600, color: tagColors[i % tagColors.length], background: `${tagColors[i % tagColors.length]}18`, border: `1px solid ${tagColors[i % tagColors.length]}33`, borderRadius: 20, padding: '2px 10px' }}>{t}</span>
                      ))}
                    </div>
                  )}
                  <div style={{ fontSize: 13, color: C.textSub, lineHeight: 1.7, whiteSpace: 'pre-wrap', marginTop: (n.tags || []).length > 0 ? 0 : 12 }}>{n.content}</div>
                </div>
              )}
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  DOUBT TRACKER
// ════════════════════════════════════════════════════════════
function DoubtTracker({ courseId }) {
  const { isDark } = useTheme();
  const C = makeC(isDark);
  const [doubts,  setDoubts]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState('all');
  const [toast,   setToast]   = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = courseId ? `?courseId=${courseId}` : '';
      const res = await api.get(`${API}/doubts${params}`, headers());
      setDoubts(res.data || []);
    } catch { showToast('⚠️ Failed to load doubts'); }
    setLoading(false);
  }, [courseId]);

  useEffect(() => { load(); }, [load]);

  const resolve = async (id, answer) => {
    try {
      const res = await api.patch(`${API}/doubts/${id}/resolve`, { answer }, headers());
      setDoubts(prev => prev.map(d => d._id === id ? res.data : d));
      showToast('✅ Marked as resolved!');
    } catch { showToast('⚠️ Failed to resolve'); }
  };

  const deleteDoubt = async (id) => {
    try {
      await api.delete(`${API}/doubts/${id}`, headers());
      setDoubts(prev => prev.filter(d => d._id !== id));
      showToast('🗑️ Doubt deleted');
    } catch { showToast('⚠️ Delete failed'); }
  };

  const priorityColors = { high: '#ef4444', medium: '#f59e0b', low: '#10b981' };
  const filtered = filter === 'all' ? doubts : doubts.filter(d => d.status === filter);
  const pending  = doubts.filter(d => d.status === 'pending').length;

  return (
    <div>
      {toast && <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 9999, background: '#10b981', color: '#fff', padding: '12px 20px', borderRadius: 12, fontWeight: 600, fontSize: 14, boxShadow: '0 8px 32px rgba(16,185,129,0.4)' }}>{toast}</div>}
      <PageHeader title="Doubt Tracker" subtitle="Students submit doubts — resolve them here" icon="❓" />

      {/* Info banner */}
      <div style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.25)', borderRadius: 14, padding: '14px 18px', marginBottom: 24, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <span style={{ fontSize: 20 }}>💡</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#a78bfa', marginBottom: 3 }}>How this works</div>
          <div style={{ fontSize: 12, color: C.textSub, lineHeight: 1.6 }}>
            Students submit doubts from their <strong style={{ color: C.text }}>My Course</strong> page → they appear here. You resolve them and your answer is shown to the student.
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total', value: doubts.length, color: '#3b82f6' },
          { label: 'Pending', value: pending, color: '#f59e0b' },
          { label: 'Resolved', value: doubts.length - pending, color: '#10b981' },
        ].map(s => (
          <div key={s.label} style={{ flex: 1, background: C.card, borderRadius: 14, padding: '16px 20px', border: `1px solid ${C.border}`, textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
        {['all', 'pending', 'resolved'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '7px 18px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
            background: filter === f ? '#7c3aed' : C.card, color: filter === f ? '#fff' : C.textSub,
            border: filter === f ? 'none' : `1px solid ${C.border}`,
          }}>{f === 'all' ? `All (${doubts.length})` : f === 'pending' ? `⏳ Pending (${pending})` : `✅ Resolved (${doubts.length - pending})`}</button>
        ))}
        <button onClick={load} style={{ marginLeft: 'auto', padding: '7px 14px', borderRadius: 20, border: `1px solid ${C.border}`, background: C.card, color: C.textSub, fontSize: 13, cursor: 'pointer' }}>🔄 Refresh</button>
      </div>

      {loading ? <Loader /> : filtered.length === 0 ? (
        <EmptyState icon="✅" text={filter === 'pending' ? 'No pending doubts!' : filter === 'resolved' ? 'No resolved doubts yet' : 'No doubts submitted yet'} sub="Students submit doubts from their My Course page." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(d => (
            <DoubtCard key={d._id} doubt={d} priorityColors={priorityColors} C={C} onResolve={resolve} onDelete={deleteDoubt} />
          ))}
        </div>
      )}
    </div>
  );
}

function DoubtCard({ doubt: d, priorityColors, C, onResolve, onDelete }) {
  const [open,   setOpen]   = useState(false);
  const [answer, setAnswer] = useState(d.answer || '');
  const pColor = priorityColors[d.priority] || '#64748b';
  const studentName = d.studentId?.name || d.studentName || 'Unknown';

  return (
    <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, borderLeft: `4px solid ${d.status === 'resolved' ? '#10b981' : pColor}`, overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: pColor, background: `${pColor}18`, border: `1px solid ${pColor}33`, borderRadius: 20, padding: '2px 9px' }}>{d.priority?.toUpperCase()}</span>
              {d.status === 'resolved' && <span style={{ fontSize: 11, fontWeight: 700, color: '#10b981', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 20, padding: '2px 9px' }}>✅ RESOLVED</span>}
              <span style={{ fontSize: 11, color: C.textMuted }}>from <strong style={{ color: C.textSub }}>{studentName}</strong></span>
              <span style={{ fontSize: 11, color: C.textMuted }}>· {new Date(d.createdAt).toLocaleDateString('en-IN')}</span>
            </div>
            <div style={{ fontSize: 14, color: C.text, lineHeight: 1.6, fontWeight: 500 }}>{d.question}</div>
            {d.status === 'resolved' && d.answer && (
              <div style={{ marginTop: 10, padding: '10px 14px', background: 'rgba(16,185,129,0.06)', borderRadius: 10, borderLeft: '3px solid #10b981' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#10b981', marginBottom: 4 }}>💡 Your Resolution</div>
                <div style={{ fontSize: 13, color: C.textSub, lineHeight: 1.6 }}>{d.answer}</div>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            {d.status === 'pending' && (
              <button onClick={() => setOpen(o => !o)} style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid rgba(16,185,129,0.3)`, background: 'rgba(16,185,129,0.08)', color: '#10b981', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                {open ? '▲ Close' : '✅ Resolve'}
              </button>
            )}
            <button onClick={() => onDelete(d._id)} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#ef4444', fontSize: 12, cursor: 'pointer' }}>🗑️</button>
          </div>
        </div>

        {open && (
          <div style={{ marginTop: 14 }}>
            <textarea value={answer} onChange={e => setAnswer(e.target.value)} rows={3} placeholder="How did you resolve this doubt? Enter your explanation…" style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 13, resize: 'vertical', outline: 'none', lineHeight: 1.6, boxSizing: 'border-box', marginBottom: 10 }} />
            <button onClick={() => { onResolve(d._id, answer); setOpen(false); }} style={{ padding: '9px 20px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              ✅ Mark as Resolved
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  DAILY PLANNER
// ════════════════════════════════════════════════════════════
function DailyPlanner() {
  const { isDark } = useTheme();
  const C = makeC(isDark);
  const todayStr = new Date().toISOString().split('T')[0];
  const [date,  setDate]  = useState(todayStr);
  const [plans, setPlans] = useState(() => { try { return JSON.parse(localStorage.getItem('trainer_plans') || '{}'); } catch { return {}; } });
  const [toast, setToast] = useState('');

  const todayPlan  = plans[date] || { tasks: [], note: '' };
  const showToast  = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const savePlan = (updated) => {
    const all = { ...plans, [date]: updated };
    localStorage.setItem('trainer_plans', JSON.stringify(all));
    setPlans(all);
  };

  const addTask = () => {
    const task = { id: Date.now().toString(), text: '', time: '', done: false };
    savePlan({ ...todayPlan, tasks: [...todayPlan.tasks, task] });
  };

  const updateTask = (id, field, value) => {
    savePlan({ ...todayPlan, tasks: todayPlan.tasks.map(t => t.id === id ? { ...t, [field]: value } : t) });
  };

  const deleteTask = (id) => {
    savePlan({ ...todayPlan, tasks: todayPlan.tasks.filter(t => t.id !== id) });
  };

  const toggleDone = (id) => {
    savePlan({ ...todayPlan, tasks: todayPlan.tasks.map(t => t.id === id ? { ...t, done: !t.done } : t) });
  };

  const done   = todayPlan.tasks.filter(t => t.done).length;
  const total  = todayPlan.tasks.length;
  const pct    = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div>
      {toast && <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 9999, background: '#10b981', color: '#fff', padding: '12px 20px', borderRadius: 12, fontWeight: 600, fontSize: 14, boxShadow: '0 8px 32px rgba(16,185,129,0.4)' }}>{toast}</div>}
      <PageHeader title="Daily Planner" subtitle="Plan your teaching day, topic-by-topic" icon="📅" />

      {/* Date picker + progress */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, background: C.card, borderRadius: 18, padding: '20px 24px', border: `1px solid ${C.border}`, marginBottom: 24 }}>
        <div>
          <label style={{ fontSize: 12, color: C.textMuted, fontWeight: 600, display: 'block', marginBottom: 6 }}>📅 Select Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ padding: '10px 14px', borderRadius: 10, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 14, outline: 'none' }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.textMuted, marginBottom: 6 }}>
            <span>Day Progress</span><span style={{ fontWeight: 700, color: C.text }}>{done}/{total} tasks done</span>
          </div>
          <div style={{ height: 8, background: C.border, borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#7c3aed,#10b981)', borderRadius: 4, transition: 'width 0.4s ease' }} />
          </div>
          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>{pct}% complete</div>
        </div>
      </div>

      {/* Tasks */}
      <div style={{ background: C.card, borderRadius: 18, padding: 24, border: `1px solid ${C.border}`, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>📋 Today's Topics & Tasks</div>
          <button onClick={addTask} style={{ padding: '7px 16px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#7c3aed,#a78bfa)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>➕ Add Task</button>
        </div>

        {todayPlan.tasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 20px', color: C.textMuted }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>📋</div>
            <div style={{ fontSize: 14, color: C.textSub }}>No tasks yet — click "Add Task" to plan your day</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {todayPlan.tasks.map((task, i) => (
              <div key={task.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 16px', borderRadius: 12,
                background: task.done ? 'rgba(16,185,129,0.06)' : C.bg,
                border: `1px solid ${task.done ? 'rgba(16,185,129,0.2)' : C.border}`,
                transition: 'all 0.2s',
              }}>
                <span style={{ fontSize: 13, color: C.textMuted, fontWeight: 700, minWidth: 24 }}>{i + 1}.</span>
                <input type="checkbox" checked={task.done} onChange={() => toggleDone(task.id)} style={{ accentColor: '#10b981', width: 16, height: 16, flexShrink: 0, cursor: 'pointer' }} />
                <input
                  value={task.time} onChange={e => updateTask(task.id, 'time', e.target.value)}
                  placeholder="Time" type="time"
                  style={{ width: 100, padding: '6px 10px', borderRadius: 8, border: `1px solid ${C.border}`, background: 'transparent', color: C.textMuted, fontSize: 12, outline: 'none', flexShrink: 0 }}
                />
                <input
                  value={task.text} onChange={e => updateTask(task.id, 'text', e.target.value)}
                  placeholder="Topic / Task description…"
                  style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: `1px solid ${C.border}`, background: 'transparent', color: task.done ? '#10b981' : C.text, fontSize: 14, outline: 'none', textDecoration: task.done ? 'line-through' : 'none' }}
                />
                <button onClick={() => deleteTask(task.id)} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: 16, cursor: 'pointer', padding: '0 4px', opacity: 0.6 }}>×</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Day notes */}
      <div style={{ background: C.card, borderRadius: 18, padding: 24, border: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 12 }}>📌 Day Notes / Reminders</div>
        <textarea
          value={todayPlan.note} rows={4}
          onChange={e => savePlan({ ...todayPlan, note: e.target.value })}
          placeholder="Any reminders, things to prepare, or carry-forward notes for tomorrow…"
          style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 14, resize: 'vertical', outline: 'none', lineHeight: 1.6, boxSizing: 'border-box' }}
        />
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  RESOURCES TAB
// ════════════════════════════════════════════════════════════
function ResourcesTab({ courseId }) {
  const { isDark } = useTheme();
  const C = makeC(isDark);
  const [resources, setResources] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [title,    setTitle]    = useState('');
  const [url,      setUrl]      = useState('');
  const [type,     setType]     = useState('link');
  const [desc,     setDesc]     = useState('');
  const [tag,      setTag]      = useState('');
  const [shared,   setShared]   = useState(true);
  const [search,   setSearch]   = useState('');
  const [filter,   setFilter]   = useState('all');
  const [saving,   setSaving]   = useState(false);
  const [toast,    setToast]    = useState('');
  const [uploadMode, setUploadMode] = useState(false); // false = URL mode, true = file upload mode
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = React.useRef();

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = courseId ? `?courseId=${courseId}` : '';
      const res = await api.get(`${API}/resources${params}`, headers());
      setResources(res.data || []);
    } catch { showToast('⚠️ Failed to load resources'); }
    setLoading(false);
  }, [courseId]);

  useEffect(() => { load(); }, [load]);

  const addResource = async () => {
    if (!title.trim()) return showToast('⚠️ Title is required');
    if (!courseId) return showToast('⚠️ No course selected');
    setSaving(true);
    try {
      const res = await api.post(`${API}/resources`, {
        courseId, title: title.trim(), url: url.trim(),
        type, desc: desc.trim(), tag: tag.trim(), sharedWithStudents: shared,
      }, headers());
      setResources(prev => [res.data, ...prev]);
      setTitle(''); setUrl(''); setDesc(''); setTag(''); setShared(true);
      showToast('✅ Resource added!');
    } catch (e) { showToast('⚠️ ' + (e.response?.data?.message || e.message)); }
    setSaving(false);
  };

  const uploadFile = async () => {
    if (!selectedFile) return showToast('⚠️ Please select a file');
    if (!courseId) return showToast('⚠️ No course selected');
    if (!title.trim()) return showToast('⚠️ Title is required');
    setSaving(true);
    setUploadProgress(0);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('courseId', courseId);
      formData.append('title', title.trim() || selectedFile.name);
      formData.append('type', type);
      formData.append('desc', desc.trim());
      formData.append('tag', tag.trim());
      formData.append('sharedWithStudents', shared);
      const token = localStorage.getItem('token');
      const res = await api.post(`${API}/resources/upload`, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => setUploadProgress(Math.round((e.loaded * 100) / e.total)),
      });
      setResources(prev => [res.data, ...prev]);
      setTitle(''); setDesc(''); setTag(''); setShared(true);
      setSelectedFile(null); setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
      showToast('✅ File uploaded successfully!');
    } catch (e) { showToast('⚠️ ' + (e.response?.data?.message || e.message)); }
    setSaving(false);
  };

  const deleteResource = async (id) => {
    try {
      await api.delete(`${API}/resources/${id}`, headers());
      setResources(prev => prev.filter(r => r._id !== id));
      showToast('🗑️ Deleted');
    } catch { showToast('⚠️ Delete failed'); }
  };

  const toggleShare = async (r) => {
    try {
      const res = await api.patch(`${API}/resources/${r._id}`, { sharedWithStudents: !r.sharedWithStudents }, headers());
      setResources(prev => prev.map(x => x._id === r._id ? res.data : x));
      showToast(res.data.sharedWithStudents ? '✅ Shared with students!' : '🔒 Hidden from students');
    } catch { showToast('⚠️ Failed to update'); }
  };

  const typeIcons  = { link: '🔗', pdf: '📄', video: '🎥', note: '📝', tool: '🛠️' };
  const typeColors = { link: '#3b82f6', pdf: '#ef4444', video: '#a78bfa', note: '#10b981', tool: '#f59e0b' };

  const allTags  = [...new Set(resources.map(r => r.tag).filter(Boolean))];
  const filtered = resources.filter(r => {
    const matchSearch = r.title.toLowerCase().includes(search.toLowerCase()) || (r.desc || '').toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || r.type === filter || r.tag === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div>
      {toast && <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 9999, background: '#10b981', color: '#fff', padding: '12px 20px', borderRadius: 12, fontWeight: 600, fontSize: 14, boxShadow: '0 8px 32px rgba(16,185,129,0.4)' }}>{toast}</div>}
      <PageHeader title="Resources" subtitle="Share study materials, links, and tools with students" icon="📚" />

      {/* Add form */}
      <div style={{ background: C.card, borderRadius: 18, padding: 24, border: `1px solid ${C.border}`, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>➕ Add Resource</div>
          {/* Toggle: URL vs File Upload */}
          <div style={{ display: 'flex', background: C.bg, borderRadius: 10, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
            <button onClick={() => { setUploadMode(false); setSelectedFile(null); }} style={{ padding: '7px 14px', border: 'none', background: !uploadMode ? '#7c3aed' : 'transparent', color: !uploadMode ? '#fff' : C.textMuted, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>🔗 URL</button>
            <button onClick={() => { setUploadMode(true); setUrl(''); }} style={{ padding: '7px 14px', border: 'none', background: uploadMode ? '#7c3aed' : 'transparent', color: uploadMode ? '#fff' : C.textMuted, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>📁 Upload File</button>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={{ fontSize: 12, color: C.textMuted, fontWeight: 600, display: 'block', marginBottom: 6 }}>📌 Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Python Docs, Week 3 Notes" style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div>
            {!uploadMode ? (
              <>
                <label style={{ fontSize: 12, color: C.textMuted, fontWeight: 600, display: 'block', marginBottom: 6 }}>🔗 URL (optional)</label>
                <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
              </>
            ) : (
              <>
                <label style={{ fontSize: 12, color: C.textMuted, fontWeight: 600, display: 'block', marginBottom: 6 }}>📁 Choose File <span style={{ color: '#ef4444' }}>*</span></label>
                <div
                  onClick={() => fileInputRef.current && fileInputRef.current.click()}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `2px dashed ${selectedFile ? '#7c3aed' : C.border}`, background: selectedFile ? 'rgba(124,58,237,0.05)' : C.bg, color: selectedFile ? '#7c3aed' : C.textMuted, fontSize: 13, cursor: 'pointer', boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s' }}
                >
                  <span style={{ fontSize: 18 }}>{selectedFile ? '✅' : '📂'}</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {selectedFile ? selectedFile.name : 'Click to choose file…'}
                  </span>
                  {selectedFile && <span style={{ marginLeft: 'auto', fontSize: 11, opacity: 0.7, flexShrink: 0 }}>({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)</span>}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  style={{ display: 'none' }}
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.png,.jpg,.jpeg,.gif,.zip,.mp4,.webm"
                  onChange={e => {
                    const f = e.target.files[0];
                    if (f) {
                      setSelectedFile(f);
                      if (!title.trim()) setTitle(f.name.replace(/\.[^/.]+$/, ''));
                      // Auto-detect type
                      const ext = f.name.split('.').pop().toLowerCase();
                      if (['pdf','doc','docx'].includes(ext)) setType('pdf');
                      else if (['mp4','webm','avi'].includes(ext)) setType('video');
                      else if (['png','jpg','jpeg','gif'].includes(ext)) setType('note');
                      else if (['ppt','pptx','xls','xlsx'].includes(ext)) setType('tool');
                    }
                  }}
                />
              </>
            )}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div>
            <label style={{ fontSize: 12, color: C.textMuted, fontWeight: 600, display: 'block', marginBottom: 6 }}>📂 Type</label>
            <select value={type} onChange={e => setType(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}>
              <option value="link">🔗 Link</option>
              <option value="pdf">📄 PDF / Doc</option>
              <option value="video">🎥 Video</option>
              <option value="note">📝 Note</option>
              <option value="tool">🛠️ Tool</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, color: C.textMuted, fontWeight: 600, display: 'block', marginBottom: 6 }}>🏷️ Topic Tag</label>
            <input value={tag} onChange={e => setTag(e.target.value)} placeholder="e.g. Python, Week 1" style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: C.textMuted, fontWeight: 600, display: 'block', marginBottom: 6 }}>📝 Description</label>
            <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Short description…" style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
          </div>
        </div>

        {/* Share toggle */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, cursor: 'pointer', padding: '10px 14px', borderRadius: 10, background: shared ? 'rgba(16,185,129,0.08)' : C.bg, border: `1px solid ${shared ? 'rgba(16,185,129,0.3)' : C.border}`, transition: 'all 0.2s' }}>
          <input type="checkbox" checked={shared} onChange={e => setShared(e.target.checked)} style={{ accentColor: '#10b981', width: 16, height: 16 }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: shared ? '#10b981' : C.text }}>👁️ Share with students</div>
            <div style={{ fontSize: 11, color: C.textMuted }}>Students will see this in their My Course page under Resources</div>
          </div>
        </label>

        {/* Upload progress bar */}
        {uploadMode && saving && uploadProgress > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: C.textMuted }}>Uploading…</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#7c3aed' }}>{uploadProgress}%</span>
            </div>
            <div style={{ height: 6, borderRadius: 99, background: C.border, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${uploadProgress}%`, background: 'linear-gradient(90deg,#7c3aed,#a78bfa)', transition: 'width 0.3s', borderRadius: 99 }} />
            </div>
          </div>
        )}

        <button onClick={uploadMode ? uploadFile : addResource} disabled={saving} style={{ width: '100%', padding: '11px 20px', borderRadius: 10, border: 'none', background: saving ? '#374151' : 'linear-gradient(135deg,#7c3aed,#a78bfa)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
          {saving ? (uploadMode ? `⬆️ Uploading… ${uploadProgress}%` : '💾 Saving…') : (uploadMode ? '⬆️ Upload File' : '💾 Save Resource')}
        </button>
      </div>

      {/* Search + filter */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.textMuted }}>🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search resources…" style={{ width: '100%', padding: '10px 14px 10px 36px', borderRadius: 10, border: `1px solid ${C.border}`, background: C.card, color: C.text, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button onClick={() => setFilter('all')} style={{ padding: '7px 14px', borderRadius: 20, border: filter === 'all' ? 'none' : `1px solid ${C.border}`, background: filter === 'all' ? '#7c3aed' : C.card, color: filter === 'all' ? '#fff' : C.textSub, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>All</button>
          {Object.keys(typeIcons).map(t => (
            <button key={t} onClick={() => setFilter(t)} style={{ padding: '7px 14px', borderRadius: 20, border: filter === t ? 'none' : `1px solid ${C.border}`, background: filter === t ? typeColors[t] : C.card, color: filter === t ? '#fff' : C.textSub, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{typeIcons[t]} {t}</button>
          ))}
          {allTags.map(tg => (
            <button key={tg} onClick={() => setFilter(tg)} style={{ padding: '7px 14px', borderRadius: 20, border: filter === tg ? 'none' : `1px solid ${C.border}`, background: filter === tg ? '#10b981' : C.card, color: filter === tg ? '#fff' : C.textSub, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{tg}</button>
          ))}
        </div>
      </div>

      {/* Resource cards */}
      {loading ? <Loader /> : filtered.length === 0 ? (
        <EmptyState icon="📚" text="No resources found" sub="Add study materials, links, PDFs or videos for your students." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 14 }}>
          {filtered.map(r => {
            const color = typeColors[r.type] || '#64748b';
            return (
              <div key={r._id} style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
                <div style={{ height: 4, background: `linear-gradient(90deg,${color},${color}88)` }} />
                <div style={{ padding: '16px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 20 }}>{typeIcons[r.type]}</span>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{r.title}</div>
                    </div>
                    <button onClick={() => deleteResource(r._id)} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: 16, cursor: 'pointer', opacity: 0.5, flexShrink: 0 }}>×</button>
                  </div>
                  {r.desc && <div style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.5, marginBottom: 10 }}>{r.desc}</div>}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {r.tag && <span style={{ fontSize: 11, fontWeight: 600, color: '#10b981', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 20, padding: '2px 9px' }}>{r.tag}</span>}
                    <span style={{ fontSize: 11, fontWeight: 600, color, background: `${color}15`, border: `1px solid ${color}30`, borderRadius: 20, padding: '2px 9px' }}>{r.type}</span>
                    <button onClick={() => toggleShare(r)} style={{ fontSize: 11, fontWeight: 600, color: r.sharedWithStudents ? '#10b981' : C.textMuted, background: r.sharedWithStudents ? 'rgba(16,185,129,0.1)' : C.bg, border: `1px solid ${r.sharedWithStudents ? 'rgba(16,185,129,0.3)' : C.border}`, borderRadius: 20, padding: '2px 9px', cursor: 'pointer' }}>
                      {r.sharedWithStudents ? '👁️ Shared' : '🔒 Private'}
                    </button>
                    {r.url && (
                      <a href={r.url.startsWith('/uploads') ? `${r.url}` : r.url}
                        target="_blank" rel="noopener noreferrer"
                        download={r.url.startsWith('/uploads') ? (r.fileName || true) : undefined}
                        style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 600, color: '#3b82f6', textDecoration: 'none', padding: '4px 12px', borderRadius: 8, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}>
                        {r.url.startsWith('/uploads') ? '⬇️ Download' : 'Open ↗'}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  SHARED COMPONENTS
// ════════════════════════════════════════════════════════════
function PageHeader({ title, subtitle, icon }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: 'linear-gradient(135deg,rgba(124,58,237,0.3),rgba(167,139,250,0.3))',
          border: '1px solid rgba(124,58,237,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
        }}>{icon}</div>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: C.text }}>{title}</h2>
          {subtitle && <p style={{ margin: '2px 0 0', fontSize: 13, color: C.textMuted }}>{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ children }) {
  return <h3 style={{ fontSize: 14, fontWeight: 700, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 16px' }}>{children}</h3>;
}

function Chip({ color, children }) {
  return (
    <span style={{ fontSize: 12, fontWeight: 600, color, background: `${color}18`, border: `1px solid ${color}33`, borderRadius: 20, padding: '3px 10px', whiteSpace: 'nowrap' }}>
      {children}
    </span>
  );
}

function Loader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60, gap: 12, color: C.textMuted }}>
      <div style={{ width: 28, height: 28, border: `3px solid ${C.border}`, borderTop: '3px solid #7c3aed', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      Loading…
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function EmptyState({ icon, text, sub }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px', color: C.textMuted }}>
      <div style={{ fontSize: 48, marginBottom: 14 }}>{icon}</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: C.textSub, marginBottom: sub ? 6 : 0 }}>{text}</div>
      {sub && <div style={{ fontSize: 13, color: C.textMuted, maxWidth: 360, margin: '0 auto', lineHeight: 1.6 }}>{sub}</div>}
    </div>
  );
}