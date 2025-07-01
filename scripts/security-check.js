#!/usr/bin/env node

/**
 * Security Check Script for Needle in the Haystack Test
 * Run this before committing to GitHub to ensure no sensitive data is exposed
 */

const fs = require('fs');
const path = require('path');

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

class SecurityChecker {
  constructor() {
    this.issues = [];
    this.warnings = [];
    this.passed = [];
  }

  log(message, color = RESET) {
    console.log(`${color}${message}${RESET}`);
  }

  addIssue(message) {
    this.issues.push(message);
    this.log(`❌ CRITICAL: ${message}`, RED);
  }

  addWarning(message) {
    this.warnings.push(message);
    this.log(`⚠️  WARNING: ${message}`, YELLOW);
  }

  addPassed(message) {
    this.passed.push(message);
    this.log(`✅ ${message}`, GREEN);
  }

  checkFileExists(filepath, shouldExist = true) {
    const exists = fs.existsSync(filepath);
    if (shouldExist && !exists) {
      this.addIssue(`Missing file: ${filepath}`);
    } else if (!shouldExist && exists) {
      this.addIssue(`File should not exist: ${filepath}`);
    } else if (shouldExist && exists) {
      this.addPassed(`Required file exists: ${filepath}`);
    } else {
      this.addPassed(`Sensitive file properly excluded: ${filepath}`);
    }
    return exists;
  }

  checkFileContent(filepath, patterns, description) {
    if (!fs.existsSync(filepath)) {
      return;
    }

    const content = fs.readFileSync(filepath, 'utf8');
    
    for (const pattern of patterns) {
      const regex = new RegExp(pattern, 'gi');
      const matches = content.match(regex);
      
      if (matches) {
        this.addIssue(`${description} found in ${filepath}: ${matches.length} matches`);
        matches.forEach(match => {
          this.log(`  Found: ${match.substring(0, 20)}...`, RED);
        });
      }
    }
  }

  checkGitIgnore() {
    this.log('\n📋 Checking .gitignore...', BLUE);
    
    if (!this.checkFileExists('.gitignore')) {
      return;
    }

    const gitignore = fs.readFileSync('.gitignore', 'utf8');
    const requiredEntries = [
      '.env',
      '.env.local',
      'api_keys.json',
      'node_modules/',
      '*.key',
      '*.pem'
    ];

    for (const entry of requiredEntries) {
      if (gitignore.includes(entry)) {
        this.addPassed(`Gitignore includes: ${entry}`);
      } else {
        this.addIssue(`Missing from .gitignore: ${entry}`);
      }
    }
  }

  checkSensitiveFiles() {
    this.log('\n🔒 Checking for sensitive files...', BLUE);
    
    const sensitiveFiles = [
      'server/.env',
      'server/api_keys.json',
      'client/.env',
      '.env',
      'api_keys.json',
      'secrets.json'
    ];

    for (const file of sensitiveFiles) {
      this.checkFileExists(file, false);
    }
  }

  checkForHardcodedSecrets() {
    this.log('\n🔍 Scanning for hardcoded API keys...', BLUE);
    
    const patterns = [
      'sk-[a-zA-Z0-9]{48}',      // OpenAI keys
      'AIza[a-zA-Z0-9]{35}',     // Google keys
      'sk-ant-[a-zA-Z0-9-]{95}' // Anthropic keys
    ];

    const filesToCheck = [
      'server/index.js',
      'client/src/App.tsx',
      'README.md'
    ];

    for (const file of filesToCheck) {
      this.checkFileContent(file, patterns, 'Hardcoded API key');
    }
  }

  checkSecurityFiles() {
    this.log('\n📄 Checking security documentation...', BLUE);
    
    this.checkFileExists('SECURITY.md');
    this.checkFileExists('server/env.example');
    
    if (fs.existsSync('README.md')) {
      const readme = fs.readFileSync('README.md', 'utf8');
      if (readme.includes('SECURITY') || readme.includes('Security')) {
        this.addPassed('README includes security information');
      } else {
        this.addWarning('README should include security section');
      }
    }
  }

  checkPackageJsonSecrets() {
    this.log('\n📦 Checking package.json files...', BLUE);
    
    const packageFiles = ['package.json', 'server/package.json', 'client/package.json'];
    
    for (const file of packageFiles) {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');
        if (content.includes('sk-') || content.includes('AIza') || content.includes('sk-ant-')) {
          this.addIssue(`Potential API key in ${file}`);
        } else {
          this.addPassed(`${file} clean`);
        }
      }
    }
  }

  checkGitHistory() {
    this.log('\n📝 Git history recommendations...', BLUE);
    
    this.addWarning('Remember to check git history for accidentally committed secrets');
    this.addWarning('If you find secrets in history, use git filter-branch to clean them');
    this.log('   Command: git log --all --grep="sk-" --grep="AIza" --grep="sk-ant-"', YELLOW);
  }

  generateReport() {
    this.log('\n' + '='.repeat(60), BLUE);
    this.log('🔒 SECURITY CHECK REPORT', BLUE);
    this.log('='.repeat(60), BLUE);

    this.log(`\n✅ Passed checks: ${this.passed.length}`, GREEN);
    this.log(`⚠️  Warnings: ${this.warnings.length}`, YELLOW);
    this.log(`❌ Critical issues: ${this.issues.length}`, RED);

    if (this.issues.length > 0) {
      this.log('\n🚨 CRITICAL ISSUES TO FIX:', RED);
      this.issues.forEach(issue => this.log(`  • ${issue}`, RED));
    }

    if (this.warnings.length > 0) {
      this.log('\n⚠️  WARNINGS TO REVIEW:', YELLOW);
      this.warnings.forEach(warning => this.log(`  • ${warning}`, YELLOW));
    }

    this.log('\n📋 FINAL SECURITY CHECKLIST:', BLUE);
    this.log('  [ ] No .env files committed', this.issues.length === 0 ? GREEN : RED);
    this.log('  [ ] No api_keys.json files committed', GREEN);
    this.log('  [ ] No hardcoded API keys in source code', GREEN);
    this.log('  [ ] .gitignore includes sensitive files', GREEN);
    this.log('  [ ] Security documentation provided', GREEN);
    this.log('  [ ] Git history checked for secrets', YELLOW);

    if (this.issues.length === 0) {
      this.log('\n🎉 READY FOR GITHUB! All critical security checks passed.', GREEN);
      this.log('📚 Don\'t forget to read SECURITY.md before sharing your repository.', BLUE);
    } else {
      this.log('\n🛑 NOT READY FOR GITHUB! Please fix critical issues above.', RED);
      this.log('💡 Run this script again after making fixes.', YELLOW);
    }

    return this.issues.length === 0;
  }

  run() {
    this.log('🔒 Running Security Check for Needle in the Haystack Test...', BLUE);
    this.log('This script will check for common security issues before GitHub upload.\n');

    this.checkGitIgnore();
    this.checkSensitiveFiles();
    this.checkForHardcodedSecrets();
    this.checkSecurityFiles();
    this.checkPackageJsonSecrets();
    this.checkGitHistory();

    const isSecure = this.generateReport();
    
    process.exit(isSecure ? 0 : 1);
  }
}

// Run the security check
const checker = new SecurityChecker();
checker.run(); 