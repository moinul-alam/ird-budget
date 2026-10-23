const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const crypto = require('crypto');

// Load .env
const env = fs.readFileSync('.env', 'utf8');
const envMap = {};
env.split('\n').forEach((l) => {
  const line = l.trim();
  if (!line || line.startsWith('#')) return;
  const eq = line.indexOf('=');
  if (eq === -1) return;
  const k = line.slice(0, eq).trim();
  let v = line.slice(eq + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1);
  }
  if (k) envMap[k] = v;
});

// Set DATABASE_URL
if (envMap.DATABASE_URL) {
  process.env.DATABASE_URL = envMap.DATABASE_URL;
}

const prisma = new PrismaClient();

async function createSuperAdmin() {
  try {
    const username = 'superadmin';
    const password = '123';
    const passwordHash = crypto.createHash('sha256').update(password).digest('hex');

    console.log('Creating superadmin user...');
    console.log('Username:', username);
    console.log('Password:', password);
    console.log('Password Hash:', passwordHash);
    console.log('Database URL:', envMap.DATABASE_URL ? 'Set' : 'Not set');

    // Check if user exists
    const existing = await prisma.adminUser.findFirst({
      where: {
        username: {
          equals: username,
          mode: 'insensitive',
        },
      },
    });

    if (existing) {
      console.log('Superadmin already exists. Updating...');
      await prisma.adminUser.update({
        where: { id: existing.id },
        data: {
          passwordHash: passwordHash,
          role: 'superadmin',
          isActive: true,
        },
      });
      console.log('✓ Superadmin updated successfully');
    } else {
      // Create new superadmin
      await prisma.adminUser.create({
        data: {
          username: username,
          passwordHash: passwordHash,
          role: 'superadmin',
          isActive: true,
        },
      });
      console.log('✓ Superadmin created successfully');
    }

    console.log('\n--- LOGIN CREDENTIALS ---');
    console.log('Username: superadmin');
    console.log('Password: 123');
    console.log('URL: /admin/login');
    console.log('--------------------------');
  } catch (error) {
    console.error('Error creating superadmin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createSuperAdmin();
