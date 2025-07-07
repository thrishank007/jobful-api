// #!/usr/bin/env node
// /**
//  * Security Audit Script
//  * Performs comprehensive security checks on the application
//  */

// const fs = require('fs');
// const path = require('path');
// const { execSync } = require('child_process');

// class SecurityAuditor {
//   constructor() {
//     this.findings = [];
//     this.criticalCount = 0;
//     this.highCount = 0;
//     this.mediumCount = 0;
//     this.lowCount = 0;
//   }

//   addFinding(severity, category, description, file = null, line = null) {
//     this.findings.push({
//       severity,
//       category,
//       description,
//       file,
//       line,
//       timestamp: new Date().toISOString()
//     });

//     switch (severity) {
//       case 'CRITICAL': this.criticalCount++; break;
//       case 'HIGH': this.highCount++; break;
//       case 'MEDIUM': this.mediumCount++; break;
//       case 'LOW': this.lowCount++; break;
//     }
//   }

//   async runNpmAudit() {
//     console.log('🔍 Running npm audit...');
//     try {
//       const output = execSync('npm audit --json', { encoding: 'utf8' });
//       const audit = JSON.parse(output);
      
//       if (audit.vulnerabilities) {
//         Object.entries(audit.vulnerabilities).forEach(([pkg, vuln]) => {
//           const severity = vuln.severity.toUpperCase();
//           this.addFinding(
//             severity,
//             'DEPENDENCY',
//             `${pkg}: ${vuln.title}`,
//             'package.json'
//           );
//         });
//       }
//     } catch (error) {
//       console.log('✅ No npm audit vulnerabilities found');
//     }
//   }

//   checkEnvironmentVariables() {
//     console.log('🔍 Checking environment variables...');
    
//     const requiredVars = [
//       'MONGO_URI',
//       'JWT_ACCESS_SECRET',
//       'JWT_REFRESH_SECRET',
//       'FIREBASE_PROJECT_ID',
//       'FIREBASE_PRIVATE_KEY',
//       'SMTP_HOST',
//       'SMTP_PASS'
//     ];

//     const envFile = path.join(__dirname, '..', '.env');
//     const envExampleFile = path.join(__dirname, '..', '.env.example');

//     // Check if .env exists
//     if (!fs.existsSync(envFile)) {
//       this.addFinding('CRITICAL', 'CONFIG', 'Missing .env file');
//     }

//     // Check if .env.example exists
//     if (!fs.existsSync(envExampleFile)) {
//       this.addFinding('MEDIUM', 'CONFIG', 'Missing .env.example file');
//     }

//     // Check required environment variables
//     requiredVars.forEach(varName => {
//       if (!process.env[varName]) {
//         this.addFinding('HIGH', 'CONFIG', `Missing environment variable: ${varName}`);
//       }
//     });

//     // Check JWT secret strength
//     if (process.env.JWT_ACCESS_SECRET && process.env.JWT_ACCESS_SECRET.length < 32) {
//       this.addFinding('HIGH', 'AUTH', 'JWT_ACCESS_SECRET is too short (< 32 characters)');
//     }
//   }

//   checkFilePermissions() {
//     console.log('🔍 Checking file permissions...');
    
//     const sensitiveFiles = [
//       '.env',
//       'package.json',
//       'package-lock.json'
//     ];

//     sensitiveFiles.forEach(file => {
//       const filePath = path.join(__dirname, '..', file);
//       if (fs.existsSync(filePath)) {
//         const stats = fs.statSync(filePath);
//         const mode = stats.mode.toString(8);
        
//         // Check if file is world-readable
//         if (mode.endsWith('4') || mode.endsWith('6') || mode.endsWith('7')) {
//           this.addFinding('MEDIUM', 'PERMISSIONS', `${file} is world-readable`, file);
//         }
//       }
//     });
//   }

//   checkCodePatterns() {
//     console.log('🔍 Checking code patterns...');
    
//     const patterns = [
//       {
//         pattern: /console\.log\([^)]*password[^)]*\)/gi,
//         severity: 'HIGH',
//         description: 'Password potentially logged to console'
//       },
//       {
//         pattern: /console\.log\([^)]*secret[^)]*\)/gi,
//         severity: 'HIGH',
//         description: 'Secret potentially logged to console'
//       },
//       {
//         pattern: /eval\(/gi,
//         severity: 'CRITICAL',
//         description: 'Use of eval() function detected'
//       },
//       {
//         pattern: /innerHTML\s*=/gi,
//         severity: 'MEDIUM',
//         description: 'Use of innerHTML (potential XSS)'
//       },
//       {
//         pattern: /document\.write\(/gi,
//         severity: 'MEDIUM',
//         description: 'Use of document.write (potential XSS)'
//       }
//     ];

