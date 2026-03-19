/* ============================================
   AI Psychiatrist Chatbot Module
   ============================================ */

const Chatbot = {
    // ⚠️ Replace with your own API key. Restrict it in Google Cloud Console to your domain only.
    // See: console.cloud.google.com -> Credentials -> API Key -> Application restrictions -> HTTP referrers
    apiKey: 'YOUR_GEMINI_API_KEY_HERE',
    apiUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
    chatHistory: [],

    init() {
        if (!document.getElementById('chatbot-script')) {
            const script = document.createElement('script');
            script.id = 'chatbot-script';
            document.body.appendChild(script);
        }
    },

    /**
     * Build the system instructions based on the user's role and the current child's context.
     */
    async buildSystemPrompt(childName) {
        const session = Storage.getSession();
        let role = session ? session.role : 'parent';

        let riskText = "No data available yet.";
        if (childName) {
            const risk = await RiskEngine.calculate(childName);
            const checkins = await Storage.getCheckinsByChild(childName);
            const lastCheckin = checkins.length > 0 ? checkins[checkins.length - 1] : null;

            riskText = `Current Risk Level: ${risk.label} (${risk.score}/100).\n`;
            if (lastCheckin) {
                const moods = { 3: 'Happy', 2: 'Neutral', 1: 'Sad' };
                const stress = { 1: 'Low', 2: 'Medium', 3: 'High' };
                riskText += `Last check-in mood: ${moods[lastCheckin.mood] || 'Unknown'}, Stress: ${stress[lastCheckin.stress] || 'Unknown'}, Sleep Quality: ${lastCheckin.sleep ? 'Good' : 'Bad'}.`;
            }
        }

        let roleInstructions = "";
        if (role === 'parent') {
            roleInstructions = "You are speaking to a Parent. Focus on the home environment, supportive daily routines, empathetic listening techniques, and fostering a safe space for the child to express feelings at home. Suggest practical, comforting activities.";
        } else if (role === 'teacher') {
            roleInstructions = "You are speaking to a Teacher. Focus on classroom behavior, peer interactions, academic impact, and managing the child's emotional state during school hours. Suggest subtle classroom accommodations, de-escalation techniques, and ways to support focusing.";
        } else if (role === 'counselor') {
            roleInstructions = "You are speaking to a School Counselor or Healthcare Professional. Use clinical but accessible terminology. Discuss targeted therapeutic interventions, behavioral tracking, coping mechanisms, and long-term emotional regulation strategies. Review the data objectively.";
        }

        return `You are MindBloom's Virtual Child Psychiatrist, an AI assistant built to advise adults on supporting a child's emotional health.
Role of the user you are talking to: ${role.toUpperCase()}.
${roleInstructions}

Context about the child (${childName || 'The Child'}):
${riskText}

Instructions:
1. Provide highly specific, actionable, and compassionate advice tailored to the user's role.
2. Keep responses relatively concise and easy to read (use short paragraphs or bullet points).
3. Always maintain a professional, empathetic, and supportive tone.
4. If the child is at High Risk, gently remind the user to consult emergency services or a real doctor if necessary, but still provide your role-specific guidance.`;
    },

    async sendMessage(message, childName) {
        if (!message || message.trim() === '') return null;

        // Initialize history with system prompt if empty
        if (this.chatHistory.length === 0) {
            const systemPrompt = await this.buildSystemPrompt(childName);
            this.chatHistory.push({
                role: "user",
                parts: [{ text: `System Instruction (Do not reply to this directly, just adopt this persona): ${systemPrompt}` }]
            });
            this.chatHistory.push({
                role: "model",
                parts: [{ text: "Understood. I will act as the Virtual Child Psychiatrist according to those instructions and context." }]
            });
        }

        this.chatHistory.push({
            role: "user",
            parts: [{ text: message }]
        });

        try {
            const response = await fetch(`${this.apiUrl}?key=${this.apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: this.chatHistory,
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 800,
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }

            const data = await response.json();
            const replyText = data.candidates[0].content.parts[0].text;

            this.chatHistory.push({
                role: "model",
                parts: [{ text: replyText }]
            });

            return replyText;
        } catch {
            console.warn('[MindBloom] Chatbot request failed.');
            // Remove the failed user message from history
            this.chatHistory.pop();
            throw new Error('Chat unavailable');
        }
    },

    clearHistory() {
        this.chatHistory = [];
    }
};

window.Chatbot = Chatbot;
