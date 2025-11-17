# Backend Server Setup Instructions

## Quick Start

The backend server needs to be running for PayMongo payments to work. Follow these steps:

### Step 1: Create Environment File

Create a `.env` file in the `server/` directory with your PayMongo API keys:

```env
# PayMongo API Keys
# Get these from: https://dashboard.paymongo.com/settings/api-keys
# Use TEST keys for development

PAYMONGO_SECRET_KEY=sk_test_your_secret_key_here
PAYMONGO_PUBLIC_KEY=pk_test_your_public_key_here

# Server Configuration
PORT=3000
```

### Step 2: Get PayMongo API Keys

1. Go to https://dashboard.paymongo.com
2. Sign up or log in
3. Navigate to **Settings** → **API Keys**
4. Copy your **Secret Key** (starts with `sk_test_` for test mode)
5. Copy your **Public Key** (starts with `pk_test_` for test mode)

### Step 3: Start the Server

From the project root, run:

```bash
npm run start:server
```

Or from the server directory:

```bash
cd server
npm start
```

You should see:
```
🚀 HanapBahay API Server running on port 3000
📍 Health check: http://localhost:3000/health
💳 Paymongo routes: http://localhost:3000/api/paymongo
```

### Step 4: Verify Server is Running

Open your browser and go to: http://localhost:3000/health

You should see:
```json
{
  "status": "ok",
  "timestamp": "...",
  "service": "HanapBahay API Server"
}
```

### Step 5: For Mobile Devices

If you're testing on a mobile device (not an emulator), you need to:

1. Find your computer's IP address:
   - Windows: Run `ipconfig` and look for "IPv4 Address"
   - Mac/Linux: Run `ifconfig` and look for your network interface IP

2. Update your frontend `.env` file (in project root):
   ```env
   EXPO_PUBLIC_API_URL=http://YOUR_IP_ADDRESS:3000
   ```
   Example: `EXPO_PUBLIC_API_URL=http://192.168.1.100:3000`

3. Restart your Expo app

## Troubleshooting

### Server won't start
- Check if port 3000 is already in use
- Verify `.env` file exists in `server/` directory
- Make sure dependencies are installed: `cd server && npm install`

### "Network request failed" error
- Make sure the server is running (check Step 4)
- If on mobile, use your computer's IP address instead of `localhost`
- Check your firewall isn't blocking port 3000

### "PAYMONGO_SECRET_KEY not set" warning
- This is just a warning - the server will still run
- Add your PayMongo keys to `server/.env` to enable payment features

## Keep Server Running

**Important:** Keep the backend server running while testing payments. You need TWO terminals:
- Terminal 1: Backend server (`npm run start:server`)
- Terminal 2: Expo app (`npm start`)

