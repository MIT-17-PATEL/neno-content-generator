const { Pool } = require('pg');

async function checkDbs() {
  const nenoPool = new Pool({
    connectionString: 'postgresql://postgres:Mit%4017082004@localhost:5432/NenoDB'
  });
  try {
    const res = await nenoPool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    console.log('Tables in NenoDB:', res.rows.map(r => r.table_name));

    if (res.rows.some(r => r.table_name === 'blogs' || r.table_name === 'blog')) {
      const blogsRes = await nenoPool.query("SELECT id, title, slug, status FROM blogs LIMIT 5");
      console.log('Blogs in NenoDB:', blogsRes.rows);
    }
  } catch (err) {
    console.log('NenoDB query err:', err.message);
  } finally {
    await nenoPool.end();
  }
}

checkDbs();
