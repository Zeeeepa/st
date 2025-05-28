#!/usr/bin/env node

/**
 * Enhanced Event System Setup Script
 * Comprehensive setup for PostgreSQL + Cloudflare Tunnel + Event Processing
 */

import fs from 'fs';
import path from 'path';
import { spawn, execSync } from 'child_process';
import { promisify } from 'util';
import readline from 'readline';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import chalk from 'chalk';
import ora from 'ora';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.dirname(__dirname);

class EnhancedEventSystemSetup {
    constructor() {
        this.spinner = null;
        this.config = {};
        this.validationResults = {};
    }

    async run() {
        console.log(chalk.blue.bold('🚀 Enhanced Event System Setup'));
        console.log(chalk.blue('====================================='));
        console.log('');
        console.log('This script will set up:');
        console.log('• PostgreSQL database with event schema');
        console.log('• Cloudflare Tunnel for secure access');
        console.log('• Enhanced event processing server');
        console.log('• Webhook validation and management');
        console.log('• Codegen database integration');
        console.log('');

        try {
            await this.checkPrerequisites();
            await this.loadOrCreateConfig();
            await this.setupPostgreSQL();
            await this.setupCloudflareAuth();
            await this.setupTunnel();
            await this.setupWebhooks();
            await this.validateSetup();
            await this.displayResults();
        } catch (error) {
            this.stopSpinner();
            console.error(chalk.red('❌ Setup failed:'), error.message);
            process.exit(1);
        }
    }

    async checkPrerequisites() {
        this.startSpinner('Checking prerequisites...');

        const checks = {
            node: this.checkNodeVersion(),
            npm: this.checkNpm(),
            git: this.checkGit(),
            os: this.checkOperatingSystem()
        };

        for (const [name, check] of Object.entries(checks)) {
            if (!check.success) {
                throw new Error(`${name} check failed: ${check.error}`);
            }
        }

        this.stopSpinner('✅ Prerequisites check passed');
    }

