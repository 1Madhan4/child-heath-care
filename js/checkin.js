/* ============================================
   Check-In Module — Async
   ============================================ */

const Checkin = {
    async renderChildForm(container) {
        const session = Storage.getSession();
        const counselors = await Storage.getCounselors();
        const html = `
        <div class="form-page view-enter">
            <button class="back-btn" onclick="App.navigate('dashboard')">← Back to Dashboard</button>
            <div class="form-card glass-card">
                <h2>🌈 Daily Check-In</h2>
                <p class="form-subtitle">How are you feeling today?</p>

                <form id="checkin-form" onsubmit="Checkin.submitChildForm(event)">
                    <div class="form-group">
                        <label class="form-label" for="checkin-child">Child's Name</label>
                        <input class="form-input" type="text" id="checkin-child" placeholder="Enter child's name" required>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Child's Photo <span style="font-weight:400;color:var(--text-muted);">(optional)</span></label>
                        <div id="photo-upload-area" onclick="document.getElementById('checkin-photo').click()" style="
                            cursor:pointer;
                            border: 2px dashed var(--border-glass);
                            border-radius: var(--radius-lg);
                            padding: var(--space-xl);
                            text-align: center;
                            transition: all 0.25s ease;
                            background: var(--bg-input);
                            position: relative;
                            overflow: hidden;
                        " onmouseover="this.style.borderColor='var(--primary-500)'" onmouseout="this.style.borderColor='var(--border-glass)'">
                            <div id="photo-placeholder">
                                <div style="font-size:2.5rem;margin-bottom:8px;">📸</div>
                                <p style="color:var(--text-secondary);font-size:var(--font-sm);font-weight:600;">Click to upload a photo</p>
                                <p style="color:var(--text-muted);font-size:var(--font-xs);margin-top:4px;">JPG, PNG or WebP · Max 2MB</p>
                            </div>
                            <img id="photo-preview" src="" alt="Child photo" style="display:none;width:120px;height:120px;border-radius:50%;object-fit:cover;border:3px solid var(--primary-500);box-shadow:0 0 20px rgba(99,102,241,0.4);">
                        </div>
                        <input type="file" id="checkin-photo" accept="image/*" style="display:none" onchange="Checkin.handlePhotoUpload(event)">
                    </div>

                    <div class="form-group">
                        <label class="form-label" for="checkin-parent-name">Parent's Name</label>
                        <input class="form-input" type="text" id="checkin-parent-name"
                            value="${session.role === 'parent' ? session.name : ''}"
                            placeholder="Enter parent's name" required>
                    </div>

                    <div class="form-group">
                        <label class="form-label" for="checkin-parent-email">Parent's Email</label>
                        <input class="form-input" type="email" id="checkin-parent-email"
                            value="${session.role === 'parent' ? session.email : ''}"
                            placeholder="parent@example.com" required>
                        <small style="color:var(--text-muted);font-size:var(--font-xs);margin-top:4px;display:block">
                            The parent must sign up with this same email to view this child's data.
                        </small>
                    </div>

                    <div class="form-group">
                        <label class="form-label" for="checkin-counselor-name">Counselor's Name</label>
                        <input class="form-input" type="text" id="checkin-counselor-name" placeholder="Enter counselor's name" required>
                    </div>

                    <div class="form-group">
                        <label class="form-label" for="checkin-counselor-email">Counselor's Email</label>
                        ${counselors.length > 0 ? `
                        <select class="form-select" id="checkin-counselor-select" onchange="Checkin.onCounselorSelect('checkin')">
                            <option value="">Choose a registered counselor...</option>
                            ${counselors.map(c => `<option value="${c.email}" data-name="${c.name}">${c.name} (${c.email})</option>`).join('')}
                            <option value="__other__">Other — enter email manually</option>
                        </select>` : ''}
                        <input class="form-input" type="email" id="checkin-counselor-email"
                            placeholder="counselor@example.com"
                            style="${counselors.length > 0 ? 'display:none;' : ''}margin-top:8px" required>
                        <small style="color:var(--text-muted);font-size:var(--font-xs);margin-top:4px;display:block">
                            The counselor must sign up with this same email to view this child's data.
                        </small>
                    </div>

                    <div class="form-group">
                        <label class="form-label" for="checkin-teacher-name">Teacher's Name</label>
                        <input class="form-input" type="text" id="checkin-teacher-name"
                            value="${session.role === 'teacher' ? session.name : ''}"
                            placeholder="Enter teacher's name" required>
                    </div>

                    <div class="form-group">
                        <label class="form-label" for="checkin-teacher-email">Teacher's Email</label>
                        <input class="form-input" type="email" id="checkin-teacher-email"
                            value="${session.role === 'teacher' ? session.email : ''}"
                            placeholder="teacher@example.com" required>
                    </div>

                    <div class="form-group">
                        <label class="form-label">How do you feel today?</label>
                        <div class="emoji-selector" id="mood-selector">
                            <button type="button" class="emoji-option" data-value="3" onclick="Checkin.selectMood(this)" title="Happy">🙂</button>
                            <button type="button" class="emoji-option" data-value="2" onclick="Checkin.selectMood(this)" title="Neutral">😐</button>
                            <button type="button" class="emoji-option" data-value="1" onclick="Checkin.selectMood(this)" title="Sad">😢</button>
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Did you sleep well?</label>
                        <div class="toggle-group" id="sleep-selector">
                            <button type="button" class="toggle-option" data-value="1" onclick="Checkin.selectToggle('sleep-selector', this)">😴 Yes</button>
                            <button type="button" class="toggle-option" data-value="0" onclick="Checkin.selectToggle('sleep-selector', this)">😫 No</button>
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Are you feeling stressed?</label>
                        <div class="toggle-group" id="stress-selector">
                            <button type="button" class="toggle-option" data-value="1" onclick="Checkin.selectToggle('stress-selector', this)">😌 Low</button>
                            <button type="button" class="toggle-option" data-value="2" onclick="Checkin.selectToggle('stress-selector', this)">😟 Medium</button>
                            <button type="button" class="toggle-option" data-value="3" onclick="Checkin.selectToggle('stress-selector', this)">😰 High</button>
                        </div>
                    </div>

                    <button class="btn btn-primary" type="submit" id="submit-checkin-btn">Submit Check-In ✨</button>
                </form>
            </div>
        </div>`;
        container.innerHTML = html;
        this.selectedMood = null;
        this.selectedSleep = null;
        this.selectedStress = null;
        this.selectedPhoto = null;

        // Pre-load photo if child name is typed
        document.getElementById('checkin-child').addEventListener('input', (e) => {
            const existing = Checkin.getChildPhoto(e.target.value.trim());
            if (existing) Checkin.showPhotoPreview(existing);
        });
    },

    handlePhotoUpload(e) {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            App.showToast('Photo too large. Max 5MB.', 'error');
            return;
        }
        // Show a local preview immediately while uploading
        const localUrl = URL.createObjectURL(file);
        this.showPhotoPreview(localUrl);
        this.uploadToCloudinary(file).then(url => {
            this.selectedPhoto = url;
        }).catch(() => {
            App.showToast('Photo upload failed. Will use local preview.', 'error');
            // Fallback: store as base64
            const reader = new FileReader();
            reader.onload = (ev) => { this.selectedPhoto = ev.target.result; };
            reader.readAsDataURL(file);
        });
    },

    async uploadToCloudinary(file) {
        const CLOUD_NAME = 'dbmlv0ac4';
        const UPLOAD_PRESET = 'mindbloom_upload'; // Create this in Cloudinary Dashboard → Settings → Upload Presets (unsigned)
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', UPLOAD_PRESET);
        formData.append('folder', 'mindbloom');

        App.showToast('Uploading photo...', 'info');
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
            method: 'POST',
            body: formData
        });
        if (!res.ok) throw new Error('Cloudinary upload failed');
        const data = await res.json();
        App.showToast('Photo uploaded! ✅', 'success');
        return data.secure_url;
    },

    showPhotoPreview(url) {
        const preview = document.getElementById('photo-preview');
        const placeholder = document.getElementById('photo-placeholder');
        if (preview && placeholder) {
            preview.src = url;
            preview.style.display = 'block';
            placeholder.style.display = 'none';
        }
    },

    getChildPhoto(childName) {
        if (!childName) return null;
        return localStorage.getItem('mindbloom_photo_' + childName.toLowerCase().trim()) || null;
    },

    saveChildPhoto(childName, url) {
        if (!childName || !url) return;
        localStorage.setItem('mindbloom_photo_' + childName.toLowerCase().trim(), url);
    },

    onCounselorSelect(prefix) {
        const select = document.getElementById(prefix + '-counselor-select');
        const emailInput = document.getElementById(prefix + '-counselor-email');
        const nameInput = document.getElementById(prefix + '-counselor-name');
        if (select.value === '__other__') {
            emailInput.style.display = 'block';
            emailInput.value = '';
            emailInput.focus();
            nameInput.value = '';
        } else if (select.value) {
            emailInput.style.display = 'none';
            emailInput.value = select.value;
            const selectedOption = select.options[select.selectedIndex];
            nameInput.value = selectedOption.dataset.name || '';
        } else {
            emailInput.style.display = 'none';
            emailInput.value = '';
            nameInput.value = '';
        }
    },

    selectedMood: null,
    selectedSleep: null,
    selectedStress: null,

    selectMood(el) {
        document.querySelectorAll('#mood-selector .emoji-option').forEach(e => e.classList.remove('selected'));
        el.classList.add('selected');
        this.selectedMood = parseInt(el.dataset.value);
    },

    selectToggle(groupId, el) {
        document.querySelectorAll(`#${groupId} .toggle-option`).forEach(e => e.classList.remove('selected'));
        el.classList.add('selected');
        if (groupId === 'sleep-selector') {
            this.selectedSleep = parseInt(el.dataset.value);
        } else if (groupId === 'stress-selector') {
            this.selectedStress = parseInt(el.dataset.value);
        }
    },

    async submitChildForm(e) {
        e.preventDefault();
        const childName = document.getElementById('checkin-child').value.trim();
        const parentName = document.getElementById('checkin-parent-name').value.trim();
        const parentEmail = document.getElementById('checkin-parent-email').value.trim().toLowerCase();
        const counselorName = document.getElementById('checkin-counselor-name').value.trim();
        const counselorEmail = document.getElementById('checkin-counselor-email').value.trim().toLowerCase();
        const teacherName = document.getElementById('checkin-teacher-name').value.trim();
        const teacherEmail = document.getElementById('checkin-teacher-email').value.trim().toLowerCase();

        if (!childName || !parentName || !parentEmail || !counselorName || !counselorEmail || !teacherName || !teacherEmail) {
            App.showToast('Please fill all text fields', 'error'); return;
        }
        if (this.selectedMood === null || this.selectedSleep === null || this.selectedStress === null) {
            App.showToast('Please answer all questions', 'error'); return;
        }

        const btn = document.getElementById('submit-checkin-btn');
        btn.disabled = true;
        btn.textContent = 'Saving...';

        const entry = {
            date: new Date().toISOString(),
            childName, parentName, parentEmail, counselorName, counselorEmail, teacherName, teacherEmail,
            mood: this.selectedMood, sleep: this.selectedSleep, stress: this.selectedStress,
            submittedBy: Storage.getSession().email
        };

        try {
            await Storage.saveCheckin(entry);
            // Save photo keyed by child name
            if (this.selectedPhoto) {
                this.saveChildPhoto(childName, this.selectedPhoto);
            }
            App.showToast('Check-in saved! 🎉', 'success');
            App.navigate('dashboard');
        } catch {
            btn.disabled = false;
            btn.textContent = 'Submit Check-In ✨';
            App.showToast('Error saving check-in. Please try again.', 'error');
        }
    },

    async renderObservationForm(container) {
        const session = Storage.getSession();
        const html = `
        <div class="form-page view-enter">
            <button class="back-btn" onclick="App.navigate('dashboard')">← Back to Dashboard</button>
            <div class="form-card glass-card">
                <h2>👁️ Adult Observation</h2>
                <p class="form-subtitle">Report any changes you've noticed in the child.</p>
                <p style="font-size:var(--font-sm);color:var(--text-secondary);margin-bottom:var(--space-lg);padding:var(--space-sm) var(--space-md);background:var(--bg-input);border-radius:var(--radius-md);">Submitting as: <strong>${session.name}</strong> (${session.role})</p>

                <form id="observation-form" onsubmit="Checkin.submitObservation(event)">
                    <div class="form-group">
                        <label class="form-label" for="obs-child">Child's Name</label>
                        <input class="form-input" type="text" id="obs-child" placeholder="Enter child's name" required>
                    </div>

                    <p class="form-section-title">Observations</p>

                    <div class="form-group">
                        <label class="form-label">Behavior change noticed?</label>
                        <div class="toggle-group" id="obs-behavior">
                            <button type="button" class="toggle-option" data-value="1" onclick="Checkin.selectToggle('obs-behavior', this)">Yes</button>
                            <button type="button" class="toggle-option" data-value="0" onclick="Checkin.selectToggle('obs-behavior', this)">No</button>
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Sleeping issues?</label>
                        <div class="toggle-group" id="obs-sleep">
                            <button type="button" class="toggle-option" data-value="1" onclick="Checkin.selectToggle('obs-sleep', this)">Yes</button>
                            <button type="button" class="toggle-option" data-value="0" onclick="Checkin.selectToggle('obs-sleep', this)">No</button>
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Sudden anger or sadness?</label>
                        <div class="toggle-group" id="obs-anger">
                            <button type="button" class="toggle-option" data-value="1" onclick="Checkin.selectToggle('obs-anger', this)">Yes</button>
                            <button type="button" class="toggle-option" data-value="0" onclick="Checkin.selectToggle('obs-anger', this)">No</button>
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label" for="obs-notes">Additional Notes (optional)</label>
                        <textarea class="form-input" id="obs-notes" rows="3" placeholder="Any other observations..."></textarea>
                    </div>

                    <button class="btn btn-primary" type="submit" id="submit-obs-btn">Submit Observation 📝</button>
                </form>
            </div>
        </div>`;
        container.innerHTML = html;
        this.obsBehavior = null;
        this.obsSleep = null;
        this.obsAnger = null;
    },

    async submitObservation(e) {
        e.preventDefault();
        const session = Storage.getSession();
        const childName = document.getElementById('obs-child').value.trim();
        const notes = document.getElementById('obs-notes').value.trim();

        const beh = document.querySelector('#obs-behavior .toggle-option.selected');
        const slp = document.querySelector('#obs-sleep .toggle-option.selected');
        const ang = document.querySelector('#obs-anger .toggle-option.selected');

        if (!childName) {
            App.showToast('Please enter the child\'s name', 'error'); return;
        }
        if (!beh || !slp || !ang) {
            App.showToast('Please answer all observation questions', 'error'); return;
        }

        const btn = document.getElementById('submit-obs-btn');
        btn.disabled = true;
        btn.textContent = 'Saving...';

        // Auto-populate role fields from the logged-in session
        const entry = {
            date: new Date().toISOString(),
            childName,
            parentEmail: session.role === 'parent' ? session.email : '',
            parentName: session.role === 'parent' ? session.name : '',
            teacherEmail: session.role === 'teacher' ? session.email : '',
            teacherName: session.role === 'teacher' ? session.name : '',
            counselorEmail: session.role === 'counselor' ? session.email : '',
            counselorName: session.role === 'counselor' ? session.name : '',
            behaviorChange: parseInt(beh.dataset.value) === 1,
            sleepIssue: parseInt(slp.dataset.value) === 1,
            angerSadness: parseInt(ang.dataset.value) === 1,
            notes,
            submittedBy: session.email
        };

        try {
            await Storage.saveObservation(entry);
            App.showToast('Observation recorded! 📝', 'success');
            App.navigate('dashboard');
        } catch {
            btn.disabled = false;
            btn.textContent = 'Submit Observation 📝';
            App.showToast('Error saving observation. Please try again.', 'error');
        }
    }
};

window.Checkin = Checkin;
