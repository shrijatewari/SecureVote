# Login Credentials

## ✅ GUARANTEED WORKING CREDENTIALS

These users are automatically seeded when the backend starts.

### 🔐 Admin Users (Tiered Access)

#### ECI Admin (Highest Level - Full Access)
- **Email:** `admin1@election.gov.in`
- **Password:** `admin1`
- **Role:** `eci` (Election Commission of India)
- **Access:** Full system access - all admin modules

#### CEO Officer (State Level)
- **Email:** `admin5@election.gov.in`
- **Password:** `admin5`
- **Role:** `ceo` (Chief Electoral Officer)
- **Access:** State-level management, data import, security, ledger

#### DEO Officer (District Level)
- **Email:** `admin4@election.gov.in`
- **Password:** `admin4`
- **Role:** `deo` (District Election Officer)
- **Access:** District management, roll revision, AI services, duplicates, death records

#### ERO Officer (Constituency Level)
- **Email:** `admin3@election.gov.in`
- **Password:** `admin3`
- **Role:** `ero` (Electoral Registration Officer)
- **Access:** Constituency management, EPIC generation, BLO task assignment

#### BLO Officer (Booth Level)
- **Email:** `admin2@election.gov.in`
- **Password:** `admin2`
- **Role:** `blo` (Booth Level Officer)
- **Access:** BLO tasks, assigned voters only

### 👤 Citizen Users

#### Test Citizen
- **Email:** `citizen1@example.com`
- **Password:** `any` (any password works in demo mode)
- **Role:** `citizen`
- **Access:** Citizen dashboard only - NO admin access

## 🎯 Quick Test Credentials

**For Admin Dashboard (Full Access):**
```
Email: admin1@election.gov.in
Password: admin1
```

**For Citizen Dashboard:**
```
Email: citizen1@example.com
Password: any
```

## 🔒 Role-Based Access Control (RBAC)

### Role Hierarchy (Highest to Lowest):
1. **eci** - Election Commission of India (Level 7) - Full access
2. **ceo** - Chief Electoral Officer (Level 6) - State level
3. **deo** - District Election Officer (Level 5) - District level
4. **ero** - Electoral Registration Officer (Level 4) - Constituency level
5. **blo** - Booth Level Officer (Level 3) - Booth level
6. **admin** - General Admin (Level 2) - Limited admin
7. **citizen** - Citizen/Voter (Level 1) - Public access only

### Access Rules:
- ✅ Citizens CANNOT access any `/admin/*` routes
- ✅ Each role can only access routes at or below their level
- ✅ Backend enforces role-based access on all API endpoints
- ✅ Frontend redirects unauthorized users to `/dashboard`

## 📝 Notes

- Admin users require exact password match (SHA256 hash)
- Voter users accept any password in demo mode
- Users are automatically seeded on backend startup
- All admin routes require authentication + minimum role level
- Citizens are redirected to `/dashboard` if they try to access `/admin`

