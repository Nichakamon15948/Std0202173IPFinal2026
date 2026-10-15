try { require('dotenv').config(); } catch (e) {}
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');

const app = express();
// Default port 3018 for University VPS (or environment PORT)
const PORT = process.env.PORT || 3018;

// Middleware
app.use(cors());
app.use(express.json());

// ==========================================
// In-Memory Fallback Data
// ==========================================
let memoryEmployees = [
  { id: "1", name: "Nichakamon", position: "HR Manager", status: "Active", salary: 55000 },
  { id: "2", name: "John Doe", position: "Software Engineer", status: "Active", salary: 45000 },
  { id: "3", name: "Jane Smith", position: "HR Specialist", status: "Active", salary: 32000 },
  { id: "4", name: "Michael Brown", position: "Senior System Architect", status: "Active", salary: 85000 },
  { id: "5", name: "Emily Davis", position: "Junior Frontend Developer", status: "On Leave", salary: 22000 },
  { id: "6", name: "David Wilson", position: "DevOps Engineer", status: "Active", salary: 52000 },
  { id: "7", name: "Sarah Connor", position: "Engineering Director", status: "Active", salary: 95000 },
  { id: "8", name: "Peter Parker", position: "Intern", status: "On Leave", salary: 15000 }
];
let nextMemoryId = 9;

// ==========================================
// MySQL Database Pool Setup (Supports both VPS Cloud and Local XAMPP)
// ==========================================
let dbPool = null;
let useDatabase = false;

