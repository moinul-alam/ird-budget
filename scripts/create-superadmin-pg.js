const { Pool } = require('pg');
const fs = require('fs');
const crypto = require('crypto');

// Load .env
const env = fs.readFileSync('.env', 'utf8');
const envMap = {};
env.split('\n').forEach(l => { const [k, v] = l.trim().split('='); if (k && v) envMap[k] = v; });

const username = 'superadmin';
const password = '123';
const passwordHash = crypto.createHash('sha256').update(password).digest('hex');

console.log('Creating superadmin user...');
console.log('Username:', username);
console.log('Password:', password);
console.log('Password Hash:', passwordHash);

const pool = new Pool({
  connectionString: envMap.DATABASE_URL,
});

async function createSuperAdmin() {
  try {
    console.log('Connecting to database...');
    const client = await pool.connect();

    // Check if user exists
    const checkResult = await client.query(
      'SELECT * FROM admin_users WHERE username = $1',
      [username]
    );

    if (checkResult.rows.length > 0) {
      console.log('Superadmin already exists. Updating...');
      await client.query(
        'UPDATE admin_users SET "passwordHash" = $1, role = $2, "isActive" = $3, "updatedAt" = NOW() WHERE id = $4',
        [passwordHash, 'superadmin', true, checkResult.rows[0].id]
      );
      console.log('✓ Superadmin updated successfully');
    } else {
      console.log('Creating new superadmin...');
      await client.query(
        'INSERT INTO admin_users (username, "passwordHash", role, "isActive", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, NOW(), NOW())',
        [username, passwordHash, 'superadmin', true]
      );
      console.log('✓ Superadmin created successfully');
    }

    client.release();

    console.log('\n--- LOGIN CREDENTIALS ---');
    console.log('Username: superadmin');
    console.log('Password: 123');
    console.log('URL: /admin/login');
    console.log('--------------------------');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

createSuperAdmin();
