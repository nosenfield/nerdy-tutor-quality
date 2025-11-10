# Vercel Deployment Guide

**Quick deployment to production**

---

## Prerequisites

1. **GitHub repository**: ✅ Already connected (`nerdy-tutor-quality`)
2. **Vercel account**: Need to create
3. **Environment variables**: Need to configure

---

## Step 1: Create Vercel Account & Link Repository

### Option A: Via Vercel Dashboard (Recommended)

1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub
3. Click "Add New Project"
4. Import repository: `nerdy-tutor-quality`
5. Vercel will auto-detect Next.js settings

### Option B: Via Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Link project to Vercel
vercel link

# Follow prompts to create project
```

---

## Step 2: Configure Environment Variables

**Required Environment Variables** (set in Vercel dashboard):

### Database (Supabase)
- `DATABASE_URL` - Production Supabase connection string
- `DIRECT_URL` - Production Supabase direct connection (for migrations)

### Redis (Upstash)
- `REDIS_URL` - Production Upstash Redis URL

### Authentication (Supabase)
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (server-side only)

### Webhook Security
- `WEBHOOK_SECRET` - HMAC secret for webhook signature verification

### Optional (for future)
- `NEXT_PUBLIC_SENTRY_DSN` - Sentry DSN (if using Sentry)
- `SENTRY_AUTH_TOKEN` - Sentry auth token (if using source maps)

**How to set in Vercel:**
1. Go to Project Settings > Environment Variables
2. Add each variable for:
   - **Production** (required)
   - **Preview** (optional, can use same as production)
   - **Development** (optional)

---

## Step 3: Configure Build Settings

Vercel should auto-detect Next.js, but verify:

- **Framework Preset**: Next.js
- **Build Command**: `npm run build` (or `pnpm build`)
- **Output Directory**: `.next` (auto-detected)
- **Install Command**: `npm install` (or `pnpm install`)
- **Node.js Version**: 20.x (recommended)

---

## Step 4: Deploy

### Option A: Automatic Deployment (Recommended)

1. Push to `main` branch:
   ```bash
   git push origin main
   ```
2. Vercel will automatically deploy

### Option B: Manual Deployment via CLI

```bash
# Deploy to production
vercel --prod

# Or deploy to preview
vercel
```

---

## Step 5: Verify Deployment

After deployment, verify:

1. **App loads**: Visit your Vercel URL (e.g., `tutor-quality.vercel.app`)
2. **Login works**: Test authentication
3. **Dashboard loads**: Verify data displays
4. **API endpoints work**: Test `/api/dashboard/tutors`
5. **No console errors**: Check browser console
6. **Database connection**: Verify data loads

---

## Step 6: Set Up Custom Domain (Optional)

1. Go to Project Settings > Domains
2. Add your custom domain
3. Follow DNS configuration instructions

---

## Troubleshooting

### Build Fails

**Check:**
- All environment variables are set
- Node.js version is correct (20.x)
- Build command is correct
- No TypeScript errors (`npm run type-check`)

### Runtime Errors

**Check:**
- Environment variables are set correctly
- Database connection string is valid
- Redis connection string is valid
- Supabase keys are correct

### Database Connection Issues

**Check:**
- `DATABASE_URL` is set correctly
- Supabase project is active
- Connection pooling is enabled (if using Supabase)

### Redis Connection Issues

**Check:**
- `REDIS_URL` is set correctly
- Upstash Redis instance is active
- TLS/SSL is enabled (Upstash requires TLS)

---

## Environment Variables Checklist

Before deploying, ensure you have:

- [ ] `DATABASE_URL` (production Supabase)
- [ ] `DIRECT_URL` (production Supabase)
- [ ] `REDIS_URL` (production Upstash)
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `WEBHOOK_SECRET`

---

## Next Steps After Deployment

1. **Set up monitoring** (Sentry, Vercel Analytics)
2. **Configure alerts** (error notifications)
3. **Set up staging environment** (optional)
4. **Document deployment process**
5. **Test webhook endpoints** with production URLs

---

**Ready to deploy?** Follow steps 1-4 above!


