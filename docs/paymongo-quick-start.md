# Paymongo Integration - Quick Start Guide

This is a quick reference guide to get Paymongo payments working in your HanapBahay app.

## ✅ What's Already Done

- ✅ Frontend Paymongo integration (components, API utilities)
- ✅ Backend server setup (Express.js with Paymongo routes)
- ✅ Payment flow integration in tenant dashboard
- ✅ Type definitions updated

## 🚀 Quick Setup (5 Steps)

### Step 1: Install Backend Dependencies

```bash
cd server
npm install
```

### Step 2: Get Paymongo API Keys

1. Go to https://dashboard.paymongo.com
2. Sign up or log in
3. Go to **Settings** → **API Keys**
4. Copy your **Secret Key** and **Public Key** (use TEST keys for development)

### Step 3: Create Environment File

Create `server/.env`:

```env
PAYMONGO_SECRET_KEY=sk_test_your_secret_key_here
PAYMONGO_PUBLIC_KEY=pk_test_your_public_key_here
PORT=3000
```

### Step 4: Start Backend Server

```bash
# From server directory
npm start

# Or from project root
npm run start:server
```

Server runs on `http://localhost:3000`

### Step 5: Update Frontend API URL

Make sure your frontend points to the backend. Check `constants/index.ts`:

```typescript
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
```

Or set in `.env`:
```env
EXPO_PUBLIC_API_URL=http://localhost:3000
```

## 🧪 Test It

1. **Start the backend server** (Step 4)
2. **Start your Expo app**: `npm start`
3. **Go to tenant dashboard** → Select a payment → Choose "Paymongo (Online Payment)"
4. **Test with Paymongo test card**: `4242 4242 4242 4242`

## 📚 Full Documentation

- **Backend Setup**: See `docs/paymongo-backend-setup.md`
- **Integration Details**: See `docs/paymongo-integration.md`
- **Server README**: See `server/README.md`

## 🔧 Troubleshooting

### Backend won't start
- Check if port 3000 is in use
- Verify `.env` file exists in `server/` directory
- Run `npm install` in `server/` directory

### Payment not working
- Verify backend server is running
- Check API keys are correct in `server/.env`
- Check browser console for errors
- Verify `EXPO_PUBLIC_API_URL` points to backend

### Webhook not receiving events
- For local dev, use ngrok: `ngrok http 3000`
- Set webhook URL in Paymongo dashboard
- Add webhook secret to `server/.env`

## 🎯 Next Steps

1. **Test payments** with Paymongo test mode
2. **Set up webhooks** for production (see backend setup guide)
3. **Switch to live keys** when ready for production
4. **Integrate database** in webhook handlers (see TODO comments in `server/paymongo-routes.js`)

## 💡 Tips

- Use **test keys** (`sk_test_`, `pk_test_`) for development
- Use **test cards** (`4242 4242 4242 4242`) for testing
- Webhooks are optional for basic testing but required for production
- Keep secret keys secure - never commit to git!

## 📞 Need Help?

- Paymongo Docs: https://developers.paymongo.com/
- Check the detailed guides in `docs/` folder
- Review server logs for error messages

