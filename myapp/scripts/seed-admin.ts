import bcrypt from 'bcryptjs';
import pool from '../lib/db';
import * as readline from 'readline';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (q: string) => new Promise<string>((resolve) => rl.question(q, resolve));

async function seedAdmin() {
  console.log('\n🔑  Wrist Tracking — Admin Seed Script\n');
  console.log('This will create the admin account in your database.\n');

  const name = await question('Admin name     : ');
  const email = await question('Admin email    : ');
  const password = await question('Admin password : ');

  if (!name || !email || !password) {
    console.error('❌ All fields are required.');
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('❌ Password must be at least 8 characters.');
    process.exit(1);
  }

  rl.close();

  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
  if (existing.rows.length > 0) {
    // Update role to admin if exists
    await pool.query("UPDATE users SET role = 'admin', name = $1 WHERE email = $2", [name.trim(), email.toLowerCase()]);
    console.log('\n✅ Existing user updated to admin role!');
  } else {
    const hash = await bcrypt.hash(password, 12);
    await pool.query(
      "INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, 'admin')",
      [name.trim(), email.toLowerCase(), hash]
    );
    console.log('\n✅ Admin account created successfully!');
  }

  console.log(`   Email: ${email.toLowerCase()}`);
  console.log('   You can now log in at /login\n');
  await pool.end();
}

seedAdmin().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
