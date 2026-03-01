# 🚀 Quick Start - Get Your App Online in 5 Minutes

## Step 1: Test Locally (30 seconds)

The development server is already running! Open your browser:

👉 **http://localhost:5173**

You should see your Boomless Cruise Simulation with:
- Interactive sliders on the left
- Live plot on the right
- Real-time updates as you move sliders

## Step 2: Deploy to Vercel (2 minutes)

### First Time Setup:

```bash
# Install Vercel CLI (one-time)
npm install -g vercel

# Navigate to project
cd boomless-web

# Deploy!
vercel
```

### Follow the prompts:

```
? Set up and deploy "boomless-web"? [Y/n] Y
? Which scope? [Select your account]
? Link to existing project? [N]
? What's your project's name? boomless-cruise
? In which directory is your code located? ./
? Want to override the settings? [N]
```

### Result:
```
✅ Deployed to production
🔗 https://boomless-cruise-xxxxx.vercel.app
```

**Copy that URL!** That's your public web app.

## Step 3: Embed in Your Website (2 minutes)

### For Wix:

1. Open your Wix site editor
2. Click **Add** (+) button on the left
3. Select **Embed** → **HTML iframe**
4. Paste this code (replace with YOUR URL):

```html
<iframe 
  src="https://boomless-cruise-xxxxx.vercel.app" 
  width="100%" 
  height="900px" 
  frameborder="0"
  style="border: none; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
</iframe>
```

5. Drag to resize as needed
6. Click **Publish**

### For Google Sites:

1. Edit your Google Site
2. Click **Insert** → **Embed**
3. Select **Embed code**
4. Paste the same iframe code
5. Click **Insert** and resize
6. Click **Publish**

### For Any Website:

Just paste the iframe HTML wherever you want the tool to appear!

## That's It! 🎉

Your interactive supersonic flight simulation is now:
- ✅ Live on the internet
- ✅ Embeddable anywhere
- ✅ Free to host (Vercel free tier)
- ✅ Accessible to anyone with the link

## Bonus: Custom Domain (Optional)

Want `boomless.yourdomain.com` instead of Vercel's URL?

1. Go to vercel.com/dashboard
2. Select your project
3. Go to **Settings** → **Domains**
4. Add your custom domain
5. Update DNS records as instructed

## Update Your App Later

Made changes? Redeploy in seconds:

```bash
cd boomless-web
npm run build
vercel --prod
```

Vercel will update your live site automatically!

## Continuous Deployment (Optional)

For automatic deployments on every code change:

1. Push your code to GitHub
2. Go to vercel.com
3. Click **Import Project**
4. Select your GitHub repo
5. Vercel auto-deploys on every commit!

## Troubleshooting

### Dev server not running?
```bash
cd boomless-web
npm run dev
```

### Deploy failed?
```bash
cd boomless-web
npm run build  # Test build locally first
```

### Need help?
Check `DEPLOYMENT.md` for detailed troubleshooting.

---

**You're done!** Your tool is live and ready to share. 🚀✈️

Share the Vercel URL with colleagues, embed it on your site, or add it to your portfolio!
