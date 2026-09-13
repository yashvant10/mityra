const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log("==========================================");
console.log("🚀 MITYRA - Surge Deployment Wizard");
console.log("==========================================\n");

rl.question('What is your EC2 Public IP or Domain? (e.g. 54.12.34.56 or my-api.com): ', (apiHost) => {
  if (!apiHost) {
    console.error('❌ You must provide an API host.');
    process.exit(1);
  }

  const cleanHost = apiHost.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const apiUrl = `http://${cleanHost}:5001/api`;
  const tryonUrl = `http://${cleanHost}:8000`;

  console.log(`\n⚙️  Setting Node.js API URL to: ${apiUrl}`);
  console.log(`⚙️  Setting CatVTON API URL to: ${tryonUrl}`);

  const envPath = path.join(__dirname, 'frontend', '.env.local');
  let envContent = fs.readFileSync(envPath, 'utf8');
  
  // Replace or add NEXT_PUBLIC_API_URL
  if (envContent.includes('NEXT_PUBLIC_API_URL=')) {
    envContent = envContent.replace(/NEXT_PUBLIC_API_URL=.*/g, `NEXT_PUBLIC_API_URL=${apiUrl}`);
  } else {
    envContent += `\nNEXT_PUBLIC_API_URL=${apiUrl}`;
  }

  // Replace or add NEXT_PUBLIC_TRYON_BACKEND_URL
  if (envContent.includes('NEXT_PUBLIC_TRYON_BACKEND_URL=')) {
    envContent = envContent.replace(/NEXT_PUBLIC_TRYON_BACKEND_URL=.*/g, `NEXT_PUBLIC_TRYON_BACKEND_URL=${tryonUrl}`);
  } else {
    envContent += `\nNEXT_PUBLIC_TRYON_BACKEND_URL=${tryonUrl}`;
  }
  fs.writeFileSync(envPath, envContent);

  console.log('✅ Updated frontend/.env.local');
  
  console.log('\n📦 Building Frontend (Static Export)...');
  try {
    execSync('npm run build', { cwd: path.join(__dirname, 'frontend'), stdio: 'inherit' });
  } catch (e) {
    console.error('❌ Build failed. Please check errors above.');
    process.exit(1);
  }

  console.log('\n🚀 Deploying to Surge...');
  const surgeDomain = `ant-ai-v2-${Date.now()}.surge.sh`;
  try {
    // We execute npx surge inside frontend/out
    console.log(`Command: npx surge ./out ${surgeDomain}`);
    execSync(`npx surge ./out ${surgeDomain}`, { cwd: path.join(__dirname, 'frontend'), stdio: 'inherit' });
    console.log('\n🎉 SUCCESS! Your frontend is live at: https://' + surgeDomain);
    console.log('⚠️  Make sure your EC2 instance allows inbound traffic on port 5001!');
  } catch (e) {
    console.error('❌ Surge deployment failed. You might need to login first using: cd frontend && npx surge login');
  }

  rl.close();
});
