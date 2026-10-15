# HR Manager & Salary Analytics System (Final Exam 2026)

**Student Name:** Nichakamon  
**Student ID:** 6730202173  
**Subject:** Internet Programming (Final Exam 2026)  
**Topic:** HR Manager & Salary Analytics System  
**GitHub Repository:** [https://github.com/Nichakamon15948/Std6730202173IPFinal2026](https://github.com/Nichakamon15948/Std6730202173IPFinal2026)

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
Open terminal in `backend`:
```bash
cd backend
npm install
npm start
```
> Server will start on **`http://localhost:5000`**

### 2. Run Frontend App (React Native / Expo)
Open second terminal in `frontend`:
```bash
cd frontend
npm install
npm run web
```
> Press `w` to open in web browser (`http://localhost:8081`).

---

## 🔑 Login Credentials
- **Username:** `admin`
- **Password:** `password123`

---

## 📋 Features Implemented

### Phase 1: Authentication & Employee Management (CRUD + Search)
- **Authentication:** `POST /api/login` (admin / password123 returns mock JWT token, invalid credentials return 401).
- **In-memory Array:** Includes **Nichakamon (HR Manager)** with ID 1 and other mock employees with diverse salaries.
- **GET All Employees & Search:** `GET /api/employees` (supports search query).
- **Add Employee (Create):** `POST /api/employees` (with client-side & server-side validation for empty fields).
- **Edit Employee (Update):** `PUT /api/employees/:id` (edit name, position, salary, status via popup modal).
- **Toggle Status:** `PUT /api/employees/:id/status` (Active ↔ On Leave).
- **Delete Employee (Delete):** `DELETE /api/employees/:id` (with "Are you sure?" confirmation alert dialog).
- **Search (ค้นหา):** Instant search bar filtering by name, position, status, and salary.

### Phase 2: Automated Salary Clustering (1D K-Means Analytics, k=3)
- **Analytics Endpoint:** `GET /api/employees/salary-clusters`
- **1D K-Means Clustering Algorithm:** Groups employee salaries into 3 distinct tiers (Tier 1, Tier 2, Tier 3) and computes centroids and employee counts.
- **Frontend Integration:** "Analyze Salary Structure" button displays a Loading Indicator while computing, and renders the result as summary cards showing Tier name, employee count, and average base salary.
