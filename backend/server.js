const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// ==========================================
// Mock Data (In-memory array - At least 5 employees)
// ==========================================
let employees = [
  {
    id: "1",
    name: "Nichakamon",
    position: "HR Manager",
    status: "Active",
    salary: 55000
  },
  {
    id: "2",
    name: "John Doe",
    position: "Software Engineer",
    status: "Active",
    salary: 45000
  },
  {
    id: "3",
    name: "Jane Smith",
    position: "HR Specialist",
    status: "Active",
    salary: 32000
  },
  {
    id: "4",
    name: "Michael Brown",
    position: "Senior System Architect",
    status: "Active",
    salary: 85000
  },
  {
    id: "5",
    name: "Emily Davis",
    position: "Junior Frontend Developer",
    status: "On Leave",
    salary: 22000
  },
  {
    id: "6",
    name: "David Wilson",
    position: "DevOps Engineer",
    status: "Active",
    salary: 52000
  },
  {
    id: "7",
    name: "Sarah Connor",
    position: "Engineering Director",
    status: "Active",
    salary: 95000
  },
  {
    id: "8",
    name: "Peter Parker",
    position: "Intern",
    status: "On Leave",
    salary: 15000
  }
];

// Helper to auto-increment ID
let nextId = 9;

// ==========================================
// 1.1 Authentication (Login) Endpoint
// ==========================================
app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};

  // Check credentials: allow both 'password123' (as per exam spec) and '123'
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
// 1.1 CRUD API Endpoints (ค้นหา / เพิ่ม / แก้ไข / ลบ)
// ==========================================

// [GET] /api/employees - Return all employee records (supports ?q= or ?search=)
app.get('/api/employees', (req, res) => {
  const { q, search } = req.query;
  const keyword = (q || search || '').toLowerCase().trim();
  if (keyword) {
    const filtered = employees.filter(emp =>
      emp.name.toLowerCase().includes(keyword) ||
      emp.position.toLowerCase().includes(keyword) ||
      emp.status.toLowerCase().includes(keyword) ||
      String(emp.salary).includes(keyword)
    );
    return res.status(200).json(filtered);
  }
  res.status(200).json(employees);
});

// [POST] /api/employees - Add a new employee
app.post('/api/employees', (req, res) => {
  const { name, position, salary } = req.body || {};

  // Validate: all fields must be non-empty
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
  if (isNaN(numericSalary) || numericSalary < 0) {
    return res.status(400).json({
      success: false,
      error: "Salary must be a valid positive number."
    });
  }

  const newEmployee = {
    id: String(nextId++),
    name: String(name).trim(),
    position: String(position).trim(),
    status: "Active", // Default status
    salary: numericSalary
  };

  employees.push(newEmployee);

  res.status(201).json({
    success: true,
    message: "Employee added successfully",
    employee: newEmployee
  });
});

// [PUT] /api/employees/:id - Edit employee details (แก้ไขข้อมูลพนักงาน)
app.put('/api/employees/:id', (req, res) => {
  const { id } = req.params;
  const { name, position, salary, status } = req.body || {};
  const employee = employees.find(emp => emp.id === String(id));

  if (!employee) {
    return res.status(404).json({
      success: false,
      error: `Employee with ID ${id} not found.`
    });
  }

  if (name && String(name).trim()) employee.name = String(name).trim();
  if (position && String(position).trim()) employee.position = String(position).trim();
  if (salary !== undefined && !isNaN(Number(salary))) employee.salary = Number(salary);
  if (status && (status === 'Active' || status === 'On Leave')) employee.status = status;

  res.status(200).json({
    success: true,
    message: "Employee updated successfully",
    employee
  });
});

// [PUT] /api/employees/:id/status - Toggle employee's status (Active <-> On Leave)
app.put('/api/employees/:id/status', (req, res) => {
  const { id } = req.params;
  const employee = employees.find(emp => emp.id === String(id));

  if (!employee) {
    return res.status(404).json({
      success: false,
      error: `Employee with ID ${id} not found.`
    });
  }

  // Toggle status
  employee.status = employee.status === "Active" ? "On Leave" : "Active";

  res.status(200).json({
    success: true,
    message: `Status updated to ${employee.status}`,
    employee
  });
});

// [DELETE] /api/employees/:id - Remove employee from the system
app.delete('/api/employees/:id', (req, res) => {
  const { id } = req.params;
  const index = employees.findIndex(emp => emp.id === String(id));

  if (index === -1) {
    return res.status(404).json({
      success: false,
      error: `Employee with ID ${id} not found.`
    });
  }

  const deletedEmployee = employees.splice(index, 1)[0];

  res.status(200).json({
    success: true,
    message: "Employee deleted successfully",
    deletedEmployee
  });
});

// ==========================================
// Phase 2: K-Means Clustering Algorithm (k=3)
// ==========================================

/**
 * 1D K-Means Clustering algorithm for salaries
 * Groups salaries into 3 clusters (Tier 1, Tier 2, Tier 3)
 */
function runKMeans1D(salaries, k = 3, maxIterations = 50) {
  if (!salaries || salaries.length === 0) {
    return [
      { group: "Tier 1", centroid: 0, count: 0 },
      { group: "Tier 2", centroid: 0, count: 0 },
      { group: "Tier 3", centroid: 0, count: 0 }
    ];
  }

  const sorted = [...salaries].sort((a, b) => a - b);

  // If there are fewer than k data points, pad gracefully
  if (sorted.length < k) {
    return [
      { group: "Tier 1", centroid: sorted[0] || 0, count: sorted[0] !== undefined ? 1 : 0 },
      { group: "Tier 2", centroid: sorted[1] || sorted[0] || 0, count: sorted[1] !== undefined ? 1 : 0 },
      { group: "Tier 3", centroid: sorted[2] || sorted[1] || sorted[0] || 0, count: sorted[2] !== undefined ? 1 : 0 }
    ];
  }

  // Initialize 3 centroids spread across min, median, max
  let centroids = [
    sorted[0],
    sorted[Math.floor(sorted.length / 2)],
    sorted[sorted.length - 1]
  ];

  // If all values are identical or duplicate centroids
  if (centroids[0] === centroids[1] || centroids[1] === centroids[2]) {
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const step = (max - min) / (k - 1 || 1);
    centroids = [min, min + step, max];
  }

  // Iterative refinement
  for (let iter = 0; iter < maxIterations; iter++) {
    const clusters = [[], [], []];

    // Assignment step: assign each salary to nearest centroid
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

    // Update step: recalculate centroids
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

  // Final assignment to get counts and final centroids
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

  // Map to objects and sort by centroid ascending (Tier 1 < Tier 2 < Tier 3)
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
app.get('/api/employees/salary-clusters', (req, res) => {
  try {
    // Extract only the salary values from all current employees
    const salaries = employees
      .map(emp => Number(emp.salary))
      .filter(s => !isNaN(s) && s > 0);

    const clusters = runKMeans1D(salaries, 3);

    res.status(200).json({
      success: true,
      clusters
    });
  } catch (error) {
    console.error('K-Means clustering error:', error);
    res.status(500).json({
      success: false,
      error: "Error processing salary clusters."
    });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
