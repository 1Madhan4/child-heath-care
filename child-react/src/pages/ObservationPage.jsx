import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Storage } from '../utils/storage';

export default function ObservationPage() {
    const { navigate, showToast, session } = useApp();
    const [childName, setChildName] = useState('');
    const [behavior, setBehavior] = useState(null);
    const [sleepIssue, setSleepIssue] = useState(null);
    const [anger, setAnger] = useState(null);
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!childName.trim()) { showToast("Please enter the child's name", 'error'); return; }
        if (behavior === null || sleepIssue === null || anger === null) { showToast('Please answer all observation questions', 'error'); return; }

        setLoading(true);
        const entry = {
            date: new Date().toISOString(),
            childName: childName.trim(),
            parentEmail: session.role === 'parent' ? session.email : '',
            parentName: session.role === 'parent' ? session.name : '',
            teacherEmail: session.role === 'teacher' ? session.email : '',
            teacherName: session.role === 'teacher' ? session.name : '',
            counselorEmail: session.role === 'counselor' ? session.email : '',
            counselorName: session.role === 'counselor' ? session.name : '',
            behaviorChange: behavior === 1,
            sleepIssue: sleepIssue === 1,
            angerSadness: anger === 1,
            notes: notes.trim(),
            submittedBy: session.email,
        };

        try {
            await Storage.saveObservation(entry);
            showToast('Observation recorded! 📝', 'success');
            navigate('dashboard');
        } catch {
            showToast('Error saving observation. Please try again.', 'error');
            setLoading(false);
        }
    };

    const ToggleGroup = ({ value, onChange, options }) => (
        <div className="toggle-group">
            {options.map(o => (
                <button key={o.v} type="button" className={`toggle-option ${value === o.v ? 'selected' : ''}`} onClick={() => onChange(o.v)}>
                    {o.l}
                </button>
            ))}
        </div>
    );

    return (
        <div className="form-page view-enter">
            <button className="back-btn" onClick={() => navigate('dashboard')}>← Back to Dashboard</button>
            <div className="form-card glass-card">
                <h2>👁️ Adult Observation</h2>
                <p className="form-subtitle">Report any changes you've noticed in the child.</p>
                <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)', padding: 'var(--space-sm) var(--space-md)', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
                    Submitting as: <strong>{session?.name}</strong> ({session?.role})
                </p>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label" htmlFor="obs-child">Child's Name</label>
                        <input className="form-input" type="text" id="obs-child" placeholder="Enter child's name" required
                            value={childName} onChange={e => setChildName(e.target.value)} />
                    </div>

                    <p className="form-section-title">Observations</p>

                    <div className="form-group">
                        <label className="form-label">Behavior change noticed?</label>
                        <ToggleGroup value={behavior} onChange={setBehavior} options={[{ v: 1, l: 'Yes' }, { v: 0, l: 'No' }]} />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Sleeping issues?</label>
                        <ToggleGroup value={sleepIssue} onChange={setSleepIssue} options={[{ v: 1, l: 'Yes' }, { v: 0, l: 'No' }]} />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Sudden anger or sadness?</label>
                        <ToggleGroup value={anger} onChange={setAnger} options={[{ v: 1, l: 'Yes' }, { v: 0, l: 'No' }]} />
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="obs-notes">Additional Notes (optional)</label>
                        <textarea className="form-input" id="obs-notes" rows={3} placeholder="Any other observations..."
                            value={notes} onChange={e => setNotes(e.target.value)} />
                    </div>

                    <button className="btn btn-primary" type="submit" id="submit-obs-btn" disabled={loading}>
                        {loading ? 'Saving...' : 'Submit Observation 📝'}
                    </button>
                </form>
            </div>
        </div>
    );
}