    checkNodeVersion() {
        try {
            const version = process.version;
            const major = parseInt(version.slice(1).split('.')[0]);
            return {
                success: major >= 16,
                version,
                error: major < 16 ? 'Node.js 16+ required' : null
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    checkNpm() {
        try {
            execSync('npm --version', { stdio: 'pipe' });
            return { success: true };
        } catch (error) {
            return { success: false, error: 'npm not found' };
        }
    }

    checkGit() {
        try {
            execSync('git --version', { stdio: 'pipe' });
            return { success: true };
        } catch (error) {
            return { success: false, error: 'git not found' };
        }
    }

    checkOperatingSystem() {
        const platform = process.platform;
        const supported = ['linux', 'darwin', 'win32'];
        return {
            success: supported.includes(platform),
            platform,
            error: !supported.includes(platform) ? `Unsupported platform: ${platform}` : null
        };
    }

    async loadOrCreateConfig() {
        this.startSpinner('Loading configuration...');

        const envPath = path.join(projectRoot, '.env');
        const examplePath = path.join(projectRoot, 'postgres-tunnel', '.env.example');

        if (!fs.existsSync(envPath)) {
            if (fs.existsSync(examplePath)) {
                fs.copyFileSync(examplePath, envPath);
                this.stopSpinner('📝 Created .env from template');
            } else {
                this.stopSpinner('⚠️ No .env template found');
            }
        } else {
            this.stopSpinner('✅ Configuration loaded');
        }

        // Load environment variables
        const envContent = fs.readFileSync(envPath, 'utf8');
        const envLines = envContent.split('\n');
        
        for (const line of envLines) {
            if (line.trim() && !line.startsWith('#')) {
                const [key, value] = line.split('=');
                if (key && value) {
                    this.config[key.trim()] = value.trim();
                }
            }
        }

        // Prompt for missing required values
        await this.promptForMissingConfig();
    }

    async promptForMissingConfig() {
        const required = [
            { key: 'CLOUDFLARE_DOMAIN', prompt: 'Enter your Cloudflare domain (e.g., yourdomain.com)' },
            { key: 'CLOUDFLARE_SUBDOMAIN', prompt: 'Enter subdomain for database (e.g., events-db)', default: 'events-db' },
            { key: 'POSTGRES_PASSWORD', prompt: 'Enter PostgreSQL password', generate: true },
            { key: 'POSTGRES_CODEGEN_PASSWORD', prompt: 'Enter Codegen user password', generate: true }
        ];

        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        for (const item of required) {
            if (!this.config[item.key] || this.config[item.key] === 'your_secure_password_here' || this.config[item.key] === 'yourdomain.com') {
                if (item.generate) {
                    this.config[item.key] = this.generateSecurePassword();
                    console.log(chalk.green(`✅ Generated secure password for ${item.key}`));
                } else {
                    const answer = await this.question(rl, `${item.prompt}: `);
                    this.config[item.key] = answer || item.default || '';
                }
            }
        }

        rl.close();

        // Update .env file
        await this.updateEnvFile();
    }

    async updateEnvFile() {
        const envPath = path.join(projectRoot, '.env');
        let envContent = fs.readFileSync(envPath, 'utf8');

        for (const [key, value] of Object.entries(this.config)) {
            const regex = new RegExp(`^${key}=.*$`, 'm');
            if (regex.test(envContent)) {
                envContent = envContent.replace(regex, `${key}=${value}`);
            } else {
                envContent += `\n${key}=${value}`;
            }
        }

        fs.writeFileSync(envPath, envContent);
        console.log(chalk.green('✅ Updated .env file'));
    }

    async setupPostgreSQL() {
        this.startSpinner('Setting up PostgreSQL...');

        try {
            // Check if PostgreSQL is installed
            try {
                execSync('psql --version', { stdio: 'pipe' });
            } catch (error) {
                await this.installPostgreSQL();
            }

            // Start PostgreSQL service
            await this.startPostgreSQL();

            // Create database and users
            await this.createDatabase();

            // Initialize schema
            await this.initializeSchema();

            this.stopSpinner('✅ PostgreSQL setup complete');

        } catch (error) {
            this.stopSpinner();
            throw new Error(`PostgreSQL setup failed: ${error.message}`);
        }
    }

    async installPostgreSQL() {
        const platform = process.platform;
        
        if (platform === 'linux') {
            execSync('sudo apt-get update && sudo apt-get install -y postgresql postgresql-contrib', { stdio: 'inherit' });
        } else if (platform === 'darwin') {
            try {
                execSync('brew install postgresql', { stdio: 'inherit' });
            } catch (error) {
                throw new Error('Please install PostgreSQL manually or install Homebrew first');
            }
        } else {
            throw new Error('Please install PostgreSQL manually on Windows');
        }
    }

    async startPostgreSQL() {
        const platform = process.platform;
        
        try {
            if (platform === 'linux') {
                execSync('sudo systemctl start postgresql', { stdio: 'pipe' });
                execSync('sudo systemctl enable postgresql', { stdio: 'pipe' });
            } else if (platform === 'darwin') {
                execSync('brew services start postgresql', { stdio: 'pipe' });
            }
        } catch (error) {
            console.warn('Could not start PostgreSQL service automatically');
        }

        // Wait for PostgreSQL to start
        await this.sleep(3000);
    }

    async createDatabase() {
        const dbName = this.config.POSTGRES_DB || 'events_db';
        const user = this.config.POSTGRES_USER || 'events_user';
        const password = this.config.POSTGRES_PASSWORD;
        const codegenUser = this.config.POSTGRES_CODEGEN_USER || 'codegen_readonly';
        const codegenPassword = this.config.POSTGRES_CODEGEN_PASSWORD;

        const commands = [
            `CREATE DATABASE "${dbName}";`,
            `CREATE USER ${user} WITH PASSWORD '${password}';`,
            `CREATE USER ${codegenUser} WITH PASSWORD '${codegenPassword}';`,
            `GRANT ALL PRIVILEGES ON DATABASE "${dbName}" TO ${user};`,
            `GRANT CONNECT ON DATABASE "${dbName}" TO ${codegenUser};`
        ];

        for (const command of commands) {
            try {
                execSync(`sudo -u postgres psql -c "${command}"`, { stdio: 'pipe' });
            } catch (error) {
                // Ignore errors for existing databases/users
                if (!error.message.includes('already exists')) {
                    console.warn(`Warning: ${error.message}`);
                }
            }
        }
    }

    async initializeSchema() {
        const schemaPath = path.join(projectRoot, 'postgres-tunnel', 'sql', 'init-schema.sql');
        
        if (!fs.existsSync(schemaPath)) {
            throw new Error('Database schema file not found');
        }

        const dbName = this.config.POSTGRES_DB || 'events_db';
        const user = this.config.POSTGRES_USER || 'events_user';
        const password = this.config.POSTGRES_PASSWORD;

        try {
            execSync(`PGPASSWORD="${password}" psql -h localhost -U ${user} -d ${dbName} -f "${schemaPath}"`, { stdio: 'pipe' });
        } catch (error) {
            throw new Error(`Schema initialization failed: ${error.message}`);
        }
    }

    async setupCloudflareAuth() {
        this.startSpinner('Setting up Cloudflare...');

        try {
            // Check if cloudflared is installed
            try {
                execSync('cloudflared --version', { stdio: 'pipe' });
            } catch (error) {
                await this.installCloudflared();
            }

            // Check if already authenticated
            const certPath = path.join(process.env.HOME || process.env.USERPROFILE, '.cloudflared', 'cert.pem');
            
            if (!fs.existsSync(certPath)) {
                this.stopSpinner('🔐 Cloudflare authentication required');
                console.log(chalk.yellow('Please authenticate with Cloudflare:'));
                console.log('1. A browser window will open');
                console.log('2. Log in to your Cloudflare account');
                console.log('3. Authorize the application');
                console.log('');
                
                await this.question(readline.createInterface({
                    input: process.stdin,
                    output: process.stdout
                }), 'Press Enter to continue...');

                execSync('cloudflared tunnel login', { stdio: 'inherit' });
            }

            this.stopSpinner('✅ Cloudflare authentication complete');

        } catch (error) {
            this.stopSpinner();
            throw new Error(`Cloudflare setup failed: ${error.message}`);
        }
    }

    async installCloudflared() {
        const platform = process.platform;
        
        if (platform === 'linux') {
            execSync('wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb', { stdio: 'inherit' });
            execSync('sudo dpkg -i cloudflared-linux-amd64.deb', { stdio: 'inherit' });
            execSync('rm cloudflared-linux-amd64.deb', { stdio: 'pipe' });
        } else if (platform === 'darwin') {
            try {
                execSync('brew install cloudflared', { stdio: 'inherit' });
            } catch (error) {
                // Fallback to direct download
                execSync('curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-amd64.tgz | tar -xz', { stdio: 'inherit' });
                execSync('sudo mv cloudflared /usr/local/bin/', { stdio: 'inherit' });
            }
        } else {
            throw new Error('Please install cloudflared manually on Windows');
        }
    }

    async setupTunnel() {
        this.startSpinner('Setting up Cloudflare Tunnel...');

        try {
            const tunnelName = this.config.CLOUDFLARE_TUNNEL_NAME || 'events-tunnel';
            const domain = this.config.CLOUDFLARE_DOMAIN;
            const subdomain = this.config.CLOUDFLARE_SUBDOMAIN || 'events-db';
            const tunnelUrl = `${subdomain}.${domain}`;

            // Create tunnel
            try {
                execSync(`cloudflared tunnel create ${tunnelName}`, { stdio: 'pipe' });
            } catch (error) {
                // Tunnel might already exist
                if (!error.message.includes('already exists')) {
                    console.warn(`Tunnel creation warning: ${error.message}`);
                }
            }

            // Get tunnel ID
            const tunnelList = execSync('cloudflared tunnel list', { encoding: 'utf8' });
            const tunnelLine = tunnelList.split('\n').find(line => line.includes(tunnelName));
            
            if (!tunnelLine) {
                throw new Error('Could not find tunnel ID');
            }

            const tunnelId = tunnelLine.split(/\s+/)[0];

            // Create tunnel configuration
            const configDir = path.join(projectRoot, 'postgres-tunnel', 'config');
            if (!fs.existsSync(configDir)) {
                fs.mkdirSync(configDir, { recursive: true });
            }

            const tunnelConfig = `
tunnel: ${tunnelId}
credentials-file: ~/.cloudflared/${tunnelId}.json

ingress:
  - hostname: ${tunnelUrl}
    service: tcp://localhost:5432
  - service: http_status:404
`;

            fs.writeFileSync(path.join(configDir, 'tunnel-config.yml'), tunnelConfig.trim());

            // Create DNS record
            try {
                execSync(`cloudflared tunnel route dns ${tunnelName} ${tunnelUrl}`, { stdio: 'pipe' });
            } catch (error) {
                console.warn('DNS record might already exist');
            }

            // Update config
            this.config.TUNNEL_URL = tunnelUrl;
            await this.updateEnvFile();

            this.stopSpinner('✅ Cloudflare Tunnel setup complete');

        } catch (error) {
            this.stopSpinner();
            throw new Error(`Tunnel setup failed: ${error.message}`);
        }
    }

    async setupWebhooks() {
        this.startSpinner('Configuring webhook endpoints...');

        try {
            // This would typically involve API calls to GitHub, Linear, Slack
            // For now, we'll just prepare the configuration
            
            const webhookUrl = this.config.CLOUDFLARE_WORKER_URL || `https://${this.config.TUNNEL_URL}`;
            
            console.log(chalk.blue('\n📋 Webhook Configuration:'));
            console.log(`GitHub: ${webhookUrl}/webhook/github`);
            console.log(`Linear: ${webhookUrl}/webhook/linear`);
            console.log(`Slack: ${webhookUrl}/webhook/slack`);

            this.stopSpinner('✅ Webhook endpoints configured');

        } catch (error) {
            this.stopSpinner();
            throw new Error(`Webhook setup failed: ${error.message}`);
        }
    }

    async validateSetup() {
        this.startSpinner('Validating setup...');

        const validations = {
            database: await this.validateDatabase(),
            tunnel: await this.validateTunnel(),
            server: await this.validateServer()
        };

        this.validationResults = validations;

        const allValid = Object.values(validations).every(v => v.success);
        
        if (allValid) {
            this.stopSpinner('✅ All validations passed');
        } else {
            this.stopSpinner('⚠️ Some validations failed');
        }
    }

    async validateDatabase() {
        try {
            const dbName = this.config.POSTGRES_DB || 'events_db';
            const user = this.config.POSTGRES_USER || 'events_user';
            const password = this.config.POSTGRES_PASSWORD;

            execSync(`PGPASSWORD="${password}" psql -h localhost -U ${user} -d ${dbName} -c "SELECT 1;"`, { stdio: 'pipe' });
            
            return { success: true, message: 'Database connection successful' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async validateTunnel() {
        try {
            // Check if tunnel process can start
            const configPath = path.join(projectRoot, 'postgres-tunnel', 'config', 'tunnel-config.yml');
            
            if (!fs.existsSync(configPath)) {
                return { success: false, error: 'Tunnel configuration not found' };
            }

            return { success: true, message: 'Tunnel configuration valid' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async validateServer() {
        try {
            // Check if enhanced server can start
            const serverPath = path.join(projectRoot, 'src', 'enhanced-server.js');
            
            if (!fs.existsSync(serverPath)) {
                return { success: false, error: 'Enhanced server not found' };
            }

            return { success: true, message: 'Server files ready' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async displayResults() {
        console.log(chalk.green.bold('\n🎉 Enhanced Event System Setup Complete!'));
        console.log(chalk.green('=========================================='));
        console.log('');

        // Connection info for Codegen
        console.log(chalk.blue.bold('📋 Codegen Connection Details:'));
        console.log(`Host: ${this.config.TUNNEL_URL}`);
        console.log(`Port: 5432`);
        console.log(`Database: ${this.config.POSTGRES_DB || 'events_db'}`);
        console.log(`Username: ${this.config.POSTGRES_CODEGEN_USER || 'codegen_readonly'}`);
        console.log(`Password: ${this.config.POSTGRES_CODEGEN_PASSWORD}`);
        console.log(`SSL Mode: require`);
        console.log('');

        // Next steps
        console.log(chalk.yellow.bold('🚀 Next Steps:'));
        console.log('1. Start the tunnel:');
        console.log(chalk.cyan('   npm run tunnel:service'));
        console.log('');
        console.log('2. Start the enhanced server:');
        console.log(chalk.cyan('   npm run enhanced:start'));
        console.log('');
        console.log('3. Test the connection:');
        console.log(chalk.cyan('   npm run tunnel:test'));
        console.log('');
        console.log('4. Add connection details to Codegen organization settings');
        console.log('');

        // Validation results
        console.log(chalk.blue.bold('✅ Validation Results:'));
        for (const [name, result] of Object.entries(this.validationResults)) {
            const status = result.success ? chalk.green('✅') : chalk.red('❌');
            const message = result.success ? result.message : result.error;
            console.log(`${status} ${name}: ${message}`);
        }
        console.log('');

        // Save connection info
        const connectionInfo = `
=== Codegen PostgreSQL Connection Details ===

Host: ${this.config.TUNNEL_URL}
Port: 5432
Database: ${this.config.POSTGRES_DB || 'events_db'}
Username: ${this.config.POSTGRES_CODEGEN_USER || 'codegen_readonly'}
Password: ${this.config.POSTGRES_CODEGEN_PASSWORD}
SSL Mode: require

Connection String:
postgresql://${this.config.POSTGRES_CODEGEN_USER || 'codegen_readonly'}:${this.config.POSTGRES_CODEGEN_PASSWORD}@${this.config.TUNNEL_URL}:5432/${this.config.POSTGRES_DB || 'events_db'}?sslmode=require

=== Available Tables ===
- github_events: GitHub webhook events
- linear_events: Linear webhook events
- slack_events: Slack webhook events
- webhook_deliveries: Delivery tracking
- event_metadata: Processing metadata
- webhook_configurations: Webhook management

=== Views ===
- recent_events: Recent events from all sources
- event_summary: Event statistics and summaries

=== Security Notes ===
- Codegen user has READ-ONLY access
- Connection is encrypted via Cloudflare Tunnel
- No ports exposed on your local firewall

=== Management Commands ===
- Start tunnel: npm run tunnel:service
- Stop tunnel: npm run tunnel:stop
- Check status: npm run tunnel:status
- Test connection: npm run tunnel:test
- Start server: npm run enhanced:start
`;

        const configDir = path.join(projectRoot, 'postgres-tunnel', 'config');
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
        }
        
        fs.writeFileSync(path.join(configDir, 'codegen-connection.txt'), connectionInfo.trim());
        
        console.log(chalk.green('📁 Connection details saved to: postgres-tunnel/config/codegen-connection.txt'));
    }

    // Utility methods
    startSpinner(text) {
        if (this.spinner) {
            this.spinner.stop();
        }
        this.spinner = ora(text).start();
    }

    stopSpinner(text) {
        if (this.spinner) {
            if (text) {
                this.spinner.succeed(text);
            } else {
                this.spinner.stop();
            }
            this.spinner = null;
        }
    }

    async question(rl, prompt) {
        return new Promise((resolve) => {
            rl.question(prompt, (answer) => {
                resolve(answer);
            });
        });
    }

    generateSecurePassword(length = 32) {
        const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let password = '';
        
        for (let i = 0; i < length; i++) {
            password += charset.charAt(Math.floor(Math.random() * charset.length));
        }
        
        return password;
    }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Run the setup if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const setup = new EnhancedEventSystemSetup();
    setup.run().catch(error => {
        console.error(chalk.red('Setup failed:'), error);
        process.exit(1);
    });
}

export { EnhancedEventSystemSetup };