async function initDatabase() {
  const configsToTry = [
    // 1. VPS Cloud Configuration (University VPS)
    {
      host: process.env.DB_HOST || '127.0.0.1',
      user: process.env.DB_USER || 'std6730202173',
      password: process.env.DB_PASSWORD || 'M3@zWq7L',
      database: process.env.DB_NAME || 'ip_std6730202173'
    },
    // 2. Local XAMPP Configuration (root with no password)
    {
      host: '127.0.0.1',
      user: 'root',
      password: '',
      database: 'ip_std6730202173'
    }
  ];

  for (const cfg of configsToTry) {
    try {
      const pool = mysql.createPool({
        ...cfg,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        connectTimeout: 3000
      });

      const conn = await pool.getConnection();
      console.log(`Connected to MySQL (${cfg.database}) via user "${cfg.user}" successfully!`);

      // Ensure table with NicTap_ fields exists
      await conn.execute(`
        CREATE TABLE IF NOT EXISTS NicTap_employees (
          NicTap_id INT AUTO_INCREMENT PRIMARY KEY,
          NicTap_name VARCHAR(255) NOT NULL,
          NicTap_position VARCHAR(255) NOT NULL,
          NicTap_status VARCHAR(50) DEFAULT 'Active',
          NicTap_salary INT NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // Ensure initial rows exist
      const [rows] = await conn.execute('SELECT COUNT(*) as count FROM NicTap_employees');
      if (rows[0].count === 0) {
        for (const emp of memoryEmployees) {
          await conn.execute(
            'INSERT INTO NicTap_employees (NicTap_name, NicTap_position, NicTap_status, NicTap_salary) VALUES (?, ?, ?, ?)',
            [emp.name, emp.position, emp.status, emp.salary]
          );
        }
        console.log('Seeded NicTap_employees table in MySQL!');
      }

      conn.release();
      dbPool = pool;
      useDatabase = true;
      return;
    } catch (err) {
      // try next config
    }
  }

  console.warn('MySQL not reachable on current host, running in In-Memory mode.');
  useDatabase = false;
}

initDatabase();

// ==========================================
// 1. Authentication (Login) Endpoint
// ==========================================
app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};

  // Check credentials: allow 'admin' with '123' or 'password123'
  if (username === 'admin' && (password === 'password123' || password === '123')) {
    return res.status(200).json({
      success: true,
      token: "mock-jwt-token"
    });
  }

  return res.status(401).json({
    success: false,
    error: "Invalid username or password"
  });
});

// ==========================================
// 1.1 CRUD API Endpoints (Using NicTap_ fields in DB)
// ==========================================

// [GET] /api/employees - Return all employee records (supports ?q= or ?search=)
app.get('/api/employees', async (req, res) => {
  const { q, search } = req.query;
  const keyword = (q || search || '').toLowerCase().trim();

  if (useDatabase && dbPool) {
    try {
      let query = `
        SELECT 
          NicTap_id AS id, 
          NicTap_name AS name, 
          NicTap_position AS position, 
          NicTap_status AS status, 
          NicTap_salary AS salary 
        FROM NicTap_employees
      `;
      let params = [];

      if (keyword) {
        query += ' WHERE LOWER(NicTap_name) LIKE ? OR LOWER(NicTap_position) LIKE ? OR LOWER(NicTap_status) LIKE ? OR CAST(NicTap_salary AS CHAR) LIKE ?';
        const like = `%${keyword}%`;
        params = [like, like, like, like];
      }

      query += ' ORDER BY NicTap_id ASC';
      const [rows] = await dbPool.execute(query, params);
      const formatted = rows.map(r => ({
        ...r,
        id: String(r.id),
        salary: Number(r.salary)
      }));
      return res.status(200).json(formatted);
    } catch (err) {
      console.error('Database GET error:', err);
    }
  }

  // Memory fallback
  if (keyword) {
    const filtered = memoryEmployees.filter(emp =>
      emp.name.toLowerCase().includes(keyword) ||
      emp.position.toLowerCase().includes(keyword) ||
      emp.status.toLowerCase().includes(keyword) ||
      String(emp.salary).includes(keyword)
    );
    return res.status(200).json(filtered);
  }
  res.status(200).json(memoryEmployees);
});

// [POST] /api/employees - Add a new employee
app.post('/api/employees', async (req, res) => {
  const { name, position, salary } = req.body || {};

  // Validation: Status 400 Bad Request if any field is empty
  if (
    !name ||
    !String(name).trim() ||
    !position ||
    !String(position).trim() ||
    salary === undefined ||
    salary === null ||
    String(salary).trim() === ''
  ) {
    return res.status(400).json({
      success: false,
      error: "All fields (name, position, salary) are required."
    });
  }

  const numericSalary = Number(salary);
  if (isNaN(numericSalary) || numericSalary <= 0) {
    return res.status(400).json({
      success: false,
      error: "Salary must be a valid positive number."
    });
  }

  const cleanName = String(name).trim();
  const cleanPos = String(position).trim();

  if (useDatabase && dbPool) {
    try {
      const [result] = await dbPool.execute(
        'INSERT INTO NicTap_employees (NicTap_name, NicTap_position, NicTap_status, NicTap_salary) VALUES (?, ?, "Active", ?)',
        [cleanName, cleanPos, numericSalary]
      );
      const newEmployee = {
        id: String(result.insertId),
        name: cleanName,
        position: cleanPos,
        status: "Active",
        salary: numericSalary
      };
      return res.status(201).json({
        success: true,
        message: "Employee added successfully to MySQL (NicTap_employees)",
        employee: newEmployee
      });
    } catch (err) {
      console.error('Database POST error:', err);
    }
  }

  // Memory fallback
  const newEmployee = {
    id: String(nextMemoryId++),
    name: cleanName,
    position: cleanPos,
    status: "Active",
    salary: numericSalary
  };
  memoryEmployees.push(newEmployee);

  res.status(201).json({
    success: true,
    message: "Employee added successfully",
    employee: newEmployee
  });
});

// [PUT] /api/employees/:id - Edit employee details
app.put('/api/employees/:id', async (req, res) => {
  const { id } = req.params;
  const { name, position, salary, status } = req.body || {};

  if (useDatabase && dbPool) {
    try {
      const [check] = await dbPool.execute('SELECT * FROM NicTap_employees WHERE NicTap_id = ?', [id]);
      if (check.length === 0) {
        return res.status(404).json({ success: false, error: `Employee #${id} not found.` });
      }

      const current = check[0];
      const newName = name ? String(name).trim() : current.NicTap_name;
      const newPos = position ? String(position).trim() : current.NicTap_position;
      const newSal = salary !== undefined && !isNaN(Number(salary)) ? Number(salary) : current.NicTap_salary;
      const newStatus = status === 'Active' || status === 'On Leave' ? status : current.NicTap_status;

      await dbPool.execute(
        'UPDATE NicTap_employees SET NicTap_name = ?, NicTap_position = ?, NicTap_status = ?, NicTap_salary = ? WHERE NicTap_id = ?',
        [newName, newPos, newStatus, newSal, id]
      );

      return res.status(200).json({
        success: true,
        message: "Employee updated successfully in MySQL",
        employee: { id: String(id), name: newName, position: newPos, status: newStatus, salary: newSal }
      });
    } catch (err) {
      console.error('Database PUT error:', err);
    }
  }

  // Memory fallback
  const employee = memoryEmployees.find(emp => emp.id === String(id));
  if (!employee) {
    return res.status(404).json({ success: false, error: `Employee #${id} not found.` });
  }

  if (name && String(name).trim()) employee.name = String(name).trim();
  if (position && String(position).trim()) employee.position = String(position).trim();
  if (salary !== undefined && !isNaN(Number(salary))) employee.salary = Number(salary);
  if (status && (status === 'Active' || status === 'On Leave')) employee.status = status;

  res.status(200).json({ success: true, message: "Employee updated successfully", employee });
});

