#!/usr/bin/env node

/**
 * Local deployment script for bt-studio to Cloudflare Pages
 * This script builds the app and deploys it using Wrangler CLI
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Local deployment of bt-studio to Cloudflare Pages...');

try {
  // Set working directory to monorepo root
  const rootDir = path.resolve(__dirname, '..');
  process.chdir(rootDir);
  
  // Check if wrangler is installed
  try {
    execSync('wrangler --version', { stdio: 'pipe' });
  } catch (error) {
    console.log('📦 Installing Wrangler CLI...');
    execSync('npm install -g wrangler', { stdio: 'inherit' });
  }
  
  // Build the application
  console.log('🔨 Building bt-studio...');
  execSync('node scripts/build-bt-studio.js', { stdio: 'inherit' });
  
  // Check if user is logged in to Cloudflare
  try {
    execSync('wrangler whoami', { stdio: 'pipe' });
  } catch (error) {
    console.log('🔐 Please login to Cloudflare first:');
    console.log('   wrangler login');
    process.exit(1);
  }
  
  // Deploy to Cloudflare Pages
  console.log('🌐 Deploying to Cloudflare Pages...');
  const distDir = path.join(rootDir, 'apps/bt-studio/dist');
  
  // Change to bt-studio directory for deployment
  process.chdir(path.join(rootDir, 'apps/bt-studio'));
  
  // Deploy using wrangler
  execSync('wrangler pages deploy dist --project-name bt-studio', { stdio: 'inherit' });
  
  console.log('✅ Deployment completed successfully!');
  console.log('🌍 Your app should be available at: https://bt-studio.pages.dev');
  
} catch (error) {
  console.error('❌ Deployment failed:', error.message);
  process.exit(1);
}
