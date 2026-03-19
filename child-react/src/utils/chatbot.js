/* AI Psychiatrist Chatbot Module */
import { Storage } from './storage';
import { RiskEngine } from './risk';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

let chatHistory = [];

async function buildSystemPrompt(childName) {
    const session = Storage.getSession();
    const role = session ? session.role : 'parent';

    let riskText = 'No data available yet.';
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

    let roleInstructions = '';
    if (role === 'parent') {
        roleInstructions = 'You are speaking to a Parent. Focus on the home environment, supportive daily routines, empathetic listening techniques, and fostering a safe space for the child to express feelings at home. Suggest practical, comforting activities.';
    } else if (role === 'teacher') {
        roleInstructions = 'You are speaking to a Teacher. Focus on classroom behavior, peer interactions, academic impact, and managing the child\'s emotional state during school hours. Suggest subtle classroom accommodations, de-escalation techniques, and ways to support focusing.';
    } else if (role === 'counselor') {
        roleInstructions = 'You are speaking to a School Counselor or Healthcare Professional. Use clinical but accessible terminology. Discuss targeted therapeutic interventions, behavioral tracking, coping mechanisms, and long-term emotional regulation strategies. Review the data objectively.';
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
}

export async function sendChatMessage(message, childName) {
    if (!message || message.trim() === '') return null;

    if (chatHistory.length === 0) {
        const systemPrompt = await buildSystemPrompt(childName);
        chatHistory.push({ role: 'user', parts: [{ text: `System Instruction (Do not reply to this directly, just adopt this persona): ${systemPrompt}` }] });
        chatHistory.push({ role: 'model', parts: [{ text: 'Understood. I will act as the Virtual Child Psychiatrist according to those instructions and context.' }] });
    }

    chatHistory.push({ role: 'user', parts: [{ text: message }] });

    try {
        const response = await fetch(`${API_URL}?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: chatHistory,
                generationConfig: { temperature: 0.7, maxOutputTokens: 800 },
            }),
        });

        if (!response.ok) throw new Error(`API Error: ${response.status}`);

        const data = await response.json();
        const replyText = data.candidates[0].content.parts[0].text;
        chatHistory.push({ role: 'model', parts: [{ text: replyText }] });
        return replyText;
    } catch {
        chatHistory.pop();
        throw new Error('Chat unavailable');
    }
}

export function clearChatHistory() {
    chatHistory = [];
}

export function formatChatReply(text) {
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n\n/g, '<br><br>')
        .replace(/\n/g, '<br>')
        .replace(/\*(.*?)/g, '<li>$1</li>');
}
