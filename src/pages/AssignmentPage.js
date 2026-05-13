import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function AssignmentPage() {
  const { date } = useParams();
  const { user, token } = useAuth();
  const { isDark, toggleTheme, theme } = useTheme();
  const navigate = useNavigate();
  const headers = { Authorization: `Bearer ${token}` };

  const [questions, setQuestions]         = useState({ A: [], B: [], C: [] });
  const [submission, setSubmission]       = useState(null);
  const [answers, setAnswers]             = useState({});
  const [activeSection, setActiveSection] = useState('A');
  const [loading, setLoading]             = useState(true);
  const [saving, setSaving]               = useState(false);
  const [submitted, setSubmitted]         = useState(false);

  // ── Timer ──────────────────────────────────────────────────
  const [timeLeft, setTimeLeft]     = useState('');
  const [timerUrgent, setTimerUrgent] = useState(false);
  const [msLeft, setMsLeft]         = useState(null);

  // ── Warning toasts ─────────────────────────────────────────
  const [warnings, setWarnings]   = useState([]);
  const firedWarnings             = useRef(new Set());

  const isToday = date === new Date().toISOString().split('T')[0];

  // Timer tick
  useEffect(() => {
    if (!isToday) return;
    const tick = () => {
      const now      = new Date();
      const midnight = new Date(); midnight.setHours(24, 0, 0, 0);
      const diff = midnight - now;
      setMsLeft(diff);
      if (diff <= 0) { setTimeLeft('Time Up!'); return; }
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1000);
      setTimeLeft(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`);
      setTimerUrgent(diff < 30 * 60_000);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [isToday]);

  // Warning milestones
  useEffect(() => {
    if (!isToday || submitted || msLeft === null) return;
    const milestones = [
      { ms: 60 * 60_000, key: '60min', level: 'info',    msg: '⏰ 1 hour left! Start wrapping up your assignment.' },
      { ms: 30 * 60_000, key: '30min', level: 'warning', msg: '⚠️ 30 minutes left! Submit soon to avoid auto-submit.' },
      { ms: 10 * 60_000, key: '10min', level: 'danger',  msg: '🚨 10 minutes left! Assignment will AUTO-SUBMIT at midnight!' },
      { ms:  5 * 60_000, key: '5min',  level: 'danger',  msg: '🔴 Only 5 minutes! AUTO-SUBMIT is very close!' },
    ];
    milestones.forEach(({ ms, key, level, msg }) => {
      if (msLeft <= ms && !firedWarnings.current.has(key)) {
        firedWarnings.current.add(key);
        const id = `${Date.now()}-${key}`;
        setWarnings(prev => [...prev, { id, level, msg }]);
        setTimeout(() => setWarnings(prev => prev.filter(w => w.id !== id)), 12_000);
      }
    });
    if (msLeft <= 0 && !firedWarnings.current.has('autosubmit')) {
      firedWarnings.current.add('autosubmit');
      doAutoSubmit();
    }
  }, [msLeft, submitted, isToday]);

  const doAutoSubmit = useCallback(async () => {
    if (submitted) return;
    try {
      await axios.patch('http://localhost:5000/api/submissions/submit',
        { traineeId: user._id, date }, { headers });
      setSubmitted(true);
      const id = 'autosubmit-done';
      setWarnings([{ id, level: 'info', msg: '✅ Assignment auto-submitted at midnight!' }]);
    } catch (err) { console.error('Auto-submit error:', err); }
  }, [submitted]);

  const dismissWarning = (id) => setWarnings(prev => prev.filter(w => w.id !== id));

  // Load data
  const courseId = user?.enrolledCourse;
  useEffect(() => { if (courseId) loadData(); }, [date]);

  const loadData = async () => {
    try {
      setLoading(true);
      const qRes = await axios.get(`http://localhost:5000/api/questions/${courseId}/${date}`, { headers });
      const all = qRes.data;
      const grouped = {
        A: all.filter(q => q.section === 'A'),
        B: all.filter(q => q.section === 'B'),
        C: all.filter(q => q.section === 'C'),
      };
      setQuestions(grouped);
      const initRes = await axios.post('http://localhost:5000/api/submissions/init',
        { traineeId: user._id, courseId, date, secAQuestions: grouped.A, secBQuestions: grouped.B, secCQuestions: grouped.C },
        { headers });
      setSubmission(initRes.data);
      setSubmitted(initRes.data.status === 'submitted');
      const ea = {};
      ['A','B','C'].forEach(sec => {
        initRes.data[`sec${sec}`]?.answers?.forEach(a => { ea[a.questionId] = a.answerText; });
      });
      setAnswers(ea);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleAnswer = async (questionId, text, section, marks) => {
    setAnswers(prev => ({ ...prev, [questionId]: text }));
    setSaving(true);
    try {
      const res = await axios.patch('http://localhost:5000/api/submissions/answer',
        { traineeId: user._id, date, section, questionId, answerText: text, marks }, { headers });
      setSubmission(res.data);
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const handleSubmit = async () => {
    if (!window.confirm('Are you sure you want to submit? You cannot edit after submission!')) return;
    try {
      await axios.patch('http://localhost:5000/api/submissions/submit', { traineeId: user._id, date }, { headers });
      setSubmitted(true);
    } catch (err) { console.error(err); }
  };

  const secInfo = {
    A: { label:'Section A', level:'Easy',   total:20, min:10, marks:1, color:'#1D9E75', bg: isDark?'#1D9E7515':'#E1F5EE' },
    B: { label:'Section B', level:'Medium', total:20, min:10, marks:3, color:'#185FA5', bg: isDark?'#185FA515':'#E6F1FB' },
    C: { label:'Section C', level:'Hard',   total:10, min:5,  marks:5, color:'#534AB7', bg: isDark?'#534AB715':'#EEEDFE' },
  };
  const getScore    = (sec) => submission?.[`sec${sec}`]?.score    || 0;
  const getAnswered = (sec) => submission?.[`sec${sec}`]?.answered || 0;
  const totalScore  = getScore('A') + getScore('B') + getScore('C');
  const maxScore    = { A:20, B:60, C:50 };

  const warnStyle = {
    info:    { bg:'#185FA520', border:'#185FA5', color:'#4fa3f7' },
    warning: { bg:'#f5a62320', border:'#f5a623', color:'#f5c842' },
    danger:  { bg:'#ff000020', border:'#ff5555', color:'#ff7777' },
  };

  if (loading) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100vh', background: theme.pageBg }}>
      <div style={{ width:32, height:32, border:`3px solid ${theme.border}`, borderTop:`3px solid ${theme.accent}`, borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
      <p style={{ color: theme.textMuted, marginTop:12 }}>Loading assignment...</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', background: theme.pageBg, overflow:'hidden', fontFamily:"'DM Sans','Segoe UI',sans-serif" }}>

      {/* Toast Stack */}
      <div style={{ position:'fixed', top:16, right:16, zIndex:9999, display:'flex', flexDirection:'column', gap:8, maxWidth:360 }}>
        {warnings.map(w => (
          <div key={w.id} style={{ background: warnStyle[w.level].bg, border:`1.5px solid ${warnStyle[w.level].border}`, borderRadius:12, padding:'12px 16px', display:'flex', alignItems:'flex-start', gap:10, boxShadow:`0 4px 24px ${warnStyle[w.level].border}33`, animation:'slideIn 0.3s ease' }}>
            <div style={{ flex:1, fontSize:13, color: warnStyle[w.level].color, fontWeight:600, lineHeight:1.4 }}>{w.msg}</div>
            <button onClick={() => dismissWarning(w.id)} style={{ background:'none', border:'none', color: warnStyle[w.level].color, cursor:'pointer', fontSize:16, padding:0, lineHeight:1, flexShrink:0 }}>✕</button>
          </div>
        ))}
      </div>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:16, padding:'16px 24px', background: isDark?'#1a2740':'#1e3a5f', flexShrink:0, flexWrap:'wrap' }}>
        <button style={{ background:'rgba(255,255,255,0.15)', border:'none', color:'#fff', padding:'8px 14px', borderRadius:8, cursor:'pointer', fontSize:14 }} onClick={() => navigate('/attendance')}>← Back</button>
        <div>
          <h2 style={{ color:'#fff', fontSize:18, fontWeight:700, margin:0 }}>Assignment — {date}</h2>
          <p style={{ color:'#a0b4c8', fontSize:12, margin:'2px 0 0 0' }}>MERN Stack Developer Course</p>
        </div>

        {isToday && !submitted && (
          <div style={{ marginLeft:'auto', borderRadius:12, padding:'8px 16px', textAlign:'center', transition:'all 0.3s', flexShrink:0, background: timerUrgent?'#ff000015':'rgba(255,255,255,0.1)', border:`1.5px solid ${timerUrgent?'#ff5555':'rgba(255,255,255,0.2)'}`, animation: timerUrgent?'pulse 1s ease-in-out infinite':'none' }}>
            <div style={{ fontSize:10, color: timerUrgent?'#ff9999':'#a0b4c8', fontWeight:600, letterSpacing:1, marginBottom:2 }}>⏰ TIME LEFT</div>
            <div style={{ fontSize:22, fontWeight:800, color: timerUrgent?'#ff5555':'#ffffff', fontVariantNumeric:'tabular-nums', letterSpacing:2 }}>{timeLeft}</div>
            <div style={{ fontSize:9, color: timerUrgent?'#ff9999':'#a0b4c8', marginTop:2 }}>Auto-submits at midnight</div>
          </div>
        )}

        {submitted && (
          <div style={{ marginLeft:'auto', background:'#1D9E7522', border:'1.5px solid #1D9E75', color:'#1D9E75', borderRadius:12, padding:'10px 20px', fontWeight:700, fontSize:14, flexShrink:0 }}>✅ Submitted</div>
        )}

        <div style={{ textAlign:'right', flexShrink:0 }}>
          <span style={{ fontSize:28, fontWeight:700, color:'#fff' }}>{totalScore}</span>
          <span style={{ fontSize:16, color:'#a0b4c8' }}>/130</span>
        </div>
        <button onClick={toggleTheme} style={{ background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.2)', color:'#fff', fontSize:12, fontWeight:600, padding:'6px 12px', borderRadius:8, cursor:'pointer' }}>
          {isDark ? '☀️' : '🌙'}
        </button>
      </div>

      {isToday && !submitted && timerUrgent && (
        <div style={{ background:'#ff000015', borderBottom:'1px solid #ff555533', color:'#ff5555', textAlign:'center', padding:'8px 24px', fontSize:13, fontWeight:600, flexShrink:0 }}>
          ⚠️ Less than 30 minutes left! Assignment will AUTO-SUBMIT at midnight.
        </div>
      )}

      {/* Section tabs */}
      <div style={{ display:'flex', gap:8, padding:'12px 24px', background: theme.cardBg, borderBottom:`1px solid ${theme.border}`, flexShrink:0 }}>
        {['A','B','C'].map(sec => (
          <button key={sec}
            style={{ flex:1, display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 16px', borderRadius:10, border:'none', cursor:'pointer', fontSize:14, fontWeight:600, transition:'all 0.2s', background: activeSection===sec ? secInfo[sec].color : theme.hoverBg, color: activeSection===sec ? '#fff' : theme.textMuted }}
            onClick={() => setActiveSection(sec)}>
            <span>{secInfo[sec].label}</span>
            <span style={{ fontSize:12, background:'rgba(255,255,255,0.25)', padding:'2px 8px', borderRadius:20 }}>{getAnswered(sec)}/{secInfo[sec].total}</span>
          </button>
        ))}
      </div>

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 24px', flexShrink:0, background: secInfo[activeSection].bg }}>
        <div>
          <span style={{ color:'#fff', fontSize:12, padding:'3px 10px', borderRadius:20, fontWeight:600, marginRight:10, background: secInfo[activeSection].color }}>{secInfo[activeSection].level}</span>
          <span style={{ fontSize:13, color: isDark?theme.textSecondary:'#555' }}>Answer minimum {secInfo[activeSection].min} questions</span>
        </div>
        <div style={{ display:'flex', alignItems:'center' }}>
          <span style={{ color: secInfo[activeSection].color, fontWeight:700 }}>{getScore(activeSection)}/{maxScore[activeSection]}</span>
          <span style={{ fontSize:12, color: theme.textMuted, marginLeft:6 }}>marks</span>
        </div>
      </div>

      <div style={{ height:4, background: theme.border, flexShrink:0 }}>
        <div style={{ height:4, transition:'width 0.4s ease', borderRadius:'0 4px 4px 0', width:`${(getAnswered(activeSection)/secInfo[activeSection].total)*100}%`, background: secInfo[activeSection].color }} />
      </div>

      {/* Questions */}
      <div style={{ flex:1, overflowY:'auto', padding:'16px 24px', display:'flex', flexDirection:'column', gap:12 }}>
        {questions[activeSection].length === 0 ? (
          <div style={{ textAlign:'center', padding:48, color: theme.textMuted }}>
            <p>No questions added for this section yet.</p>
          </div>
        ) : questions[activeSection].map((q, idx) => {
          const isAnswered = answers[q._id]?.trim().length > 0;
          return (
            <div key={q._id} style={{ background: theme.cardBg, borderRadius:12, padding:16, border:`1px solid ${theme.border}`, borderLeft:`4px solid ${isAnswered?secInfo[activeSection].color:theme.border}` }}>
              <div style={{ display:'flex', alignItems:'flex-start', gap:12, marginBottom:10 }}>
                <div style={{ width:32, height:32, background: isDark?'#1a2740':'#1e3a5f', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <span style={{ color:'#fff', fontSize:12, fontWeight:700 }}>Q{idx+1}</span>
                </div>
                <p style={{ flex:1, fontSize:14, color: theme.textPrimary, fontWeight:500, margin:0, lineHeight:1.5 }}>{q.text}</p>
                <span style={{ fontSize:11, padding:'3px 8px', borderRadius:20, fontWeight:600, flexShrink:0, background: isAnswered?secInfo[activeSection].bg:theme.hoverBg, color: isAnswered?secInfo[activeSection].color:theme.textMuted }}>
                  {q.marks} mark{q.marks>1?'s':''}
                </span>
              </div>
              <textarea
                style={{ width:'100%', border:`1.5px solid ${isAnswered?secInfo[activeSection].color:theme.border}`, borderRadius:8, padding:'10px 12px', fontSize:13, color: theme.textPrimary, background: theme.inputBg, resize:'vertical', fontFamily:'inherit', boxSizing:'border-box', outline:'none', transition:'border-color 0.2s', opacity: submitted?0.7:1 }}
                placeholder={submitted ? 'Submitted' : 'Your answer here...'}
                value={answers[q._id] || ''}
                disabled={submitted}
                onChange={e => handleAnswer(q._id, e.target.value, activeSection, q.marks)}
                rows={3}
              />
              {isAnswered && <div style={{ fontSize:11, color:'#1D9E75', fontWeight:600, marginTop:6 }}>✓ Answered</div>}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 24px', background: theme.cardBg, borderTop:`1px solid ${theme.border}`, flexShrink:0 }}>
        <div style={{ display:'flex', gap:16, fontSize:13, color: theme.textMuted }}>
          <span>Sec A: {getAnswered('A')}/20</span>
          <span>Sec B: {getAnswered('B')}/20</span>
          <span>Sec C: {getAnswered('C')}/10</span>
          {saving && <span>Saving...</span>}
        </div>
        {!submitted ? (
          <button style={{ background: isDark?'#1a2740':'#1e3a5f', color:'#fff', border:'none', padding:'10px 24px', borderRadius:10, fontSize:14, fontWeight:600, cursor:'pointer' }} onClick={handleSubmit}>
            Submit Assignment
          </button>
        ) : (
          <div style={{ background:'#E1F5EE', color:'#1D9E75', padding:'10px 20px', borderRadius:10, fontWeight:600, fontSize:14 }}>✓ Submitted</div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{box-shadow:0 0 0 0 rgba(255,85,85,0.3)} 50%{box-shadow:0 0 0 6px rgba(255,85,85,0)} }
        @keyframes slideIn { from{opacity:0;transform:translateX(40px)} to{opacity:1;transform:translateX(0)} }
      `}</style>
    </div>
  );
}