// [PUT] /api/employees/:id/status - Toggle employee's status (Active <-> On Leave)
app.put('/api/employees/:id/status', async (req, res) => {
  const { id } = req.params;

  if (useDatabase && dbPool) {
    try {
      const [rows] = await dbPool.execute('SELECT * FROM NicTap_employees WHERE NicTap_id = ?', [id]);
      if (rows.length === 0) {
        return res.status(404).json({ success: false, error: `Employee #${id} not found.` });
      }
      const newStatus = rows[0].NicTap_status === 'Active' ? 'On Leave' : 'Active';
      await dbPool.execute('UPDATE NicTap_employees SET NicTap_status = ? WHERE NicTap_id = ?', [newStatus, id]);

      return res.status(200).json({
        success: true,
        message: `Status updated to ${newStatus}`,
        employee: {
          id: String(rows[0].NicTap_id),
          name: rows[0].NicTap_name,
          position: rows[0].NicTap_position,
          status: newStatus,
          salary: Number(rows[0].NicTap_salary)
        }
      });
    } catch (err) {
      console.error('Database toggle status error:', err);
    }
  }

  // Memory fallback
  const employee = memoryEmployees.find(emp => emp.id === String(id));
  if (!employee) {
    return res.status(404).json({ success: false, error: `Employee #${id} not found.` });
  }

  employee.status = employee.status === "Active" ? "On Leave" : "Active";
  res.status(200).json({ success: true, message: `Status updated to ${employee.status}`, employee });
});

// [DELETE] /api/employees/:id - Remove employee from database
app.delete('/api/employees/:id', async (req, res) => {
  const { id } = req.params;

  if (useDatabase && dbPool) {
    try {
      const [rows] = await dbPool.execute('SELECT * FROM NicTap_employees WHERE NicTap_id = ?', [id]);
      if (rows.length === 0) {
        return res.status(404).json({ success: false, error: `Employee #${id} not found.` });
      }
      await dbPool.execute('DELETE FROM NicTap_employees WHERE NicTap_id = ?', [id]);
      return res.status(200).json({
        success: true,
        message: "Employee deleted successfully from MySQL (NicTap_employees)",
        deletedEmployee: rows[0]
      });
    } catch (err) {
      console.error('Database DELETE error:', err);
    }
  }

  // Memory fallback
  const index = memoryEmployees.findIndex(emp => emp.id === String(id));
  if (index === -1) {
    return res.status(404).json({ success: false, error: `Employee #${id} not found.` });
  }

  const deletedEmployee = memoryEmployees.splice(index, 1)[0];
  res.status(200).json({ success: true, message: "Employee deleted successfully", deletedEmployee });
});

