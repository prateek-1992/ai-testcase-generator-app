# Deployment Guide

This guide covers various hosting options for the Test Case Generator application.

## 🚀 Recommended Hosting Options

### 1. Vercel (Recommended - Easiest)

**Best for**: Quick deployment, zero-config Next.js hosting

**Pros**:
- Made by Next.js creators - perfect integration
- Free tier with generous limits
- Automatic deployments from GitHub
- Edge network for fast global access
- Built-in CI/CD
- Simple deployment process

**Cons**:
- Serverless functions have timeout limits (10s on free tier, 60s on Pro)
- May need Pro plan for longer LLM requests

**Setup Steps**:

1. **Push to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/testcase-generator.git
   git push -u origin main
   ```

2. **Deploy to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Sign up with GitHub
   - Click "New Project"
   - Import your repository
   - Vercel auto-detects Next.js settings
   - Click "Deploy"

3. **Deploy**:
   - No environment variables needed - this app uses BYOK (Bring Your Own Key) model
   - Users enter API keys directly in the browser UI

**Pricing**: Free tier available, Pro starts at $20/month

**Note**: For longer LLM requests, you may need to upgrade to Pro plan ($20/month) which allows 60s function timeouts.

---

### 2. Railway

**Best for**: Full-stack apps, longer-running processes

**Pros**:
- Generous free tier ($5 credit/month)
- Easy deployment from GitHub
- Supports longer function timeouts
- Simple deployment process
- Good for development and production

**Cons**:
- Less Next.js-specific optimizations than Vercel
- May cost more at scale

**Setup Steps**:

1. **Push to GitHub** (same as above)

2. **Deploy to Railway**:
   - Go to [railway.app](https://railway.app)
   - Sign up with GitHub
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your repository
   - Railway auto-detects Next.js
   - Deploy! (No environment variables needed - BYOK model)

**Pricing**: $5 free credit/month, then pay-as-you-go (~$5-10/month for small apps)

---

### 3. Render

**Best for**: Simple deployments, good free tier

**Pros**:
- Free tier available (with limitations)
- Easy GitHub integration
- Automatic SSL
- Good documentation

**Cons**:
- Free tier spins down after inactivity (cold starts)
- Limited function timeout on free tier

**Setup Steps**:

1. **Push to GitHub**

2. **Deploy to Render**:
   - Go to [render.com](https://render.com)
   - Sign up with GitHub
   - Click "New" → "Web Service"
   - Connect your repository
   - Settings:
     - **Build Command**: `npm install && npm run build`
     - **Start Command**: `npm start`
     - **Environment**: Node
   - Deploy! (No environment variables needed - BYOK model)

**Pricing**: Free tier (with limitations), paid plans start at $7/month

---

### 4. Netlify

**Best for**: JAMstack apps, good free tier

**Pros**:
- Excellent free tier
- Easy GitHub integration
- Great for static + serverless functions
- Edge functions support

**Cons**:
- Next.js support is good but Vercel is more optimized
- Function timeout limits (10s free, 26s paid)

**Setup Steps**:

1. **Push to GitHub**

2. **Deploy to Netlify**:
   - Go to [netlify.com](https://netlify.com)
   - Sign up with GitHub
   - Click "Add new site" → "Import an existing project"
   - Connect repository
   - Build settings:
     - **Build command**: `npm run build`
     - **Publish directory**: `.next`
   - Deploy!

**Pricing**: Free tier available, Pro starts at $19/month

---

### 5. Self-Hosted (VPS)

**Best for**: Full control, cost-effective at scale

**Options**: DigitalOcean, Linode, AWS EC2, Hetzner

**Pros**:
- Full control over environment
- No timeout limits
- Can run Ollama on same server
- Cost-effective for high traffic

**Cons**:
- Requires server management
- Need to set up SSL, monitoring, etc.
- More complex setup

**Setup Steps** (DigitalOcean example):

1. **Create Droplet**:
   - Ubuntu 22.04 LTS
   - Minimum 2GB RAM (4GB+ recommended for Ollama)

2. **Install Dependencies**:
   ```bash
   # SSH into server
   ssh root@your-server-ip

   # Update system
   apt update && apt upgrade -y

   # Install Node.js 18+
   curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
   apt install -y nodejs

   # Install PM2 (process manager)
   npm install -g pm2

   # Install Nginx (reverse proxy)
   apt install -y nginx

   # Install Certbot (SSL)
   apt install -y certbot python3-certbot-nginx
   ```

3. **Deploy Application**:
   ```bash
   # Clone repository
   git clone https://github.com/yourusername/testcase-generator.git
   cd testcase-generator

   # Install dependencies
   npm install

   # Build application
   npm run build

   # Start with PM2
   pm2 start npm --name "testcase-generator" -- start
   pm2 save
   pm2 startup
   ```

4. **Configure Nginx**:
   ```nginx
   # /etc/nginx/sites-available/testcase-generator
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

