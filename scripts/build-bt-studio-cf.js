#!/usr/bin/env node

/**
 * Cloudflare Pages specific build script for bt-studio
 * This script handles the monorepo build process for Cloudflare Pages environment
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Building bt-studio for Cloudflare Pages...');

try {
  // Set working directory to monorepo root
  const rootDir = process.cwd();
  console.log(`Working directory: ${rootDir}`);
  
  // Disable Nx Cloud to avoid authorization issues
  process.env.NX_CLOUD_DISTRIBUTED_EXECUTION = 'false';
  process.env.NX_CLOUD_ACCESS_TOKEN = '';
  process.env.NX_SKIP_NX_CACHE = 'true';
  
  console.log('🔨 Building bt-studio and its dependencies...');
  // Use the full project name and skip cache
  execSync('npx nx build @bt-toolkit/bt-studio --skip-nx-cache', { 
    stdio: 'inherit',
    env: {
      ...process.env,
      NX_CLOUD_DISTRIBUTED_EXECUTION: 'false',
      NX_CLOUD_ACCESS_TOKEN: '',
      NX_SKIP_NX_CACHE: 'true'
    }
  });
  
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
  
  // List the contents of the dist directory
  console.log('📂 Build output contents:');
  const distContents = fs.readdirSync(distDir);
  distContents.forEach(item => {
    const itemPath = path.join(distDir, item);
    const stats = fs.statSync(itemPath);
    const type = stats.isDirectory() ? 'DIR' : 'FILE';
    const size = stats.isFile() ? `(${Math.round(stats.size / 1024)}KB)` : '';
    console.log(`   ${type}: ${item} ${size}`);
  });
  
} catch (error) {
  console.error('❌ Build failed:', error.message);
  console.error('Error details:', error);
  process.exit(1);
}