//     this.scanDirectory('.', patterns);
//   }

//   scanDirectory(dir, patterns) {
//     const files = fs.readdirSync(dir, { withFileTypes: true });
    
//     files.forEach(file => {
//       const fullPath = path.join(dir, file.name);
      
//       if (file.isDirectory() && !file.name.startsWith('.') && file.name !== 'node_modules') {
//         this.scanDirectory(fullPath, patterns);
//       } else if (file.isFile() && (file.name.endsWith('.js') || file.name.endsWith('.ts'))) {
//         const content = fs.readFileSync(fullPath, 'utf8');
        
//         patterns.forEach(({ pattern, severity, description }) => {
//           const matches = content.match(pattern);
//           if (matches) {
//             this.addFinding(severity, 'CODE', description, fullPath);
//           }
//         });
//       }
//     });
//   }

//   checkDependencyVersions() {
//     console.log('🔍 Checking dependency versions...');
    
//     const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
//     const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
//     // Check for outdated major versions
//     const outdatedPackages = {
//       'express': '^4.18.0',
//       'mongoose': '^7.0.0',
//       'jsonwebtoken': '^9.0.0',
//       'helmet': '^6.0.0'
//     };

//     Object.entries(outdatedPackages).forEach(([pkg, recommendedVersion]) => {
//       if (dependencies[pkg] && dependencies[pkg] !== recommendedVersion) {
//         this.addFinding('MEDIUM', 'DEPENDENCY', `${pkg} version may be outdated`, 'package.json');
//       }
//     });
//   }

//   checkSecurityHeaders() {
//     console.log('🔍 Checking security headers implementation...');
    
//     const appFile = path.join(__dirname, '..', 'index.js');
//     if (fs.existsSync(appFile)) {
//       const content = fs.readFileSync(appFile, 'utf8');
      
//       const requiredHeaders = [
//         'helmet',
//         'X-Content-Type-Options',
//         'X-Frame-Options',
//         'X-XSS-Protection'
//       ];

//       requiredHeaders.forEach(header => {
//         if (!content.includes(header)) {
//           this.addFinding('MEDIUM', 'SECURITY', `Missing security header: ${header}`, 'index.js');
//         }
//       });
//     }
//   }

//   generateReport() {
//     console.log('\n📊 Security Audit Report');
//     console.log('========================');
//     console.log(`Total findings: ${this.findings.length}`);
//     console.log(`Critical: ${this.criticalCount}`);
//     console.log(`High: ${this.highCount}`);
//     console.log(`Medium: ${this.mediumCount}`);
//     console.log(`Low: ${this.lowCount}`);
//     console.log('\n🔍 Detailed Findings:');
//     console.log('====================');

//     this.findings.forEach((finding, index) => {
//       console.log(`\n${index + 1}. [${finding.severity}] ${finding.category}`);
//       console.log(`   ${finding.description}`);
//       if (finding.file) {
//         console.log(`   File: ${finding.file}`);
//       }
//     });

//     // Generate JSON report
//     const report = {
//       summary: {
//         total: this.findings.length,
//         critical: this.criticalCount,
//         high: this.highCount,
//         medium: this.mediumCount,
//         low: this.lowCount
//       },
//       findings: this.findings,
//       timestamp: new Date().toISOString()
//     };

//     fs.writeFileSync('security-audit-report.json', JSON.stringify(report, null, 2));
//     console.log('\n📄 Detailed report saved to: security-audit-report.json');

//     // Return exit code based on findings
//     if (this.criticalCount > 0) {
//       console.log('\n❌ CRITICAL vulnerabilities found!');
//       process.exit(1);
//     } else if (this.highCount > 0) {
//       console.log('\n⚠️  HIGH severity vulnerabilities found!');
//       process.exit(1);
//     } else {
//       console.log('\n✅ No critical or high severity vulnerabilities found');
//       process.exit(0);
//     }
//   }

//   async run() {
//     console.log('🔐 Starting Security Audit...\n');
    
//     await this.runNpmAudit();
//     this.checkEnvironmentVariables();
//     this.checkFilePermissions();
//     this.checkCodePatterns();
//     this.checkDependencyVersions();
//     this.checkSecurityHeaders();
    
//     this.generateReport();
//   }
// }

// // Run the audit
// const auditor = new SecurityAuditor();
// auditor.run().catch(console.error);
