const fs = require('fs');

async function syncLiveSite() {
  const websiteBaseUrl = 'https://www.nenotechnology.com';

  console.log('1. Authenticating with live website...');
  const authRes = await fetch(websiteBaseUrl + '/api/admin/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'mitpatel@nenotechnology.com', password: 'mitlalo' })
  });

  if (!authRes.ok) {
    console.error('Auth failed:', authRes.status, await authRes.text());
    return;
  }

  const authData = await authRes.json();
  const token = authData.token;
  const cookie = 'neno-admin-session=' + token;
  console.log('Authenticated successfully! Token acquired.');

  console.log('\n2. Fetching existing live blogs on nenotechnology.com...');
  const liveRes = await fetch(websiteBaseUrl + '/api/admin/blogs', {
    headers: { 'Cookie': cookie }
  });
  const liveBlogs = await liveRes.json();
  console.log(`Found ${liveBlogs.length} blogs currently on the live site:`);
  liveBlogs.forEach((b, i) => {
    console.log(`  [${i+1}] ${b.id} | ${b.title}`);
  });

  console.log('\n3. Fetching local Content Studio blogs...');
  const localRes = await fetch('http://localhost:3001/api/admin/blogs?status=all', {
    headers: {
      'Cookie': 'ai_studio_session=dev-mock-session'
    }
  });

  // Let's also fetch from memory/db via Content Studio endpoint
  const localBlogs = await (await fetch('http://localhost:3001/api/blogs?limit=50')).json();
  console.log(`Local Content Studio has ${localBlogs.total || localBlogs.items?.length} blogs.`);
}

syncLiveSite().catch(console.error);
