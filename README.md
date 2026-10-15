# HR Manager & Salary Analytics System (Final Exam 2026)

**Student ID:** 6730202173  
**Subject:** Internet Programming (Final Exam 2026)  
**Topic:** HR Manager & Salary Analytics System  

---

## 📁 Project Directory Structure
```text
Std6730202173IPFinal2026/
├── backend/
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── App.js
│   ├── app.json
│   ├── babel.config.js
│   └── package.json
├── .gitignore
└── README.md
```

---

## 🚀 How to Run the Project

### 1. Run Backend Server (Express.js)
Open a terminal in `backend`:
```bash
cd backend
npm install
npm start
```
> The server will start on **`http://localhost:5000`**

### 2. Run Frontend App (React Native / Expo)
Open a second terminal in `frontend`:
```bash
cd frontend
npm install
npm run web
```
> Press `w` to open in your web browser (or scan QR code with Expo Go for mobile).

---

## 🔑 Login Credentials
- **Username:** `admin`
- **Password:** `password123`

---

## 📋 Features Implemented

### Phase 1: Authentication & Employee Management (CRUD)
- **Authentication:** `POST /api/login` (admin / password123 returns mock JWT token, invalid credentials return 401).
- **In-memory Array:** Pre-populated with 7 mock employees with diverse salaries.
- **GET All Employees:** `GET /api/employees`
- **Add Employee:** `POST /api/employees` (with client-side & server-side validation for empty fields).
- **Toggle Status:** `PUT /api/employees/:id/status` (Active ↔ On Leave).
- **Delete Employee:** `DELETE /api/employees/:id` (with "Are you sure?" confirmation alert dialog).

### Phase 2: Automated Salary Clustering (1D K-Means Analytics, k=3)
- **Analytics Endpoint:** `GET /api/employees/salary-clusters`
- **1D K-Means Clustering Algorithm:** Groups current employee salaries into 3 distinct tiers (Tier 1, Tier 2, Tier 3) and computes centroids and employee counts.
- **Frontend Integration:** "Analyze Salary Structure" button displays a Loading Indicator while computing, and renders the result as summary cards showing Tier name, employee count, and average base salary.
