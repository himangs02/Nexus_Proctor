import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { Plus, X, Trash2, CheckCircle2, LayoutGrid, FileText, ShieldAlert, Upload, Edit } from 'lucide-react';
import * as XLSX from 'xlsx'; 

const EMPTY_Q = { type: 'mcq', title: '', description: '', points: 10, options: [{ text: '', isCorrect: false },{ text: '', isCorrect: false },{ text: '', isCorrect: false },{ text: '', isCorrect: false }], testCases: [{ input: '', expectedOutput: '', isHidden: false }], timeLimitSeconds: 5, constraints: '' };

const formatForInput = (dateString) => {
  if (!dateString) return '';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const h = pad(d.getHours());
  const min = pad(d.getMinutes());
  return `${y}-${m}-${day}T${h}:${min}`;
};

export const TeacherDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('OVERVIEW');
  const [modal, setModal] = useState(false);
  const [exams, setExams] = useState([]);
  const [subs, setSubs] = useState({});
  const [violations, setViolations] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [viewExam, setViewExam] = useState(null);
  const [toast, setToast] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null); 
  
  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const showConfirm = (message, onConfirm) => {
    setConfirmModal({ message, onConfirm });
  };
  
  const [editingId, setEditingId] = useState(null);
  const fileInputRef = useRef(null);
  const tcFileInputRef = useRef(null);
  const [activeTcIndex, setActiveTcIndex] = useState(null);

  const defaultForm = { title: '', description: '', course: '', startTime: '', durationMinutes: 60, proctoring: { maxViolations: 3, restrictionMinutes: 30, requireFullscreen: true, disableCopyPaste: true, autoSubmitOnMax: true, enableWebcam: false }, questions: [{ ...EMPTY_Q }] };
  const [form, setForm] = useState(defaultForm);

  const load = () => {
    setLoading(true);
    api.get('/exams').then(r => setExams(r.data.data || [])).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const loadSubs = async (examId) => {
    const [s, v] = await Promise.all([
      api.get(`/submissions/exam/${examId}`).then(r => r.data.data).catch(() => []),
      api.get(`/violations/exam/${examId}`).then(r => r.data.data).catch(() => []),
    ]);
    setSubs(p => ({ ...p, [examId]: s }));
    setViolations(p => ({ ...p, [examId]: v }));
  };

  const addQ = () => setForm(p => ({ ...p, questions: [...p.questions, { ...EMPTY_Q, options: EMPTY_Q.options.map(o => ({...o})), testCases: EMPTY_Q.testCases.map(t => ({...t})) }] }));
  const rmQ = (i) => setForm(p => ({ ...p, questions: p.questions.filter((_, idx) => idx !== i) }));
  const updQ = (i, field, val) => setForm(p => ({ ...p, questions: p.questions.map((q, idx) => idx === i ? { ...q, [field]: val } : q) }));
  const updOpt = (qi, oi, field, val) => {
    setForm(p => {
      const qs = [...p.questions];
      const opts = [...qs[qi].options];
      if (field === 'isCorrect') opts.forEach((o, i) => o.isCorrect = i === oi);
      else opts[oi] = { ...opts[oi], [field]: val };
      qs[qi] = { ...qs[qi], options: opts };
      return { ...p, questions: qs };
    });
  };
  const addTc = (qi) => updQ(qi, 'testCases', [...form.questions[qi].testCases, { input: '', expectedOutput: '', isHidden: false }]);
  const rmTc = (qi, ti) => updQ(qi, 'testCases', form.questions[qi].testCases.filter((_, i) => i !== ti));
  const updTc = (qi, ti, field, val) => {
    const tcs = [...form.questions[qi].testCases];
    tcs[ti] = { ...tcs[ti], [field]: val };
    updQ(qi, 'testCases', tcs);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    try {
      let parsedQs = [];
      if (ext === 'txt') {
        const text = await file.text();
        const blocks = text.split('---').map(b => b.trim()).filter(Boolean);
        blocks.forEach(block => {
          const lines = block.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
          let q = { type: 'subjective', title: '', description: '', points: 10, options: [], testCases: [], constraints: '', timeLimitSeconds: 5 };
          lines.forEach(line => {
            const upper = line.toUpperCase();
            if (upper.startsWith('TYPE:')) q.type = line.substring(5).trim().toLowerCase();
            else if (upper.startsWith('TITLE:')) q.title = line.substring(6).trim();
            else if (upper.startsWith('DESC:')) q.description = line.substring(5).trim();
            else if (upper.startsWith('POINTS:')) q.points = parseInt(line.substring(7).trim()) || 10;
            else if (upper.startsWith('OPT:')) {
              let optText = line.substring(4).trim();
              let isCorrect = optText.startsWith('*');
              if (isCorrect) optText = optText.substring(1).trim();
              q.options.push({ text: optText, isCorrect });
            }
            else if (upper.startsWith('CONSTRAINTS:')) q.constraints = line.substring(12).trim();
            else if (upper.startsWith('TC_IN:')) q.testCases.push({ input: line.substring(6).trim().replace(/\\n/g, '\n'), expectedOutput: '', isHidden: false });
            else if (upper.startsWith('TC_OUT:')) { if (q.testCases.length > 0) q.testCases[q.testCases.length - 1].expectedOutput = line.substring(7).trim().replace(/\\n/g, '\n'); }
            else if (upper.startsWith('TC_HIDDEN:')) { if (q.testCases.length > 0) q.testCases[q.testCases.length - 1].isHidden = line.substring(10).trim().toLowerCase() === 'true'; }
          });
          parsedQs.push(q);
        });
      } else if (ext === 'csv' || ext === 'xlsx') {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        rows.forEach(row => {
          const type = (row['Type'] || 'subjective').toLowerCase().trim();
          let q = { ...EMPTY_Q, type, title: row['Title'] || 'Imported Question', description: row['Description'] || '', points: Number(row['Points']) || 10, options: [], testCases: [] };
          if (type === 'mcq') {
            const correctIndex = Number(row['Correct Option']) || 1;
            [1, 2, 3, 4].forEach(i => {
              if (row[`Option ${i}`]) q.options.push({ text: String(row[`Option ${i}`]), isCorrect: i === correctIndex });
            });
            if (q.options.length === 0) q.options = [{text:'Option A', isCorrect:true}, {text:'Option B', isCorrect:false}];
          } else if (type === 'coding') {
            q.constraints = row['Constraints'] || '';
          }
          parsedQs.push(q);
        });
      }
      if (parsedQs.length > 0) {
        setForm(p => ({ ...p, questions: [...p.questions, ...parsedQs] }));
        showToast(`✅ Imported ${parsedQs.length} questions!`, 'success');
      } else { showToast('❌ No valid questions found.', 'error'); }
    } catch (err) { showToast('❌ Error reading file.', 'error'); }
    e.target.value = null;
  };

  const handleTcUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || activeTcIndex === null) return;
    const ext = file.name.split('.').pop().toLowerCase();
    try {
      let newTcs = [];
      if (ext === 'txt') {
        const text = await file.text();
        const blocks = text.split('---').map(b => b.trim()).filter(Boolean);
        blocks.forEach(block => {
          const lines = block.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
          let tc = { input: '', expectedOutput: '', isHidden: false };
          lines.forEach(line => {
            const upper = line.toUpperCase();
            if (upper.startsWith('IN:')) tc.input = line.substring(3).trim().replace(/\\n/g, '\n');
            else if (upper.startsWith('OUT:')) tc.expectedOutput = line.substring(4).trim().replace(/\\n/g, '\n');
            else if (upper.startsWith('HIDDEN:')) tc.isHidden = line.substring(7).trim().toLowerCase() === 'true';
          });
          if (tc.input || tc.expectedOutput) newTcs.push(tc);
        });
      } else if (ext === 'csv' || ext === 'xlsx') {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        rows.forEach(row => {
          newTcs.push({
            input: String(row['Input'] || '').replace(/\\n/g, '\n'),
            expectedOutput: String(row['Expected Output'] || '').replace(/\\n/g, '\n'),
            isHidden: String(row['Is Hidden'] || '').toLowerCase() === 'true'
          });
        });
      }
      if (newTcs.length > 0) {
        updQ(activeTcIndex, 'testCases', [...form.questions[activeTcIndex].testCases, ...newTcs]);
        showToast(`✅ Automatically added ${newTcs.length} test cases!`, 'success');
      }
    } catch (err) { showToast('❌ Error reading test case file.', 'error'); }
    e.target.value = null;
    setActiveTcIndex(null);
  };

  const showFormatGuide = () => { showToast(`CSV/EXCEL FORMAT: Headers: Type, Title, Description, Points, Option 1-4, Correct Option, Constraints`, 'info'); };

  const openEditModal = (examData) => {
    setEditingId(examData.id);
    setForm({
      title: examData.title || '',
      description: examData.description || '',
      course: examData.course || '',
      startTime: formatForInput(examData.startTime),
      durationMinutes: examData.durationMinutes || 60,
      proctoring: examData.proctoring || { maxViolations: 3, restrictionMinutes: 30, requireFullscreen: true, disableCopyPaste: true, autoSubmitOnMax: true, enableWebcam: false },
      questions: examData.questions && examData.questions.length > 0 ? examData.questions.map(q => ({
          ...EMPTY_Q,
          ...q,
          options: q.options?.length > 0 ? q.options : EMPTY_Q.options.map(o => ({...o})),
          testCases: q.testCases?.length > 0 ? q.testCases : EMPTY_Q.testCases.map(t => ({...t}))
      })) : [{ ...EMPTY_Q }]
    });
    setModal(true);
  };

  const deploy = async (status = 'published') => {
    if (!form.title.trim()) return showToast('Exam title is required.', 'error');
    for (let i = 0; i < form.questions.length; i++) {
      if (!form.questions[i].title.trim()) return showToast(`Question ${i + 1} title is required.`, 'error');
    }
    let computedEndTime = undefined;
    let isoStartTime = undefined;
    if (form.startTime) {
      const st = new Date(form.startTime);
      if (!isNaN(st.getTime())) {
        isoStartTime = st.toISOString(); 
        if (form.durationMinutes) computedEndTime = new Date(st.getTime() + form.durationMinutes * 60000).toISOString();
      }
    }
    const cleanedQuestions = form.questions.map(q => {
      const base = { type: q.type, title: q.title.trim(), description: q.description || '', points: q.points || 10 };
      if (q.type === 'mcq') base.options = q.options;
      else if (q.type === 'coding') {
        base.testCases = (q.testCases || []).filter(tc => tc.expectedOutput.trim() !== '');
        base.constraints = q.constraints || '';
        base.timeLimitSeconds = q.timeLimitSeconds || 5;
      }
      return base;
    });
    const payload = { ...form, questions: cleanedQuestions, startTime: isoStartTime, endTime: computedEndTime };
    if (!editingId || status === 'draft') payload.status = status;
    setSaving(true);
    try {
      if (editingId) await api.put(`/exams/${editingId}`, payload); 
      else await api.post('/exams', payload); 
      setModal(false); setEditingId(null); setForm(defaultForm); load();
      if (viewExam && editingId) {
        const updatedRes = await api.get(`/exams/${editingId}`);
        setViewExam(updatedRes.data.data);
      }
    } catch (e) { showToast(e.response?.data?.message || 'Deployment failed.', 'error'); } 
    finally { setSaving(false); }
  };

  const toggleStatus = async (exam, status) => {
    await api.patch(`/exams/${exam.id}/status`, { status }).catch(() => {});
    load();
    if (viewExam && viewExam.id === exam.id) setViewExam({...viewExam, status});
  };

  const deleteExam = async (id) => {
    showConfirm('Are you sure you want to delete this exam? This action is irreversible.', async () => {
      await api.delete(`/exams/${id}`).catch(() => {});
      if (viewExam?.id === id) setViewExam(null);
      load();
    });
  };

  const renderModal = () => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/40 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95">
        <div className="px-8 py-5 border-b flex justify-between items-center bg-gray-50/50 rounded-t-2xl">
          <h2 className="text-lg font-black uppercase tracking-tight">{editingId ? '✏️ Edit Exam' : 'Deploy New Exam'}</h2>
          <button onClick={() => { setModal(false); setEditingId(null); setForm(defaultForm); }} className="p-2 hover:bg-gray-200 rounded-lg transition-colors"><X size={20} /></button>
        </div>
        <div className="p-8 overflow-y-auto flex-1 space-y-6">
          <input value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))} placeholder="Exam Title *" className="w-full px-4 py-3 bg-gray-50 rounded-xl font-bold outline-none border border-gray-200 focus:border-emerald-400 focus:bg-white transition-all" />
          
          <div className="grid grid-cols-3 gap-4">
            <input value={form.course} onChange={e => setForm(p => ({...p, course: e.target.value}))} placeholder="Course" className="px-4 py-3 bg-gray-50 rounded-xl font-bold outline-none border border-gray-200 focus:border-emerald-400 focus:bg-white transition-all" />
            <input type="number" value={form.durationMinutes} onChange={e => setForm(p => ({...p, durationMinutes: +e.target.value}))} placeholder="Duration (min)" className="px-4 py-3 bg-gray-50 rounded-xl font-bold outline-none border border-gray-200 focus:border-emerald-400 focus:bg-white transition-all" />
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-gray-500 uppercase ml-2 mb-1">Start Time</label>
              <input type="datetime-local" step="60" value={form.startTime} onChange={e => setForm(p => ({...p, startTime: e.target.value}))} className="px-4 py-3 bg-gray-50 rounded-xl font-bold outline-none text-gray-600 border border-gray-200 focus:border-emerald-400 focus:bg-white transition-all" />
            </div>
          </div>
          <textarea value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} placeholder="Description" className="w-full px-4 py-3 bg-gray-50 rounded-xl outline-none h-20 resize-none border border-gray-200 focus:border-emerald-400 focus:bg-white transition-all" />

          <div className="bg-emerald-50/50 p-5 rounded-xl space-y-3 border border-emerald-100">
            <h3 className="text-xs font-black text-emerald-700 uppercase tracking-widest">Security Settings</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <label className="flex items-center gap-2 font-medium"><input type="number" value={form.proctoring.maxViolations} onChange={e => setForm(p => ({...p, proctoring: {...p.proctoring, maxViolations: +e.target.value}}))} className="w-16 px-2 py-1.5 rounded-lg border outline-none font-bold shadow-sm" /> Max Violations</label>
              <label className="flex items-center gap-2 font-medium"><input type="number" value={form.proctoring.restrictionMinutes} onChange={e => setForm(p => ({...p, proctoring: {...p.proctoring, restrictionMinutes: +e.target.value}}))} className="w-16 px-2 py-1.5 rounded-lg border outline-none font-bold shadow-sm" /> Restriction (min)</label>
              <label className="flex items-center gap-2 font-medium"><input type="checkbox" checked={form.proctoring.requireFullscreen} onChange={e => setForm(p => ({...p, proctoring: {...p.proctoring, requireFullscreen: e.target.checked}}))} className="accent-emerald-600 w-4 h-4" /> Require Fullscreen</label>
              <label className="flex items-center gap-2 font-medium"><input type="checkbox" checked={form.proctoring.disableCopyPaste} onChange={e => setForm(p => ({...p, proctoring: {...p.proctoring, disableCopyPaste: e.target.checked}}))} className="accent-emerald-600 w-4 h-4" /> Disable Copy/Paste</label>
              <label className="flex items-center gap-2 font-medium"><input type="checkbox" checked={form.proctoring.autoSubmitOnMax} onChange={e => setForm(p => ({...p, proctoring: {...p.proctoring, autoSubmitOnMax: e.target.checked}}))} className="accent-emerald-600 w-4 h-4" /> Auto-submit on Max</label>
            </div>
          </div>

          <div className="flex justify-between items-center flex-wrap gap-3">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Questions ({form.questions.length})</h3>
            <div className="flex gap-2">
              <button onClick={showFormatGuide} className="text-xs font-bold text-gray-500 flex items-center gap-1 bg-white px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-all border border-gray-200 shadow-sm">❔ Format Guide</button>
              <input type="file" accept=".txt,.csv,.xlsx" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
              <button onClick={() => fileInputRef.current?.click()} className="text-xs font-bold text-blue-600 flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-all border border-blue-100 shadow-sm"><Upload size={14} /> Bulk Upload Qs</button>
              <button onClick={addQ} className="text-xs font-bold text-emerald-600 flex items-center gap-1 bg-emerald-50 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-all border border-emerald-100 shadow-sm"><Plus size={14} /> Add Question</button>
            </div>
          </div>

          <input type="file" accept=".txt,.csv,.xlsx" ref={tcFileInputRef} className="hidden" onChange={handleTcUpload} />

          {form.questions.map((q, qi) => (
            <div key={qi} className="bg-gray-50 rounded-2xl p-6 space-y-4 border border-gray-100">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <span className="bg-white px-3 py-1 rounded-lg text-xs font-black border shadow-sm">Q{qi+1}</span>
                  <select value={q.type} onChange={e => updQ(qi, 'type', e.target.value)} className="bg-emerald-50 text-emerald-700 rounded-lg px-3 py-1.5 text-xs font-black border border-emerald-100 cursor-pointer outline-none">
                    <option value="mcq">MCQ</option>
                    <option value="coding">CODING</option>
                    <option value="subjective">SUBJECTIVE</option>
                  </select>
                  <input type="number" value={q.points} onChange={e => updQ(qi, 'points', +e.target.value)} className="w-16 px-2 py-1.5 rounded-lg border outline-none font-bold text-xs" placeholder="Points" />
                </div>
                <button onClick={() => rmQ(qi)} className="text-gray-400 hover:text-red-500 bg-white p-1.5 rounded-lg border shadow-sm transition-all"><Trash2 size={16} /></button>
              </div>

              <input value={q.title} onChange={e => updQ(qi, 'title', e.target.value)} placeholder="Question title *" className="w-full bg-white border rounded-lg py-2.5 px-4 font-bold outline-none focus:border-emerald-400 transition-all" />
              <textarea value={q.description} onChange={e => updQ(qi, 'description', e.target.value)} placeholder="Description / problem statement" className="w-full bg-white border rounded-lg p-4 text-sm outline-none h-20 resize-none focus:border-emerald-400 transition-all" />

              {q.type === 'mcq' && (
                <div className="grid grid-cols-2 gap-3">
                  {q.options.map((o, oi) => (
                    <div key={oi} className={`flex items-center gap-3 bg-white p-3 rounded-xl border transition-all ${o.isCorrect ? 'border-emerald-400 bg-emerald-50/30' : ''}`}>
                      <input type="radio" name={`correct-${qi}`} checked={o.isCorrect} onChange={() => updOpt(qi, oi, 'isCorrect', true)} className="accent-emerald-500 w-4 h-4 cursor-pointer" />
                      <input value={o.text} onChange={e => updOpt(qi, oi, 'text', e.target.value)} placeholder={`Option ${oi+1}`} className="flex-1 text-sm outline-none bg-transparent font-medium" />
                    </div>
                  ))}
                </div>
              )}

              {q.type === 'coding' && (
                <div className="space-y-3">
                  <textarea value={q.constraints} onChange={e => updQ(qi, 'constraints', e.target.value)} placeholder="Constraints (e.g. 1 ≤ n ≤ 10^5)" className="w-full bg-white border rounded-lg p-3 text-sm outline-none h-14 resize-none font-mono" />
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-400 uppercase">Test Cases ({q.testCases.length})</span>
                    <div className="flex gap-2">
                      <button onClick={() => { setActiveTcIndex(qi); tcFileInputRef.current?.click(); }} className="text-xs font-bold text-emerald-600 flex items-center gap-1 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-lg shadow-sm hover:bg-emerald-100 transition-all"><Upload size={12} /> Bulk TCs</button>
                      <button onClick={() => addTc(qi)} className="text-xs font-bold text-blue-600 flex items-center gap-1 bg-white border px-3 py-1.5 rounded-lg shadow-sm hover:bg-gray-50 transition-all"><Plus size={12} /> Add TC</button>
                    </div>
                  </div>
                  {q.testCases.map((tc, ti) => (
                    <div key={ti} className="bg-white rounded-xl border p-4 space-y-3 shadow-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-gray-500">TC {ti+1}</span>
                        <div className="flex items-center gap-3">
                          <label className="text-xs font-bold text-gray-500 flex items-center gap-1"><input type="checkbox" checked={tc.isHidden} onChange={e => updTc(qi, ti, 'isHidden', e.target.checked)} className="accent-blue-500" /> Hidden</label>
                          <button onClick={() => rmTc(qi, ti)} className="text-gray-400 hover:text-red-500"><X size={14} /></button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <textarea value={tc.input} onChange={e => updTc(qi, ti, 'input', e.target.value)} placeholder="Input" className="bg-gray-50 rounded-lg p-3 text-xs font-mono outline-none h-16 resize-none border border-transparent focus:border-gray-200 focus:bg-white" />
                        <textarea value={tc.expectedOutput} onChange={e => updTc(qi, ti, 'expectedOutput', e.target.value)} placeholder="Expected Output" className="bg-gray-50 rounded-lg p-3 text-xs font-mono outline-none h-16 resize-none border border-transparent focus:border-gray-200 focus:bg-white" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="px-8 py-5 border-t flex justify-end gap-3 bg-gray-50 rounded-b-2xl">
          <button onClick={() => { setModal(false); setEditingId(null); setForm(defaultForm); }} className="px-6 py-3.5 text-gray-500 font-bold text-xs uppercase tracking-widest hover:text-gray-700 bg-white border border-gray-200 rounded-xl shadow-sm transition-all">Cancel</button>
          {(!editingId || form.status === 'draft') && (
            <button onClick={() => deploy('draft')} disabled={saving} className="px-6 py-3.5 border border-amber-200 bg-amber-50 text-amber-700 rounded-xl font-bold text-xs uppercase tracking-widest disabled:opacity-50 hover:bg-amber-100 transition-all shadow-sm">Save Draft</button>
          )}
          <button onClick={() => deploy('published')} disabled={saving} className="px-8 py-3.5 bg-emerald-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg disabled:opacity-50 hover:bg-emerald-700 transition-all active:scale-95">
            {saving ? '⏳ Processing…' : editingId ? '🔄 Update Exam' : '🚀 Publish Exam'}
          </button>
        </div>
      </div>
    </div>
  );

  const ExamDetail = ({ exam }) => {
    const [liveStudents, setLiveStudents] = useState([]);
    const [liveViolations, setLiveViolations] = useState([]);

    useEffect(() => { loadSubs(exam.id); }, [exam.id]);
    const es = subs[exam.id] || [];

    useEffect(() => {
      import('../services/socket').then(({ connectSocket }) => {
        const socket = connectSocket();
        socket.emit('join_monitoring', { examId: exam.id });

        socket.on('active_students', (data) => setLiveStudents(data.students || []));
        socket.on('student_joined', (data) => setLiveStudents(p => [...p.filter(s => s.studentId !== data.studentId), data]));
        socket.on('student_left', (data) => {
          setLiveStudents(p => p.filter(s => s.studentId !== data.studentId));
        });

        socket.on('violation_alert', (data) => {
          setLiveViolations(p => [data, ...p]);
        });

        return () => {
          socket.off('active_students');
          socket.off('student_joined');
          socket.off('student_left');
          socket.off('violation_alert');
        };
      });
    }, [exam.id]);

    const forceSubmit = (studentId) => {
      showConfirm('Are you sure you want to forcibly submit and lock this student out of the exam?', () => {
        import('../services/socket').then(({ getSocket }) => {
          const socket = getSocket();
          if (socket) {
            socket.emit('force_submit_student', { examId: exam.id, studentId, reason: 'Manual termination by proctor' });
          }
        });
      });
    };

    return (
      <div className="space-y-6 pb-20 animate-in fade-in duration-500">
        <button onClick={() => setViewExam(null)} className="text-sm font-bold text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors">← Back to Registry</button>
        
        <div className="flex justify-between items-start bg-white p-6 rounded-2xl border shadow-sm">
          <div>
            <h2 className="text-2xl font-black flex items-center gap-3">
              {exam.title}
              {exam.status === 'active' && <span className="bg-red-500 text-white text-[10px] uppercase px-3 py-1 rounded-full animate-pulse shadow-sm tracking-widest">LIVE NOW</span>}
              {exam.status === 'published' && <span className="bg-blue-50 text-blue-600 text-[10px] uppercase px-3 py-1 rounded-full border border-blue-100 tracking-widest shadow-sm">PUBLISHED</span>}
            </h2>
            <div className="flex items-center gap-3 mt-2 text-sm">
               <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-lg font-bold text-xs">{exam.course || 'General Sector'}</span>
               <span className="text-gray-400 font-medium">• {exam.durationMinutes}min window • {exam.questions.length} total nodes • {exam.totalMarks} aggregate value</span>
            </div>
          </div>
          
          <div className="flex gap-2">
            {(exam.status === 'draft' || exam.status === 'published') && (
               <button onClick={() => openEditModal(exam)} className="flex items-center gap-2 bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm">
                 <Edit size={14}/> Edit Details
               </button>
            )}
            {exam.status === 'draft' && <button onClick={() => toggleStatus(exam, 'published')} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-600/20">Publish Network</button>}
            {exam.status === 'published' && <button onClick={() => toggleStatus(exam, 'draft')} className="bg-amber-50 hover:bg-amber-100 text-amber-600 border border-amber-200 px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm">Unpublish</button>}
            {(exam.status === 'published' || exam.status === 'draft') && <button onClick={() => toggleStatus(exam, 'active')} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/20">FORCE START NOW</button>}
            {exam.status === 'active' && <button onClick={() => toggleStatus(exam, 'ended')} className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-md shadow-red-600/20 animate-pulse">TERMINATE SESSION</button>}
            <button onClick={() => deleteExam(exam.id)} className="bg-white text-red-500 hover:bg-red-50 border border-gray-200 hover:border-red-200 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1"><Trash2 size={14}/> Dump</button>
          </div>
        </div>

        {exam.status === 'active' && (
          <div className="bg-gray-900 text-white rounded-3xl border border-gray-800 p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none transform translate-x-1/2 -translate-y-1/2"></div>
            
            <h3 className="text-xs font-black text-emerald-400 uppercase tracking-widest mb-6 flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
              Live Proctoring Matrix
            </h3>
            
            <div className="grid grid-cols-2 gap-8 relative z-10">
              <div>
                <h4 className="text-[10px] text-gray-400 uppercase tracking-[0.2em] mb-4 font-bold border-b border-gray-800 pb-2">Active Connections ({liveStudents.length})</h4>
                {liveStudents.length === 0 ? <p className="text-xs text-gray-600 italic font-medium mt-4">Awaiting incoming student nodes...</p> : (
                  <div className="space-y-3 max-h-[30rem] overflow-y-auto pr-2 custom-scrollbar">
                    {liveStudents.map(s => (
                      <div key={s.studentId} className="flex items-center justify-between bg-gray-800/50 backdrop-blur-sm p-4 rounded-2xl border border-gray-700/50 hover:border-gray-600 transition-all group">
                        <div className="flex items-center gap-4">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse"></span>
                          <div>
                            <span className="text-sm font-bold text-gray-100 block">{s.name}</span>
                            <span className="text-[10px] text-gray-400 font-mono tracking-tighter">ID: {s.studentId}</span>
                          </div>
                        </div>
                        <button onClick={() => forceSubmit(s.studentId)} className="text-[9px] font-black bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500 hover:text-white px-3 py-2 rounded-lg transition-all uppercase tracking-widest opacity-0 group-hover:opacity-100">
                          Force Kill
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-[10px] text-gray-400 uppercase tracking-[0.2em] mb-4 font-bold border-b border-gray-800 pb-2">Vision AI Alert Log</h4>
                {liveViolations.length === 0 ? <p className="text-xs text-gray-600 italic font-medium mt-4">Sector is currently secure. No infractions detected.</p> : (
                  <div className="space-y-3 max-h-72 overflow-y-auto pr-2 custom-scrollbar">
                    {liveViolations.map((v, i) => (
                      <div key={i} className="flex flex-col bg-gray-800/50 backdrop-blur-sm p-4 rounded-2xl border-l-4 border-gray-700 hover:bg-gray-800 transition-all" style={{ borderLeftColor: v.severity === 'critical' ? '#ef4444' : '#f97316' }}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-black text-gray-200 uppercase tracking-wide">{v.studentName}</span>
                          <span className="text-[9px] text-gray-500 font-bold bg-gray-900 px-2 py-1 rounded-md border border-gray-800">{new Date(v.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded shadow-sm ${v.severity === 'critical' ? 'bg-red-500 text-white' : 'bg-orange-500 text-white'}`}>
                            {v.type?.replace(/_/g, ' ')}
                          </span>
                        </div>
                        {v.details && <p className="text-[10px] text-gray-400 font-medium leading-relaxed">{v.details}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-3xl border shadow-sm p-8">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-6 border-b border-gray-100 pb-4">Historical Submissions ({es.length})</h3>
          {es.length === 0 ? <p className="text-gray-400 text-sm italic">No records in the vault.</p> : (
            <div className="overflow-hidden rounded-xl border border-gray-200">
              <table className="w-full text-left text-sm bg-white">
                <thead className="bg-gray-50/80"><tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest"><th className="py-4 px-6">Student Node</th><th className="px-6">Score Matrix</th><th className="px-6">Status Flag</th><th className="px-6">Infractions</th></tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {es.map(s => (
                    <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 px-6">
                        <p className="font-bold text-gray-900">{s.student?.name}</p>
                        <p className="text-[10px] text-gray-400 font-mono mt-0.5">{s.student?.studentId}</p>
                      </td>
                      <td className="px-6">
                        <div className="flex items-center gap-2">
                           <span className="font-black text-gray-700">{s.totalScore}</span><span className="text-gray-300">/</span><span className="text-xs text-gray-400">{s.maxScore}</span>
                           <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${s.percentage >= 40 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>{s.percentage}%</span>
                        </div>
                      </td>
                      <td className="px-6"><span className={`text-[9px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest ${s.status === 'submitted' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : s.status === 'auto_submitted' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>{s.status.replace('_', ' ')}</span></td>
                      <td className="px-6">
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-black ${s.violationCount > 0 ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-gray-50 text-gray-400'}`}>
                          {s.violationCount}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-[calc(100vh-8.5rem)] bg-gray-50 overflow-hidden font-sans relative rounded-xl border border-gray-100 shadow-sm">
      {modal && renderModal()}

      {/* ✨ SLEEK FLOATING PILL TOAST ✨ */}
      {toast && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[600] animate-in slide-in-from-bottom-10 fade-in duration-300">
          <div className={`px-6 py-3.5 rounded-full shadow-2xl border flex items-center gap-3 text-sm font-bold ${
            toast.type === 'error' ? 'bg-red-600 text-white border-red-500 shadow-red-600/20' : 
            'bg-gray-900 text-white border-gray-700 shadow-xl'
          }`}>
            <span className="text-lg">{toast.type === 'error' ? '⚠️' : '✨'}</span>
            <span className="tracking-wide pr-2">{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-2 opacity-50 hover:opacity-100 transition-opacity">✕</button>
          </div>
        </div>
      )}

      {/* ⚠️ NATIVE-LOOKING CONFIRM MODAL ⚠️ */}
      {confirmModal && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-gray-100 text-center animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center text-2xl mx-auto mb-5 shadow-inner">⚠️</div>
            <h3 className="text-xl font-black text-gray-900 tracking-tight mb-2">Confirm Action</h3>
            <p className="text-gray-500 text-sm font-medium leading-relaxed mb-8">{confirmModal.message}</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmModal(null)} className="flex-1 px-4 py-3.5 bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold text-xs uppercase tracking-widest rounded-xl transition-all">Cancel</button>
              <button onClick={() => { confirmModal.onConfirm(); setConfirmModal(null); }} className="flex-1 px-4 py-3.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-widest rounded-xl shadow-lg transition-all active:scale-95">Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar Navigation */}
      <div className="w-64 bg-white border-r flex flex-col p-5 overflow-y-auto relative z-10 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-3 mb-10 px-2 mt-4 cursor-pointer hover:scale-[1.02] transition-transform">
          <div className="bg-emerald-50 text-emerald-600 p-2 rounded-xl border border-emerald-100 shadow-sm">
            <CheckCircle2 size={20} strokeWidth={3} />
          </div>
          <h1 className="text-[13px] font-black tracking-[0.2em] uppercase text-gray-900 leading-tight">Trainer<br/><span className="text-gray-400">Core_</span></h1>
        </div>
        
        <nav className="flex-1 space-y-2">
          {[{ icon: <LayoutGrid size={18}/>, label: 'OVERVIEW' }, { icon: <FileText size={18}/>, label: 'EXAMS' }, { icon: <ShieldAlert size={18}/>, label: 'MONITORING' }].map(item => (
            <button key={item.label} onClick={() => { setTab(item.label); setViewExam(null); }}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-black text-[10px] tracking-[0.15em] transition-all shadow-sm border ${tab === item.label ? 'bg-[#4B775E] text-white border-[#4B775E] shadow-emerald-900/20 translate-x-1' : 'bg-white text-gray-400 border-transparent hover:border-gray-100 hover:bg-gray-50 hover:text-gray-600'}`}>
              {item.icon}{item.label}
            </button>
          ))}
        </nav>
        
        <div className="mt-auto pt-6 border-t border-gray-100 relative group mb-4">
          <div className="absolute -top-14 left-0 right-0 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 translate-y-4 group-hover:translate-y-0 z-50">
            <button onClick={() => { logout(); navigate('/'); }} className="w-full flex items-center justify-center gap-2 py-3 bg-white border border-red-100 rounded-xl text-[10px] uppercase tracking-widest font-black text-red-500 shadow-xl hover:bg-red-50 hover:scale-[1.02] active:scale-[0.98] transition-all">
              <span>🚪</span> Terminate
            </button>
          </div>
          
          <div className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-50 border border-transparent hover:border-gray-100 cursor-pointer transition-all">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center text-emerald-600 font-black text-sm border border-emerald-100/50 shadow-sm shrink-0">
              {user?.name?.[0] || 'A'}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-gray-900 truncate">{user?.name}</p>
              <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600/70 mt-0.5">Faculty Auth</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-gray-50/50 p-8 lg:p-12 pb-24 relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none transform translate-x-1/3 -translate-y-1/3"></div>

        {viewExam ? <ExamDetail exam={viewExam} /> : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 relative z-10">
            <div className="flex justify-between items-end mb-10">
              <div>
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] mb-2 border-b border-emerald-100 inline-block pb-1">System Control</p>
                <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tight">{tab}</h2>
              </div>
              <button onClick={() => { setEditingId(null); setForm(defaultForm); setModal(true); }} className="bg-gray-900 hover:bg-black text-white px-6 py-4 rounded-2xl font-black text-[10px] tracking-[0.1em] uppercase flex items-center gap-3 shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all">
                <div className="bg-white/20 p-1 rounded-md"><Plus size={14}/></div> Generate Node
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              {[{ l: 'Total Matrix', v: exams.length, c: 'text-gray-900', i: '📦' },
                { l: 'Live Sector', v: exams.filter(e => e.status === 'active' || e.status === 'published').length, c: 'text-emerald-600', i: '📡' },
                { l: 'Draft Vault', v: exams.filter(e => e.status === 'draft').length, c: 'text-amber-500', i: '📝' },
                { l: 'Ended Ops', v: exams.filter(e => e.status === 'ended').length, c: 'text-gray-400', i: '🏁' }
              ].map((s, i) => (
                <div key={i} className="bg-white p-8 rounded-3xl border border-gray-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.04)] transition-all hover:-translate-y-1 group">
                  <div className="flex justify-between items-start mb-6">
                    <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-lg shadow-sm border border-gray-100 group-hover:scale-110 transition-transform">{s.i}</div>
                  </div>
                  <h3 className={`text-4xl font-black mb-2 ${s.c}`}>{s.v}</h3>
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.15em]">{s.l}</p>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-[0_8px_32px_rgba(0,0,0,0.02)] overflow-hidden">
              <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                <h4 className="text-xs font-black text-gray-900 uppercase tracking-[0.15em] flex items-center gap-3">
                  <div className="w-2 h-8 bg-[#4B775E] rounded-full"></div>
                  Assessment Registry
                </h4>
              </div>
              
              {loading ? (
                <div className="p-16 flex flex-col items-center justify-center opacity-50">
                   <div className="w-8 h-8 border-4 border-gray-200 border-t-[#4B775E] rounded-full animate-spin mb-4"></div>
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Querying Databanks...</p>
                </div>
              ) : exams.length === 0 ? (
                <div className="p-20 text-center">
                   <div className="text-5xl mb-4 opacity-20">📂</div>
                   <p className="text-xs font-black text-gray-300 uppercase tracking-widest italic">No deployments found.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-white border-b border-gray-100"><tr className="text-[9px] font-black text-gray-400 uppercase tracking-[0.15em]">
                      <th className="px-8 py-5">Assessment Profile</th><th className="px-6 py-5">Sector</th><th className="px-6 py-5">Payload</th><th className="px-6 py-5">Status Matrix</th><th className="px-8 py-5 text-right">Overrides</th>
                    </tr></thead>
                    <tbody className="divide-y divide-gray-50">
                      {exams.map(exam => (
                        <tr key={exam.id} className="hover:bg-gray-50/80 cursor-pointer transition-colors group" onClick={() => setViewExam(exam)}>
                          <td className="px-8 py-6">
                            <p className="font-black text-sm text-gray-900 group-hover:text-[#4B775E] transition-colors">{exam.title}</p>
                            <div className="flex items-center gap-2 mt-1">
                               <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Window: {exam.durationMinutes}m</span>
                            </div>
                          </td>
                          <td className="px-6 py-6 text-xs font-bold text-gray-500">{exam.course || '—'}</td>
                          <td className="px-6 py-6"><span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-lg text-[10px] font-black border border-gray-200">{exam.questions?.length || 0} Nodes</span></td>
                          <td className="px-6 py-6">
                            <div className="flex items-center gap-2">
                              {exam.status === 'active' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>}
                              <span className={`text-[9px] font-black px-3 py-1.5 rounded-md uppercase tracking-widest shadow-sm ${exam.status === 'active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : exam.status === 'published' ? 'bg-blue-50 text-blue-600 border border-blue-100' : exam.status === 'draft' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-gray-50 text-gray-400 border border-gray-200'}`}>{exam.status}</span>
                            </div>
                          </td>
                          <td className="px-8 py-6 text-right" onClick={e => e.stopPropagation()}>
                            <div className="flex gap-2 justify-end opacity-60 group-hover:opacity-100 transition-opacity">
                              
                              {(exam.status === 'draft' || exam.status === 'published') && (
                                <button onClick={() => openEditModal(exam)} className="text-[10px] bg-white border border-gray-200 text-gray-600 hover:border-gray-400 hover:text-gray-900 px-3 py-1.5 rounded-lg font-black uppercase tracking-widest shadow-sm transition-all flex items-center gap-1">
                                  <Edit size={12}/> Edit
                                </button>
                              )}

                              {exam.status === 'draft' && <button onClick={() => toggleStatus(exam, 'published')} className="text-[10px] bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-100 px-3 py-1.5 rounded-lg font-black uppercase tracking-widest shadow-sm transition-all">Publish</button>}
                              {exam.status === 'published' && <button onClick={() => toggleStatus(exam, 'draft')} className="text-[10px] bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-100 px-3 py-1.5 rounded-lg font-black uppercase tracking-widest shadow-sm transition-all">Revoke</button>}
                              {exam.status === 'active' && <button onClick={() => toggleStatus(exam, 'ended')} className="text-[10px] bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 px-3 py-1.5 rounded-lg font-black uppercase tracking-widest shadow-sm transition-all">End</button>}
                              <button onClick={() => deleteExam(exam.id)} className="text-gray-300 hover:text-red-500 p-1.5 bg-white border border-transparent hover:border-red-100 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={14}/></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
