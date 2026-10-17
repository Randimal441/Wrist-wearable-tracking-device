import bcrypt from 'bcryptjs';
import pool from '../lib/db';

async function seedAdmin() {
  const name = 'Admin';
  const email = 'admin@gmail.com';
  const password = 'admin1234';

  console.log('\n🔑  Wrist Tracking — Admin Seed Script\n');

  const hash = await bcrypt.hash(password, 12);

  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length > 0) {
    await pool.query(
      "UPDATE users SET role = 'admin', name = $1, password_hash = $2 WHERE email = $3",
      [name, hash, email]
    );
    console.log('✅ Existing user updated to admin role!');
  } else {
    await pool.query(
      "INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, 'admin')",
      [name, email, hash]
    );
    console.log('✅ Admin account created successfully!');
  }

  console.log(`   Email   : ${email}`);
  console.log(`   Password: admin1234`);
  console.log('   Login at: http://localhost:3000/login\n');
  await pool.end();
}

seedAdmin().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
