/* Risk Scoring Engine */
import { Storage } from './storage';

export const RiskEngine = {
    async calculate(childName) {
        const checkins = await Storage.getCheckinsByChild(childName);
        const observations = await Storage.getObservationsByChild(childName);

        if (checkins.length === 0) {
            return { score: 0, level: 'low', label: 'No Data', moodScore: 0, sleepScore: 0, behaviorScore: 0 };
        }
        if (checkins.length < 3) {
            return { score: 0, level: 'low', label: 'Not Enough Data (need 3+ check-ins)', moodScore: 0, sleepScore: 0, behaviorScore: 0 };
        }

        const recent = checkins.slice(-5);

        const avgMood = recent.reduce((sum, c) => sum + c.mood, 0) / recent.length;
        const moodScore = Math.round(((3 - avgMood) / 2) * 40);

        const avgSleep = recent.reduce((sum, c) => sum + c.sleep, 0) / recent.length;
        let sleepScore = Math.round((1 - avgSleep) * 20);
        const recentObs = observations.slice(-5);
        const sleepIssueCount = recentObs.filter(o => o.sleepIssue).length;
        sleepScore += Math.round((sleepIssueCount / Math.max(recentObs.length, 1)) * 10);
        sleepScore = Math.min(sleepScore, 30);

        const avgStress = recent.reduce((sum, c) => sum + c.stress, 0) / recent.length;
        let behaviorScore = Math.round(((avgStress - 1) / 2) * 15);
        const behaviorChangeCount = recentObs.filter(o => o.behaviorChange).length;
        const angerCount = recentObs.filter(o => o.angerSadness).length;
        behaviorScore += Math.round(((behaviorChangeCount + angerCount) / Math.max(recentObs.length * 2, 1)) * 15);
        behaviorScore = Math.min(behaviorScore, 30);

        let consecutiveSad = 0;
        for (let i = recent.length - 1; i >= 0; i--) {
            if (recent[i].mood === 1) consecutiveSad++;
            else break;
        }
        const consecutiveBonus = consecutiveSad >= 3 ? 10 : consecutiveSad >= 2 ? 5 : 0;
        const totalScore = Math.min(moodScore + sleepScore + behaviorScore + consecutiveBonus, 100);

        let level, label;
        if (totalScore <= 30) { level = 'low'; label = 'Low Risk'; }
        else if (totalScore <= 60) { level = 'medium'; label = 'Medium Risk'; }
        else { level = 'high'; label = 'High Risk'; }

        return { score: totalScore, level, label, moodScore, sleepScore, behaviorScore };
    },

    getTriageAction(level) {
        switch (level) {
            case 'low':
                return { icon: '🟢', title: 'Continue Monitoring', text: 'Everything looks okay. Keep tracking daily check-ins to maintain awareness.', alertClass: 'alert-low' };
            case 'medium':
                return { icon: '🟡', title: 'Alert School Counselor', text: 'Some concerning patterns detected. Consider scheduling a check-in with the school counselor.', alertClass: 'alert-medium' };
            case 'high':
                return { icon: '🔴', title: 'Alert Doctor Immediately', text: 'Significant warning signs detected. Please contact a healthcare professional or school psychologist right away.', alertClass: 'alert-high' };
            default:
                return { icon: '⚪', title: 'No Data', text: 'Start by adding daily check-ins.', alertClass: 'alert-low' };
        }
    },
};
