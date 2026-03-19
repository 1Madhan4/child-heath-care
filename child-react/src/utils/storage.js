/* Storage Module — LocalStorage Only */

const SESSION_KEY = 'mindbloom_session';
const DATA_KEY = 'mindbloom_data';

export const Storage = {
  getDB() {
    try {
      const data = localStorage.getItem(DATA_KEY);
      if (data) return JSON.parse(data);
    } catch {}
    return { users: {}, checkins: {}, observations: {} };
  },

  saveDB(db) {
    localStorage.setItem(DATA_KEY, JSON.stringify(db));
  },

  sanitizeEmail(email) {
    return email.toLowerCase().replace(/[.#$[\]]/g, '_');
  },

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

  generateId() {
    return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
  },

  async saveUserProfile(userConfig) {
    const db = this.getDB();
    const key = this.sanitizeEmail(userConfig.username || userConfig.email);
    db.users[key] = userConfig;
    this.saveDB(db);
  },

  async getUserProfile(username) {
    const db = this.getDB();
    const key = this.sanitizeEmail(username);
    return db.users[key] || null;
  },

  async deleteUserFromDB(email) {
    const db = this.getDB();
    const key = this.sanitizeEmail(email);
    delete db.users[key];
    this.saveDB(db);
  },

  async getCounselors() {
    const db = this.getDB();
    return Object.values(db.users).filter(u => u.role === 'counselor');
  },

  async saveCheckin(data) {
    const db = this.getDB();
    const id = this.generateId();
    db.checkins[id] = data;
    this.saveDB(db);
  },

  async getCheckinsByChild(childName) {
    const session = this.getSession();
    if (!session) return [];
    const db = this.getDB();
    const allData = Object.entries(db.checkins)
      .map(([id, val]) => ({ id, ...val }))
      .filter(c => c.childName === childName);
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
    const db = this.getDB();
    const id = this.generateId();
    db.observations[id] = data;
    this.saveDB(db);
  },

  async getObservationsByChild(childName) {
    const session = this.getSession();
    if (!session) return [];
    const db = this.getDB();
    const allData = Object.entries(db.observations)
      .map(([id, val]) => ({ id, ...val }))
      .filter(o => o.childName === childName);
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
    const db = this.getDB();
    const children = new Set();
    const filterAdd = data => {
      for (const key in data) {
        const item = data[key];
        if (session.role === 'parent' && item.parentEmail === session.email) children.add(item.childName);
        if (session.role === 'teacher' && item.teacherEmail === session.email) children.add(item.childName);
        if (session.role === 'counselor' && item.counselorEmail === session.email) children.add(item.childName);
      }
    };
    if (db.checkins) filterAdd(db.checkins);
    if (db.observations) filterAdd(db.observations);
    return Array.from(children).sort();
  },

  async deleteCheckinsForUser(email) {
    const db = this.getDB();
    let changed = false;
    for (const [id, data] of Object.entries(db.checkins)) {
      if (data.parentEmail === email || data.teacherEmail === email || data.counselorEmail === email) {
        delete db.checkins[id];
        changed = true;
      }
    }
    if (changed) this.saveDB(db);
  },

  async deleteObservationsForUser(email) {
    const db = this.getDB();
    let changed = false;
    for (const [id, data] of Object.entries(db.observations)) {
      if (data.parentEmail === email || data.teacherEmail === email || data.counselorEmail === email) {
        delete db.observations[id];
        changed = true;
      }
    }
    if (changed) this.saveDB(db);
  },
};
