import { useRouter } from "expo-router";
import { useEffect, useState, useRef } from "react";
import { Animated, Dimensions, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View, ActivityIndicator } from "react-native";
import { login } from "./utils/api";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { androidUI } from "./utils/androidUI";
import { useToast } from "./contexts/ToastContext";
import { usePushNotifications } from "./contexts/PushNotificationContext";

const { width } = Dimensions.get("window");
const ACCENT = "#3D5AFE";

export default function LoginScreen() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const router = useRouter();
  const logoAnim = useState(new Animated.Value(0))[0];
  const buttonAnim = useRef(new Animated.Value(1)).current;
  const checkAuthAnim = useRef(new Animated.Value(0)).current;
  const { showToast } = useToast();
  const { registerToken } = usePushNotifications();

  // Check if user is already logged in and auto-redirect if valid token exists
  useEffect(() => {
    let isMounted = true;
    
    const checkLoginStatus = async () => {
      // Don't check login status if user is actively logging in
      if (isLoggingIn || !isMounted) return;
      
      try {
        const token = await AsyncStorage.getItem('token');
        const role = await AsyncStorage.getItem('userRole');
        const name = await AsyncStorage.getItem('userName');
        
        if (token && role && isMounted) {
          // Validate token with backend
          const { success } = await (await import('./utils/api')).validateToken();
          
          if (success && isMounted) {
            // Token is valid - register push token and auto-redirect to dashboard
            try {
              await registerToken();
            } catch (error) {
              // Don't block auto-login if push token registration fails
              console.warn('Failed to register push token on auto-login:', error);
            }
            
            router.replace({ 
              pathname: "./dashboard", 
              params: { role, name: name || 'User' } 
            });
            return;
          }
        }
        
        // Token invalid; ensure cleared
        if (isMounted) {
          await AsyncStorage.removeItem('token');
          await AsyncStorage.removeItem('userRole');
          await AsyncStorage.removeItem('userId');
          await AsyncStorage.removeItem('userName');
        }
      } catch (error: any) {
        // Clear invalid tokens and show appropriate message if needed
        if (isMounted) {
          await AsyncStorage.removeItem('token');
          await AsyncStorage.removeItem('userRole');
          await AsyncStorage.removeItem('userId');
          await AsyncStorage.removeItem('userName');
          
          // Only show error toast for network issues, not for expired tokens
          if (error.message && error.message.includes('Network error')) {
            showToast('Network error. Please check your connection', 'error');
          }
        }
      } finally {
        if (isMounted) {
          setCheckingAuth(false);
        }
      }
    };
    
    checkLoginStatus();
    
    return () => {
      isMounted = false;
    };
  }, [showToast, isLoggingIn, router]);

  // Animate auth check spinner
  useEffect(() => {
    if (checkingAuth) {
      Animated.loop(
        Animated.timing(checkAuthAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        })
      ).start();
    }
  }, [checkingAuth]);

  useEffect(() => {
    Animated.spring(logoAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 6,
      tension: 80,
    }).start();
  }, []);

  const handleLogin = async () => {
    if (!phone || !password) {
      showToast('Please enter phone number and password', 'error');
      return;
    }
    
    // Animate button
    Animated.sequence([
      Animated.timing(buttonAnim, {
        toValue: 0.96,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(buttonAnim, {
        toValue: 1,
        friction: 3,
        tension: 80,
        useNativeDriver: true,
      })
    ]).start();

    setLoading(true);
    setIsLoggingIn(true);
    try {
      const data = await login(phone, password);
      if (data.token) {
        // Store user name and userId for future use
        await AsyncStorage.setItem('userName', data.name);
        if (data.userId) await AsyncStorage.setItem('userId', data.userId);
        
        // Register push notification token after successful login
        try {
          await registerToken();
        } catch (error) {
          // Don't block login if push token registration fails
          console.warn('Failed to register push token:', error);
        }
        
        // Navigate immediately to dashboard
        router.replace({ pathname: "./dashboard", params: { role: data.role, name: data.name } });
      } else {
        showToast('Login failed. Please try again', 'error');
      }
    } catch (err: any) {
      // Show specific error message from the enhanced error handling
      const errorMessage = err.message || 'Login failed. Please try again';
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
      setIsLoggingIn(false);
    }
  };

  // Animated SVG spinner (simple)
  const Spinner = () => (
    <Animated.View style={{
      transform: [{ rotate: logoAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }],
      marginBottom: 8,
    }}>
      <Ionicons name="cart" size={54} color={ACCENT} />
    </Animated.View>
  );

  // Loading spinner for auth check
  const AuthCheckSpinner = () => {
    const spin = checkAuthAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '360deg'],
    });
    
    return (
      <Animated.View style={{
        transform: [{ rotate: spin }],
      }}>
        <Ionicons name="cart" size={48} color={ACCENT} />
      </Animated.View>
    );
  };

  // Show loading overlay while checking authentication
  if (checkingAuth) {
    return (
      <View style={styles.loadingOverlay}>
        <View style={styles.loadingCard}>
          <AuthCheckSpinner />
          <Text style={styles.loadingTitle}>Welcome to Sarathi !</Text>
          <ActivityIndicator 
            size="small" 
            color={ACCENT} 
            style={{ marginTop: 16 }}
          />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.gradientBg}>
        <Animated.View
          style={{
            alignItems: "center",
            opacity: logoAnim,
            transform: [
              {
                translateY: logoAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-40, 0],
                }),
              },
            ],
          }}
        >
          <Spinner />
          <Text style={styles.heading}>👋 Welcome Back</Text>
          <Text style={styles.subheading}>Let's get you started</Text>
        </Animated.View>
        <View style={styles.formCard}>
          <Text style={styles.title}>Sign in to your account</Text>
          <TextInput
            placeholder="Phone No"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            style={styles.input}
            placeholderTextColor="#b0b3b8"
          />
          <TextInput
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={styles.input}
            placeholderTextColor="#b0b3b8"
          />
          <Animated.View style={{ transform: [{ scale: buttonAnim }] }}>
            <Pressable
              style={({ pressed }) => [
                styles.button,
                pressed && styles.buttonPressed,
              ]}
              onPress={handleLogin}
              disabled={loading}
            >
              <Text style={styles.buttonText}>{loading ? 'Logging in...' : 'Login'}</Text>
            </Pressable>
          </Animated.View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  gradientBg: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    height: "100%",
    backgroundColor: androidUI.colors.background,
  },
  heading: {
    fontSize: 28,
    fontWeight: '700',
    color: ACCENT,
    marginBottom: 2,
    fontFamily: androidUI.fontFamily.medium,
  },
  subheading: {
    fontSize: 16,
    color: androidUI.colors.text.secondary,
    fontWeight: '500',
    marginBottom: 18,
    fontFamily: androidUI.fontFamily.regular,
  },
  formCard: {
    width: width * 0.9,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: androidUI.borderRadius.xxlarge,
    padding: 28,
    alignItems: "center",
    ...androidUI.modalShadow,
    marginTop: 16,
  },
  title: {
    fontSize: 18,
    color: androidUI.colors.text.primary,
    fontWeight: "600",
    fontFamily: androidUI.fontFamily.regular,
    marginBottom: 22,
    letterSpacing: 0.2,
  },
  input: {
    width: "100%",
    borderWidth: 0,
    borderRadius: androidUI.borderRadius.medium,
    padding: androidUI.spacing.lg,
    marginBottom: 18,
    fontSize: 16,
    backgroundColor: "#f3f6fa",
    color: androidUI.colors.text.primary,
    ...androidUI.shadow,
    fontFamily: androidUI.fontFamily.regular,
  },
  button: {
    backgroundColor: ACCENT,
    paddingVertical: 15,
    paddingHorizontal: 60,
    borderRadius: androidUI.borderRadius.xxlarge,
    ...androidUI.cardShadow,
    shadowColor: ACCENT,
    marginTop: 8,
    transitionDuration: "200ms",
  },
  buttonPressed: {
    backgroundColor: "#304ffe",
    ...androidUI.buttonPress,
  },
  buttonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.5,
    fontFamily: androidUI.fontFamily.medium,
  },
  loadingOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
    backgroundColor: androidUI.colors.background,
  },
  loadingCard: {
    width: width * 0.85,
    backgroundColor: androidUI.colors.surface,
    borderRadius: androidUI.borderRadius.xxlarge,
    paddingVertical: 50,
    paddingHorizontal: 32,
    alignItems: 'center',
    ...androidUI.modalShadow,
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: androidUI.colors.text.primary,
    marginTop: 24,
    textAlign: 'center',
    fontFamily: androidUI.fontFamily.regular,
    letterSpacing: 0.2,
  },
});
