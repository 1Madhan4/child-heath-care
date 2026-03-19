# 🌱 MindBloom — Child Emotional Health Tracker

MindBloom is a web application that helps **parents, teachers, and school counselors** monitor and support children's emotional well-being. It collects daily check-in data, analyzes risk levels using a scoring engine, and provides AI-powered guidance through a virtual child psychiatrist chatbot.

---

## ✨ Features

- 📋 **Daily Check-ins** — Children or adults log mood, stress, sleep, and behavioral observations
- 📊 **Risk Scoring Engine** — Automatically calculates emotional risk levels (Low / Moderate / High) based on check-in history
- 🤖 **AI Virtual Psychiatrist** — Powered by Google Gemini, gives role-specific advice to parents, teachers, and counselors
- 📈 **Dashboard** — Visualizes trends with charts, shows alerts, and summarizes a child's recent emotional state
- 👁️ **Observation Logs** — Adults can record behavioral notes linked to a child
- 🔒 **Role-Based Access** — Different views and AI advice tailored for Parent, Teacher, or Counselor roles
- ☁️ **Firebase Realtime Database** — Data synced across devices, linked by email

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite |
| Styling | Tailwind CSS |
| Charts | Chart.js + react-chartjs-2 |
| Database | Firebase Realtime Database |
| AI Chatbot | Google Gemini 2.5 Flash API |
| Hosting | Firebase Hosting |

---

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/1Madhan4/child-heath-care.git
cd child-heath-care/child-react
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up environment variables
Create a `.env` file in the `child-react/` folder (use `.env.example` as a template):
```bash
cp .env.example .env
```

Then fill in your API key:
```
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

> Get your free Gemini API key at [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)

### 4. Run locally
```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 📁 Project Structure

```
child-heath-care/
├── child-react/          # React app (main application)
│   ├── src/
│   │   ├── pages/        # AuthPage, DashboardPage, CheckinPage, ObservationPage
│   │   ├── components/   # Reusable UI components
│   │   ├── utils/        # storage.js, risk.js, chatbot.js, auth.js
│   │   └── context/      # AppContext (global state)
│   ├── .env.example      # Environment variable template
│   └── ...
├── index.html            # Plain HTML version
├── css/                  # Plain CSS styles
└── js/                   # Plain JS modules
```

---

## 🔑 Environment Variables

| Variable | Description |
|---|---|
| `VITE_GEMINI_API_KEY` | Your Google Gemini API key |

> ⚠️ Never commit your `.env` file. It is already listed in `.gitignore`.

---

## 🌐 Live Demo

Hosted on Firebase: **[childmon-d03db.web.app](https://childmon-d03db.web.app)**

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

## 🙌 Acknowledgements

- [Google Gemini API](https://ai.google.dev/) — AI chatbot backbone
- [Firebase](https://firebase.google.com/) — Realtime database & hosting
- [Chart.js](https://www.chartjs.org/) — Data visualization
