# BT Studio - Cloudflare Pages Deployment Guide

This guide explains how to deploy the BT Studio app to Cloudflare Pages from this Nx monorepo.

## 🚀 Quick Deployment

### Option 1: Automatic Deployment (Recommended)

1. **Connect your repository to Cloudflare Pages:**
   - Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → Pages
   - Click "Create a project" → "Connect to Git"
   - Select your repository and authorize Cloudflare

2. **Configure build settings:**
   ```
   Framework preset: None
   Build command: pnpm build:bt-studio
   Build output directory: apps/bt-studio/dist
   Root directory: (leave empty - uses repo root)
   ```

3. **Set environment variables:**
   ```
   NODE_ENV=production
   VITE_APP_NAME=BT Studio
   VITE_APP_VERSION=1.0.0
   ```

4. **Deploy:**
   - Click "Save and Deploy"
   - Cloudflare will automatically build and deploy your app

### Option 2: Manual Deployment with Wrangler CLI

1. **Install Wrangler CLI:**
   ```bash
   npm install -g wrangler
   ```

2. **Login to Cloudflare:**
   ```bash
   wrangler login
   ```

3. **Build the application:**
   ```bash
   pnpm build:bt-studio
   ```

4. **Deploy to Cloudflare Pages:**
   ```bash
   cd apps/bt-studio
   wrangler pages deploy dist --project-name bt-studio
   ```

## 📁 Project Structure

```
bt-toolkit/
├── apps/bt-studio/
│   ├── dist/                 # Build output (created after build)
│   ├── src/                  # Source code
│   ├── _headers              # Cloudflare Pages headers
│   ├── _redirects            # SPA routing redirects
│   ├── wrangler.toml         # Cloudflare configuration
│   └── vite.config.ts        # Vite build configuration
├── scripts/
│   └── build-bt-studio.js    # Custom build script for monorepo
└── package.json              # Root package.json with build:bt-studio script
```

## 🔧 Configuration Files

### `wrangler.toml`
Cloudflare Pages configuration with build settings and environment variables.

### `_headers`
HTTP headers for security and caching:
- Security headers (X-Frame-Options, CSP, etc.)
- Cache control for static assets
- No-cache for HTML files

### `_redirects`
SPA routing configuration:
- Redirects all non-file requests to `index.html` for client-side routing

### `scripts/build-bt-studio.js`
Custom build script that:
- Installs dependencies with `pnpm`
- Builds the app using Nx
- Copies Cloudflare configuration files to dist

## 🌍 Environment Variables

Set these in your Cloudflare Pages project settings:

| Variable | Value | Description |
|----------|-------|-------------|
| `NODE_ENV` | `production` | Node environment |
| `VITE_APP_NAME` | `BT Studio` | Application name |
| `VITE_APP_VERSION` | `1.0.0` | Application version |

## 🔄 Continuous Deployment

### GitHub Actions (Recommended)
We've set up automated deployment using GitHub Actions:

**Automatic Deployment:**
- File: `.github/workflows/deploy-bt-studio.yml`
- Triggers on push to `main`/`master` branch
- Creates preview deployments for pull requests
- Only runs when bt-studio or related files change

**Manual Deployment:**
- File: `.github/workflows/manual-deploy-bt-studio.yml`
- Manually trigger from GitHub Actions tab
- Choose between `preview` and `production` environments
- Optional version tagging

**Required Secrets:**
Set these in your GitHub repository settings → Secrets and variables → Actions:
```
CLOUDFLARE_API_TOKEN=your_cloudflare_api_token
CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id
```

### Cloudflare Pages Direct Integration
Alternative to GitHub Actions:
- **Production branch:** `main` or `master`
- **Preview branches:** All other branches
- **Build command:** `pnpm build:bt-studio`
- **Output directory:** `apps/bt-studio/dist`

## 🛠️ Local Development

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Start development server:**
   ```bash
   npx nx serve @bt-toolkit/bt-studio
   ```

3. **Build locally:**
   ```bash
   pnpm build:bt-studio
   ```

4. **Deploy locally:**
   ```bash
   pnpm deploy:bt-studio
   ```

5. **Preview build:**
   ```bash
   cd apps/bt-studio/dist
   npx http-server -p 3000
   ```

## 🐛 Troubleshooting

### Build Issues

**Problem:** Build fails with dependency errors
```bash
# Solution: Clear cache and reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

**Problem:** Nx build fails
```bash
# Solution: Build dependencies first
npx nx build @bt-toolkit/bt-studio --skip-nx-cache
```

### Deployment Issues

**Problem:** 404 errors on page refresh
- **Cause:** Missing SPA routing configuration
- **Solution:** Ensure `_redirects` file is in the dist folder

**Problem:** Assets not loading
- **Cause:** Incorrect base path
- **Solution:** Check `vite.config.ts` base configuration

### Runtime Issues

**Problem:** Environment variables not working
- **Cause:** Variables not prefixed with `VITE_`
- **Solution:** Prefix client-side variables with `VITE_`

**Problem:** CORS errors
- **Cause:** Missing headers configuration
- **Solution:** Check `_headers` file configuration

## 📊 Performance Optimization

### Build Optimization
- **Tree shaking:** Enabled by default in Vite
- **Code splitting:** Automatic for dynamic imports
- **Asset optimization:** Images and fonts are optimized

### Caching Strategy
- **Static assets:** 1 year cache with immutable flag
- **HTML files:** No cache to ensure updates
- **API responses:** Configure based on data freshness needs

### Monitoring
- Use Cloudflare Analytics to monitor:
  - Page load times
  - Error rates
  - Traffic patterns
  - Core Web Vitals

## 🔒 Security

### Headers
- **X-Frame-Options:** Prevents clickjacking
- **X-Content-Type-Options:** Prevents MIME sniffing
- **Referrer-Policy:** Controls referrer information
- **Permissions-Policy:** Restricts browser features

### Content Security Policy (CSP)
Consider adding CSP headers for additional security:
```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'
```

## 📈 Scaling

### CDN Benefits
Cloudflare Pages provides:
- Global CDN with 200+ locations
- Automatic HTTPS
- DDoS protection
- Edge caching

### Performance Features
- **Brotli compression:** Automatic
- **HTTP/2 & HTTP/3:** Enabled by default
- **Edge computing:** Available with Cloudflare Workers

## 🆘 Support

### Resources
- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)
- [Vite Documentation](https://vitejs.dev/)
- [Nx Documentation](https://nx.dev/)

### Common Commands
```bash
# Build for production
pnpm build:bt-studio

# Deploy locally with Wrangler
pnpm deploy:bt-studio

# Deploy manually with Wrangler
wrangler pages deploy apps/bt-studio/dist --project-name bt-studio

# Check build output
ls -la apps/bt-studio/dist/

# Test locally
cd apps/bt-studio/dist && npx http-server

# Login to Cloudflare (first time only)
wrangler login

# Check Cloudflare account
wrangler whoami
```
