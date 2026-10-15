const mysql = require('mysql2/promise');

async function setup() {
  const conn = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'ip_std6730202173'
  });

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS employees (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      position VARCHAR(255) NOT NULL,
      status VARCHAR(50) DEFAULT 'Active',
      salary INT NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  console.log('Table employees created/verified in MySQL!');

  const [rows] = await conn.execute('SELECT COUNT(*) as count FROM employees');
  if (rows[0].count === 0) {
    const initial = [
      ['Nichakamon', 'HR Manager', 'Active', 55000],
      ['John Doe', 'Software Engineer', 'Active', 45000],
      ['Jane Smith', 'HR Specialist', 'Active', 32000],
      ['Michael Brown', 'Senior System Architect', 'Active', 85000],
      ['Emily Davis', 'Junior Frontend Developer', 'On Leave', 22000],
      ['David Wilson', 'DevOps Engineer', 'Active', 52000],
      ['Sarah Connor', 'Engineering Director', 'Active', 95000],
      ['Peter Parker', 'Intern', 'On Leave', 15000]
    ];
    for (const [name, pos, status, salary] of initial) {
      await conn.execute(
        'INSERT INTO employees (name, position, status, salary) VALUES (?, ?, ?, ?)',
        [name, pos, status, salary]
      );
    }
    console.log('Seeded 8 employees into MySQL!');
  } else {
    console.log('Employees table already has', rows[0].count, 'rows.');
  }

  const [all] = await conn.execute('SELECT * FROM employees');
  console.log('Total rows in MySQL:', all.length);
  all.forEach(r => console.log(`ID: ${r.id} | ${r.name} (${r.position}) - ${r.status} - ฿${r.salary}`));

  await conn.end();
}

setup().catch(console.error);
