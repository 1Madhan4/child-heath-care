import { useState, useEffect, useRef, useCallback } from 'react';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale, LinearScale, PointElement, LineElement,
    Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { useApp } from '../context/AppContext';
import { Storage } from '../utils/storage';
import { RiskEngine } from '../utils/risk';
import { sendChatMessage, formatChatReply, clearChatHistory } from '../utils/chatbot';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const MOOD_EMOJIS = { 3: '🙂', 2: '😐', 1: '😢' };
const STRESS_LABELS = { 1: 'Low', 2: 'Medium', 3: 'High' };

/* ─────────────────────────────────────────
   Speech helpers
───────────────────────────────────────── */
function stripHtml(html) {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function getBestVoice() {
    const voices = window.speechSynthesis?.getVoices() || [];
    return (
        voices.find(v => /female|zira|samantha|victoria|Karen|Moira|Tessa/i.test(v.name)) ||
        voices.find(v => v.lang === 'en-US') ||
        voices[0]
    );
}

function speakWithBoundary(plainText, onBoundary, onEnd) {
    if (!window.speechSynthesis) { onEnd?.(); return; }
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(plainText);
    utt.lang = 'en-US';
    utt.rate = 0.95;
    utt.pitch = 1.05;
    const voice = getBestVoice();
    if (voice) utt.voice = voice;
    utt.onboundary = (e) => {
        if (e.name === 'word') onBoundary?.(e.charIndex, e.charLength ?? 1);
    };
    utt.onend = onEnd;
    utt.onerror = onEnd;
    window.speechSynthesis.speak(utt);
}

function stopSpeaking() {
    window.speechSynthesis?.cancel();
}

/* ─────────────────────────────────────────
   Sub-components
───────────────────────────────────────── */
function RiskBar({ label, value, max, color }) {
    const pct = Math.round((value / max) * 100);
    return (
        <div style={{ marginBottom: 'var(--space-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-xs)' }}>
                <span style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>{label}</span>
                <span style={{ fontSize: 'var(--font-sm)', fontWeight: 600 }}>{value}/{max}</span>
            </div>
            <div style={{ height: 8, background: 'var(--bg-input)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 'var(--radius-full)', transition: 'width 0.8s ease' }} />
            </div>
        </div>
    );
}

function UserMenu({ session, onSignOut, onDeleteAccount }) {
    const [open, setOpen] = useState(false);
    return (
        <div style={{ position: 'relative' }}>
            <div onClick={() => setOpen(o => !o)}
                style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', cursor: 'pointer', padding: '6px 12px', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-glass)', background: open ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,0.05)', transition: 'all 0.2s' }}>
                <div className="user-avatar">{session.name.charAt(0).toUpperCase()}</div>
                <span className="user-name">{session.name}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>▾</span>
            </div>
            {open && (
                <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, minWidth: 210, background: '#14142b', border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-card)', zIndex: 999, overflow: 'hidden' }}>
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-glass)' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 'var(--font-sm)' }}>{session.name}</div>
                        <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)', marginTop: 2, textTransform: 'capitalize' }}>{session.role}</div>
                    </div>
                    <div onClick={() => { setOpen(false); onSignOut(); }} id="signout-btn"
                        style={{ padding: '11px 16px', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 'var(--font-sm)', display: 'flex', alignItems: 'center', gap: 8 }}
                        onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                        onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                        🚪 Sign Out
                    </div>
                    <div style={{ borderTop: '1px solid var(--border-glass)' }} />
                    <div onClick={() => { setOpen(false); onDeleteAccount(); }} id="delete-account-btn"
                        style={{ padding: '11px 16px', cursor: 'pointer', color: '#ef4444', fontSize: 'var(--font-sm)', display: 'flex', alignItems: 'center', gap: 8 }}
                        onMouseOver={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
                        onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                        🗑️ Delete Account
                    </div>
                </div>
            )}
        </div>
    );
}

