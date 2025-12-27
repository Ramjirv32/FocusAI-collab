const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

console.log('\n🚀 Setting up Focusia...\n');

// 1. Create config directory
const configDir = path.join(os.homedir(), '.focusia');
if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
    console.log('✅ Created config directory:', configDir);
} else {
    console.log('✅ Config directory exists:', configDir);
}

// 2. Check Docker
console.log('\n🐳 Checking Docker installation...');
try {
    const dockerVersion = execSync('docker --version', { encoding: 'utf8' });
    console.log('✅ Docker is installed:', dockerVersion.trim());
} catch (error) {
    console.error('\n❌ Docker is not installed!');
    console.error('   Please install Docker first:');
    console.error('   - Windows/Mac: https://www.docker.com/products/docker-desktop');
    console.error('   - Linux: https://docs.docker.com/engine/install/');
    process.exit(1);
}

// 3. Check Docker Compose
try {
    const composeVersion = execSync('docker-compose --version', { encoding: 'utf8' });
    console.log('✅ Docker Compose is installed:', composeVersion.trim());
} catch (error) {
    console.error('\n❌ Docker Compose is not installed!');
    console.error('   Please install Docker Compose:');
    console.error('   https://docs.docker.com/compose/install/');
    process.exit(1);
}

// 4. Check if Docker daemon is running
console.log('\n🔍 Checking Docker daemon...');
try {
    execSync('docker ps', { stdio: 'ignore' });
    console.log('✅ Docker daemon is running');
} catch (error) {
    console.error('\n⚠️  Docker daemon is not running!');
    console.error('   Please start Docker Desktop or Docker service');
    console.error('   Then run: pnpm start');
    process.exit(1);
}

// 5. Build Docker images (optional, will build on first run if skipped)
console.log('\n📦 Building Docker images (this may take a few minutes)...');
try {
    execSync('docker-compose build --no-cache', { stdio: 'inherit', cwd: __dirname });
    console.log('\n✅ Docker images built successfully');
} catch (error) {
    console.error('\n⚠️  Failed to build images, will build on first run');
}

// 6. Create default config if doesn't exist
const configFile = path.join(configDir, 'config.json');
if (!fs.existsSync(configFile)) {
    const defaultConfig = {
        GROQ_API_KEY: '',
        API_BASE_URL: 'http://localhost:5001',
        MONGODB_URI: 'mongodb://localhost:27018/focusai',
        updatedAt: new Date().toISOString()
    };
    fs.writeFileSync(configFile, JSON.stringify(defaultConfig, null, 2));
    console.log('\n✅ Created default config file');
}

console.log('\n' + '='.repeat(60));
console.log('✅ Setup complete!');
console.log('='.repeat(60));
console.log('\n📝 Next steps:');
console.log('   1. Run: pnpm start');
console.log('   2. Configure your Groq API key in the settings window');
console.log('   3. Start tracking your productivity!\n');
console.log('💡 Tip: Get your Groq API key from: https://console.groq.com/keys\n');
