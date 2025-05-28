// scripts/system-validator.js - System Requirements Validator
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { promisify } from 'util';
import chalk from 'chalk';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class SystemValidator {
  constructor() {
    this.results = {
      nodejs: { status: 'unknown', version: null, message: '' },
      npm: { status: 'unknown', version: null, message: '' },
      postgresql: { status: 'unknown', version: null, message: '', port: null },
      project: { status: 'unknown', message: '' },
      dependencies: { status: 'unknown', message: '' },
      environment: { status: 'unknown', message: '' }
    };
  }

  async runCommand(command, options = {}) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, { 
        shell: true, 
        stdio: 'pipe',
        timeout: 10000,
        ...options 
      });
      
      let stdout = '';
      let stderr = '';
      
      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });
      
      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });
      
      child.on('close', (code) => {
        resolve({ stdout, stderr, code });
      });
      
      child.on('error', (error) => {
        reject(error);
      });
    });
  }

  async validateNodeJS() {
    try {
      const version = process.version;
      const majorVersion = parseInt(version.slice(1).split('.')[0]);
      
      if (majorVersion >= 16) {
        this.results.nodejs = {
          status: 'success',
          version: version,
          message: `Node.js ${version} is supported`
        };
      } else {
        this.results.nodejs = {
          status: 'error',
          version: version,
          message: `Node.js ${version} is not supported. Please upgrade to Node.js 16 or higher.`
        };
      }
    } catch (error) {
      this.results.nodejs = {
        status: 'error',
        version: null,
        message: `Failed to check Node.js version: ${error.message}`
      };
    }
  }

  async validateNPM() {
    try {
      const { stdout, code } = await this.runCommand('npm --version');
      
      if (code === 0) {
        const version = stdout.trim();
        this.results.npm = {
          status: 'success',
          version: version,
          message: `npm ${version} is available`
        };
      } else {
        this.results.npm = {
          status: 'error',
          version: null,
          message: 'npm is not available or not working properly'
        };
      }
    } catch (error) {
      this.results.npm = {
        status: 'error',
        version: null,
        message: `Failed to check npm: ${error.message}`
      };
    }
  }

  async validatePostgreSQL() {
    try {
      // Check if PostgreSQL is installed and running
      let postgresFound = false;
      let version = null;
      let port = null;
      
      // Try different methods based on platform
      if (process.platform === 'win32') {
        // Windows: Check service
        try {
          const { stdout } = await this.runCommand('powershell "Get-Service postgresql*"');
          if (stdout.includes('Running')) {
            postgresFound = true;
            
            // Try to get version
            try {
              const { stdout: versionOut } = await this.runCommand('psql --version');
              const versionMatch = versionOut.match(/psql \\(PostgreSQL\\) ([\\d\\.]+)/);
              if (versionMatch) {
                version = versionMatch[1];
              }
            } catch (error) {
              // Version check failed, but service is running
            }
            
            // Try to detect port
            try {
              const { stdout: netstat } = await this.runCommand('netstat -an | findstr :5432');
              if (netstat.includes('5432')) {
                port = 5432;
              }
            } catch (error) {
              try {
                const { stdout: netstat } = await this.runCommand('netstat -an | findstr :5433');
                if (netstat.includes('5433')) {
                  port = 5433;
                }
              } catch (error) {
                // Port detection failed
              }
            }
          }
        } catch (error) {
          // Service check failed
        }
      } else {
        // Unix-like systems
        try {
          const { stdout, code } = await this.runCommand('which psql');
          if (code === 0) {
            postgresFound = true;
            
            // Try to get version
            try {
              const { stdout: versionOut } = await this.runCommand('psql --version');
              const versionMatch = versionOut.match(/psql \\(PostgreSQL\\) ([\\d\\.]+)/);
              if (versionMatch) {
                version = versionMatch[1];
              }
            } catch (error) {
              // Version check failed
            }
            
            // Check if service is running
            try {
              await this.runCommand('systemctl is-active postgresql');
              port = 5432; // Default port
            } catch (error) {
              // Service check failed
            }
          }
        } catch (error) {
          // psql not found
        }
      }
      
      if (postgresFound) {
        this.results.postgresql = {
          status: 'success',
          version: version,
          port: port,
          message: `PostgreSQL ${version || 'detected'} is available${port ? ` on port ${port}` : ''}`
        };
      } else {
        this.results.postgresql = {
          status: 'warning',
          version: null,
          port: null,
          message: 'PostgreSQL not detected. Installation may be required.'
        };
      }
    } catch (error) {
      this.results.postgresql = {
        status: 'error',
        version: null,
        port: null,
        message: `Failed to check PostgreSQL: ${error.message}`
      };
    }
  }

  async validateProject() {
    try {
      const projectRoot = path.join(__dirname, '..');
      
      // Check package.json
      const packageJsonPath = path.join(projectRoot, 'package.json');
      if (!fs.existsSync(packageJsonPath)) {
        this.results.project = {
          status: 'error',
          message: 'package.json not found. Please run from project root directory.'
        };
        return;
      }
      
      // Check src directory
      const srcPath = path.join(projectRoot, 'src');
      if (!fs.existsSync(srcPath)) {
        this.results.project = {
          status: 'error',
          message: 'src directory not found. Project structure is invalid.'
        };
        return;
      }
      
      // Check main server file
      const serverPath = path.join(srcPath, 'server.js');
      if (!fs.existsSync(serverPath)) {
        this.results.project = {
          status: 'error',
          message: 'src/server.js not found. Project structure is invalid.'
        };
        return;
      }
      
      this.results.project = {
        status: 'success',
        message: 'Project structure is valid'
      };
    } catch (error) {
      this.results.project = {
        status: 'error',
        message: `Failed to validate project: ${error.message}`
      };
    }
  }

  async validateDependencies() {
    try {
      const projectRoot = path.join(__dirname, '..');
      const nodeModulesPath = path.join(projectRoot, 'node_modules');
      
      if (!fs.existsSync(nodeModulesPath)) {
        this.results.dependencies = {
          status: 'warning',
          message: 'Dependencies not installed. Run "npm install" first.'
        };
        return;
      }
      
      // Check key dependencies
      const keyDependencies = ['express', 'pg', 'chalk'];
      const missingDeps = [];
      
      for (const dep of keyDependencies) {
        const depPath = path.join(nodeModulesPath, dep);
        if (!fs.existsSync(depPath)) {
          missingDeps.push(dep);
        }
      }
      
      if (missingDeps.length > 0) {
        this.results.dependencies = {
          status: 'warning',
          message: `Missing dependencies: ${missingDeps.join(', ')}. Run "npm install".`
        };
      } else {
        this.results.dependencies = {
          status: 'success',
          message: 'All key dependencies are installed'
        };
      }
    } catch (error) {
      this.results.dependencies = {
        status: 'error',
        message: `Failed to validate dependencies: ${error.message}`
      };
    }
  }

  async validateEnvironment() {
    try {
      const envPath = path.join(__dirname, '..', '.env');
      
      if (!fs.existsSync(envPath)) {
        this.results.environment = {
          status: 'warning',
          message: '.env file not found. Environment setup required.'
        };
        return;
      }
      
      // Check if .env has required variables
      const envContent = fs.readFileSync(envPath, 'utf8');
      const requiredVars = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
      const missingVars = [];
      
      for (const varName of requiredVars) {
        if (!envContent.includes(`${varName}=`)) {
          missingVars.push(varName);
        }
      }
      
      if (missingVars.length > 0) {
        this.results.environment = {
          status: 'warning',
          message: `Missing environment variables: ${missingVars.join(', ')}`
        };
      } else {
        this.results.environment = {
          status: 'success',
          message: 'Environment configuration found'
        };
      }
    } catch (error) {
      this.results.environment = {
        status: 'error',
        message: `Failed to validate environment: ${error.message}`
      };
    }
  }

  async validateAll() {
    console.log(chalk.blue('🔍 System Validation'));
    console.log(chalk.gray('Checking system requirements and configuration...\n'));
    
    await this.validateNodeJS();
    await this.validateNPM();
    await this.validatePostgreSQL();
    await this.validateProject();
    await this.validateDependencies();
    await this.validateEnvironment();
    
    return this.results;
  }

  printResults() {
    console.log(chalk.blue('\n📊 Validation Results'));
    console.log('='.repeat(50));
    
    for (const [category, result] of Object.entries(this.results)) {
      const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
      let statusIcon = '';
      let statusColor = chalk.gray;
      
      switch (result.status) {
        case 'success':
          statusIcon = '✅';
          statusColor = chalk.green;
          break;
        case 'warning':
          statusIcon = '⚠️';
          statusColor = chalk.yellow;
          break;
        case 'error':
          statusIcon = '❌';
          statusColor = chalk.red;
          break;
        default:
          statusIcon = '❓';
          statusColor = chalk.gray;
      }
      
      console.log(`${statusIcon} ${statusColor(categoryName)}: ${result.message}`);
      
      if (result.version) {
        console.log(chalk.gray(`   Version: ${result.version}`));
      }
      
      if (result.port) {
        console.log(chalk.gray(`   Port: ${result.port}`));
      }
    }
    
    console.log('');
  }

  getRecommendations() {
    const recommendations = [];
    
    for (const [category, result] of Object.entries(this.results)) {
      if (result.status === 'error' || result.status === 'warning') {
        switch (category) {
          case 'nodejs':
            if (result.status === 'error') {
              recommendations.push({
                priority: 'high',
                action: 'Install or upgrade Node.js',
                description: 'Download from https://nodejs.org/ (version 16 or higher required)'
              });
            }
            break;
            
          case 'npm':
            if (result.status === 'error') {
              recommendations.push({
                priority: 'high',
                action: 'Install npm',
                description: 'npm usually comes with Node.js. Reinstall Node.js if needed.'
              });
            }
            break;
            
          case 'postgresql':
            if (result.status === 'warning' || result.status === 'error') {
              recommendations.push({
                priority: 'high',
                action: 'Install PostgreSQL',
                description: 'Download from https://www.postgresql.org/download/ or use package manager'
              });
            }
            break;
            
          case 'dependencies':
            if (result.status === 'warning') {
              recommendations.push({
                priority: 'medium',
                action: 'Install dependencies',
                description: 'Run: npm install'
              });
            }
            break;
            
          case 'environment':
            if (result.status === 'warning') {
              recommendations.push({
                priority: 'medium',
                action: 'Setup environment',
                description: 'Run: npm run dev (interactive setup) or npm run setup:env'
              });
            }
            break;
        }
      }
    }
    
    return recommendations;
  }

  printRecommendations() {
    const recommendations = this.getRecommendations();
    
    if (recommendations.length === 0) {
      console.log(chalk.green('🎉 All validations passed! System is ready.'));
      return;
    }
    
    console.log(chalk.yellow('💡 Recommendations'));
    console.log('='.repeat(50));
    
    const highPriority = recommendations.filter(r => r.priority === 'high');
    const mediumPriority = recommendations.filter(r => r.priority === 'medium');
    
    if (highPriority.length > 0) {
      console.log(chalk.red('🔴 High Priority:'));
      highPriority.forEach((rec, index) => {
        console.log(chalk.red(`${index + 1}. ${rec.action}`));
        console.log(chalk.gray(`   ${rec.description}`));
      });
      console.log('');
    }
    
    if (mediumPriority.length > 0) {
      console.log(chalk.yellow('🟡 Medium Priority:'));
      mediumPriority.forEach((rec, index) => {
        console.log(chalk.yellow(`${index + 1}. ${rec.action}`));
        console.log(chalk.gray(`   ${rec.description}`));
      });
      console.log('');
    }
  }

  isSystemReady() {
    const criticalChecks = ['nodejs', 'npm', 'project'];
    return criticalChecks.every(check => this.results[check].status === 'success');
  }
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const validator = new SystemValidator();
  
  validator.validateAll().then(() => {
    validator.printResults();
    validator.printRecommendations();
    
    if (validator.isSystemReady()) {
      console.log(chalk.green('\n✅ System is ready for development!'));
      console.log(chalk.gray('Run "npm run dev" to start interactive setup.'));
    } else {
      console.log(chalk.red('\n❌ System is not ready. Please address the issues above.'));
      process.exit(1);
    }
  }).catch(error => {
    console.error(chalk.red('Validation failed:'), error.message);
    process.exit(1);
  });
}

export { SystemValidator };

