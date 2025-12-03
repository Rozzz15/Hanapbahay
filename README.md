# HanapBahay - Property Rental App 🏠

A property rental application built with Expo, React Native, and TypeScript.

## 🚀 Quick Start

### Prerequisites
- Node.js v18.0.0 or higher
- npm (comes with Node.js)

### Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Verify setup (optional but recommended)**
   ```bash
   node scripts/verify-setup.js
   ```

3. **Start the app**
   ```bash
   npm start
   ```
   Or use:
   ```bash
   npx expo start
   ```

4. **Choose your platform**
   - Press `w` for web browser
   - Press `a` for Android emulator/device
   - Press `i` for iOS simulator (Mac only)
   - Scan QR code with Expo Go app on your phone

### ⚙️ Environment Configuration (Optional)

**Note:** You may see a warning: `⚠️ Supabase credentials not configured, using mock client`

This is **normal** and the app will work fine for development. The app uses a mock Supabase client when credentials aren't configured. To use real Supabase features:

1. Create a `.env` file in the project root:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

2. Get your credentials from [Supabase Dashboard](https://app.supabase.com) → Settings → API

See **[SETUP_GUIDE.md](./SETUP_GUIDE.md)** for detailed instructions.

### Troubleshooting

If you encounter issues, especially the **"Something went wrong"** error when opening on another device:

- See **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** for specific solutions to common errors
- See **[SETUP_GUIDE.md](./SETUP_GUIDE.md)** for detailed setup instructions

**Common quick fixes:**
```bash
# Clear cache and restart
npm run reset

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# For network issues on different devices, use tunnel mode
npm run start:tunnel
```

## 📱 Platform Support

- **iOS** - Requires Mac with Xcode
- **Android** - Requires Android Studio or physical device
- **Web** - Runs in any modern browser

## 🚀 Deployment

Ready to deploy your app so everyone can access it? Check out our deployment guides:

- **[QUICK_DEPLOY.md](./QUICK_DEPLOY.md)** - Get your app live in minutes (recommended for first-time deployment)
- **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** - Comprehensive guide covering web, mobile, and backend deployment

### Quick Links:
- **Web Deployment** - Deploy to Vercel, Netlify, or any static host
- **Mobile Apps** - Build and publish to iOS App Store and Google Play Store
- **Backend Server** - Deploy to Heroku, Railway, or Render

## 🛠️ Available Scripts

- `npm start` - Start Expo development server
- `npm run reset` - Clear cache and restart
- `npm run android` - Run on Android
- `npm run ios` - Run on iOS (Mac only)
- `npm run web` - Run in web browser
- `npm run build:web` - Build web version for deployment
- `npm test` - Run tests
- `npm run lint` - Check code quality

## 📚 Project Structure

This project uses [Expo Router](https://docs.expo.dev/router/introduction/) for file-based routing.

- `app/` - Main application screens and routes
- `components/` - Reusable React components
- `utils/` - Utility functions
- `api/` - API integration functions
- `context/` - React Context providers
- `assets/` - Images, fonts, and other static assets

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
