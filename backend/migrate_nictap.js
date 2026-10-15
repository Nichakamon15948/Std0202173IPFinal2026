const mysql = require('mysql2/promise');

async function migrate() {
  const conn = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'ip_std6730202173'
  });

  console.log('Connected to MySQL. Migrating table with NicTap_ prefix...');

  // Drop old tables if exist to make sure schema has NicTap_ prefix
  await conn.execute(`DROP TABLE IF EXISTS NicTap_employees;`);
  await conn.execute(`DROP TABLE IF EXISTS employees;`);

  // Create table with NicTap_ prefix for all fields
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS NicTap_employees (
      NicTap_id INT AUTO_INCREMENT PRIMARY KEY,
      NicTap_name VARCHAR(255) NOT NULL,
      NicTap_position VARCHAR(255) NOT NULL,
      NicTap_status VARCHAR(50) DEFAULT 'Active',
      NicTap_salary INT NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // Also create alias table employees with same NicTap_ fields for safety
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS employees (
      NicTap_id INT AUTO_INCREMENT PRIMARY KEY,
      NicTap_name VARCHAR(255) NOT NULL,
      NicTap_position VARCHAR(255) NOT NULL,
      NicTap_status VARCHAR(50) DEFAULT 'Active',
      NicTap_salary INT NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  console.log('Created tables with NicTap_ fields: NicTap_id, NicTap_name, NicTap_position, NicTap_status, NicTap_salary');

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
      'INSERT INTO NicTap_employees (NicTap_name, NicTap_position, NicTap_status, NicTap_salary) VALUES (?, ?, ?, ?)',
      [name, pos, status, salary]
    );
    await conn.execute(
      'INSERT INTO employees (NicTap_name, NicTap_position, NicTap_status, NicTap_salary) VALUES (?, ?, ?, ?)',
      [name, pos, status, salary]
    );
  }

  console.log('Seeded 8 employees into both tables with NicTap_ prefix!');

  const [cols] = await conn.execute('DESCRIBE NicTap_employees');
  console.log('NicTap_employees columns:');
  cols.forEach(c => console.log(`- ${c.Field} (${c.Type})`));

  await conn.end();
}

migrate().catch(console.error);
