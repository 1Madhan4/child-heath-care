import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Storage } from '../utils/storage';

const CLOUD_NAME = 'dbmlv0ac4';
const UPLOAD_PRESET = 'mindbloom_upload';

async function uploadToCloudinary(file, showToast) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);
    formData.append('folder', 'mindbloom');
    showToast('Uploading photo...', 'info');
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: 'POST', body: formData });
    if (!res.ok) throw new Error('Cloudinary upload failed');
    const data = await res.json();
    showToast('Photo uploaded! ✅', 'success');
    return data.secure_url;
}

function getChildPhoto(childName) {
    if (!childName) return null;
    return localStorage.getItem('mindbloom_photo_' + childName.toLowerCase().trim()) || null;
}

function saveChildPhoto(childName, url) {
    if (!childName || !url) return;
    localStorage.setItem('mindbloom_photo_' + childName.toLowerCase().trim(), url);
}

export default function CheckinPage() {
    const { navigate, showToast, session } = useApp();
    const [counselors, setCounselors] = useState([]);
    const [childName, setChildName] = useState('');
    const [parentName, setParentName] = useState(session?.role === 'parent' ? session.name : '');
    const [parentEmail, setParentEmail] = useState(session?.role === 'parent' ? session.email : '');
    const [counselorName, setCounselorName] = useState('');
    const [counselorEmail, setCounselorEmail] = useState('');
    const [counselorSelect, setCounselorSelect] = useState('');
    const [showManualCounselor, setShowManualCounselor] = useState(false);
    const [teacherName, setTeacherName] = useState(session?.role === 'teacher' ? session.name : '');
    const [teacherEmail, setTeacherEmail] = useState(session?.role === 'teacher' ? session.email : '');
    const [mood, setMood] = useState(null);
    const [sleep, setSleep] = useState(null);
    const [stress, setStress] = useState(null);
    const [photoUrl, setPhotoUrl] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        Storage.getCounselors().then(setCounselors);
    }, []);

    const handleChildNameChange = (e) => {
        const name = e.target.value;
        setChildName(name);
        const existing = getChildPhoto(name.trim());
        if (existing) setPhotoPreview(existing);
    };

    const handlePhotoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { showToast('Photo too large. Max 5MB.', 'error'); return; }
        const localUrl = URL.createObjectURL(file);
        setPhotoPreview(localUrl);
        try {
            const url = await uploadToCloudinary(file, showToast);
            setPhotoUrl(url);
        } catch {
            showToast('Photo upload failed. Will use local preview.', 'error');
            const reader = new FileReader();
            reader.onload = (ev) => setPhotoUrl(ev.target.result);
            reader.readAsDataURL(file);
        }
    };

    const handleCounselorSelectChange = (e) => {
        const val = e.target.value;
        setCounselorSelect(val);
        if (val === '__other__') {
            setShowManualCounselor(true);
            setCounselorEmail('');
            setCounselorName('');
        } else if (val) {
            setShowManualCounselor(false);
            setCounselorEmail(val);
            const opt = counselors.find(c => c.email === val);
            setCounselorName(opt ? opt.name : '');
        } else {
            setShowManualCounselor(false);
            setCounselorEmail('');
            setCounselorName('');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!childName.trim() || !parentName.trim() || !parentEmail.trim() || !counselorName.trim() || !counselorEmail.trim() || !teacherName.trim() || !teacherEmail.trim()) {
            showToast('Please fill all text fields', 'error'); return;
        }
        if (mood === null || sleep === null || stress === null) {
            showToast('Please answer all questions', 'error'); return;
        }

        setLoading(true);
        const entry = {
            date: new Date().toISOString(),
            childName: childName.trim(),
            parentName: parentName.trim(),
            parentEmail: parentEmail.trim().toLowerCase(),
            counselorName: counselorName.trim(),
            counselorEmail: counselorEmail.trim().toLowerCase(),
            teacherName: teacherName.trim(),
            teacherEmail: teacherEmail.trim().toLowerCase(),
            mood, sleep, stress,
            submittedBy: session.email,
        };

        try {
            await Storage.saveCheckin(entry);
            if (photoUrl) saveChildPhoto(childName.trim(), photoUrl);
            showToast('Check-in saved! 🎉', 'success');
            navigate('dashboard');
        } catch {
            showToast('Error saving check-in. Please try again.', 'error');
            setLoading(false);
        }
    };

    return (
        <div className="form-page view-enter">
            <button className="back-btn" onClick={() => navigate('dashboard')}>← Back to Dashboard</button>
            <div className="form-card glass-card">
                <h2>🌈 Daily Check-In</h2>
                <p className="form-subtitle">How are you feeling today?</p>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label" htmlFor="checkin-child">Child's Name</label>
                        <input className="form-input" type="text" id="checkin-child" placeholder="Enter child's name" required
                            value={childName} onChange={handleChildNameChange} />
                    </div>

                    {/* Photo Upload */}
                    <div className="form-group">
                        <label className="form-label">Child's Photo <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(optional)</span></label>
                        <div onClick={() => document.getElementById('checkin-photo').click()} style={{
                            cursor: 'pointer', border: '2px dashed var(--border-glass)', borderRadius: 'var(--radius-lg)',
                            padding: 'var(--space-xl)', textAlign: 'center', transition: 'all 0.25s ease',
                            background: 'var(--bg-input)', position: 'relative', overflow: 'hidden',
                        }}
                            onMouseOver={e => e.currentTarget.style.borderColor = 'var(--primary-500)'}
                            onMouseOut={e => e.currentTarget.style.borderColor = 'var(--border-glass)'}
                        >
                            {photoPreview ? (
                                <img src={photoPreview} alt="Child" style={{ width: 120, height: 120, borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--primary-500)', boxShadow: '0 0 20px rgba(99,102,241,0.4)' }} />
                            ) : (
                                <div>
                                    <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>📸</div>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)', fontWeight: 600 }}>Click to upload a photo</p>
                                    <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-xs)', marginTop: 4 }}>JPG, PNG or WebP · Max 5MB</p>
                                </div>
                            )}
                        </div>
                        <input type="file" id="checkin-photo" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoUpload} />
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="checkin-parent-name">Parent's Name</label>
                        <input className="form-input" type="text" id="checkin-parent-name" placeholder="Enter parent's name" required
                            value={parentName} onChange={e => setParentName(e.target.value)} />
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="checkin-parent-email">Parent's Email</label>
                        <input className="form-input" type="email" id="checkin-parent-email" placeholder="parent@example.com" required
                            value={parentEmail} onChange={e => setParentEmail(e.target.value)} />
                        <small style={{ color: 'var(--text-muted)', fontSize: 'var(--font-xs)', marginTop: 4, display: 'block' }}>
                            The parent must sign up with this same email to view this child's data.
                        </small>
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="checkin-counselor-name">Counselor's Name</label>
                        <input className="form-input" type="text" id="checkin-counselor-name" placeholder="Enter counselor's name" required
                            value={counselorName} onChange={e => setCounselorName(e.target.value)} />
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="checkin-counselor-email">Counselor's Email</label>
                        {counselors.length > 0 && (
                            <select className="form-select" value={counselorSelect} onChange={handleCounselorSelectChange} style={{ marginBottom: 8 }}>
                                <option value="">Choose a registered counselor...</option>
                                {counselors.map(c => <option key={c.email} value={c.email} data-name={c.name}>{c.name} ({c.email})</option>)}
                                <option value="__other__">Other — enter email manually</option>
                            </select>
                        )}
                        {(counselors.length === 0 || showManualCounselor) && (
                            <input className="form-input" type="email" id="checkin-counselor-email" placeholder="counselor@example.com" required
                                value={counselorEmail} onChange={e => setCounselorEmail(e.target.value)} style={{ marginTop: counselors.length > 0 ? 8 : 0 }} />
                        )}
                        <small style={{ color: 'var(--text-muted)', fontSize: 'var(--font-xs)', marginTop: 4, display: 'block' }}>
                            The counselor must sign up with this same email to view this child's data.
                        </small>
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="checkin-teacher-name">Teacher's Name</label>
                        <input className="form-input" type="text" id="checkin-teacher-name" placeholder="Enter teacher's name" required
                            value={teacherName} onChange={e => setTeacherName(e.target.value)} />
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="checkin-teacher-email">Teacher's Email</label>
                        <input className="form-input" type="email" id="checkin-teacher-email" placeholder="teacher@example.com" required
                            value={teacherEmail} onChange={e => setTeacherEmail(e.target.value)} />
                    </div>

                    {/* Mood */}
                    <div className="form-group">
                        <label className="form-label">How do you feel today?</label>
                        <div className="emoji-selector">
                            {[{ v: 3, e: '🙂', t: 'Happy' }, { v: 2, e: '😐', t: 'Neutral' }, { v: 1, e: '😢', t: 'Sad' }].map(o => (
                                <button key={o.v} type="button" className={`emoji-option ${mood === o.v ? 'selected' : ''}`} title={o.t}
                                    onClick={() => setMood(o.v)}>{o.e}</button>
                            ))}
                        </div>
                    </div>

                    {/* Sleep */}
                    <div className="form-group">
                        <label className="form-label">Did you sleep well?</label>
                        <div className="toggle-group">
                            {[{ v: 1, l: '😴 Yes' }, { v: 0, l: '😫 No' }].map(o => (
                                <button key={o.v} type="button" className={`toggle-option ${sleep === o.v ? 'selected' : ''}`}
                                    onClick={() => setSleep(o.v)}>{o.l}</button>
                            ))}
                        </div>
                    </div>

                    {/* Stress */}
                    <div className="form-group">
                        <label className="form-label">Are you feeling stressed?</label>
                        <div className="toggle-group">
                            {[{ v: 1, l: '😌 Low' }, { v: 2, l: '😟 Medium' }, { v: 3, l: '😰 High' }].map(o => (
                                <button key={o.v} type="button" className={`toggle-option ${stress === o.v ? 'selected' : ''}`}
                                    onClick={() => setStress(o.v)}>{o.l}</button>
                            ))}
                        </div>
                    </div>

                    <button className="btn btn-primary" type="submit" id="submit-checkin-btn" disabled={loading}>
                        {loading ? 'Saving...' : 'Submit Check-In ✨'}
                    </button>
                </form>
            </div>
        </div>
    );
}
