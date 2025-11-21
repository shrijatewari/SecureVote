# 🗳️ Election Management System

A **government-grade, production-ready** Election Management System with AI-powered duplicate detection, biometric verification, and comprehensive voter roll management.

## ✨ Features

### Core Features
- ✅ **Multi-step Voter Registration** with OTP verification (Email, Mobile, Aadhaar)
- ✅ **Biometric Verification** (Face Recognition + Fingerprint)
- ✅ **EPIC Card Generation**
- ✅ **Comprehensive Profile Management** (50+ fields)
- ✅ **Document Upload** with AES-256 encryption
- ✅ **Application Tracking** with timeline

  <img width="1280" height="764" alt="image" src="https://github.com/user-attachments/assets/01772d2e-6437-406f-9cc2-a2bcd79e3893" />

  <img width="1280" height="760" alt="image" src="https://github.com/user-attachments/assets/bd10bc12-0b09-404c-b4de-3136ce7453c1" />

  <img width="1280" height="845" alt="image" src="https://github.com/user-attachments/assets/540cc57c-4746-4caf-a523-cd57f515601e" />

  <img width="1280" height="770" alt="image" src="https://github.com/user-attachments/assets/cd5ac10b-821a-478b-8ac7-465d1073acb2" />





### Advanced Features
- ✅ **AI-Powered Duplicate Detection** (6 AI microservices)
- ✅ **Death Record Synchronization**
- ✅ **BLO Field Verification** with GPS tracking
- ✅ **Roll Revision** with dry-run and commit workflow
- ✅ **Grievance Management** system
- ✅ **Transparency Portal** with Merkle root verification
- ✅ **Audit Logs** with hash-chained immutability
- ✅ **Multilingual Support** (10 languages)

  <img width="1280" height="770" alt="image" src="https://github.com/user-attachments/assets/f7b5e57f-1f3f-4332-adf1-d52c35e736b6" />

  <img width="1280" height="766" alt="image" src="https://github.com/user-attachments/assets/798e8d23-b483-4f52-9953-f15521bdea05" />

  <img width="992" height="1062" alt="image" src="https://github.com/user-attachments/assets/5e17ceca-fad1-458f-bc5d-50ffebbd7bb0" />




### Security Features
- ✅ **AES-256 Encryption** for sensitive data
- ✅ **JWT Authentication** with role-based access
- ✅ **Hash-chained Audit Logs**
- ✅ **Merkle Root** for tamper-proof snapshots
- ✅ **SIEM Integration** for security monitoring

## 🏗️ Architecture

```
Frontend (React + TypeScript + Vite)
    ↓
Backend API (Node.js + Express)
    ↓
Database (MySQL)
    ↓
AI Microservices (Python FastAPI)
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MySQL 8.0+
- Python 3.11+ (for AI services)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/YOUR_USERNAME/voting-dbms-project.git
cd voting-dbms-project
```

2. **Install Frontend Dependencies**
```bash
npm install
```

3. **Install Backend Dependencies**
```bash
cd backend
npm install
```

4. **Set up Environment Variables**
```bash
# Copy example env file
cp .env.example .env
cp .env.example backend/.env

# Edit with your database credentials
```

5. **Run Database Migrations**
```bash
cd backend
node src/db/migrate.js
node src/db/migrate_extended.js
node src/db/migrate_profile_complete.js
node src/db/migrate_biometric_complete.js
node src/db/migrate_enhanced_features.js
node src/db/migrate_ai_tables.js
```

6. **Start AI Services** (Optional)
```bash
cd ai-services
./START_ALL.sh
# OR
docker-compose up
```

7. **Start Backend**
```bash
cd backend
npm start
```

8. **Start Frontend**
```bash
npm run dev
```

## 📁 Project Structure

```
voting-dbms-project/
├── src/                    # Frontend React app
│   ├── pages/             # Page components
│   ├── components/        # Reusable components
│   ├── services/          # API services
│   └── i18n/             # Multilingual support
├── backend/               # Node.js backend
│   ├── src/
│   │   ├── controllers/   # Route controllers
│   │   ├── services/      # Business logic
│   │   ├── routes/        # API routes
│   │   ├── db/           # Database migrations
│   │   └── middleware/    # Auth, validation, etc.
│   └── package.json
├── ai-services/           # Python AI microservices
│   ├── duplicate-engine/
│   ├── address-engine/
│   ├── deceased-engine/
│   ├── document-engine/
│   ├── forgery-engine/
│   └── biometric-engine/
└── package.json          # Frontend package.json
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/request-otp` - Request OTP
- `POST /api/auth/verify-otp` - Verify OTP

### Voters
- `GET /api/voters` - List voters
- `POST /api/voters` - Create voter
- `GET /api/voters/:id` - Get voter details
- `PUT /api/voters/:id` - Update voter

### AI Services
- `POST /api/ai/duplicates/predict` - Predict duplicates
- `POST /api/ai/address/normalize` - Normalize address
- `POST /api/ai/documents/verify` - Verify document
- `GET /api/ai/health` - Health check

See full API documentation at `/api-docs` when backend is running.

## 🤖 AI Services

The system includes 6 AI microservices:

1. **Duplicate Detection Engine** - ML-powered duplicate voter detection
2. **Address Intelligence Engine** - Address normalization and fraud detection
3. **Deceased Registry Matcher** - Match voters with death records
4. **Document OCR Engine** - Extract text and detect fake documents
5. **Forgery Detection Engine** - Detect tampered official notices
6. **Biometric Matching Engine** - Face and fingerprint matching

## 🌐 Multilingual Support

Supports 10 languages:
- English (en)
- Hindi (hi)
- Bengali (bn)
- Telugu (te)
- Marathi (mr)
- Tamil (ta)
- Gujarati (gu)
- Kannada (kn)
- Malayalam (ml)
- Punjabi (pa)

## 🔐 Security

- **AES-256 Encryption** for sensitive data
- **JWT Authentication** with refresh tokens
- **Hash-chained Audit Logs** for tamper detection
- **Merkle Root** for public transparency
- **Role-Based Access Control** (Citizen, BLO, ERO, DEO, CEO, SuperAdmin)
- **Rate Limiting** and **CORS** protection

## 📊 Database Schema

- **30+ Tables** including:
  - `voters` - Voter information
  - `elections` - Election data
  - `votes` - Vote records
  - `audit_logs` - Immutable audit trail
  - `duplicates` - Duplicate detection results
  - `ai_scores` - AI prediction scores
  - And more...

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
npm test
```

## 📦 Deployment

See deployment guides for detailed instructions:
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - General deployment guide (GitHub, Vercel, Database setup)
- **[VERCEL_DEPLOY_INSTRUCTIONS.md](./VERCEL_DEPLOY_INSTRUCTIONS.md)** - Complete step-by-step Vercel deployment guide
- **[backend/README.md](./backend/README.md)** - Backend setup and configuration guide

## 🛠️ Tech Stack

### Frontend
- React 19
- TypeScript
- Vite
- Tailwind CSS
- React Router
- React i18next
- Face-api.js
- Leaflet Maps

### Backend
- Node.js
- Express.js
- MySQL
- JWT
- bcryptjs
- Zod (Validation)

### AI Services
- Python 3.11
- FastAPI
- NumPy
- Scikit-learn (ready for ML models)

## 📄 License

MIT License

## 👥 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 🙏 Acknowledgments

- Election Commission of India (ECI) for design inspiration
- DigiLocker and Aadhaar Portal for UI/UX reference
- All open-source contributors

---

**Built with ❤️ for transparent and secure elections**