// ==========================================
// Phase 2: K-Means Clustering Algorithm (k=3)
// ==========================================
function runKMeans1D(salaries, k = 3, maxIterations = 50) {
  if (!salaries || salaries.length === 0) {
    return [
      { group: "Tier 1", centroid: 0, count: 0 },
      { group: "Tier 2", centroid: 0, count: 0 },
      { group: "Tier 3", centroid: 0, count: 0 }
    ];
  }

  const sorted = [...salaries].sort((a, b) => a - b);

  if (sorted.length < k) {
    return [
      { group: "Tier 1", centroid: sorted[0] || 0, count: sorted[0] !== undefined ? 1 : 0 },
      { group: "Tier 2", centroid: sorted[1] || sorted[0] || 0, count: sorted[1] !== undefined ? 1 : 0 },
      { group: "Tier 3", centroid: sorted[2] || sorted[1] || sorted[0] || 0, count: sorted[2] !== undefined ? 1 : 0 }
    ];
  }

  let centroids = [
    sorted[0],
    sorted[Math.floor(sorted.length / 2)],
    sorted[sorted.length - 1]
  ];

  if (centroids[0] === centroids[1] || centroids[1] === centroids[2]) {
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const step = (max - min) / (k - 1 || 1);
    centroids = [min, min + step, max];
  }

  for (let iter = 0; iter < maxIterations; iter++) {
    const clusters = [[], [], []];

    for (const val of sorted) {
      let minDist = Infinity;
      let clusterIndex = 0;
      for (let i = 0; i < k; i++) {
        const dist = Math.abs(val - centroids[i]);
        if (dist < minDist) {
          minDist = dist;
          clusterIndex = i;
        }
      }
      clusters[clusterIndex].push(val);
    }

    let converged = true;
    const newCentroids = [];
    for (let i = 0; i < k; i++) {
      if (clusters[i].length === 0) {
        newCentroids.push(centroids[i]);
      } else {
        const mean = clusters[i].reduce((sum, v) => sum + v, 0) / clusters[i].length;
        if (Math.abs(mean - centroids[i]) > 0.1) {
          converged = false;
        }
        newCentroids.push(mean);
      }
    }

    centroids = newCentroids;
    if (converged) break;
  }

  const finalClusters = [[], [], []];
  for (const val of sorted) {
    let minDist = Infinity;
    let clusterIndex = 0;
    for (let i = 0; i < k; i++) {
      const dist = Math.abs(val - centroids[i]);
      if (dist < minDist) {
        minDist = dist;
        clusterIndex = i;
      }
    }
    finalClusters[clusterIndex].push(val);
  }

  const results = finalClusters.map((cluster, i) => {
    const count = cluster.length;
    const centroid = count > 0 
      ? Math.round(cluster.reduce((sum, v) => sum + v, 0) / count)
      : Math.round(centroids[i]);
    return { centroid, count };
  });

  results.sort((a, b) => a.centroid - b.centroid);

  return results.map((item, idx) => ({
    group: `Tier ${idx + 1}`,
    centroid: item.centroid,
    count: item.count
  }));
}

// [GET] /api/employees/salary-clusters - K-Means Analytics
app.get('/api/employees/salary-clusters', async (req, res) => {
  try {
    let salaries = [];

    if (useDatabase && dbPool) {
      const [rows] = await dbPool.execute('SELECT NicTap_salary AS salary FROM NicTap_employees');
      salaries = rows.map(r => Number(r.salary)).filter(s => !isNaN(s) && s > 0);
    } else {
      salaries = memoryEmployees.map(emp => Number(emp.salary)).filter(s => !isNaN(s) && s > 0);
    }

    const clusters = runKMeans1D(salaries, 3);
    res.status(200).json({ success: true, clusters });
  } catch (error) {
    console.error('K-Means clustering error:', error);
    res.status(500).json({ success: false, error: "Error processing salary clusters." });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