/* ─────────────────────────────────────────
   ChatBubble — purely presentational
   Speaking is controlled by the parent.
───────────────────────────────────────── */
function ChatBubble({ msg, revealChars, isDone, onReplay, onStop, isSpeaking }) {
    if (msg.role === 'user') {
        return <div className="chat-bubble user">{msg.text}</div>;
    }

    const plain = stripHtml(formatChatReply(msg.text));

    return (
        <div className="chat-bubble ai" style={{ position: 'relative', paddingRight: 28 }}>
            {isDone
                ? <span dangerouslySetInnerHTML={{ __html: formatChatReply(msg.text) }} />
                : (
                    <span>
                        {plain.slice(0, revealChars)}
                        <span className="tts-cursor" />
                    </span>
                )
            }

            {/* 🔊 replay / stop */}
            {!msg.isThinking && (
                <button
                    onClick={isSpeaking ? onStop : onReplay}
                    title={isSpeaking ? 'Stop' : 'Replay'}
                    style={{
                        position: 'absolute', top: 6, right: 6,
                        background: isSpeaking ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.07)',
                        border: '1px solid rgba(255,255,255,0.14)',
                        borderRadius: '50%', width: 22, height: 22,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', fontSize: 10, transition: 'all 0.2s',
                        color: isSpeaking ? 'var(--primary-300)' : 'var(--text-muted)',
                    }}>
                    {isSpeaking ? '■' : '🔊'}
                </button>
            )}
        </div>
    );
}

