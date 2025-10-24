import React from 'react';
import { createImage } from '@gluestack-ui/image';
import { Platform, Image as RNImage } from 'react-native';
import { tva } from '@gluestack-ui/nativewind-utils/tva';
import type { VariantProps } from '@gluestack-ui/nativewind-utils';
import LoadingImage from './LoadingImage';

const imageStyle = tva({
  base: 'max-w-full',
  variants: {
    size: {
      '2xs': 'h-6 w-6',
      'xs': 'h-10 w-10',
      'sm': 'h-16 w-16',
      'md': 'h-20 w-20',
      'lg': 'h-24 w-24',
      'xl': 'h-32 w-32',
      '2xl': 'h-64 w-64',
      'full': 'h-full w-full',
      'none': '',
    },
  },
});

const UIImage = createImage({ Root: RNImage });

type ImageProps = VariantProps<typeof imageStyle> &
  React.ComponentProps<typeof UIImage>;

// Enhanced Image component with loading states and fallbacks
const Image = React.forwardRef<
  React.ComponentRef<typeof UIImage>,
  ImageProps & { 
    className?: string;
    showSkeleton?: boolean;
    fallbackIcon?: 'home' | 'image';
    borderRadius?: number;
  }
>(function Image({ 
  size = 'md', 
  className, 
  showSkeleton = true,
  fallbackIcon = 'home',
  borderRadius = 0,
  ...props 
}, ref) {
  // If it's a URI source, use LoadingImage for enhanced functionality
  if (props.source && typeof props.source === 'object' && 'uri' in props.source) {
    // Create proper style object for web compatibility
    const combinedStyle = Platform.OS === 'web' 
      ? { 
          height: 'revert-layer', 
          width: 'revert-layer',
          maxWidth: '100%',
          objectFit: 'cover'
        }
      : undefined;
    
    return (
      <LoadingImage
        source={props.source}
        style={combinedStyle}
        resizeMode={props.resizeMode}
        showSkeleton={showSkeleton}
        fallbackIcon={fallbackIcon}
        borderRadius={borderRadius}
        onLoad={props.onLoad}
        onError={props.onError}
      />
    );
  }

  // For non-URI sources, use the original UIImage
  return (
    <UIImage
      className={imageStyle({ size, class: className })}
      {...props}
      ref={ref}
      // @ts-expect-error : web only
      style={
        Platform.OS === 'web'
          ? { height: 'revert-layer', width: 'revert-layer' }
          : undefined
      }
    />
  );
});

Image.displayName = 'Image';
export { Image };
export { default as LoadingImage } from './LoadingImage';
export { default as ImageGallery } from './ImageGallery';
