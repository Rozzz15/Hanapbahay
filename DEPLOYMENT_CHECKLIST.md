# ✅ Deployment Checklist

Use this checklist to ensure everything is set up correctly before and after deployment.

## 📋 Pre-Deployment Checklist

### Environment Variables

#### Frontend (`.env` file in project root)
- [ ] `EXPO_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- [ ] `EXPO_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon key
- [ ] `EXPO_PUBLIC_API_URL` - Your backend API URL (production)

**Template:** See `env.template` file

#### Backend (`server/.env` file)
- [ ] `PAYMONGO_SECRET_KEY` - PayMongo secret key (use `sk_live_` for production)
- [ ] `PAYMONGO_PUBLIC_KEY` - PayMongo public key (use `pk_live_` for production)
- [ ] `PORT` - Server port (usually auto-set by hosting provider)
- [ ] `PAYMONGO_WEBHOOK_SECRET` - Webhook secret (if using webhooks)

**Template:** See `server/env.template` file

### Configuration Files

- [ ] `app.json` - App name, version, bundle IDs configured
- [ ] `eas.json` - EAS build profiles configured
- [ ] Supabase project created and configured

### Assets

- [ ] App icon (`assets/images/icon.png`)
- [ ] Splash screen (`assets/images/splash-icon.png`)
- [ ] Favicon for web (`assets/images/favicon.png`)

### Testing

- [ ] All features tested locally
- [ ] Payment flow tested (with test cards)
- [ ] Login/signup working
- [ ] Database connections working
- [ ] API endpoints responding correctly

### Accounts & Services

- [ ] Expo account created and logged in
- [ ] Supabase project created
- [ ] PayMongo account created (production mode)
- [ ] Google Play Console account (for Android)
- [ ] Apple Developer account (for iOS) - $99/year

---

## 🌐 Web Deployment Checklist

### Build & Deploy
- [ ] Web app built (`npm run build:web`)
- [ ] Static files generated in `dist/` folder
- [ ] Deployed to hosting service (Cloudflare Pages, GitHub Pages, or Supabase Storage)
- [ ] Environment variables set in hosting platform
- [ ] Custom domain configured (optional)
- [ ] SSL certificate active (automatic)

### Hosting Options
Choose one:
- [ ] **Cloudflare Pages** - Connected to GitHub, auto-deploys
- [ ] **GitHub Pages** - Static hosting via GitHub
- [ ] **Supabase Storage** - Files uploaded to public bucket

### Testing
- [ ] Web app loads correctly
- [ ] All pages navigable
- [ ] Forms submit correctly
- [ ] API calls working
- [ ] Payment flow working
- [ ] Mobile-responsive design works

---

## 📱 Mobile Deployment Checklist

### Android

#### Building
- [ ] EAS CLI installed (`npm install -g eas-cli`)
- [ ] Logged in to Expo (`eas login`)
- [ ] Environment variables set in Expo dashboard
- [ ] Preview build created (`eas build --platform android --profile preview`)
- [ ] Production build created (`eas build --platform android --profile production`)

#### Google Play Store
- [ ] Google Play Console account created
- [ ] App store listing created
- [ ] Screenshots uploaded
- [ ] App description written
- [ ] Privacy policy URL added
- [ ] App bundle uploaded
- [ ] App submitted for review

#### Testing
- [ ] APK/AAB installed on test device
- [ ] All features working
- [ ] Payment integration tested
- [ ] Notifications working (if applicable)

### iOS

#### Building
- [ ] Apple Developer account active
- [ ] EAS CLI installed and configured
- [ ] Environment variables set
- [ ] Preview build created (`eas build --platform ios --profile preview`)
- [ ] Production build created (`eas build --platform ios --profile production`)

#### App Store
- [ ] App Store Connect account set up
- [ ] App listing created
- [ ] Screenshots uploaded (all required sizes)
- [ ] App description written
- [ ] Privacy policy URL added
- [ ] App submitted for review