5. **Enable SSL**:
   ```bash
   ln -s /etc/nginx/sites-available/testcase-generator /etc/nginx/sites-enabled/
   nginx -t
   systemctl restart nginx
   certbot --nginx -d your-domain.com
   ```

**Pricing**: $6-12/month for basic VPS

---

## 🔧 Important Configuration for Hosting

### Update `next.config.js` for Production

Your current config should work, but you may want to add:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  // Add if deploying to platforms that need it
  output: 'standalone', // For Docker/self-hosted
}

module.exports = nextConfig
```

### Environment Variables

**Note**: This application uses a **Bring Your Own Key (BYOK)** model. 
API keys are entered directly in the browser UI and stored in localStorage.
No environment variables are needed or supported for API keys.

### Function Timeout Considerations

- **Vercel Free**: 10 seconds (may timeout on large PRDs)
- **Vercel Pro**: 60 seconds ✅
- **Railway**: 300 seconds ✅
- **Render Free**: 30 seconds
- **Netlify Free**: 10 seconds
- **Self-hosted**: No limit ✅

**Recommendation**: For production with large PRDs, use Vercel Pro, Railway, or self-hosted.

---

## 📊 Comparison Table

| Platform | Free Tier | Timeout Limit | Ease of Setup | Best For |
|----------|-----------|---------------|---------------|----------|
| **Vercel** | ✅ Yes | 10s (free), 60s (pro) | ⭐⭐⭐⭐⭐ | Next.js apps |
| **Railway** | ✅ $5 credit | 300s | ⭐⭐⭐⭐ | Full-stack apps |
| **Render** | ✅ Yes (limited) | 30s | ⭐⭐⭐⭐ | Simple deployments |
| **Netlify** | ✅ Yes | 10s (free), 26s (paid) | ⭐⭐⭐⭐ | JAMstack |
| **Self-hosted** | ❌ | Unlimited | ⭐⭐ | Full control |

---

## 🎯 My Recommendation

**For Open Source Project**:
1. **Start with Vercel** (free tier) - easiest, best Next.js support
2. **Upgrade to Vercel Pro** ($20/month) if you need longer timeouts
3. **Or use Railway** ($5-10/month) for better timeout limits

**For Personal/Internal Use**:
- **Self-hosted VPS** if you want to run Ollama on the same server
- **Railway** for simplicity with good limits

---

## 🚀 Quick Deploy Checklist

Before deploying:

- [ ] Push code to GitHub
- [ ] Test locally: `npm run build && npm start`
- [ ] Remove any hardcoded API keys
- [ ] Update README with deployment link (optional)
- [ ] Verify deployment works (no environment variables needed)
- [ ] Configure custom domain (optional)

---

## 📝 Post-Deployment

After deploying:

1. **Test the deployment**:
   - Upload a sample PRD
   - Test all providers
   - Verify downloads work

2. **Monitor**:
   - Check function logs for errors
   - Monitor API usage/costs
   - Set up error tracking (optional: Sentry)

3. **Update README**:
   - Add live demo link
   - Update deployment instructions

---

**Need help?** Check the hosting platform's Next.js documentation or their support forums.

