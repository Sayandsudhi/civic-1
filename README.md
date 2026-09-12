# CivicPulse AI — Intelligent Public Complaint & Issue Management Platform

CivicPulse AI is a production-grade full-stack civic-tech web application designed for smart cities. It transforms how municipalities handle public grievances (road damage, electrical hazards, water issues, food safety violations, and sanitation problems).

Instead of treating complaints in chronological order (first-come, first-served), CivicPulse AI combines **Groq LLM AI** with a **deterministic backend Emergency Safety Engine** to evaluate severity, urgency, community impact, and safety risks. Urgent and hazardous complaints (e.g. live electrical wires, gas leaks, building collapses) trigger an instant **EMERGENCY OVERRIDE** and are elevated to the top of the assigned department's queue.

---

## 🚀 Key Features

1. **Deterministic Emergency Override**:
   - Backend safety engine scans for dangerous public hazards (live electrical wires, electrical shocks, fires, explosions, gas leaks, building collapses, open manholes, high-voltage cables).
   - Automatically flags `emergency = True`, clamps score to $\ge 96$, and sets priority level to `CRITICAL`.
2. **Groq AI Priority Engine**:
   - Analyzes severity (25%), urgency (25%), public impact (20%), and safety risk (30%).
   - Calculates weighted priority score $[0-100]$:
     $$\text{Priority Score} = (\text{Severity} \times 0.25) + (\text{Urgency} \times 0.25) + (\text{Public Impact} \times 0.20) + (\text{Safety Risk} \times 0.30)$$
   - Priority Tiers:
     - **CRITICAL**: 90 – 100 (Red pulsing alert)
     - **HIGH**: 75 – 89 (Orange alert)
     - **MEDIUM**: 50 – 74 (Amber alert)
     - **LOW**: 0 – 49 (Emerald alert)
3. **Role-Based Operations & Authorization**:
   - **Citizen**: Register, lodge issues with optional photo attachment, receive animated AI prioritization, and track resolution timeline.
   - **Department Officer**: Access department-specific operations queue strictly ordered by:
     `ORDER BY emergency DESC, priority_score DESC, created_at ASC`
     Officers can update statuses (`NEW` $\to$ `ASSIGNED` $\to$ `IN_PROGRESS` $\to$ `RESOLVED` $\to$ `CLOSED`) and append audit notes.
   - **Administrator**: Executive command center with Recharts metrics (complaints by department, priority distribution, 7-day velocity), department CRUD management, and officer credential provisioning.
4. **Unique AI Operations Pulse / Radar**:
   - Dynamic real-time monitoring component visualizing incoming citizen reports flowing into the AI Core and dispatching to priority queues.
5. **Interactive AI Triage Modal**:
   - Animated multi-step progress bar ("Reading report", "Safety check", "Risk evaluation", "Assigning score") upon complaint submission.
6. **Public Issue Tracker**:
   - Anyone can track any issue via reference ID (e.g. `CP-2026-000001`) with full timeline transparency.

---

## 🛠️ Technology Stack

- **Frontend**: Vite, React 19, Tailwind CSS v4, React Router v7, Axios, Lucide React, Framer Motion, Recharts, Canvas Confetti.
- **Backend**: Python 3, FastAPI, SQLAlchemy ORM, Pydantic, PyJWT, bcrypt, python-dotenv, websockets.
- **AI**: Groq API (`llama-3.3-70b-versatile`) with structured JSON schema output and intelligent heuristic fallback.
- **Database**: PostgreSQL (with automatic zero-friction SQLite fallback for local developer testing).

---

## 📂 Project Structure

```
CivicPulse AI/
├── backend/
│   ├── app/
│   │   ├── core/           # Config & bcrypt security
│   │   ├── db/             # SQLAlchemy engine & initial seeder
│   │   ├── models/         # User, Department, Officer, Complaint, ComplaintUpdate
│   │   ├── schemas/        # Pydantic validation schemas
│   │   ├── services/       # Groq AI, Emergency checker, WebSockets
│   │   ├── dependencies/   # Role-based auth guards
│   │   ├── routers/        # Auth, Complaints, Departments, Officers, Admin
│   │   └── main.py         # FastAPI application entrypoint
│   ├── requirements.txt
│   ├── .env
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/     # Radar, Badges, Modals, Navbar, Sidebar, StatCards
│   │   ├── context/        # AuthContext, ToastContext
│   │   ├── pages/          # Landing, User, Department Officer, Admin, Track
│   │   ├── services/       # Axios API client & services
│   │   ├── utils/          # Priority formatters & constants
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   ├── vite.config.js
│   ├── .env
│   └── .env.example
└── README.md
```

