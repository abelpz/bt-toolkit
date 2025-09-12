#!/usr/bin/env node

/**
 * Build script for bt-studio deployment to Cloudflare Pages
 * This script handles the monorepo build process and prepares the dist folder
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Building bt-studio for Cloudflare Pages deployment...');

try {
  // Set working directory to monorepo root
  const rootDir = path.resolve(__dirname, '..');
  process.chdir(rootDir);
  
  console.log('📦 Installing dependencies...');
  // Use --no-frozen-lockfile for development, --frozen-lockfile for CI
  const installCommand = process.env.CI ? 'pnpm install --frozen-lockfile' : 'pnpm install';
  execSync(installCommand, { stdio: 'inherit' });
  
  console.log('🔨 Building bt-studio and its dependencies...');
  execSync('npx nx build @bt-toolkit/bt-studio', { stdio: 'inherit' });
  
  // Copy Cloudflare Pages configuration files to dist
  const distDir = path.join(rootDir, 'apps/bt-studio/dist');
  const appDir = path.join(rootDir, 'apps/bt-studio');
  
  console.log('📋 Copying Cloudflare Pages configuration files...');
  
  // Copy _headers file
  const headersSource = path.join(appDir, '_headers');
  const headersTarget = path.join(distDir, '_headers');
  if (fs.existsSync(headersSource)) {
    fs.copyFileSync(headersSource, headersTarget);
    console.log('✅ Copied _headers');
  }
  
  // Copy _redirects file
  const redirectsSource = path.join(appDir, '_redirects');
  const redirectsTarget = path.join(distDir, '_redirects');
  if (fs.existsSync(redirectsSource)) {
    fs.copyFileSync(redirectsSource, redirectsTarget);
    console.log('✅ Copied _redirects');
  }
  
  console.log('✅ Build completed successfully!');
  console.log(`📁 Build output: ${distDir}`);
  
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}
