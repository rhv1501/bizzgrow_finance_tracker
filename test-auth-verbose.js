const http = require('http');

async function testFlow() {
  console.log('1. Logging in...');
  const resLogin = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@bizzgrow.com', password: 'AdminPassword@123' })
  });
  const dataLogin = await resLogin.json();
  console.log('Login Response:', JSON.stringify(dataLogin, null, 2));
  
  const cookiesStr = resLogin.headers.get('set-cookie');
  console.log('Cookies Received:', cookiesStr !== null);
  
  if (!cookiesStr) return;
  // Properly handle multiple Set-Cookie headers for fetch in Node (might need special handling depending on node version)
  // In Node 18+, res.headers.getSetCookie() exists.
  let cookieHeaders = "";
  if (resLogin.headers.getSetCookie) {
     cookieHeaders = resLogin.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');
  } else {
     cookieHeaders = cookiesStr.split(',').map(c => c.trim().split(';')[0]).join('; ');
  }
  console.log('Processed Cookie String:', cookieHeaders.substring(0, 50) + '...');

  console.log('\n2. Fetching /api/auth/me...');
  const resMe = await fetch('http://localhost:3000/api/auth/me', {
    headers: { 'Cookie': cookieHeaders }
  });
  const dataMe = await resMe.json();
  console.log('Me Response:', JSON.stringify(dataMe, null, 2));

  console.log('\n3. Fetching /api/summary...');
  const resSum = await fetch('http://localhost:3000/api/summary', {
    headers: { 'Cookie': cookieHeaders }
  });
  console.log('Summary Status:', resSum.status);
  const dataSumText = await resSum.text();
  try {
     console.log('Summary JSON:', JSON.stringify(JSON.parse(dataSumText), null, 2));
  } catch(e){
     console.log('Summary Body (Non-JSON):', dataSumText.substring(0, 500));
  }
}
testFlow();