---

## ⚙️ Step-by-Step Setup Guide

### 1. Prerequisites
- **Node.js** (v18 or newer)
- **Python** (v3.10 or newer)
- Optional: PostgreSQL (if using local Postgres; otherwise the application runs seamlessly using SQLite by default).
- Optional: Groq API Key (from [console.groq.com](https://console.groq.com)).

---

### 2. Backend Setup

1. Open a terminal and navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Configure environment variables in `backend/.env`:
   ```ini
   # Database connection (PostgreSQL or SQLite)
   DATABASE_URL=sqlite:///./civicpulse.db
   # Or for PostgreSQL:
   # DATABASE_URL=postgresql://username:password@localhost:5432/civicpulse

   # Optional Groq API Key for live LLM prioritization
   GROQ_API_KEY=your_groq_api_key_here

   # Security secrets
   SECRET_KEY=civicpulse_ai_super_secret_jwt_key_2026_modern_smart_city_production
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=admin123
   ACCESS_TOKEN_EXPIRE_MINUTES=120
   ```

4. Start the FastAPI backend server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   > The database tables, default administrator, municipal departments, and sample demo officers are seeded automatically on startup!
   > Swagger API docs will be available at: [http://localhost:8000/docs](http://localhost:8000/docs)

---

### 3. Frontend Setup

1. In a second terminal window, navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install npm dependencies:
   ```bash
   npm install
   ```

3. Verify `frontend/.env`:
   ```ini
   VITE_API_URL=http://localhost:8000
   ```

4. Start the Vite development server:
   ```bash
   npm run dev
   ```
   > Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🔑 Pre-Configured Demo Credentials

For convenience during evaluation, every login page has a **1-click auto-fill button**:

| Role | Username / Identifier | Password | Access / Department |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin` | `admin123` | Full Municipal Command Center |
| **KSEB Electricity Officer** | `officer_kseb` | `officer123` | KSEB / Electricity Queue |
| **Road Safety Officer** | `officer_road` | `officer123` | Road Safety Operations Queue |
| **Food Safety Officer** | `officer_food` | `officer123` | Food Safety Operations Queue |
| **Citizen** | `citizen` | `citizen123` | Citizen Dashboard & Issue Reporting |

---

## 🧪 Testing the AI & Emergency Workflow

1. Open [http://localhost:5173](http://localhost:5173).
2. Click **"Citizen Sign In"** and click **"Auto-fill Demo Citizen"** $\to$ Sign In.
3. Click **"Report an Issue"** (`/complaints/new`):
   - Select **KSEB / Electricity**.
   - Type Title: *"Live electrical wire snapped near school entrance"*
   - Observe the **Hazardous Condition Alert** badge lighting up in real time.
   - Enter description: *"High voltage wire fell on road and is sparking, immediate shock danger for pedestrians."*
   - Click **"Send Complaint"**.
4. Watch the animated **AI Analysis Modal** sequentially evaluate bodily hazard, public impact, and assign priority score **96+ (CRITICAL EMERGENCY)**.
5. Log out and go to **Officer Portal** (`/department/login`), click **"KSEB Electricity Officer"** $\to$ Log In.
6. Observe that the newly reported live wire incident is immediately ranked at the **very top of the Priority Queue**.
7. Click **"Quick Status"** or **"Investigate"** to transition status to `IN_PROGRESS` or `RESOLVED` and log an official note.
8. Go to **"Track Issue"** (`/track`) to view the public live resolution timeline.

---

## 🛡️ Security & Integrity

- Passwords are salted and hashed using direct **bcrypt**.
- JWT tokens are signed using **HS256** with expiration validation.
- Department-level authorization is enforced on the FastAPI backend (officers cannot query complaints outside their assigned department).
- File uploads are validated for MIME type, image extension (`.jpg`, `.jpeg`, `.png`, `.webp`), and size limit ($5\text{MB}$).
