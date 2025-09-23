import { Platform, Dimensions, StatusBar, StyleSheet } from 'react-native';

const { width, height } = Dimensions.get('window');

// Android-specific UI utilities
export const androidUI = {
  // Status bar height for Android
  statusBarHeight: Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0,
  
  // Safe area padding
  safeAreaTop: Platform.OS === 'ios' ? 60 : 40,
  safeAreaBottom: Platform.OS === 'ios' ? 34 : 0,
  
  // Font families
  fontFamily: {
    regular: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    medium: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    bold: Platform.OS === 'ios' ? 'System' : 'sans-serif-bold',
  },
  
  // Shadow properties for Android
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: Platform.OS === 'android' ? 4 : 0,
  },
  
  // Card shadow
  cardShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: Platform.OS === 'android' ? 6 : 0,
  },
  
  // Modal shadow
  modalShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: Platform.OS === 'android' ? 12 : 0,
  },
  
  // Button press effect
  buttonPress: Platform.OS === 'android' ? { opacity: 0.8 } : { transform: [{ scale: 0.98 }] },
  
  // Border radius consistency
  borderRadius: {
    small: 8,
    medium: 12,
    large: 16,
    xlarge: 20,
    xxlarge: 24,
  },
  
  // Spacing
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },
  
  // Colors
  colors: {
    primary: '#3D5AFE',
    secondary: '#6c6f7b',
    background: '#f5f7fa',
    surface: '#fff',
    border: '#e3e9f9',
    text: {
      primary: '#22223b',
      secondary: '#6c6f7b',
      disabled: '#b0b3b8',
    },
  },
};

// Helper function to create consistent styles
export const createStyles = (styleObject: any) => {
  return StyleSheet.create(styleObject);
};

// Helper for Android-specific adjustments
export const androidAdjustment = (iosValue: any, androidValue: any) => {
  return Platform.OS === 'ios' ? iosValue : androidValue;
};

// Default export to prevent Expo Router warnings
export default androidUI; 