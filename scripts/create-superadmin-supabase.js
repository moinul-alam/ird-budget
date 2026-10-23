const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const crypto = require('crypto');

// Load .env
const env = fs.readFileSync('.env', 'utf8');
const envMap = {};
env.split('\n').forEach(l => { const [k, v] = l.trim().split('='); if (k && v) envMap[k] = v; });

const supabase = createClient(envMap.NEXT_PUBLIC_SUPABASE_URL, envMap.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function createSuperAdmin() {
  try {
    const username = 'superadmin';
    const password = '123';
    const passwordHash = crypto.createHash('sha256').update(password).digest('hex');

    console.log('Creating superadmin user...');
    console.log('Username:', username);
    console.log('Password:', password);
    console.log('Password Hash:', passwordHash);

    // Check if user exists
    const { data: existing, error: checkError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('username', username)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking existing user:', checkError);
      return;
    }

    if (existing) {
      console.log('Superadmin already exists. Updating...');
      const { error: updateError } = await supabase
        .from('admin_users')
        .update({
          passwordHash: passwordHash,
          role: 'superadmin',
          isActive: true,
          updatedAt: new Date().toISOString()
        })
        .eq('id', existing.id);

      if (updateError) {
        console.error('Error updating user:', updateError);
        return;
      }
      console.log('✓ Superadmin updated successfully');
    } else {
      // Create new superadmin
      const { error: insertError } = await supabase
        .from('admin_users')
        .insert({
          username: username,
          passwordHash: passwordHash,
          role: 'superadmin',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });

      if (insertError) {
        console.error('Error creating user:', insertError);
        return;
      }
      console.log('✓ Superadmin created successfully');
    }

    console.log('\n--- LOGIN CREDENTIALS ---');
    console.log('Username: superadmin');
    console.log('Password: 123');
    console.log('URL: /admin/login');
    console.log('--------------------------');
  } catch (error) {
    console.error('Error:', error);
  }
}

createSuperAdmin();
