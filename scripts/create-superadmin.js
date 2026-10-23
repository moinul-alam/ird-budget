const fs = require('fs');
const crypto = require('crypto');

// Load .env manually like the seed script does
const env = fs.readFileSync('.env', 'utf8');
const envMap = {};
env.split('\n').forEach(l => { const [k, v] = l.trim().split('='); if (k && v) envMap[k] = v; });
process.env.DATABASE_URL = envMap.DATABASE_URL;

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createSuperAdmin() {
  try {
    const username = 'admin';
    const password = '123';
    const passwordHash = crypto.createHash('sha256').update(password).digest('hex');

    // Check if admin user already exists
    const existing = await prisma.adminUser.findFirst({
      where: {
        username: {
          equals: username,
          mode: 'insensitive',
        },
      },
    });

    if (existing) {
      console.log('Admin user already exists. Updating password...');
      await prisma.adminUser.update({
        where: { id: existing.id },
        data: {
          passwordHash: passwordHash,
          role: 'superadmin',
          isActive: true,
        },
      });
      console.log('✓ Admin user updated successfully');
    } else {
      // Create new superadmin user
      await prisma.adminUser.create({
        data: {
          username: username,
          passwordHash: passwordHash,
          role: 'superadmin',
          isActive: true,
        },
      });
      console.log('✓ Superadmin user created successfully');
    }

    console.log('\nLogin credentials:');
    console.log('Username: admin');
    console.log('Password: 123');
    console.log('URL: /admin/login');
  } catch (error) {
    console.error('Error creating superadmin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createSuperAdmin();
