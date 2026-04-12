const { test } = require('node:test');
const assert = require('node:assert');

const BASE_URL = 'http://localhost:3335';
const AUTH_HEADER = 'Basic ' + Buffer.from('admin:password123').toString('base64');

test('Server is protected with Basic Auth', async (t) => {
  await t.test('returns 401 when not authenticated', async () => {
    const res = await fetch(`${BASE_URL}/`);
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.headers.get('www-authenticate'), 'Basic realm="ProjectDashboard"');
  });

  await t.test('returns 200 for frontend when authenticated', async () => {
    const res = await fetch(`${BASE_URL}/`, {
      headers: { 'Authorization': AUTH_HEADER }
    });
    assert.strictEqual(res.status, 200);
    const text = await res.text();
    assert.ok(text.includes('<title>Project Dashboard</title>'));
  });

  await t.test('returns 200 for API when authenticated', async () => {
    const res = await fetch(`${BASE_URL}/api/projects`, {
      headers: { 'Authorization': AUTH_HEADER }
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data));
  });

  await t.test('can create and retrieve projects when authenticated', async () => {
    const projectName = 'Test Project ' + Date.now();
    
    // Create project
    const createRes = await fetch(`${BASE_URL}/api/projects`, {
      method: 'POST',
      headers: { 
        'Authorization': AUTH_HEADER,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name: projectName })
    });
    assert.strictEqual(createRes.status, 200);
    const project = await createRes.json();
    assert.strictEqual(project.name, projectName);

    // Get projects
    const listRes = await fetch(`${BASE_URL}/api/projects`, {
      headers: { 'Authorization': AUTH_HEADER }
    });
    const projects = await listRes.json();
    assert.ok(projects.some(p => p.name === projectName));
  });
});
