# Paymongo Backend Setup Guide

This guide will help you set up the backend server for Paymongo payment processing.

## Prerequisites

- Node.js v18 or higher
- npm or yarn
- Paymongo account (sign up at https://paymongo.com)
- Paymongo API keys (get from https://dashboard.paymongo.com/settings/api-keys)

## Step 1: Install Dependencies

Navigate to the `server` directory and install dependencies:

```bash
cd server
npm install
```

Or install from the project root:

```bash
npm install express cors dotenv
```

## Step 2: Set Up Environment Variables

1. Create a `.env` file in the `server` directory:

```bash
cd server
touch .env
```

2. Add your Paymongo API keys to the `.env` file:

```env
# Paymongo API Keys
# Get these from: https://dashboard.paymongo.com/settings/api-keys
# Use TEST keys for development, LIVE keys for production

PAYMONGO_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxx
PAYMONGO_PUBLIC_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxx
PAYMONGO_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxx

# Server Configuration
PORT=3000
```

## Step 3: Get Paymongo API Keys

1. Go to [Paymongo Dashboard](https://dashboard.paymongo.com)
2. Sign up or log in to your account
3. Navigate to **Settings** → **API Keys**
4. Copy your keys:
   - **Secret Key** (starts with `sk_test_` for test, `sk_live_` for live)
   - **Public Key** (starts with `pk_test_` for test, `pk_live_` for live)

### For Webhook Secret:

1. Navigate to **Settings** → **Webhooks**
2. Create a new webhook endpoint (see Step 5 below)
3. Copy the webhook secret (starts with `whsec_`)

## Step 4: Start the Server

```bash
# From the server directory
npm start

# Or from project root
npm run start:server

# For development with auto-reload (requires nodemon)
npm run start:server:dev
```

The server will start on `http://localhost:3000` by default.

Verify it's running:
```bash
curl http://localhost:3000/health
```

You should see:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "service": "HanapBahay API Server"
}
```

## Step 5: Set Up Webhook (For Production)

### For Local Development (using ngrok):

1. Install ngrok:
```bash
npm install -g ngrok
```

2. Expose your local server:
```bash
ngrok http 3000
```

3. Copy the ngrok URL (e.g., `https://abc123.ngrok.io`)

4. In Paymongo Dashboard → **Settings** → **Webhooks**:
   - Click "Create Webhook"
   - URL: `https://abc123.ngrok.io/api/paymongo/webhook`
   - Events: Select `payment.succeeded`, `payment.failed`, `payment.pending`
   - Copy the webhook secret and add it to your `.env` file

### For Production:

1. Deploy your server to a hosting service (Heroku, Railway, AWS, etc.)
2. Get your production URL (e.g., `https://api.hanapbahay.com`)
3. In Paymongo Dashboard → **Settings** → **Webhooks**:
   - Create webhook with URL: `https://api.hanapbahay.com/api/paymongo/webhook`
   - Select events: `payment.succeeded`, `payment.failed`, `payment.pending`
   - Copy the webhook secret and add it to your production environment variables

## Step 6: Update Frontend Configuration

Update your frontend `.env` file (or `constants/index.ts`) to point to your backend:

```env
EXPO_PUBLIC_API_URL=http://localhost:3000
```

For production:
```env
EXPO_PUBLIC_API_URL=https://api.hanapbahay.com
```

## Testing

### Test the API Endpoints

1. **Health Check:**
```bash
curl http://localhost:3000/health
```

2. **Create Payment Intent:**
```bash
curl -X POST http://localhost:3000/api/paymongo/create-payment-intent \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 10000,
    "currency": "PHP",
    "description": "Test payment",
    "metadata": {
      "paymentId": "test_123"
    }
  }'
```

### Test with Paymongo Test Cards

Use these test card numbers in the Paymongo payment form:

- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **3D Secure**: `4000 0025 0000 3155`

Expiry: Any future date (e.g., `12/25`)
CVC: Any 3 digits (e.g., `123`)

## Troubleshooting

### Server won't start

- **Port already in use**: Change `PORT` in `.env` or kill the process using port 3000
- **Missing dependencies**: Run `npm install` in the `server` directory
- **Environment variables not loaded**: Make sure `.env` file exists in `server` directory

### Paymongo API errors

- **401 Unauthorized**: Check that your API keys are correct
- **Invalid amount**: Make sure amount is in cents (e.g., 10000 = ₱100.00)
- **Test vs Live keys**: Make sure you're using test keys in test mode

### Webhook not receiving events

- **Webhook URL not accessible**: Make sure your server is publicly accessible (use ngrok for local)
- **Invalid signature**: Check that `PAYMONGO_WEBHOOK_SECRET` is correct
- **Wrong events**: Make sure you selected the correct events in Paymongo dashboard

## Production Checklist

Before going live:

- [ ] Switch to live Paymongo API keys
- [ ] Update webhook URL to production domain
- [ ] Enable HTTPS (required for webhooks)
- [ ] Set up proper error logging and monitoring
- [ ] Test all payment flows in production mode
- [ ] Set up database integration for webhook handlers
- [ ] Configure CORS for your production domain only
- [ ] Review security best practices

## Next Steps

1. **Integrate Database**: Update webhook handlers to save payment data to your database
2. **Add Authentication**: Secure your API endpoints with authentication
3. **Add Logging**: Set up proper logging for production monitoring
4. **Add Rate Limiting**: Protect your API from abuse
5. **Add Error Monitoring**: Set up error tracking (e.g., Sentry)

## Support

- Paymongo API Documentation: https://developers.paymongo.com/
- Paymongo Support: https://paymongo.com/contact
- Server README: See `server/README.md`