/* ─────────────────────────────────────────
   Main Dashboard
───────────────────────────────────────── */
export default function DashboardPage() {
    const { navigate, showToast, signOut, deleteAccount, session } = useApp();
    const [children, setChildren] = useState([]);
    const [currentChild, setCurrentChild] = useState(null);
    const [dashData, setDashData] = useState(null);
    const [chartData, setChartData] = useState(null);
    const [loadingDash, setLoadingDash] = useState(true);

    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [chatLoading, setChatLoading] = useState(false);
    const [autoSpeak, setAutoSpeak] = useState(true);
    const [listening, setListening] = useState(false);

    // -- Speaking state managed in parent --
    // activeSpeakIdx: index of message currently being spoken (-1 = none)
    // revealChars: how many characters of that message are revealed so far
    const [activeSpeakIdx, setActiveSpeakIdx] = useState(-1);
    const [revealChars, setRevealChars] = useState(0);
    const [speakDone, setSpeakDone] = useState(true);
    const revealRef = useRef(0); // ref copy to avoid stale closure in callbacks

    const recognitionRef = useRef(null);
    const messagesEndRef = useRef(null);

    /* ── Speak a specific message by index ── */
    const speakMessage = useCallback((msgs, idx, onDone) => {
        if (!autoSpeak || idx < 0 || idx >= msgs.length) return;
        const msg = msgs[idx];
        if (!msg || msg.role !== 'ai' || msg.isThinking) return;

        const plain = stripHtml(formatChatReply(msg.text));
        revealRef.current = 0;
        setActiveSpeakIdx(idx);
        setRevealChars(0);
        setSpeakDone(false);

        speakWithBoundary(
            plain,
            (charIndex, charLength) => {
                revealRef.current = charIndex + charLength;
                setRevealChars(charIndex + charLength);
            },
            () => {
                setRevealChars(plain.length);
                setSpeakDone(true);
                setActiveSpeakIdx(-1);
                onDone?.();
            }
        );
    }, [autoSpeak]);

    /* ── Stop speaking ── */
    const stopAndReset = useCallback(() => {
        stopSpeaking();
        setActiveSpeakIdx(-1);
        setSpeakDone(true);
    }, []);

    /* ── Load data ── */
    const loadChildren = useCallback(async () => {
        const kids = await Storage.getChildrenForUser();
        setChildren(kids);
        return kids;
    }, []);

    const loadDashboardData = useCallback(async (childName) => {
        if (!childName) { setLoadingDash(false); setDashData(null); setChartData(null); return; }
        setLoadingDash(true);
        const [risk, checkins] = await Promise.all([
            RiskEngine.calculate(childName),
            Storage.getCheckinsByChild(childName),
        ]);
        const triage = RiskEngine.getTriageAction(risk.level);
        const last7 = checkins.slice(-7).reverse();
        const last14 = checkins.slice(-14);
        const childPhoto = localStorage.getItem('mindbloom_photo_' + childName.toLowerCase().trim()) || null;
        setDashData({ risk, triage, checkins, last7, childPhoto });
        setChartData({
            labels: last14.map(c => new Date(c.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
            datasets: [
                { label: 'Mood', data: last14.map(c => c.mood), borderColor: '#748ffc', backgroundColor: 'rgba(116,143,252,0.1)', fill: true, tension: 0.4, pointBackgroundColor: '#748ffc', pointBorderColor: '#fff', pointBorderWidth: 2, pointRadius: 5, pointHoverRadius: 7 },
                { label: 'Stress', data: last14.map(c => c.stress), borderColor: '#ff922b', backgroundColor: 'rgba(255,146,43,0.08)', fill: true, tension: 0.4, pointBackgroundColor: '#ff922b', pointBorderColor: '#fff', pointBorderWidth: 2, pointRadius: 5, pointHoverRadius: 7 },
            ],
        });
        setLoadingDash(false);
    }, []);

    useEffect(() => {
        if (window.speechSynthesis) window.speechSynthesis.getVoices();
        loadChildren().then(kids => {
            const first = kids.length > 0 ? kids[0] : null;
            setCurrentChild(first);
            clearChatHistory();
            const greeting = `Hello! I'm your Virtual Psychiatrist. How can I help you support ${first || 'the child'} today?`;
            const msgs = [{ role: 'ai', text: greeting }];
            setChatMessages(msgs);
            loadDashboardData(first);
            // Speak greeting after a tiny delay so voices are loaded
            setTimeout(() => speakMessage(msgs, 0), 400);
        });
    }, [loadChildren, loadDashboardData]); // speakMessage intentionally omitted

    const switchChild = (name) => {
        setCurrentChild(name);
        stopAndReset();
        clearChatHistory();
        const greeting = `Switched to ${name}. How can I help you today?`;
        const msgs = [{ role: 'ai', text: greeting }];
        setChatMessages(msgs);
        loadDashboardData(name);
        setTimeout(() => speakMessage(msgs, 0), 200);
    };

    /* ── Speech-to-Text ── */
    const startListening = () => {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) { showToast('Speech recognition not supported.', 'error'); return; }
        const rec = new SR();
        rec.lang = 'en-US';
        rec.interimResults = false;
        rec.onstart = () => setListening(true);
        rec.onresult = (e) => { setChatInput(e.results[0][0].transcript); setListening(false); };
        rec.onerror = () => { setListening(false); showToast('Could not hear you.', 'error'); };
        rec.onend = () => setListening(false);
        rec.start();
        recognitionRef.current = rec;
    };
    const stopListening = () => { recognitionRef.current?.stop(); setListening(false); };

    /* ── Chat Submit ── */
    const handleChatSubmit = async (e) => {
        e.preventDefault();
        const text = chatInput.trim();
        if (!text || chatLoading) return;
        setChatInput('');
        stopAndReset();

        setChatMessages(prev => {
            const withUser = [...prev, { role: 'user', text }];
            const withThinking = [...withUser, { role: 'ai', text: 'Thinking…', isThinking: true }];
            return withThinking;
        });
        setChatLoading(true);

        try {
            const reply = await sendChatMessage(text, currentChild);

            // Build final messages list, then immediately speak the new reply
            setChatMessages(prev => {
                const updated = prev.filter(m => !m.isThinking);
                const next = [...updated, { role: 'ai', text: reply }];
                // Speak right here, synchronously referencing next array
                if (autoSpeak) {
                    const idx = next.length - 1;
                    const plain = stripHtml(formatChatReply(reply));
                    revealRef.current = 0;
                    setActiveSpeakIdx(idx);
                    setRevealChars(0);
                    setSpeakDone(false);
                    speakWithBoundary(
                        plain,
                        (ci, cl) => { revealRef.current = ci + cl; setRevealChars(ci + cl); },
                        () => { setRevealChars(plain.length); setSpeakDone(true); setActiveSpeakIdx(-1); }
                    );
                }
                return next;
            });
        } catch {
            setChatMessages(prev => {
                const updated = prev.filter(m => !m.isThinking);
                return [...updated, { role: 'ai', text: 'Sorry, something went wrong. Please try again.' }];
            });
        } finally {
            setChatLoading(false);
        }
    };

    /* ── Replay a finished message ── */
    const handleReplay = useCallback((idx) => {
        setChatMessages(prev => {
            stopAndReset();
            speakMessage(prev, idx);
            return prev;
        });
    }, [speakMessage, stopAndReset]);

    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

    const handlePhotoChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
            const fd = new FormData();
            fd.append('file', file);
            fd.append('upload_preset', 'mindbloom_upload');
            fd.append('folder', 'mindbloom');
            showToast('Uploading photo…', 'info');
            const res = await fetch('https://api.cloudinary.com/v1_1/dbmlv0ac4/image/upload', { method: 'POST', body: fd });
            if (!res.ok) throw new Error();
            const data = await res.json();
            localStorage.setItem('mindbloom_photo_' + currentChild.toLowerCase().trim(), data.secure_url);
            showToast('Photo updated! ✅', 'success');
            loadDashboardData(currentChild);
        } catch { showToast('Could not update photo.', 'error'); }
    };

    const chartOptions = {
        responsive: true, maintainAspectRatio: false,
        interaction: { intersect: false, mode: 'index' },
        plugins: {
            legend: { labels: { color: '#a7a9be', font: { family: 'Outfit', size: 12 }, usePointStyle: true, pointStyle: 'circle' } },
            tooltip: { backgroundColor: 'rgba(15,14,23,0.9)', titleFont: { family: 'Outfit' }, bodyFont: { family: 'Outfit' }, cornerRadius: 8, padding: 12 },
        },
        scales: {
            x: { ticks: { color: '#72738c', font: { family: 'Outfit', size: 11 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
            y: { min: 0, max: 4, ticks: { color: '#72738c', font: { family: 'Outfit', size: 11 }, stepSize: 1, callback: v => ({ 1: '😢 Sad', 2: '😐 Neutral', 3: '🙂 Happy' })[v] || '' }, grid: { color: 'rgba(255,255,255,0.05)' } },
        },
    };

    return (
        <div className="dashboard view-enter">
            {/* Header */}
            <div className="dashboard-header">
                <div><h1>🌱 MindBloom</h1></div>
                <div className="user-info">
                    <UserMenu session={session} onSignOut={signOut} onDeleteAccount={deleteAccount} />
                </div>
            </div>

            {/* Child Selector */}
            {children.length > 0 && (
                <div className="child-selector">
                    <label htmlFor="child-select">Viewing data for:</label>
                    <select className="form-select" id="child-select" value={currentChild || ''} onChange={e => switchChild(e.target.value)} style={{ display: 'inline-block', width: 'auto', minWidth: 200 }}>
                        {children.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
            )}

            {/* Quick Actions */}
            <div className="quick-actions" style={{ marginBottom: 'var(--space-xl)' }}>
                <button className="btn btn-primary" onClick={() => navigate('checkin')} id="new-checkin-btn">🌈 New Check-In</button>
                <button className="btn btn-secondary" onClick={() => navigate('observation')} id="new-observation-btn">👁️ Add Observation</button>
            </div>

            {/* Two-column layout */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 'var(--space-xl)', alignItems: 'start', minHeight: 600 }}>

                {/* ── Left ── */}
                <div id="dashboard-content">
                    {loadingDash ? (
                        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Loading patient data…</div>
                    ) : !dashData ? (
                        <div className="empty-state glass-card" style={{ padding: 'var(--space-3xl)' }}>
                            <div className="empty-icon">🌱</div>
                            <h3 style={{ marginBottom: 'var(--space-md)', color: 'var(--text-secondary)' }}>No Data Yet</h3>
                            <p>Start by adding a daily check-in for a child.<br />The dashboard will show insights once data is available.</p>
                        </div>
                    ) : (
                        <>
                            {/* Child Profile */}
                            <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-lg)', padding: 'var(--space-lg)', marginBottom: 'var(--space-xl)', background: 'linear-gradient(135deg,rgba(99,102,241,0.1),rgba(236,72,153,0.06))' }}>
                                {dashData.childPhoto
                                    ? <img src={dashData.childPhoto} alt={currentChild} style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--primary-500)', boxShadow: '0 0 20px rgba(99,102,241,0.4)', flexShrink: 0 }} />
                                    : <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg,var(--primary-600),var(--accent-pink))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', flexShrink: 0, boxShadow: '0 0 20px rgba(99,102,241,0.3)' }}>🧒</div>
                                }
                                <div>
                                    <div style={{ fontSize: 'var(--font-xl)', fontWeight: 800 }}>{currentChild}</div>
                                    <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                        <span className={`risk-badge ${dashData.risk.level}`}>{dashData.risk.label}</span>
                                        <span style={{ color: 'var(--text-muted)', fontSize: 'var(--font-xs)' }}>{dashData.checkins.length} check-in{dashData.checkins.length !== 1 ? 's' : ''}</span>
                                    </div>
                                </div>
                                <div style={{ marginLeft: 'auto' }}>
                                    <button onClick={() => document.getElementById('change-photo-input').click()} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-glass)', color: 'var(--text-secondary)', borderRadius: 'var(--radius-full)', padding: '6px 14px', cursor: 'pointer', fontSize: 'var(--font-xs)', fontFamily: 'var(--font-family)', transition: 'all 0.2s' }}
                                        onMouseOver={e => e.currentTarget.style.borderColor = 'var(--primary-500)'}
                                        onMouseOut={e => e.currentTarget.style.borderColor = 'var(--border-glass)'}>
                                        📷 Change Photo
                                    </button>
                                    <input type="file" id="change-photo-input" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
                                </div>
                            </div>

                            {/* Stats */}
                            <div className="stat-cards">
                                <div className="stat-card glass-card"><div className="stat-icon">📊</div><div className="stat-value">{dashData.risk.score}</div><div className="stat-label">Risk Score</div></div>
                                <div className="stat-card glass-card"><div className="stat-icon">{dashData.risk.level === 'low' ? '🟢' : dashData.risk.level === 'medium' ? '🟡' : '🔴'}</div><div className="stat-value"><span className={`risk-badge ${dashData.risk.level}`}>{dashData.risk.label}</span></div><div className="stat-label">Risk Level</div></div>
                                <div className="stat-card glass-card"><div className="stat-icon">📝</div><div className="stat-value">{dashData.checkins.length}</div><div className="stat-label">Total Check-Ins</div></div>
                                <div className="stat-card glass-card"><div className="stat-icon">📅</div><div className="stat-value">{dashData.checkins.length > 0 ? new Date(dashData.checkins[dashData.checkins.length - 1].date).toLocaleDateString() : '—'}</div><div className="stat-label">Last Check-In</div></div>
                            </div>

                            {/* Alert */}
                            <div className={`alert-card ${dashData.triage.alertClass}`}>
                                <span className="alert-icon">{dashData.triage.icon}</span>
                                <div>
                                    <div className="alert-title">{dashData.triage.title}</div>
                                    <div className="alert-text">{dashData.triage.text}</div>
                                </div>
                            </div>

                            {/* Chart + Breakdown */}
                            <div className="dashboard-grid">
                                <div className="chart-container glass-card">
                                    <h3>📈 Mood Trend (Last 14 Days)</h3>
                                    <div className="chart-wrapper">
                                        {chartData && <Line data={chartData} options={chartOptions} />}
                                    </div>
                                </div>
                                <div className="glass-card" style={{ padding: 'var(--space-xl)' }}>
                                    <h3 style={{ marginBottom: 'var(--space-lg)' }}>🧠 Risk Breakdown</h3>
                                    <RiskBar label="Mood" value={dashData.risk.moodScore} max={40} color="var(--accent-pink)" />
                                    <RiskBar label="Sleep" value={dashData.risk.sleepScore} max={30} color="var(--accent-cyan)" />
                                    <RiskBar label="Behavior" value={dashData.risk.behaviorScore} max={30} color="var(--accent-orange)" />
                                </div>
                            </div>

                            {/* History */}
                            <div className="history-list glass-card" style={{ marginTop: 'var(--space-xl)' }}>
                                <div className="section-header"><h3>📋 Recent Check-Ins</h3></div>
                                {dashData.last7.length > 0 ? dashData.last7.map((c, i) => (
                                    <div className="history-item" key={i}>
                                        <span className="history-date">{new Date(c.date).toLocaleDateString()}</span>
                                        <span className="history-mood">{MOOD_EMOJIS[c.mood] || '❓'}</span>
                                        <div className="history-details">
                                            <span className="history-detail">Sleep: <span>{c.sleep ? '✅' : '❌'}</span></span>
                                            <span className="history-detail">Stress: <span>{STRESS_LABELS[c.stress] || '?'}</span></span>
                                        </div>
                                    </div>
                                )) : <div className="empty-state"><p>No check-ins yet</p></div>}
                            </div>
                        </>
                    )}
                </div>

                {/* ── Right: Chatbot ── */}
                <div className="chatbot-panel" style={{ height: 'calc(100vh - 200px)', position: 'sticky', top: 20 }}>
                    <div className="chatbot-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <h3>🧠 Virtual Psychiatrist</h3>
                        {/* Auto-speak toggle */}
                        <button
                            onClick={() => { const next = !autoSpeak; setAutoSpeak(next); if (!next) stopAndReset(); }}
                            title={autoSpeak ? 'Auto-speak ON' : 'Auto-speak OFF'}
                            style={{ background: autoSpeak ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.07)', border: `1px solid ${autoSpeak ? 'rgba(99,102,241,0.6)' : 'rgba(255,255,255,0.12)'}`, borderRadius: 'var(--radius-full)', padding: '4px 10px', cursor: 'pointer', fontSize: 12, color: autoSpeak ? 'var(--primary-300)' : 'var(--text-muted)', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 4 }}>
                            {autoSpeak ? '🔊 On' : '🔇 Off'}
                        </button>
                    </div>

                    <div className="chatbot-messages" id="chatbot-messages">
                        {chatMessages.map((msg, i) => {
                            const isActive = i === activeSpeakIdx;
                            const plain = msg.role === 'ai' ? stripHtml(formatChatReply(msg.text)) : '';
                            return (
                                <ChatBubble
                                    key={i}
                                    msg={msg}
                                    revealChars={isActive ? revealChars : plain.length}
                                    isDone={!isActive || speakDone}
                                    isSpeaking={isActive && !speakDone}
                                    onReplay={() => handleReplay(i)}
                                    onStop={stopAndReset}
                                />
                            );
                        })}
                        {chatLoading && (
                            <div className="chat-bubble ai" style={{ opacity: 0.6 }}>
                                <span className="tts-cursor" /><span className="tts-cursor" style={{ animationDelay: '0.2s' }} /><span className="tts-cursor" style={{ animationDelay: '0.4s' }} />
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <form className="chatbot-input" onSubmit={handleChatSubmit}>
                        <button type="button" onClick={listening ? stopListening : startListening}
                            title={listening ? 'Stop recording' : 'Speak your question'}
                            style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', border: 'none', flexShrink: 0, cursor: 'pointer', fontSize: '1rem', background: listening ? 'linear-gradient(135deg,#ef4444,#dc2626)' : 'rgba(255,255,255,0.07)', color: listening ? '#fff' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', animation: listening ? 'micPulse 1s infinite' : 'none' }}>
                            {listening ? '⏹' : '🎤'}
                        </button>
                        <input type="text" id="chatbot-input-field"
                            placeholder={listening ? 'Listening…' : 'Ask something…'}
                            autoComplete="off"
                            value={chatInput}
                            onChange={e => setChatInput(e.target.value)}
                            disabled={chatLoading}
                        />
                        <button type="submit" disabled={chatLoading || !chatInput.trim()}>↑</button>
                    </form>
                </div>
            </div>
        </div>
    );
}
