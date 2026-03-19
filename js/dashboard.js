/* ============================================
   Dashboard Module — Async
   ============================================ */

const Dashboard = {
    currentChild: null,
    moodChart: null,

    async render(container) {
        const session = Storage.getSession();
        const children = await Storage.getChildrenForUser();
        this.currentChild = children.length > 0 ? children[0] : null;

        const html = `
        <div class="dashboard view-enter">
            <div class="dashboard-header">
                <div>
                    <h1>🌱 MindBloom</h1>
                </div>
                <div class="user-info">
                    <div style="position:relative;" id="user-menu-wrapper">
                        <div onclick="Dashboard.toggleUserMenu()" style="display:flex;align-items:center;gap:var(--space-sm);cursor:pointer;padding:6px 12px;border-radius:var(--radius-full);border:1px solid var(--border-glass);background:rgba(255,255,255,0.05);transition:all 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.09)'" onmouseout="this.style.background='rgba(255,255,255,0.05)'">
                            <div class="user-avatar">${session.name.charAt(0).toUpperCase()}</div>
                            <span class="user-name">${session.name}</span>
                            <span style="color:var(--text-muted);font-size:10px;">▾</span>
                        </div>
                        <!-- Dropdown Menu -->
                        <div id="user-dropdown" style="display:none;position:absolute;top:calc(100% + 8px);right:0;min-width:210px;background:#14142b;border:1px solid var(--border-glass);border-radius:var(--radius-md);box-shadow:var(--shadow-card);z-index:999;overflow:hidden;">
                            <div style="padding:12px 16px;border-bottom:1px solid var(--border-glass);">
                                <div style="font-weight:700;color:var(--text-primary);font-size:var(--font-sm);">${session.name}</div>
                                <div style="font-size:var(--font-xs);color:var(--text-muted);margin-top:2px;text-transform:capitalize;">${session.role}</div>
                            </div>
                            <div onclick="App.signOut()" id="signout-btn" style="padding:11px 16px;cursor:pointer;color:var(--text-secondary);font-size:var(--font-sm);display:flex;align-items:center;gap:8px;transition:background 0.15s;" onmouseover="this.style.background='rgba(255,255,255,0.06)'" onmouseout="this.style.background='transparent'">
                                🚪 Sign Out
                            </div>
                            <div style="border-top:1px solid var(--border-glass);"></div>
                            <div onclick="App.deleteAccount()" id="delete-account-btn" style="padding:11px 16px;cursor:pointer;color:#ef4444;font-size:var(--font-sm);display:flex;align-items:center;gap:8px;transition:background 0.15s;" onmouseover="this.style.background='rgba(239,68,68,0.08)'" onmouseout="this.style.background='transparent'">
                                🗑️ Delete Account
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            ${children.length > 0 ? `
            <div class="child-selector">
                <label for="child-select">Viewing data for:</label>
                <select class="form-select" id="child-select" onchange="Dashboard.switchChild(this.value)" style="display:inline-block;width:auto;min-width:200px">
                    ${children.map(c => `<option value="${c}" ${c === this.currentChild ? 'selected' : ''}>${c}</option>`).join('')}
                </select>
            </div>` : ''}

            <div class="quick-actions" style="margin-bottom:var(--space-xl)">
                <button class="btn btn-primary" onclick="App.navigate('checkin')" id="new-checkin-btn">🌈 New Check-In</button>
                <button class="btn btn-secondary" onclick="App.navigate('observation')" id="new-observation-btn">👁️ Add Observation</button>
            </div>

            <!-- Two-column layout: Dashboard Content on Left, Chatbot on Right -->
            <div style="display: grid; grid-template-columns: 1fr 350px; gap: var(--space-xl); align-items: start; height: calc(100vh - 200px); min-height: 600px;">
                <!-- Main Dashboard Content -->
                <div id="dashboard-content" style="overflow-y: auto; height: 100%; padding-right: 10px;">
                    <div style="text-align:center; padding: 40px; color: var(--text-muted);">Loading patient data...</div>
                </div>

                <!-- Virtual Psychiatrist Sidebar -->
                <div class="chatbot-panel" id="chatbot-panel">
                    <div class="chatbot-header">
                        <h3>🧠 Virtual Psychiatrist</h3>
                    </div>
                    <div class="chatbot-messages" id="chatbot-messages">
                        <div class="chat-bubble ai">Hello! I'm your AI Psychiatrist assistant. How can I help you support ${this.currentChild || 'the child'} today?</div>
                    </div>
                    <form class="chatbot-input" onsubmit="Dashboard.handleChatSubmit(event)">
                        <input type="text" id="chatbot-input-field" placeholder="Ask for advice..." autocomplete="off">
                        <button type="submit">↑</button>
                    </form>
                </div>
            </div>
        </div>`;

        container.innerHTML = html;

        const contentDiv = document.getElementById('dashboard-content');
        if (this.currentChild) {
            contentDiv.innerHTML = await this.renderDashboardContent(this.currentChild);
            setTimeout(async () => await this.renderMoodChart(this.currentChild), 100);
        } else {
            contentDiv.innerHTML = this.renderEmptyState();
        }
    },

    toggleUserMenu() {
        const menu = document.getElementById('user-dropdown');
        if (!menu) return;
        const isOpen = menu.style.display === 'block';
        menu.style.display = isOpen ? 'none' : 'block';
    },

    renderEmptyState() {
        return `
        <div class="empty-state glass-card" style="padding:var(--space-3xl)">
            <div class="empty-icon">🌱</div>
            <h3 style="margin-bottom:var(--space-md);color:var(--text-secondary)">No Data Yet</h3>
            <p>Start by adding a daily check-in for a child.<br>The dashboard will show insights once data is available.</p>
        </div>`;
    },

    async updateChildPhoto(childName, event) {
        const file = event.target.files[0];
        if (!file) return;
        try {
            const url = await Checkin.uploadToCloudinary(file);
            Checkin.saveChildPhoto(childName, url);
            // Refresh dashboard content
            const contentDiv = document.getElementById('dashboard-content');
            if (contentDiv) {
                contentDiv.innerHTML = await this.renderDashboardContent(childName);
                setTimeout(async () => await this.renderMoodChart(childName), 100);
            }
        } catch {
            App.showToast('Could not update photo. Try again.', 'error');
        }
    },

    async renderDashboardContent(childName) {
        const risk = await RiskEngine.calculate(childName);
        const triage = RiskEngine.getTriageAction(risk.level);
        const checkins = await Storage.getCheckinsByChild(childName);
        const lastCheckins = checkins.slice(-7).reverse();
        const moodEmojis = { 3: '🙂', 2: '😐', 1: '😢' };
        const stressLabels = { 1: 'Low', 2: 'Medium', 3: 'High' };
        const childPhoto = Checkin.getChildPhoto(childName);

        return `
        <!-- Child Profile Header -->
        <div class="glass-card" style="display:flex;align-items:center;gap:var(--space-lg);padding:var(--space-lg);margin-bottom:var(--space-xl);background:linear-gradient(135deg,rgba(99,102,241,0.1),rgba(236,72,153,0.06));">
            ${childPhoto
                ? `<img src="${childPhoto}" alt="${childName}" style="width:72px;height:72px;border-radius:50%;object-fit:cover;border:3px solid var(--primary-500);box-shadow:0 0 20px rgba(99,102,241,0.4);flex-shrink:0;">`
                : `<div style="width:72px;height:72px;border-radius:50%;background:linear-gradient(135deg,var(--primary-600),var(--accent-pink));display:flex;align-items:center;justify-content:center;font-size:2rem;flex-shrink:0;box-shadow:0 0 20px rgba(99,102,241,0.3);">🧒</div>`
            }
            <div>
                <div style="font-size:var(--font-xl);font-weight:800;color:var(--text-primary);">${childName}</div>
                <div style="margin-top:6px;display:flex;align-items:center;gap:var(--space-sm);">
                    <span class="risk-badge ${risk.level}">${risk.label}</span>
                    <span style="color:var(--text-muted);font-size:var(--font-xs);">${checkins.length} check-in${checkins.length !== 1 ? 's' : ''}</span>
                </div>
            </div>
            <div style="margin-left:auto;">
                <button onclick="document.getElementById('change-photo-input').click()" style="background:rgba(255,255,255,0.06);border:1px solid var(--border-glass);color:var(--text-secondary);border-radius:var(--radius-full);padding:6px 14px;cursor:pointer;font-size:var(--font-xs);font-family:var(--font-family);transition:all 0.2s;" onmouseover="this.style.borderColor='var(--primary-500)'" onmouseout="this.style.borderColor='var(--border-glass)'">📷 Change Photo</button>
                <input type="file" id="change-photo-input" accept="image/*" style="display:none" onchange="Dashboard.updateChildPhoto('${childName}', event)">
            </div>
        </div>

        <!-- Stat Cards -->
        <div class="stat-cards">
            <div class="stat-card glass-card">
                <div class="stat-icon">📊</div>
                <div class="stat-value">${risk.score}</div>
                <div class="stat-label">Risk Score</div>
            </div>
            <div class="stat-card glass-card">
                <div class="stat-icon">${risk.level === 'low' ? '🟢' : risk.level === 'medium' ? '🟡' : '🔴'}</div>
                <div class="stat-value"><span class="risk-badge ${risk.level}">${risk.label}</span></div>
                <div class="stat-label">Risk Level</div>
            </div>
            <div class="stat-card glass-card">
                <div class="stat-icon">📝</div>
                <div class="stat-value">${checkins.length}</div>
                <div class="stat-label">Total Check-Ins</div>
            </div>
            <div class="stat-card glass-card">
                <div class="stat-icon">📅</div>
                <div class="stat-value">${checkins.length > 0 ? new Date(checkins[checkins.length - 1].date).toLocaleDateString() : '—'}</div>
                <div class="stat-label">Last Check-In</div>
            </div>
        </div>

        <!-- Alert Card -->
        <div class="alert-card ${triage.alertClass}" style="margin-bottom:var(--space-xl)">
            <span class="alert-icon">${triage.icon}</span>
            <div>
                <div class="alert-title">${triage.title}</div>
                <div class="alert-text">${triage.text}</div>
            </div>
        </div>

        <div class="dashboard-grid">
            <!-- Mood Trend Chart -->
            <div class="chart-container glass-card">
                <h3>📈 Mood Trend (Last 14 Days)</h3>
                <div class="chart-wrapper">
                    <canvas id="mood-chart"></canvas>
                </div>
            </div>

            <!-- Risk Breakdown -->
            <div class="glass-card" style="padding:var(--space-xl)">
                <h3 style="margin-bottom:var(--space-lg)">🧠 Risk Breakdown</h3>
                ${this.renderRiskBar('Mood', risk.moodScore, 40, '--accent-pink')}
                ${this.renderRiskBar('Sleep', risk.sleepScore, 30, '--accent-cyan')}
                ${this.renderRiskBar('Behavior', risk.behaviorScore, 30, '--accent-orange')}
            </div>
        </div>

        <!-- Recent History -->
        <div class="history-list glass-card" style="margin-top:var(--space-xl)">
            <div class="section-header">
                <h3>📋 Recent Check-Ins</h3>
            </div>
            ${lastCheckins.length > 0 ? lastCheckins.map(c => `
                <div class="history-item">
                    <span class="history-date">${new Date(c.date).toLocaleDateString()}</span>
                    <span class="history-mood">${moodEmojis[c.mood] || '❓'}</span>
                    <div class="history-details">
                        <span class="history-detail">Sleep: <span>${c.sleep ? '✅' : '❌'}</span></span>
                        <span class="history-detail">Stress: <span>${stressLabels[c.stress] || '?'}</span></span>
                    </div>
                </div>
            `).join('') : '<div class="empty-state"><p>No check-ins yet</p></div>'}
        </div>`;
    },

    renderRiskBar(label, value, max, colorVar) {
        const pct = Math.round((value / max) * 100);
        return `
        <div style="margin-bottom:var(--space-lg)">
            <div style="display:flex;justify-content:space-between;margin-bottom:var(--space-xs)">
                <span style="font-size:var(--font-sm);color:var(--text-secondary)">${label}</span>
                <span style="font-size:var(--font-sm);font-weight:600">${value}/${max}</span>
            </div>
            <div style="height:8px;background:var(--bg-input);border-radius:var(--radius-full);overflow:hidden">
                <div style="height:100%;width:${pct}%;background:var(${colorVar});border-radius:var(--radius-full);transition:width 0.8s ease"></div>
            </div>
        </div>`;
    },

    async switchChild(name) {
        this.currentChild = name;
        const content = document.getElementById('dashboard-content');
        if (content) {
            content.innerHTML = '<div style="text-align:center; padding: 40px; color: var(--text-muted);">Loading patient data...</div>';
            content.innerHTML = await this.renderDashboardContent(name);
            setTimeout(async () => await this.renderMoodChart(name), 100);
        }
    },

    async renderMoodChart(childName) {
        const canvas = document.getElementById('mood-chart');
        if (!canvas) return;

        const checkins = await Storage.getCheckinsByChild(childName);
        const last14 = checkins.slice(-14);

        const labels = last14.map(c => {
            const d = new Date(c.date);
            return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        });

        const moodData = last14.map(c => c.mood);
        const stressData = last14.map(c => c.stress);

        if (this.moodChart) {
            this.moodChart.destroy();
        }

        const ctx = canvas.getContext('2d');
        this.moodChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Mood',
                        data: moodData,
                        borderColor: '#748ffc',
                        backgroundColor: 'rgba(116, 143, 252, 0.1)',
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: '#748ffc',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        pointRadius: 5,
                        pointHoverRadius: 7
                    },
                    {
                        label: 'Stress',
                        data: stressData,
                        borderColor: '#ff922b',
                        backgroundColor: 'rgba(255, 146, 43, 0.08)',
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: '#ff922b',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        pointRadius: 5,
                        pointHoverRadius: 7
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    legend: {
                        labels: {
                            color: '#a7a9be',
                            font: { family: 'Outfit', size: 12 },
                            usePointStyle: true,
                            pointStyle: 'circle'
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(15, 14, 23, 0.9)',
                        titleFont: { family: 'Outfit' },
                        bodyFont: { family: 'Outfit' },
                        cornerRadius: 8,
                        padding: 12
                    }
                },
                scales: {
                    x: {
                        ticks: { color: '#72738c', font: { family: 'Outfit', size: 11 } },
                        grid: { color: 'rgba(255,255,255,0.05)' }
                    },
                    y: {
                        min: 0,
                        max: 4,
                        ticks: {
                            color: '#72738c',
                            font: { family: 'Outfit', size: 11 },
                            stepSize: 1,
                            callback: function (value) {
                                const labels = { 1: '😢 Sad', 2: '😐 Neutral', 3: '🙂 Happy' };
                                return labels[value] || '';
                            }
                        },
                        grid: { color: 'rgba(255,255,255,0.05)' }
                    }
                }
            }
        });
    },

    // --- Chatbot Integration ---
    async handleChatSubmit(e) {
        e.preventDefault();
        const input = document.getElementById('chatbot-input-field');
        const text = input.value.trim();
        if (!text) return;

        const messagesContainer = document.getElementById('chatbot-messages');

        // Add user message
        const userDiv = document.createElement('div');
        userDiv.className = 'chat-bubble user';
        userDiv.textContent = text;
        messagesContainer.appendChild(userDiv);
        input.value = '';
        input.disabled = true;

        // Add loading state
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'chat-bubble ai';
        loadingDiv.textContent = 'Thinking...';
        messagesContainer.appendChild(loadingDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        try {
            const replyText = await Chatbot.sendMessage(text, this.currentChild);
            loadingDiv.innerHTML = this.formatChatReply(replyText);
        } catch (err) {
            loadingDiv.textContent = 'Sorry, there was an error processing your request. Please try again.';
            loadingDiv.style.color = 'var(--accent-red)';
        }

        input.disabled = false;
        input.focus();
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    },

    formatChatReply(text) {
        // Simple markdown to HTML (bold and linebreaks)
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n\n/g, '<br><br>')
            .replace(/\n/g, '<br>')
            .replace(/\*(.*?)/g, '<li>$1</li>');
    }
};

window.Dashboard = Dashboard;
