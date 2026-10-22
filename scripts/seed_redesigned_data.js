const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env', 'utf8');
const envMap = {};
env.split('\n').forEach(l => { const [k, v] = l.trim().split('='); if (k && v) envMap[k] = v; });
const supabase = createClient(envMap.PUBLIC_SUPABASE_URL, envMap.PUBLIC_SUPABASE_ANON_KEY);

async function runSeed() {
  console.log('--- Starting Data Seeding ---');

  // 1. Seed Core Ministries
  const { data: minData, error: minErr } = await supabase
    .from('core_ministries')
    .upsert([
      { id: 1, code: 'IRD', name: 'অভ্যন্তরীণ সম্পদ বিভাগ' }
    ], { onConflict: 'id' })
    .select();

  if (minErr) {
    console.error('Error seeding ministries:', minErr);
    return;
  }
  console.log('Seeded core_ministries:', minData.length);

  // 2. Load Backup Data
  const backup = JSON.parse(fs.readFileSync('resources/offices_backup_91.json', 'utf8'));

  // 3. Seed Core Departments
  const cleanDepts = backup.departments.map(d => {
    let name = d.name || '';
    if (name.includes(':::min=')) name = name.split(':::min=')[0];
    if (name.includes(':::budget=')) name = name.split(':::budget=')[0];
    return {
      id: d.id,
      ministry_id: 1,
      name: name.trim(),
      code: `DEPT_${d.id}`,
    };
  });

  const { data: deptData, error: deptErr } = await supabase
    .from('core_departments')
    .upsert(cleanDepts, { onConflict: 'id' })
    .select();

  if (deptErr) {
    console.error('Error seeding departments:', deptErr);
    return;
  }
  console.log('Seeded core_departments:', deptData.length);

  // 4. Seed Core Office Types
  const cleanOfficeTypes = backup.office_types.map(ot => {
    let name = ot.name || '';
    if (name.includes(':::order=')) name = name.split(':::order=')[0];
    if (name.includes(':::label=')) name = name.split(':::label=')[0];
    return {
      id: ot.id,
      department_id: ot.department_id,
      name: name.trim(),
      is_group_budget: Boolean(ot.is_group_budget),
      sort_order: ot.id,
    };
  });

  const { data: otData, error: otErr } = await supabase
    .from('core_office_types')
    .upsert(cleanOfficeTypes, { onConflict: 'id' })
    .select();

  if (otErr) {
    console.error('Error seeding office types:', otErr);
    return;
  }
  console.log('Seeded core_office_types:', otData.length);

  // 5. Seed Core Offices (Clean names without :::tags)
  // Build map of office type to department
  const otToDept = new Map();
  cleanOfficeTypes.forEach(ot => otToDept.set(ot.id, ot.department_id));

  const cleanOffices = backup.offices.map(o => {
    let name = o.name || '';
    if (name.includes(':::pwd$')) name = name.split(':::pwd$')[0];
    if (name.includes(':::poid=')) name = name.split(':::poid=')[0];
    if (name.includes(':::did=')) name = name.split(':::did=')[0];
    if (name.includes(':::mid=')) name = name.split(':::mid=')[0];

    // Determine parent_office_id if valid
    let poid = o.parent_office_id;
    if (o.name && o.name.includes(':::poid=')) {
      const p = parseInt(o.name.split(':::poid=')[1], 10);
      if (!isNaN(p)) poid = p;
    }

    const deptId = otToDept.get(o.office_type_id) || 10;

    return {
      id: o.id,
      budget_id: String(o.budget_id).trim(),
      name: name.trim(),
      department_id: deptId,
      office_type_id: o.office_type_id,
      parent_office_id: null, // set null first to avoid self-referential FK constraint on insert
      is_active: true,
    };
  });

  const { data: offData, error: offErr } = await supabase
    .from('core_offices')
    .upsert(cleanOffices, { onConflict: 'id' })
    .select();

  if (offErr) {
    console.error('Error seeding offices:', offErr);
    return;
  }
  console.log('Seeded core_offices:', offData.length);

  // 6. Seed Office User Logins (1 login per office)
  // Default password hint: '12345' (or custom password if previously set on office 100)
  const crypto = require('crypto');
  const userLogins = backup.offices.map(o => {
    let pwdHint = '12345';
    if (o.name && o.name.includes(':::pwd$')) {
      const extracted = o.name.split(':::pwd$')[1];
      if (extracted) pwdHint = extracted;
    }
    const pwdHash = crypto.createHash('sha256').update(pwdHint).digest('hex');

    return {
      id: o.id,
      office_id: o.id,
      budget_id: String(o.budget_id).trim(),
      password_hash: pwdHash,
      password_hint: pwdHint,
      is_active: true,
    };
  });

  const { data: loginData, error: loginErr } = await supabase
    .from('office_user_logins')
    .upsert(userLogins, { onConflict: 'id' })
    .select();

  if (loginErr) {
    console.error('Error seeding office user logins:', loginErr);
    return;
  }
  console.log('Seeded office_user_logins:', loginData.length);

  console.log('--- Database Seeding Completed Successfully! ---');
}

runSeed();
