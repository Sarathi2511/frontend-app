import { useRouter } from "expo-router";
import { useEffect, useState, useRef } from "react";
import { Alert, Animated, Dimensions, Image, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View, LayoutAnimation, UIManager } from "react-native";
import { login } from "./api";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useSocket } from "./contexts/SocketContext";
import { androidUI } from "./utils/androidUI";
import { useToast } from "./contexts/ToastContext";

const { width, height } = Dimensions.get("window");
const ACCENT = "#3D5AFE";

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function LoginScreen() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const router = useRouter();
  const logoAnim = useState(new Animated.Value(0))[0];
  const buttonAnim = useRef(new Animated.Value(1)).current;
  const { connect } = useSocket();
  const { showToast } = useToast();

  // Check if user is already logged in - but don't auto-navigate
  useEffect(() => {
    const checkLoginStatus = async () => {
      // Don't check login status if user is actively logging in
      if (isLoggingIn) return;
      
      try {
        const token = await AsyncStorage.getItem('token');
        const role = await AsyncStorage.getItem('userRole');
        const name = await AsyncStorage.getItem('userName');
        if (token && role) {
          // Validate token with backend - but don't navigate
          const { success } = await (await import('./api')).validateToken();
          if (success) {
            // Don't auto-navigate - let the user manually log in
            // await connect();
            // router.replace({ pathname: "./dashboard", params: { role, name } });
            return;
          }
        }
        // Token invalid; ensure cleared
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('userRole');
        await AsyncStorage.removeItem('userId');
        await AsyncStorage.removeItem('userName');
      } catch (error: any) {
        // Clear invalid tokens and show appropriate message if needed
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('userRole');
        await AsyncStorage.removeItem('userId');
        await AsyncStorage.removeItem('userName');
        
        // Only show error toast for network issues, not for expired tokens
        if (error.message && error.message.includes('Network error')) {
          showToast('Network error. Please check your connection', 'error');
        }
      }
    };
    checkLoginStatus();
  }, [showToast, isLoggingIn]); // Removed connect from dependencies

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
        
        // Establish WebSocket connection after successful login
        await connect();
        
        // Navigate immediately to dashboard
        router.replace({ pathname: "./dashboard", params: { role: data.role, name: data.name } });
        
        // Show success toast with role-specific message after navigation
        const roleMessage = data.role === 'Admin' ? 'Welcome back, Admin!' : 
                           data.role === 'Staff' ? 'Welcome back, Staff!' :
                           data.role === 'Executive' ? 'Welcome back, Executive!' :
                           `Welcome back, ${data.name}!`;
        showToast(roleMessage, 'success');
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

  // Collapsible demo users
  const toggleDemo = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowDemo(v => !v);
  };

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
          <View style={{ marginTop: 24 }}>
            <Pressable style={styles.demoToggle} onPress={toggleDemo}>
              <Ionicons name={showDemo ? "chevron-up" : "chevron-down"} size={18} color={ACCENT} style={{ marginRight: 6 }} />
              <Text style={styles.demoToggleText}>{showDemo ? "Hide Demo Users" : "Try Demo Users"}</Text>
            </Pressable>
            {showDemo && (
              <View style={styles.demoBox}>
                <Text style={styles.demoText}>
                  Admin: 1111111111 / adminpass{"\n"}
                  Staff: 2222222222 / staffpass{"\n"}
                  Executive: 3333333333 / execpass
                </Text>
              </View>
            )}
          </View>
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
  logo: {
    width: 60,
    height: 60,
    marginBottom: 8,
    borderRadius: androidUI.borderRadius.medium,
    ...androidUI.shadow,
  },
  appName: {
    fontSize: 26,
    fontWeight: "700",
    color: ACCENT,
    fontFamily: androidUI.fontFamily.medium,
    marginBottom: 32,
    letterSpacing: 0.5,
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
  demoToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    paddingVertical: androidUI.spacing.sm,
    paddingHorizontal: 18,
    borderRadius: androidUI.borderRadius.large,
    backgroundColor: '#f3f6fa',
    marginBottom: 4,
  },
  demoToggleText: {
    color: ACCENT,
    fontWeight: '600',
    fontSize: 15,
  },
  demoBox: {
    backgroundColor: androidUI.colors.surface,
    borderRadius: androidUI.borderRadius.medium,
    padding: androidUI.spacing.lg,
    marginTop: 6,
    ...androidUI.shadow,
  },
  demoText: {
    color: androidUI.colors.text.disabled,
    fontSize: 13,
    textAlign: 'center',
    fontFamily: androidUI.fontFamily.regular,
    marginTop: 8,
    lineHeight: 18,
  },
}); 