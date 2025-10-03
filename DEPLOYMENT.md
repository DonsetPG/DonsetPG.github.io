# GitHub Pages Deployment Guide

This project is configured to work with GitHub Pages (github.io domains).

## Deployment Steps

1. **Push your code to GitHub**
   - Connect your Lovable project to GitHub (if not already connected)
   - Your code will automatically sync to your GitHub repository

2. **Enable GitHub Pages**
   - Go to your repository settings on GitHub
   - Navigate to "Pages" in the left sidebar
   - Under "Source", select "GitHub Actions" (recommended) or "Deploy from a branch"
   - If using branch deployment, select the `main` branch and `/ (root)` folder
   - Click Save

3. **Build and Deploy**

   **Option A: Using GitHub Actions (Recommended)**
   
   Create `.github/workflows/deploy.yml`:
   ```yaml
   name: Deploy to GitHub Pages

   on:
     push:
       branches: [ main ]
     workflow_dispatch:

   permissions:
     contents: read
     pages: write
     id-token: write

   jobs:
     build:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: actions/setup-node@v4
           with:
             node-version: '20'
         - run: npm ci
         - run: npm run build
         - uses: actions/upload-pages-artifact@v3
           with:
             path: ./dist

     deploy:
       needs: build
       runs-on: ubuntu-latest
       environment:
         name: github-pages
         url: ${{ steps.deployment.outputs.page_url }}
       steps:
         - uses: actions/deploy-pages@v4
           id: deployment
   ```

   **Option B: Manual Deployment**
   ```bash
   npm run build
   # Then manually upload the dist folder to GitHub Pages
   ```

4. **Access your site**
   - Your site will be available at: `https://your-username.github.io/your-repo-name/`
   - For hash routing, URLs will be: `https://your-username.github.io/your-repo-name/#/blog`

## Technical Details

### Hash Routing
This project uses HashRouter instead of BrowserRouter to ensure compatibility with GitHub Pages. This means:
- URLs use the `#` symbol: `domain.com/#/blog` instead of `domain.com/blog`
- No server configuration needed for client-side routing
- All routes work correctly when accessed directly

### Asset Handling
- The `.nojekyll` file in the public directory ensures Jekyll doesn't process the site
- All assets are bundled correctly by Vite
- Image imports work as ES6 modules from `src/assets/`

## Custom Domain (Optional)

To use a custom domain:
1. Add a `CNAME` file to the `public` directory with your domain
2. Configure DNS settings at your domain registrar
3. Enable "Enforce HTTPS" in GitHub Pages settings

Example `public/CNAME`:
```
blog.yourdomain.com
```

## Troubleshooting

**Issue**: Page shows 404 after refresh
- **Solution**: This is normal with GitHub Pages. Hash routing (#/) prevents this issue.

**Issue**: Assets not loading
- **Solution**: Ensure all asset imports use ES6 imports, not direct URLs.

**Issue**: Build fails
- **Solution**: Run `npm ci` and `npm run build` locally first to verify the build works.