#### Testing
- [ ] App installed on test device
- [ ] All features working
- [ ] Payment integration tested
- [ ] Push notifications working (if applicable)

---

## 🔧 Backend Deployment Checklist (Optional)

If you need PayMongo payment backend, choose one:

### Option A: Express Server on Railway/Render
- [ ] Railway or Render account created
- [ ] Project created and repository connected
- [ ] Root directory set to `server`
- [ ] Environment variables configured (PAYMONGO_SECRET_KEY, etc.)
- [ ] Build command: `npm install`
- [ ] Start command: `npm start`
- [ ] Health check passing (`/health` endpoint)

### Option B: Supabase Edge Functions (Advanced)
- [ ] Supabase Functions configured
- [ ] PayMongo routes migrated to Edge Functions
- [ ] Functions deployed
- [ ] Environment secrets set in Supabase

### Testing
- [ ] Health endpoint working (`GET /health`)
- [ ] PayMongo routes accessible
- [ ] Payment intent creation working
- [ ] CORS configured correctly
- [ ] Server logs accessible

---

## 🔐 Security Checklist

- [ ] All API keys are production keys (not test keys)
- [ ] Environment variables NOT committed to git
- [ ] `.env` files in `.gitignore`
- [ ] CORS configured for production domains only
- [ ] HTTPS enabled (automatic on most platforms)
- [ ] Webhook secrets configured
- [ ] Database connections secure

---

## 🔗 Integration Checklist

### PayMongo Webhooks
- [ ] Webhook endpoint created in PayMongo dashboard
- [ ] Webhook URL: `https://your-backend-url.com/api/paymongo/webhook`
- [ ] Webhook secret added to backend environment variables
- [ ] Webhook events selected:
  - [ ] `payment.succeeded`
  - [ ] `payment.failed`
  - [ ] `payment.pending`
- [ ] Webhook tested

### Frontend-Backend Connection
- [ ] `EXPO_PUBLIC_API_URL` points to deployed backend
- [ ] CORS allows frontend domain
- [ ] API calls working from frontend
- [ ] Error handling configured

### Database
- [ ] Supabase project is production instance
- [ ] Database migrations applied
- [ ] Row Level Security (RLS) policies configured
- [ ] Database backups enabled

---

## 📊 Post-Deployment Checklist

### Monitoring
- [ ] Error tracking set up (Sentry, etc.)
- [ ] Analytics configured (optional)
- [ ] Server monitoring active
- [ ] Uptime monitoring configured

### Documentation
- [ ] Deployment URLs documented
- [ ] Environment variables documented
- [ ] API endpoints documented
- [ ] Team access granted (if applicable)

### Testing in Production
- [ ] End-to-end user flow tested
- [ ] Payment with real test transaction
- [ ] Error scenarios tested
- [ ] Performance checked
- [ ] Mobile devices tested

### Sharing
- [ ] Web URL shared with team/users
- [ ] App store links shared (if published)
- [ ] Test builds shared (for internal testing)
- [ ] Documentation updated

---

## 🆘 Troubleshooting Checklist

If something isn't working:

- [ ] Check environment variables are set correctly
- [ ] Verify API keys are production keys
- [ ] Check server logs for errors
- [ ] Verify CORS settings
- [ ] Test endpoints directly with curl/Postman
- [ ] Check network connectivity
- [ ] Verify SSL certificates are valid
- [ ] Check database connection
- [ ] Review error tracking logs

---

## 🎉 You're Done!

Once all checkboxes are complete, your app should be fully deployed and accessible to everyone!

**Remember to:**
- Monitor for errors after deployment
- Set up backups
- Plan for scaling if needed
- Keep dependencies updated
- Monitor costs

---

## 📞 Need Help?

- See `SUPABASE_DEPLOYMENT.md` for detailed Supabase deployment instructions
- See `QUICK_DEPLOY.md` for quick start guide
- Check Supabase documentation: https://supabase.com/docs
- Review Expo/EAS documentation: https://docs.expo.dev

Happy deploying! 🚀




