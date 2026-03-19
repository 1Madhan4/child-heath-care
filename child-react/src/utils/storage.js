import { ref, set, get, push, remove, query, orderByChild, equalTo } from 'firebase/database';
import { db } from './firebase';

const SESSION_KEY = 'mindbloom_session';

export const Storage = {
  // --- Session Helpers (still using localStorage for local persistent session state) ---
  setSession(data) {
    const sessionWithExpiry = {
      ...data,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionWithExpiry));
  },

  getSession() {
    try {
      const data = JSON.parse(localStorage.getItem(SESSION_KEY));
      if (!data) return null;
      if (data.expiresAt && Date.now() > data.expiresAt) {
        this.clearSession();
        return null;
      }
      return data;
    } catch {
      return null;
    }
  },

  clearSession() {
    localStorage.removeItem(SESSION_KEY);
  },

  // --- Firebase Database Methods ---

  async saveUserProfile(uid, userConfig) {
    const userRef = ref(db, `users/${uid}`);
    await set(userRef, {
      ...userConfig,
      updatedAt: new Date().toISOString()
    });
  },

  async getUserProfile(uid) {
    const userRef = ref(db, `users/${uid}`);
    const snapshot = await get(userRef);
    return snapshot.exists() ? snapshot.val() : null;
  },

  // Helper for lookup by email (used for legacy or external lookups)
  async getUserProfileByEmail(email) {
    const emailKey = email.toLowerCase().replace(/[.#$[\]]/g, '_');
    const userQuery = query(ref(db, 'users'), orderByChild('email'), equalTo(email.toLowerCase()));
    const snapshot = await get(userQuery);
    if (snapshot.exists()) {
      const val = snapshot.val();
      return Object.values(val)[0];
    }
    return null;
  },

  async deleteUserFromDB(uid) {
    await remove(ref(db, `users/${uid}`));
  },

  async getCounselors() {
    const userQuery = query(ref(db, 'users'), orderByChild('role'), equalTo('counselor'));
    const snapshot = await get(userQuery);
    return snapshot.exists() ? Object.values(snapshot.val()) : [];
  },

  async saveCheckin(data) {
    const checkinRef = push(ref(db, 'checkins'));
    await set(checkinRef, {
      ...data,
      createdAt: new Date().toISOString()
    });
  },

  async getCheckinsByChild(childName) {
    const session = this.getSession();
    if (!session) return [];

    const checkinQuery = query(ref(db, 'checkins'), orderByChild('childName'), equalTo(childName));
    const snapshot = await get(checkinQuery);

    if (!snapshot.exists()) return [];

    const allData = Object.entries(snapshot.val()).map(([id, val]) => ({ id, ...val }));

    return allData
      .filter(c => {
        if (session.role === 'parent') return c.parentEmail === session.email;
        if (session.role === 'teacher') return c.teacherEmail === session.email;
        if (session.role === 'counselor') return c.counselorEmail === session.email;
        return false;
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  },

  async saveObservation(data) {
    const obsRef = push(ref(db, 'observations'));
    await set(obsRef, {
      ...data,
      createdAt: new Date().toISOString()
    });
  },

  async getObservationsByChild(childName) {
    const session = this.getSession();
    if (!session) return [];

    const obsQuery = query(ref(db, 'observations'), orderByChild('childName'), equalTo(childName));
    const snapshot = await get(obsQuery);

    if (!snapshot.exists()) return [];

    const allData = Object.entries(snapshot.val()).map(([id, val]) => ({ id, ...val }));

    return allData
      .filter(o => {
        if (session.role === 'parent') return o.parentEmail === session.email;
        if (session.role === 'teacher') return o.teacherEmail === session.email;
        if (session.role === 'counselor') return o.counselorEmail === session.email;
        return false;
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  },

  async getChildrenForUser() {
    const session = this.getSession();
    if (!session) return [];

    // This is less efficient in NoSQL without normalized "user_children" mapping
    // But for now, we'll keep the logic of scanning checkins/observations
    const children = new Set();

    const scanData = async (path) => {
      const snapshot = await get(ref(db, path));
      if (snapshot.exists()) {
        Object.values(snapshot.val()).forEach(item => {
          if (session.role === 'parent' && item.parentEmail === session.email) children.add(item.childName);
          if (session.role === 'teacher' && item.teacherEmail === session.email) children.add(item.childName);
          if (session.role === 'counselor' && item.counselorEmail === session.email) children.add(item.childName);
        });
      }
    };

    await scanData('checkins');
    await scanData('observations');

    return Array.from(children).sort();
  },

  async deleteCheckinsForUser(email) {
    // In Realtime DB, deleting filtered items requires fetching them first or secondary indexing
    const snapshot = await get(ref(db, 'checkins'));
    if (snapshot.exists()) {
      const entries = Object.entries(snapshot.val());
      for (const [id, data] of entries) {
        if (data.parentEmail === email || data.teacherEmail === email || data.counselorEmail === email) {
          await remove(ref(db, `checkins/${id}`));
        }
      }
    }
  },

  async deleteObservationsForUser(email) {
    const snapshot = await get(ref(db, 'observations'));
    if (snapshot.exists()) {
      const entries = Object.entries(snapshot.val());
      for (const [id, data] of entries) {
        if (data.parentEmail === email || data.teacherEmail === email || data.counselorEmail === email) {
          await remove(ref(db, `observations/${id}`));
        }
      }
    }
  },
};
