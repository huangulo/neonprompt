const { test } = require('node:test');
const assert = require('node:assert');

const BASE_URL = 'http://localhost:3335';
const USERNAME = 'lechauve';
const PASSWORD = 'calvito911#';

test('E2E Dashboard Flow', async (t) => {
  let cookieHeader = '';

  await t.test('Login with valid credentials', async () => {
    const res = await fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `username=${USERNAME}&password=${encodeURIComponent(PASSWORD)}`
    });
    assert.strictEqual(res.status, 200);
    const setCookie = res.headers.get('set-cookie');
    assert.ok(setCookie, 'Should receive a session cookie');
    cookieHeader = setCookie.split(';')[0];
  });

  await t.test('Access dashboard after login', async () => {
    const res = await fetch(`${BASE_URL}/`, {
      headers: { 'Cookie': cookieHeader }
    });
    assert.strictEqual(res.status, 200);
    const text = await res.text();
    assert.ok(text.includes('<title>Project Dashboard</title>'));
    assert.ok(text.includes('class="header"'));
  });

  await t.test('API Interaction: Create Project', async () => {
    const projectName = 'E2E Project ' + Date.now();
    const res = await fetch(`${BASE_URL}/api/projects`, {
      method: 'POST',
      headers: { 
        'Cookie': cookieHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name: projectName })
    });
    assert.strictEqual(res.status, 200);
    const project = await res.json();
    assert.strictEqual(project.name, projectName);
    
    // Verify it appears in the list
    const listRes = await fetch(`${BASE_URL}/api/projects`, {
      headers: { 'Cookie': cookieHeader }
    });
    const projects = await listRes.json();
    assert.ok(projects.some(p => p.name === projectName));
  });

  await t.test('Logout', async () => {
    const res = await fetch(`${BASE_URL}/logout`, {
      headers: { 'Cookie': cookieHeader },
      redirect: 'manual'
    });
    assert.strictEqual(res.status, 302);
    assert.ok(res.headers.get('location').includes('/login'));
  });
});
