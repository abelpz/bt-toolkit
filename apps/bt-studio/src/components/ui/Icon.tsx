/**
 * Centralized Icon Component
 * 
 * Cross-platform icon system using Lucide React
 * Works in both React and React Native (with react-native-svg)
 */

import React from 'react';
import {
  // Media/Audio icons
  Volume2,
  Play,
  Pause,
  Square,
  SkipBack,
  SkipForward,
  
  // Educational icons
  GraduationCap,
  Book,
  BookOpen,
  
  // Navigation icons
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  ArrowRight,
  Home,
  Menu,
  Target,
  List,
  Grid3X3,
  
  // Action icons
  Search,
  Settings,
  Download,
  Upload,
  Save,
  Edit,
  Trash2,
  Plus,
  Minus,
  X,
  Check,
  
  // Status icons
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  XCircle,
  Clock,
  
  // UI icons
  Eye,
  EyeOff,
  Maximize,
  Minimize,
  MoreHorizontal,
  MoreVertical,
  
  // File/Document icons
  File,
  FileText,
  Folder,
  FolderOpen,
  
  type LucideIcon
} from 'lucide-react';

// Icon name mapping for easy usage
export const iconMap = {
  // Media/Audio
  'volume': Volume2,
  'play': Play,
  'pause': Pause,
  'stop': Square,
  'skip-back': SkipBack,
  'skip-forward': SkipForward,
  
  // Educational
  'academy': GraduationCap,
  'translation-words': Book,
  'book-open': BookOpen,
  
  // Navigation
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  'arrow-left': ArrowLeft,
  'arrow-right': ArrowRight,
  'home': Home,
  'menu': Menu,
  'target': Target,
  'list': List,
  'grid': Grid3X3,
  
  // Actions
  'search': Search,
  'settings': Settings,
  'download': Download,
  'upload': Upload,
  'save': Save,
  'edit': Edit,
  'delete': Trash2,
  'plus': Plus,
  'minus': Minus,
  'close': X,
  'check': Check,
  
  // Status
  'warning': AlertTriangle,
  'error': AlertCircle,
  'info': Info,
  'success': CheckCircle,
  'cancel': XCircle,
  'loading': Clock,
  
  // UI
  'show': Eye,
  'hide': EyeOff,
  'maximize': Maximize,
  'minimize': Minimize,
  'more-horizontal': MoreHorizontal,
  'more-vertical': MoreVertical,
  
  // Files
  'file': File,
  'file-text': FileText,
  'folder': Folder,
  'folder-open': FolderOpen,
} as const;

export type IconName = keyof typeof iconMap;

export interface IconProps {
  /** Icon name from the iconMap */
  name: IconName;
  /** Icon size in pixels (default: 16) */
  size?: number;
  /** Icon color (CSS color value) */
  color?: string;
  /** Additional CSS classes */
  className?: string;
  /** Stroke width (default: 2) */
  strokeWidth?: number;
  /** Click handler */
  onClick?: () => void;
  /** ARIA label for accessibility */
  'aria-label'?: string;
  /** Title for tooltip */
  title?: string;
}

/**
 * Universal Icon Component
 * 
 * Usage:
 * <Icon name="play" size={20} color="blue" />
 * <Icon name="academy" className="text-blue-500" />
 * <Icon name="translation-words" size={24} strokeWidth={1.5} />
 */
export const Icon: React.FC<IconProps> = ({
  name,
  size = 16,
  color,
  className = '',
  strokeWidth = 2,
  onClick,
  'aria-label': ariaLabel,
  title,
}) => {
  const IconComponent = iconMap[name] as LucideIcon;
  
  if (!IconComponent) {
    console.warn(`Icon "${name}" not found in iconMap`);
    return null;
  }
  
  const iconProps = {
    size,
    color,
    strokeWidth,
    className: `lucide-icon ${className}`,
    onClick,
    'aria-label': ariaLabel || name,
    title: title || ariaLabel || name,
  };
  
  return <IconComponent {...iconProps} />;
};

/**
 * Icon Button Component
 * 
 * Combines Icon with button functionality
 */
export interface IconButtonProps extends Omit<IconProps, 'onClick'> {
  /** Button click handler */
  onClick?: () => void;
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
  className = '',
  strokeWidth,
  onClick,
  disabled = false,
  variant = 'default',
  buttonSize = 'md',
  'aria-label': ariaLabel,
  title,
}) => {
  const baseClasses = 'inline-flex items-center justify-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variantClasses = {
    default: 'bg-gray-100 hover:bg-gray-200 focus:ring-gray-500',
    ghost: 'hover:bg-gray-100 focus:ring-gray-500',
    outline: 'border border-gray-300 hover:bg-gray-50 focus:ring-gray-500',
  };
  
  const sizeClasses = {
    sm: 'w-6 h-6 p-1',
    md: 'w-8 h-8 p-1.5',
    lg: 'w-10 h-10 p-2',
  };
  
  const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer';
  
  const buttonClasses = `
    ${baseClasses}
    ${variantClasses[variant]}
    ${sizeClasses[buttonSize]}
    ${disabledClasses}
    ${className}
  `.trim();
  
  return (
    <button
      type="button"
      className={buttonClasses}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      aria-label={ariaLabel || name}
      title={title || ariaLabel || name}
    >
      <Icon
        name={name}
        size={size}
        color={color}
        strokeWidth={strokeWidth}
      />
    </button>
  );
};

// Export individual icons for direct usage if needed
export {
  Volume2,
  Play,
  Pause,
  Square,
  GraduationCap,
  Book,
  ChevronLeft,
  ChevronRight,
  // Add more as needed
};
