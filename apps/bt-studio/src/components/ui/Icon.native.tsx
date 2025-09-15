/**
 * React Native Icon Component
 * 
 * Cross-platform icon system using Lucide React Native
 * This file shows how to adapt the Icon component for React Native
 * 
 * NOTE: This is a reference implementation. To use this:
 * 1. Install: pnpm add lucide-react-native react-native-svg
 * 2. Follow react-native-svg setup instructions
 * 3. Replace lucide-react imports with lucide-react-native
 */

import React from 'react';
import { TouchableOpacity, View } from 'react-native';
// import { 
//   // Media/Audio icons
//   Volume2,
//   Play,
//   Pause,
//   Square,
//   SkipBack,
//   SkipForward,
//   
//   // Educational icons
//   GraduationCap,
//   Book,
//   BookOpen,
//   
//   // Navigation icons
//   ChevronLeft,
//   ChevronRight,
//   ArrowLeft,
//   ArrowRight,
//   Home,
//   Menu,
//   
//   // Action icons
//   Search,
//   Settings,
//   Download,
//   Upload,
//   Save,
//   Edit,
//   Trash2,
//   Plus,
//   Minus,
//   X,
//   Check,
//   
//   // Status icons
//   AlertTriangle,
//   AlertCircle,
//   Info,
//   CheckCircle,
//   XCircle,
//   Clock,
//   
//   // UI icons
//   Eye,
//   EyeOff,
//   Maximize,
//   Minimize,
//   MoreHorizontal,
//   MoreVertical,
//   
//   // File/Document icons
//   File,
//   FileText,
//   Folder,
//   FolderOpen,
//   
//   type LucideIcon
// } from 'lucide-react-native';

// Same iconMap as the web version
export const iconMap = {
  // Media/Audio
  'volume': 'Volume2',
  'play': 'Play',
  'pause': 'Pause',
  'stop': 'Square',
  'skip-back': 'SkipBack',
  'skip-forward': 'SkipForward',
  
  // Educational
  'academy': 'GraduationCap',
  'translation-words': 'Book',
  'book-open': 'BookOpen',
  
  // Navigation
  'chevron-left': 'ChevronLeft',
  'chevron-right': 'ChevronRight',
  'arrow-left': 'ArrowLeft',
  'arrow-right': 'ArrowRight',
  'home': 'Home',
  'menu': 'Menu',
  
  // Actions
  'search': 'Search',
  'settings': 'Settings',
  'download': 'Download',
  'upload': 'Upload',
  'save': 'Save',
  'edit': 'Edit',
  'delete': 'Trash2',
  'plus': 'Plus',
  'minus': 'Minus',
  'close': 'X',
  'check': 'Check',
  
  // Status
  'warning': 'AlertTriangle',
  'error': 'AlertCircle',
  'info': 'Info',
  'success': 'CheckCircle',
  'cancel': 'XCircle',
  'loading': 'Clock',
  
  // UI
  'show': 'Eye',
  'hide': 'EyeOff',
  'maximize': 'Maximize',
  'minimize': 'Minimize',
  'more-horizontal': 'MoreHorizontal',
  'more-vertical': 'MoreVertical',
  
  // Files
  'file': 'File',
  'file-text': 'FileText',
  'folder': 'Folder',
  'folder-open': 'FolderOpen',
} as const;

export type IconName = keyof typeof iconMap;

export interface IconProps {
  /** Icon name from the iconMap */
  name: IconName;
  /** Icon size in pixels (default: 16) */
  size?: number;
  /** Icon color (CSS color value) */
  color?: string;
  /** Stroke width (default: 2) */
  strokeWidth?: number;
  /** Click handler */
  onPress?: () => void;
  /** Accessibility label */
  accessibilityLabel?: string;
}

/**
 * React Native Icon Component
 * 
 * Usage:
 * <Icon name="play" size={20} color="blue" />
 * <Icon name="academy" color="#3B82F6" />
 * <Icon name="translation-words" size={24} strokeWidth={1.5} />
 */
export const Icon: React.FC<IconProps> = ({
  name,
  size = 16,
  color = '#000000',
  strokeWidth = 2,
  onPress,
  accessibilityLabel,
}) => {
  // const IconComponent = iconMap[name] as LucideIcon;
  
  // if (!IconComponent) {
  //   console.warn(`Icon "${name}" not found in iconMap`);
  //   return null;
  // }
  
  // const iconElement = (
  //   <IconComponent
  //     size={size}
  //     color={color}
  //     strokeWidth={strokeWidth}
  //   />
  // );
  
  // Placeholder for now - replace with actual icon when lucide-react-native is installed
  const iconElement = (
    <View 
      style={{ 
        width: size, 
        height: size, 
        backgroundColor: color, 
        borderRadius: size / 4 
      }} 
    />
  );
  
  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        accessibilityLabel={accessibilityLabel || name}
        accessibilityRole="button"
      >
        {iconElement}
      </TouchableOpacity>
    );
  }
  
  return (
    <View accessibilityLabel={accessibilityLabel || name}>
      {iconElement}
    </View>
  );
};

/**
 * React Native Icon Button Component
 */
export interface IconButtonProps extends Omit<IconProps, 'onPress'> {
  /** Button press handler */
  onPress?: () => void;
  /** Disabled state */
  disabled?: boolean;
  /** Button variant */
  variant?: 'default' | 'ghost' | 'outline';
  /** Button size */
  buttonSize?: 'sm' | 'md' | 'lg';
}

export const IconButton: React.FC<IconButtonProps> = ({
  name,
  size,
  color,
  strokeWidth,
  onPress,
  disabled = false,
  variant = 'default',
  buttonSize = 'md',
  accessibilityLabel,
}) => {
  const buttonSizes = {
    sm: 24,
    md: 32,
    lg: 40,
  };
  
  const containerSize = buttonSizes[buttonSize];
  const iconSize = size || Math.round(containerSize * 0.5);
  
  const getBackgroundColor = () => {
    if (disabled) return '#F3F4F6';
    switch (variant) {
      case 'default': return '#F9FAFB';
      case 'ghost': return 'transparent';
      case 'outline': return 'transparent';
      default: return '#F9FAFB';
    }
  };
  
  const getBorderColor = () => {
    if (disabled) return '#E5E7EB';
    switch (variant) {
      case 'outline': return '#D1D5DB';
      default: return 'transparent';
    }
  };
  
  return (
    <TouchableOpacity
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel || name}
      accessibilityRole="button"
      style={{
        width: containerSize,
        height: containerSize,
        borderRadius: containerSize / 2,
        backgroundColor: getBackgroundColor(),
        borderWidth: variant === 'outline' ? 1 : 0,
        borderColor: getBorderColor(),
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Icon
        name={name}
        size={iconSize}
        color={color}
        strokeWidth={strokeWidth}
      />
    </TouchableOpacity>
  );
};

// Export individual icons for direct usage if needed
// export {
//   Volume2,
//   Play,
//   Pause,
//   Square,
//   GraduationCap,
//   Book,
//   ChevronLeft,
//   ChevronRight,
//   // Add more as needed
// };
