const http = require('http');

async function testFlow() {
  console.log('1. Logging in...');
  const resLogin = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@bizzgrow.com', password: 'AdminPassword@123' })
  });
  const dataLogin = await resLogin.json();
  console.log('Login Response:', dataLogin);
  
  const cookiesStr = resLogin.headers.get('set-cookie');
  console.log('Cookies Received:', cookiesStr !== null);
  
  if (!cookiesStr) return;
  const cookieHeaders = cookiesStr.split(', sb-').map((c, i) => i === 0 ? c : 'sb-' + c).join('; ');

  console.log('\n2. Fetching /api/auth/me...');
  const resMe = await fetch('http://localhost:3000/api/auth/me', {
    headers: { 'Cookie': cookieHeaders }
  });
  const dataMe = await resMe.json();
  console.log('Me Response:', dataMe);

  console.log('\n3. Fetching /api/summary...');
  const resSum = await fetch('http://localhost:3000/api/summary', {
    headers: { 'Cookie': cookieHeaders }
  });
  const dataSumText = await resSum.text();
  try {
     console.log('Summary Response Base:', JSON.parse(dataSumText).role);
  } catch(e){
     console.log('Summary HTML/Error:', dataSumText.substring(0, 300));
  }
}
testFlow();
