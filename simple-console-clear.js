// Simple console script - Copy and paste this into your console
console.log('🧹 Clearing port 8081...');

// Kill processes on port 8081 (Windows)
if (typeof require !== 'undefined') {
  const { execSync } = require('child_process');
  try {
    execSync('netstat -ano | findstr :8081', (error, stdout) => {
      if (stdout) {
        const lines = stdout.toString().split('\n');
        lines.forEach(line => {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 5) {
            const pid = parts[4];
            if (pid && pid !== '0') {
              try {
                execSync(`taskkill /PID ${pid} /F`);
                console.log(`✅ Killed process ${pid}`);
              } catch (e) {
                console.log(`⚠️  Could not kill ${pid}`);
              }
            }
          }
        });
      }
    });
  } catch (e) {
    console.log('✅ No processes on port 8081');
  }
}

// Clear browser data
if (typeof localStorage !== 'undefined') {
  localStorage.clear();
  console.log('✅ localStorage cleared');
}

if (typeof sessionStorage !== 'undefined') {
  sessionStorage.clear();
  console.log('✅ sessionStorage cleared');
}

// Clear cookies
if (typeof document !== 'undefined') {
  document.cookie.split(";").forEach(cookie => {
    const eqPos = cookie.indexOf("=");
    const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
    document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
  });
  console.log('✅ Cookies cleared');
}

console.log('🎉 Port 8081 cleared!');
