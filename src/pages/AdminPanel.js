import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API = 'http://localhost:5000';

const SECTIONS = [
  { key: 'A', label: 'Section A', desc: 'Easy',   marks: 1, color: '#1D9E75', light: '#e6f7f2', count: 20 },
  { key: 'B', label: 'Section B', desc: 'Medium',  marks: 3, color: '#185FA5', light: '#e6f0fb', count: 20 },
  { key: 'C', label: 'Section C', desc: 'Hard',    marks: 5, color: '#534AB7', light: '#eeedfa', count: 10 },
];

export default function AdminPanel() {
  const { token } = useAuth();
  const headers = { Authorization: `Bearer ${token}` };

  const [tab, setTab]             = useState('questions');
  const [courseId, setCourseId]   = useState('');
  const [date, setDate]           = useState(new Date().toISOString().split('T')[0]);
  const [questions, setQuestions] = useState([]);
  const [activeSection, setActiveSection] = useState('A');

  const emptyRows = (sec) => {
    const s = SECTIONS.find(x => x.key === sec);
    return Array.from({ length: s.count }, (_, i) => ({ text: '', marks: s.marks, order: i + 1 }));
  };
  const [secInputs, setSecInputs] = useState({ A: emptyRows('A'), B: emptyRows('B'), C: emptyRows('C') });
  const [saving,  setSaving]  = useState({ A: false, B: false, C: false });
  const [saveMsg, setSaveMsg] = useState({ A: '', B: '', C: '' });

  const [videoFile,  setVideoFile]  = useState(null);
  const [videoTitle, setVideoTitle] = useState('');
  const [uploading,  setUploading]  = useState(false);
  const [uploadMsg,  setUploadMsg]  = useState('');

  const [submissions, setSubmissions] = useState([]);
  const [subLoading,  setSubLoading]  = useState(false);
  const [filterDate,  setFilterDate]  = useState(new Date().toISOString().split('T')[0]);
  const [expandedSub, setExpandedSub] = useState(null);
  const [expandedSec, setExpandedSec] = useState('A');

  useEffect(() => { if (courseId && date) loadQuestions(); }, [courseId, date]);

  const loadQuestions = async () => {
    try {
      const res = await axios.get(`${API}/api/questions/${courseId}/${date}`, { headers });
      setQuestions(res.data);
      const newInputs = { A: emptyRows('A'), B: emptyRows('B'), C: emptyRows('C') };
      res.data.forEach(q => {
        const idx = (q.order || 1) - 1;
        if (newInputs[q.section] && idx >= 0 && idx < newInputs[q.section].length)
          newInputs[q.section][idx] = { text: q.text, marks: q.marks, order: q.order || idx + 1, _id: q._id };
      });
      setSecInputs(newInputs);
    } catch (err) { console.error(err); }
  };

  const updateRow = (sec, idx, field, value) =>
    setSecInputs(prev => {
      const updated = [...prev[sec]];
      updated[idx] = { ...updated[idx], [field]: value };
      return { ...prev, [sec]: updated };
    });

  const addRow    = (sec) => setSecInputs(prev => ({ ...prev, [sec]: [...prev[sec], { text: '', marks: SECTIONS.find(s => s.key === sec).marks, order: prev[sec].length + 1 }] }));
  const removeRow = (sec, idx) => setSecInputs(prev => { const r = [...prev[sec]]; r.splice(idx, 1); return { ...prev, [sec]: r }; });

  const saveSection = async (sec) => {
    if (!courseId) return alert('Please enter Course ID first!');
    const rows = secInputs[sec].filter(r => r.text.trim());
    if (!rows.length) return alert('Enter at least one question!');
    setSaving(p => ({ ...p, [sec]: true }));
    setSaveMsg(p => ({ ...p, [sec]: '' }));
    try {
      await Promise.all(questions.filter(q => q.section === sec).map(q => axios.delete(`${API}/api/questions/${q._id}`, { headers }).catch(() => {})));
      await Promise.all(rows.map((r, i) => axios.post(`${API}/api/questions`, { courseId, date, section: sec, text: r.text.trim(), marks: Number(r.marks), order: r.order || i + 1 }, { headers })));
      setSaveMsg(p => ({ ...p, [sec]: `✅ ${rows.length} questions saved!` }));
      loadQuestions();
    } catch (err) { setSaveMsg(p => ({ ...p, [sec]: '❌ Error: ' + err.message })); }
    finally { setSaving(p => ({ ...p, [sec]: false })); }
  };

  const deleteQuestion = async (id) => {
    if (!window.confirm('Delete this question?')) return;
    try { await axios.delete(`${API}/api/questions/${id}`, { headers }); loadQuestions(); }
    catch { alert('Error deleting'); }
  };

  const uploadVideo = async () => {
    if (!videoFile || !courseId || !videoTitle) return alert('Course ID, title, and video file required!');
    setUploading(true); setUploadMsg('');
    try {
      const fd = new FormData();
      fd.append('video', videoFile); fd.append('courseId', courseId);
      fd.append('date', date);       fd.append('title', videoTitle);
      await axios.post(`${API}/api/classes/upload`, fd, { headers: { ...headers, 'Content-Type': 'multipart/form-data' } });
      setUploadMsg('✅ Video uploaded successfully! Previous class expired.');
      setVideoFile(null); setVideoTitle('');
    } catch (err) { setUploadMsg('❌ Upload failed: ' + err.message); }
    finally { setUploading(false); }
  };

  const loadSubmissions = async () => {
    setSubLoading(true);
    try {
      const params = filterDate ? `?date=${filterDate}` : '';
      const res = await axios.get(`${API}/api/submissions/admin/all${params}`, { headers });
      setSubmissions(res.data);
    } catch (err) { console.error(err); setSubmissions([]); }
    finally { setSubLoading(false); }
  };

  useEffect(() => { if (tab === 'submissions') loadSubmissions(); }, [tab, filterDate]);

  const secCount   = (sec) => questions.filter(q => q.section === sec).length;
  const totalScore = (sub) => (sub.secA?.score || 0) + (sub.secB?.score || 0) + (sub.secC?.score || 0);
  const maxScore   = (sub) => ['secA', 'secB', 'secC'].reduce((t, k, i) => t + (sub[k]?.answers?.length || 0) * [1, 3, 5][i], 0);

  return (
    <div style={S.page}>
      <div style={S.header}>
        <h2 style={S.title}>🛠 Admin Panel</h2>
        <p style={S.sub}>MERN Stack Developer Course Management</p>
      </div>

      <div style={S.topRow}>
        <div style={S.field}><label style={S.label}>Course ID</label>
          <input style={S.input} placeholder="Paste course ID here" value={courseId} onChange={e => setCourseId(e.target.value)} /></div>
        <div style={S.field}><label style={S.label}>Date</label>
          <input type="date" style={S.input} value={date} onChange={e => setDate(e.target.value)} /></div>
        <button style={S.loadBtn} onClick={loadQuestions} disabled={!courseId}>🔄 Load</button>
      </div>

      <div style={S.tabs}>
        {[{ key: 'questions', label: '📝 Questions' }, { key: 'submissions', label: '📬 Submissions' }, { key: 'video', label: '🎬 Upload Video' }].map(t => (
          <button key={t.key} style={{ ...S.tab, ...(tab === t.key ? S.tabActive : {}) }} onClick={() => setTab(t.key)}>{t.label}</button>
        ))}
      </div>

      {/* QUESTIONS TAB */}
      {tab === 'questions' && (
        <div>
          <div style={S.secTabs}>
            {SECTIONS.map(sec => (
              <button key={sec.key}
                style={{ ...S.secTab, borderBottom: activeSection === sec.key ? `3px solid ${sec.color}` : '3px solid transparent', color: activeSection === sec.key ? sec.color : '#888', fontWeight: activeSection === sec.key ? 700 : 500 }}
                onClick={() => setActiveSection(sec.key)}>
                <span style={{ ...S.secDot, background: sec.color }} />
                {sec.label}
                <span style={{ ...S.chip, background: sec.light, color: sec.color }}>{secCount(sec.key)}/{sec.count}</span>
              </button>
            ))}
          </div>
          {SECTIONS.map(sec => activeSection === sec.key && (
            <div key={sec.key} style={S.card}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <h3 style={{ ...S.cardTitle, color: sec.color }}>{sec.label} — {sec.desc}</h3>
                  <p style={S.secDesc}>Each question: <b>{sec.marks} mark{sec.marks > 1 ? 's' : ''}</b> &nbsp;|&nbsp; Target: <b>{sec.count} questions</b></p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button style={{ ...S.addRowBtn, borderColor: sec.color, color: sec.color }} onClick={() => addRow(sec.key)}>+ Add Row</button>
                  <button style={{ ...S.saveBtn, background: sec.color, opacity: saving[sec.key] ? 0.7 : 1 }} onClick={() => saveSection(sec.key)} disabled={saving[sec.key]}>
                    {saving[sec.key] ? 'Saving...' : `💾 Save Section ${sec.key}`}
                  </button>
                </div>
              </div>
              {saveMsg[sec.key] && <div style={{ ...S.msgBox, background: saveMsg[sec.key].startsWith('✅') ? '#e6f7f2' : '#fdecea', color: saveMsg[sec.key].startsWith('✅') ? '#1D9E75' : '#c0392b' }}>{saveMsg[sec.key]}</div>}
              <div style={S.qGrid}>
                <div style={S.qGridHeader}><span style={{ width: 36 }}>#</span><span style={{ flex: 1 }}>Question Text</span><span style={{ width: 80, textAlign: 'center' }}>Marks</span><span style={{ width: 36 }}></span></div>
                {secInputs[sec.key].map((row, idx) => (
                  <div key={idx} style={S.qRow}>
                    <div style={{ ...S.qNum, background: sec.light, color: sec.color }}>{idx + 1}</div>
                    <textarea style={S.qInput} placeholder={`Question ${idx + 1}...`} value={row.text} rows={2} onChange={e => updateRow(sec.key, idx, 'text', e.target.value)} />
                    <input type="number" style={S.marksInput} value={row.marks} min={1} onChange={e => updateRow(sec.key, idx, 'marks', e.target.value)} />
                    <button style={S.delRowBtn} onClick={() => removeRow(sec.key, idx)}>✕</button>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
                <span style={{ fontSize: 13, color: '#888' }}>{secInputs[sec.key].filter(r => r.text.trim()).length} of {secInputs[sec.key].length} filled</span>
                <button style={{ ...S.saveBtn, background: sec.color, opacity: saving[sec.key] ? 0.7 : 1 }} onClick={() => saveSection(sec.key)} disabled={saving[sec.key]}>
                  {saving[sec.key] ? 'Saving...' : `💾 Save Section ${sec.key}`}
                </button>
              </div>
            </div>
          ))}
          {questions.length > 0 && (
            <div style={{ ...S.card, borderRadius: 14 }}>
              <h3 style={S.cardTitle}>📋 Saved Questions for {date} ({questions.length} total)</h3>
              {SECTIONS.map(sec => {
                const qs = questions.filter(q => q.section === sec.key);
                if (!qs.length) return null;
                return (
                  <div key={sec.key} style={{ marginBottom: 16 }}>
                    <div style={{ ...S.secBadge, background: sec.color }}>{sec.label} — {sec.desc} — {qs.length} questions</div>
                    {qs.map((q, i) => (
                      <div key={q._id} style={S.savedQ}>
                        <span style={{ ...S.qNum, background: sec.light, color: sec.color, flexShrink: 0 }}>{i + 1}</span>
                        <span style={{ flex: 1, fontSize: 14, color: '#333' }}>{q.text}</span>
                        <span style={{ ...S.chip, background: sec.light, color: sec.color, flexShrink: 0 }}>{q.marks}m</span>
                        <button style={S.delRowBtn} onClick={() => deleteQuestion(q._id)}>🗑</button>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUBMISSIONS TAB */}
      {tab === 'submissions' && (
        <div style={{ ...S.card, borderRadius: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            <h3 style={{ ...S.cardTitle, margin: 0 }}>📬 Trainee Submissions</h3>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={S.label}>Date:</label>
              <input type="date" style={{ ...S.input, width: 160 }} value={filterDate} onChange={e => setFilterDate(e.target.value)} />
              <button style={{ ...S.loadBtn, padding: '8px 14px' }} onClick={loadSubmissions}>🔄</button>
            </div>
          </div>

          {subLoading ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#aaa' }}>Loading submissions...</div>
          ) : submissions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>📭</div>
              <div style={{ color: '#aaa', fontSize: 14 }}>No submissions found for this date.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={S.subSummary}>
                <span>🧑‍💻 {submissions.length} submission{submissions.length !== 1 ? 's' : ''}</span>
                <span style={{ color: '#1D9E75' }}>✅ {submissions.filter(s => s.status === 'submitted').length} submitted</span>
                <span style={{ color: '#e67e22' }}>⏳ {submissions.filter(s => s.status !== 'submitted').length} in progress</span>
              </div>

              {submissions.map(sub => {
                const isExpanded = expandedSub === sub._id;
                const score = totalScore(sub);
                const max   = maxScore(sub);
                const pct   = max > 0 ? Math.round((score / max) * 100) : 0;
                const secAnswers = sub[`sec${expandedSec}`]?.answers || [];

                return (
                  <div key={sub._id} style={{ border: '1.5px solid #eef', borderRadius: 12, overflow: 'hidden' }}>
                    {/* Header row — click to expand */}
                    <div style={{ ...S.subHeader, background: isExpanded ? '#f4f6fb' : '#fff', cursor: 'pointer' }}
                      onClick={() => setExpandedSub(isExpanded ? null : sub._id)}>
                      <div style={S.traineeAvatar}>{sub.trainee?.name?.charAt(0)?.toUpperCase() || '?'}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 15, color: '#1e3a5f' }}>{sub.trainee?.name || 'Unknown'}</div>
                        <div style={{ fontSize: 12, color: '#888' }}>{sub.trainee?.email} &nbsp;|&nbsp; {sub.date}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 20, fontWeight: 800, color: pct >= 75 ? '#1D9E75' : pct >= 50 ? '#f5a623' : '#e74c3c' }}>
                            {score}<span style={{ fontSize: 12, color: '#aaa', fontWeight: 400 }}>/{max}</span>
                          </div>
                          <div style={{ fontSize: 11, color: '#aaa' }}>{pct}%</div>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 20, background: sub.status === 'submitted' ? '#e6f7f2' : '#fff8e1', color: sub.status === 'submitted' ? '#1D9E75' : '#e67e22' }}>
                          {sub.status === 'submitted' ? '✅ Submitted' : '⏳ In Progress'}
                        </span>
                        <span style={{ fontSize: 18, color: '#aaa' }}>{isExpanded ? '▲' : '▼'}</span>
                      </div>
                    </div>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div style={{ padding: '0 16px 16px' }}>
                        {/* Score breakdown per section */}
                        <div style={S.scoreBreakdown}>
                          {SECTIONS.map(sec => {
                            const s = sub[`sec${sec.key}`];
                            return (
                              <div key={sec.key} style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: 11, color: sec.color, fontWeight: 700, marginBottom: 2 }}>{sec.label}</div>
                                <div style={{ fontSize: 22, fontWeight: 800, color: sec.color }}>{s?.score || 0}</div>
                                <div style={{ fontSize: 11, color: '#aaa' }}>{s?.answered || 0}/{s?.answers?.length || 0} answered</div>
                              </div>
                            );
                          })}
                          {sub.submittedAt && (
                            <div style={{ textAlign: 'center', borderLeft: '1px solid #eee', paddingLeft: 20 }}>
                              <div style={{ fontSize: 11, color: '#888', fontWeight: 700, marginBottom: 2 }}>Submitted At</div>
                              <div style={{ fontSize: 14, fontWeight: 700, color: '#1D9E75' }}>{new Date(sub.submittedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
                              <div style={{ fontSize: 11, color: '#aaa' }}>{new Date(sub.submittedAt).toLocaleDateString('en-IN')}</div>
                            </div>
                          )}
                        </div>

                        {/* Section answer switcher */}
                        <div style={{ display: 'flex', borderBottom: '1px solid #eee', marginBottom: 14 }}>
                          {SECTIONS.map(sec => (
                            <button key={sec.key}
                              style={{ ...S.ansSecTab, borderBottom: expandedSec === sec.key ? `2px solid ${sec.color}` : '2px solid transparent', color: expandedSec === sec.key ? sec.color : '#aaa' }}
                              onClick={() => setExpandedSec(sec.key)}>
                              {sec.label}
                              <span style={{ ...S.chip, background: sec.light, color: sec.color, marginLeft: 6 }}>
                                {sub[`sec${sec.key}`]?.answered || 0} answered
                              </span>
                            </button>
                          ))}
                        </div>

                        {/* Answers */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {secAnswers.length === 0
                            ? <p style={{ color: '#aaa', fontSize: 13 }}>No answers in this section.</p>
                            : secAnswers.map((ans, idx) => {
                                const sec = SECTIONS.find(s => s.key === expandedSec);
                                return (
                                  <div key={idx} style={{ ...S.answerCard, borderLeft: `3px solid ${ans.isAnswered ? sec.color : '#ddd'}` }}>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                                      <div style={{ ...S.qNum, background: sec.light, color: sec.color, flexShrink: 0, marginTop: 2 }}>{idx + 1}</div>
                                      <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 6 }}>
                                          {ans.questionText}
                                          <span style={{ ...S.chip, background: sec.light, color: sec.color, marginLeft: 8 }}>{ans.marks}m</span>
                                        </div>
                                        <div style={{ fontSize: 13, color: ans.isAnswered ? '#1e3a5f' : '#bbb', background: ans.isAnswered ? '#f4f6fb' : '#fafafa', border: '1px solid #eee', borderRadius: 8, padding: '8px 12px', fontStyle: ans.isAnswered ? 'normal' : 'italic', minHeight: 36 }}>
                                          {ans.isAnswered ? ans.answerText : 'No answer given'}
                                        </div>
                                      </div>
                                      <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: ans.isAnswered ? '#e6f7f2' : '#f5f5f5', color: ans.isAnswered ? '#1D9E75' : '#bbb' }}>
                                        {ans.isAnswered ? '✓ Answered' : '— Skipped'}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })
                          }
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIDEO TAB */}
      {tab === 'video' && (
        <div style={{ ...S.card, borderRadius: 14 }}>
          <h3 style={S.cardTitle}>🎬 Upload Today's Class Video</h3>
          <p style={S.warning}>⚠️ When a new video is uploaded — the previous class will automatically expire!</p>
          <div style={S.field}>
            <label style={S.label}>Class Title</label>
            <input style={S.input} placeholder="e.g. Day 5 — React Hooks Deep Dive" value={videoTitle} onChange={e => setVideoTitle(e.target.value)} />
          </div>
          <div style={S.uploadBox}>
            <input type="file" accept="video/*" onChange={e => setVideoFile(e.target.files[0])} style={{ marginBottom: 12 }} />
            {videoFile && <p style={{ color: '#1D9E75', fontSize: 13 }}>✅ Selected: {videoFile.name} ({(videoFile.size / 1024 / 1024).toFixed(1)} MB)</p>}
          </div>
          <button style={{ ...S.saveBtn, background: '#1e3a5f', opacity: uploading ? 0.7 : 1 }} onClick={uploadVideo} disabled={uploading}>
            {uploading ? 'Uploading...' : '🎬 Upload Class Video'}
          </button>
          {uploadMsg && <p style={{ marginTop: 12, fontSize: 14, color: uploadMsg.startsWith('✅') ? '#1D9E75' : '#E24B4A' }}>{uploadMsg}</p>}
        </div>
      )}
    </div>
  );
}

const S = {
  page:          { minHeight: '100vh', background: '#f0f4f8', padding: 24, fontFamily: "'DM Sans','Segoe UI',sans-serif" },
  header:        { marginBottom: 20 },
  title:         { color: '#1e3a5f', fontSize: 22, fontWeight: 800, margin: 0 },
  sub:           { color: '#888', fontSize: 13, margin: '4px 0 0 0' },
  topRow:        { display: 'flex', gap: 12, alignItems: 'flex-end', marginBottom: 20, background: '#fff', padding: 16, borderRadius: 14, boxShadow: '0 1px 4px #0001' },
  field:         { flex: 1, display: 'flex', flexDirection: 'column', gap: 5 },
  label:         { fontSize: 11, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px' },
  input:         { padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 14, outline: 'none', fontFamily: 'inherit' },
  loadBtn:       { padding: '9px 18px', background: '#1e3a5f', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', alignSelf: 'flex-end' },
  tabs:          { display: 'flex', gap: 8, marginBottom: 16 },
  tab:           { padding: '10px 22px', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 14, background: '#fff', color: '#555', fontWeight: 500 },
  tabActive:     { background: '#1e3a5f', color: '#fff', fontWeight: 700 },
  secTabs:       { display: 'flex', background: '#fff', borderRadius: '12px 12px 0 0', borderBottom: '1px solid #eee' },
  secTab:        { flex: 1, padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 },
  secDot:        { width: 8, height: 8, borderRadius: '50%', display: 'inline-block' },
  chip:          { fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20 },
  card:          { background: '#fff', borderRadius: '0 0 14px 14px', padding: 20, marginBottom: 16, boxShadow: '0 1px 4px #0001' },
  cardTitle:     { fontSize: 16, fontWeight: 700, color: '#1e3a5f', margin: '0 0 4px 0' },
  secDesc:       { fontSize: 13, color: '#888', margin: 0 },
  addRowBtn:     { padding: '7px 14px', background: '#fff', border: '1.5px solid', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  saveBtn:       { padding: '8px 20px', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  msgBox:        { padding: '10px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, marginBottom: 14 },
  qGrid:         { display: 'flex', flexDirection: 'column', border: '1px solid #eef', borderRadius: 10, overflow: 'hidden' },
  qGridHeader:   { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#f8f9fc', fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' },
  qRow:          { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderTop: '1px solid #f0f4f8' },
  qNum:          { width: 28, height: 28, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 },
  qInput:        { flex: 1, border: '1.5px solid #e8edf5', borderRadius: 7, padding: '7px 10px', fontSize: 13, fontFamily: 'inherit', resize: 'vertical', outline: 'none' },
  marksInput:    { width: 64, border: '1.5px solid #e8edf5', borderRadius: 7, padding: '7px 8px', fontSize: 13, textAlign: 'center', outline: 'none' },
  delRowBtn:     { background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, color: '#bbb', padding: 4 },
  secBadge:      { color: '#fff', padding: '5px 12px', borderRadius: '7px 7px 0 0', fontSize: 12, fontWeight: 700 },
  savedQ:        { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderBottom: '1px solid #f5f5f5' },
  warning:       { background: '#FFF8E1', color: '#E65100', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 },
  uploadBox:     { border: '2px dashed #e2e8f0', borderRadius: 10, padding: 20, marginBottom: 16, textAlign: 'center' },
  subSummary:    { display: 'flex', gap: 20, padding: '10px 16px', background: '#f8f9fc', borderRadius: 10, fontSize: 13, fontWeight: 600, color: '#555', marginBottom: 8 },
  subHeader:     { display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', transition: 'background 0.15s' },
  traineeAvatar: { width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#1D9E75,#185FA5)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, flexShrink: 0 },
  scoreBreakdown:{ display: 'flex', gap: 24, background: '#f8f9fc', borderRadius: 10, padding: '14px 20px', marginBottom: 16, marginTop: 12 },
  ansSecTab:     { padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center' },
  answerCard:    { background: '#fafbfd', borderRadius: 10, padding: '12px 14px', border: '1px solid #eef' },
};