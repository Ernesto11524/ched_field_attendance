/**
 * Run this script once to create your first admin account.
 *
 * Usage:
 *   node scripts/create-admin.js
 *
 * It will ask you for a name, email, and password.
 */

require('dotenv').config({ path: '../.env' });
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const readline = require('readline');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

async function main() {
  console.log('\n=== Create First Admin User ===\n');

  const full_name = await ask('Full name: ');
  const email     = await ask('Email: ');
  const password  = await ask('Password (min 8 characters): ');

  if (password.length < 8) {
    console.error('❌ Password must be at least 8 characters.');
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  try {
    const result = await pool.query(
      `INSERT INTO admin_users (full_name, email, password_hash, role)
       VALUES ($1, $2, $3, 'admin')
       RETURNING id, full_name, email, role`,
      [full_name, email, passwordHash]
    );

    console.log('\n✅ Admin created successfully!');
    console.log('   Name:', result.rows[0].full_name);
    console.log('   Email:', result.rows[0].email);
    console.log('   Role:', result.rows[0].role);
    console.log('\nYou can now log in at POST /api/auth/login\n');
  } catch (err) {
    if (err.code === '23505') {
      console.error('❌ An admin with this email already exists.');
    } else {
      console.error('❌ Error:', err.message);
    }
  } finally {
    pool.end();
    rl.close();
  }
}

main();
