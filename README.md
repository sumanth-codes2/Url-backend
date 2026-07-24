# 🚀 BitylGlow - Enterprise URL Shortener & Analytics Platform

BitylGlow is a production-ready, full-stack enterprise URL management and business intelligence platform built using Node.js, Express, MongoDB, and React with TypeScript.

It features advanced analytics, custom alias generation, QR code creation, team workspaces, link expiration, password protection, AI-powered link copilot, and multi-provider email verification.

---

## 📂 Project Architecture & Directory Structure

The project is structured into two main decoupled applications:

```text
Url_Shortner/
├── backend/                  # Node.js + Express REST API Backend
│   ├── src/
│   │   ├── config/           # Environment & App configs
│   │   ├── controllers/      # Route controllers (Auth, URL, Analytics, Workspace)
│   │   ├── database/         # MongoDB connection setup
│   │   ├── models/           # Mongoose schemas (User, Url, Analytics, Workspace)
│   │   ├── repositories/     # Data access layer (SOLID repository pattern)
│   │   ├── routes/           # Express router endpoints
│   │   ├── services/         # Business logic layer (AI, Email, GeoIP)
│   │   │   ├── ai/           # Gemini & Ollama AI Orchestrator & Providers
│   │   │   ├── email/        # Provider-based Email Service (Resend, Gmail, Ethereal)
│   │   │   └── geo/          # IP Geolocation tracking service
│   │   ├── shared/           # Cross-cutting middleware, errors, and loggers
│   │   ├── validators/       # Request validation schemas
│   │   ├── app.js            # Express app configuration
│   │   └── server.js         # Server entrypoint & background crawlers
│   ├── .env.example          # Environment variables template
│   └── package.json
│
├── frontend/                 # React + Vite + TypeScript Frontend SPA
│   ├── src/
│   │   ├── components/       # Layouts, Sidebar, Navigation, Modals, Theme toggles
│   │   ├── context/          # React Contexts (AuthContext, WorkspaceContext)
│   │   ├── pages/            # App Views (Dashboard, Analytics, Links, QR Codes, Workspaces)
│   │   └── App.tsx           # Router and top-level components
│   ├── public/               # Static assets
│   ├── index.html            # HTML entry template
│   ├── package.json
│   └── vite.config.ts        # Vite build tool configuration
│
└── docker-compose.yml        # Multi-container orchestration (MongoDB + Backend + Frontend)
```

---

## ⚡ Prerequisites

Before running the application, ensure you have the following installed on your machine:

- **Node.js** (v18.0.0 or higher) - [Download Node.js](https://nodejs.org/)
- **npm** (v9.0.0 or higher) or **yarn** / **pnpm**
- **MongoDB** (Local instance running on `mongodb://localhost:27017` OR a **MongoDB Atlas** connection string)
- **Git** - [Download Git](https://git-scm.com/)
- *(Optional)* **Docker & Docker Compose** - [Download Docker Desktop](https://www.docker.com/)

---

## 🛠️ Step-by-Step Installation & Local Setup

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_GITHUB_USERNAME/Url_Shortner.git
cd Url_Shortner
```

---

### 2. Backend Setup (`/backend`)

1. **Navigate to the backend directory**:
   ```bash
   cd backend
   ```

2. **Install backend dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file inside the `backend` folder by copying the provided example:
   ```bash
   cp .env.example .env
   ```

   Open `.env` and fill in your configuration:
   ```env
   PORT=5000
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/url_shortener
   JWT_SECRET=your_custom_secure_jwt_secret_key

   # Email Providers (Optional for local testing - falls back to Ethereal)
   RESEND_API_KEY=re_your_resend_key
   GMAIL_USER=your_email@gmail.com
   GMAIL_PASS=your_gmail_app_password

   # AI Features (Optional)
   GEMINI_API_KEY=your_google_gemini_api_key
   ```

4. **Start the Backend Server**:
   ```bash
   npm run dev
   ```
   The backend server will start on **`http://localhost:5000`**.
   - 📖 **Swagger API Docs**: Interactive documentation is available at `http://localhost:5000/api-docs`

---

### 3. Frontend Setup (`/frontend`)

1. **Open a new terminal tab/window and navigate to the frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install frontend dependencies**:
   ```bash
   npm install
   ```

3. **Start the Frontend Development Server**:
   ```bash
   npm run dev
   ```
   The frontend application will start on **`http://localhost:5173`**.

4. Open your browser and navigate to **`http://localhost:5173`** to access BitylGlow!

---

## 🐳 Running with Docker Compose (Alternative)

If you prefer to run the entire stack (MongoDB, Backend, and Frontend) inside containerized environments:

1. Make sure **Docker Desktop** is running.
2. From the root `Url_Shortner/` directory, run:
   ```bash
   docker-compose up --build
   ```
3. Access the services:
   - **Frontend App**: `http://localhost:80` (or `http://localhost:5173`)
   - **Backend API**: `http://localhost:5000`
   - **Swagger Docs**: `http://localhost:5000/api-docs`

To stop the containers:
```bash
docker-compose down
```

---

## 🔐 Key Features

- ✂️ **Smart URL Shortening**: Create short codes with optional custom aliases.
- 🔒 **Link Security**: Support for password-protected links and expiration dates.
- 📊 **Real-time Analytics**: Tracks total clicks, referrer sources, browser types, device breakdowns, OS, and geographic locations.
- 📱 **QR Code Generator**: Instant QR code creation for generated short links.
- 👥 **Team Workspaces**: Collaborate with team members with role-based access control.
- 🤖 **AI Assistant Copilot**: Integrated Google Gemini AI for smart link alias suggestions and analytics insights.
- 🔑 **Secure Authentication**: JWT-based login, register, and password recovery via OTP emails (Resend & Gmail SMTP integration).
- 🌙 **Dark/Light Mode**: Full theme customization support.

---

## 📝 Available NPM Scripts

### Backend (`/backend`)
- `npm run dev`: Starts the backend server with live reload (`node src/server.js`).
- `npm start`: Runs the server in production mode.

### Frontend (`/frontend`)
- `npm run dev`: Starts the Vite development server on `http://localhost:5173`.
- `npm run build`: Compiles TypeScript and builds the production bundle in `dist/`.
- `npm run preview`: Locally previews the production build.
- `npm run lint`: Runs code linting checks via `oxlint`.

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
