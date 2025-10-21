import React from 'react';
import { View, Text, Image, Platform, StyleSheet } from 'react-native';

// Simple avatar implementation without NativeWind dependencies
type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

interface AvatarProps {
  size?: AvatarSize;
  children?: React.ReactNode;
  style?: any;
}

const Avatar = React.forwardRef<View, AvatarProps>(
  function Avatar({ size = 'md', children, style, ...props }, ref) {
    return (
      <View
        ref={ref}
        style={[styles.avatar, styles[`avatar_${size}`], style]}
        {...props}
      >
        {children}
      </View>
    );
  }
);

interface AvatarBadgeProps {
  size?: AvatarSize;
  style?: any;
}

const AvatarBadge = React.forwardRef<View, AvatarBadgeProps>(
  function AvatarBadge({ size = 'md', style, ...props }, ref) {
    return (
      <View
        ref={ref}
        style={[styles.badge, styles[`badge_${size}`], style]}
        {...props}
      />
    );
  }
);

interface AvatarFallbackTextProps {
  size?: AvatarSize;
  children?: React.ReactNode;
  style?: any;
}

const AvatarFallbackText = React.forwardRef<Text, AvatarFallbackTextProps>(
  function AvatarFallbackText({ size = 'md', children, style, ...props }, ref) {
    return (
      <Text
        ref={ref}
        style={[styles.fallbackText, styles[`fallbackText_${size}`], style]}
        {...props}
      >
        {children}
      </Text>
    );
  }
);

interface AvatarImageProps {
  source?: any;
  style?: any;
}

const AvatarImage = React.forwardRef<Image, AvatarImageProps>(
  function AvatarImage({ source, style, ...props }, ref) {
    return (
      <Image
        ref={ref}
        source={source}
        style={[styles.image, style]}
        {...props}
      />
    );
  }
);

interface AvatarGroupProps {
  children?: React.ReactNode;
  style?: any;
}

const AvatarGroup = React.forwardRef<View, AvatarGroupProps>(
  function AvatarGroup({ children, style, ...props }, ref) {
    return (
      <View
        ref={ref}
        style={[styles.group, style]}
        {...props}
      >
        {children}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  avatar: {
    borderRadius: 9999,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    backgroundColor: '#3b82f6',
  },
  avatar_xs: { width: 24, height: 24 },
  avatar_sm: { width: 32, height: 32 },
  avatar_md: { width: 48, height: 48 },
  avatar_lg: { width: 64, height: 64 },
  avatar_xl: { width: 96, height: 96 },
  avatar_2xl: { width: 128, height: 128 },
  
  badge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: '#10b981',
    borderRadius: 9999,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  badge_xs: { width: 8, height: 8 },
  badge_sm: { width: 8, height: 8 },
  badge_md: { width: 12, height: 12 },
  badge_lg: { width: 16, height: 16 },
  badge_xl: { width: 24, height: 24 },
  badge_2xl: { width: 32, height: 32 },
  
  fallbackText: {
    color: '#ffffff',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  fallbackText_xs: { fontSize: 10 },
  fallbackText_sm: { fontSize: 12 },
  fallbackText_md: { fontSize: 16 },
  fallbackText_lg: { fontSize: 20 },
  fallbackText_xl: { fontSize: 30 },
  fallbackText_2xl: { fontSize: 48 },
  
  image: {
    height: '100%',
    width: '100%',
    borderRadius: 9999,
    position: 'absolute',
  },
  
  group: {
    flexDirection: 'row-reverse',
    position: 'relative',
  },
});

Avatar.displayName = 'Avatar';
AvatarBadge.displayName = 'AvatarBadge';
AvatarFallbackText.displayName = 'AvatarFallbackText';
AvatarImage.displayName = 'AvatarImage';
AvatarGroup.displayName = 'AvatarGroup';

export { Avatar, AvatarBadge, AvatarFallbackText, AvatarImage, AvatarGroup };
