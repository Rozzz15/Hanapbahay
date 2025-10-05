# HanapBahay - Organized Codebase Structure

## 📁 Project Structure

```
hanapbahay/
├── app/                          # Expo Router pages
│   ├── (tabs)/                   # Tab navigation screens
│   │   ├── _layout.tsx          # Tab layout configuration
│   │   ├── index.tsx            # Dashboard (Home)
│   │   ├── chat.tsx             # Chat screen
│   │   └── profile.tsx          # Profile screen
│   ├── _layout.tsx              # Root layout
│   ├── index.tsx                # Onboarding screen
│   ├── login.tsx                # Login screen
│   ├── sign-up.tsx              # Sign-up screen
│   ├── forgot-password.tsx      # Forgot password screen
│   ├── filter.tsx               # Property filter screen
│   ├── chat-room.tsx            # Individual chat room
│   ├── unauthorized.tsx         # Unauthorized access screen
│   └── +not-found.tsx           # 404 screen
│
├── components/                   # Organized component library
│   ├── buttons/                 # Button components
│   │   ├── GradientButton.tsx
│   │   ├── InteractiveButton.tsx
│   │   ├── HapticTab.tsx
│   │   └── index.ts
│   ├── chat/                    # Chat-related components
│   │   ├── ChatList.tsx
│   │   ├── ChatSearchBar.tsx
│   │   └── index.ts
│   ├── forms/                   # Form components
│   │   ├── ButtonCarousel.tsx
│   │   ├── CountSelect.tsx
│   │   ├── LocationSearchBar.tsx
│   │   ├── PriceRangeSelector.tsx
│   │   └── index.ts
│   ├── listings/                # Property listing components
│   │   ├── ListingCard.tsx
│   │   ├── ListingCarousel.tsx
│   │   ├── ListingList.tsx
│   │   └── index.ts
│   ├── common/                  # Common/shared components
│   │   ├── ThemedText.tsx
│   │   └── index.ts
│   ├── ui/                      # Gluestack UI components
│   │   ├── avatar/
│   │   ├── button/
│   │   ├── form-control/
│   │   ├── input/
│   │   ├── text/
│   │   └── ... (other UI components)
│   ├── __tests__/               # Component tests
│   └── index.ts                 # Main components export
│
├── types/                       # TypeScript type definitions
│   └── index.ts                 # All type exports
│
├── constants/                   # App constants
│   ├── Colors.ts               # Color definitions
│   └── index.ts                # All constants export
│
├── utils/                       # Utility functions
│   ├── auth-user.ts            # User authentication utilities
│   ├── mock-auth.ts            # Mock authentication data
│   ├── mockData.ts             # Mock data for development
│   ├── supabase-client.ts      # Supabase client configuration
│   └── index.ts                # All utilities export
│
├── context/                     # React Context providers
│   ├── AuthContext.tsx         # Authentication context
│   └── PermissionContext.tsx   # Permission management context
│
├── hooks/                       # Custom React hooks
│   ├── useColorScheme.ts       # Color scheme hook
│   ├── usePermissions.ts       # Permission hook
│   └── useThemeColor.ts        # Theme color hook
│
├── api/                         # API layer
│   └── auth/                    # Authentication API
│       ├── login.ts
│       └── sign-up.ts
│
├── schema/                      # Validation schemas
│   └── auth.ts                  # Authentication schemas
│
├── assets/                      # Static assets
│   ├── fonts/                  # Custom fonts
│   ├── images/                 # App images
│   └── onboarding/            # Onboarding images
│
└── Configuration files
    ├── package.json
    ├── tsconfig.json
    ├── tailwind.config.js
    ├── babel.config.js
    └── metro.config.js
```

## 🎯 Organization Benefits

### 1. **Component Organization**
- **`buttons/`** - All button-related components
- **`chat/`** - Chat functionality components
- **`forms/`** - Form input and validation components
- **`listings/`** - Property listing components
- **`common/`** - Shared/reusable components
- **`ui/`** - Gluestack UI component library

### 2. **Clean Imports**
```typescript
// Before (scattered imports)
import { GradientButton } from '../../components/GradientButton';
import { InteractiveButton } from '../../components/InteractiveButton';
import { ChatList } from '../../components/ChatList';

// After (organized imports)
import { GradientButton, InteractiveButton } from '@/components/buttons';
import { ChatList } from '@/components/chat';
```

### 3. **Type Safety**
- Centralized type definitions in `types/index.ts`
- Consistent interfaces across the app
- Better IntelliSense and error checking

### 4. **Constants Management**
- All app constants in one place
- Easy to maintain and update
- Consistent naming conventions

### 5. **Utility Functions**
- Organized utility functions
- Reusable helper functions
- Clean separation of concerns

## 🚀 Usage Examples

### Importing Components
```typescript
// Import from specific categories
import { GradientButton, InteractiveButton } from '@/components/buttons';
import { ChatList, ChatSearchBar } from '@/components/chat';
import { ListingCard, ListingList } from '@/components/listings';

// Import from main components index
import { GradientButton, ChatList, ListingCard } from '@/components';
```

### Using Types
```typescript
import type { User, ChatItem, ListingType } from '@/types';
```

### Using Constants
```typescript
import { ROUTES, STORAGE_KEYS } from '@/constants';
```

### Using Utilities
```typescript
import { formatPrice, formatDate } from '@/utils';
```

## 🔧 Maintenance

### Adding New Components
1. Create component in appropriate folder
2. Add export to folder's `index.ts`
3. Update main `components/index.ts` if needed

### Adding New Types
1. Add type definition to `types/index.ts`
2. Use throughout the app for consistency

### Adding New Constants
1. Add constant to `constants/index.ts`
2. Use consistent naming conventions

## 📝 Best Practices

1. **Component Organization**: Group related components together
2. **Index Files**: Use index files for clean imports
3. **Type Safety**: Define types in centralized location
4. **Constants**: Keep all constants in one place
5. **Utilities**: Organize helper functions logically
6. **Naming**: Use consistent naming conventions
7. **Exports**: Use named exports for better tree-shaking

This organized structure makes the codebase more maintainable, scalable, and easier to navigate for developers.
