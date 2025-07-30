import { useRouter } from "expo-router";
import { useEffect, useState, useRef } from "react";
import { Alert, Animated, Dimensions, Image, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View, LayoutAnimation, UIManager } from "react-native";
import { login } from "./api";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useSocket } from "./contexts/SocketContext";

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
  const router = useRouter();
  const logoAnim = useState(new Animated.Value(0))[0];
  const buttonAnim = useRef(new Animated.Value(1)).current;
  const { connect } = useSocket();

  // Check if user is already logged in
  useEffect(() => {
    const checkLoginStatus = async () => {
      const token = await AsyncStorage.getItem('token');
      const role = await AsyncStorage.getItem('userRole');
      const name = await AsyncStorage.getItem('userName');
      if (token && role) {
        // Establish WebSocket connection for already logged in user
        await connect();
        router.replace({ pathname: "./dashboard", params: { role, name } });
      }
    };
    checkLoginStatus();
  }, [connect]);

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
      Alert.alert("Error", "Please enter phone number and password");
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
    try {
      const data = await login(phone, password);
      if (data.token) {
        // Store user name and userId for future use
        await AsyncStorage.setItem('userName', data.name);
        if (data.userId) await AsyncStorage.setItem('userId', data.userId);
        
        // Establish WebSocket connection after successful login
        // Small delay to ensure token is properly stored
        await new Promise(resolve => setTimeout(resolve, 100));
        await connect();
        
        router.replace({ pathname: "./dashboard", params: { role: data.role, name: data.name } });
      } else {
        Alert.alert("Login Failed", "Invalid phone number or password");
      }
    } catch (err) {
      Alert.alert("Login Error", "Could not connect to server");
    } finally {
      setLoading(false);
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
    backgroundColor: "#e3e9f9",
  },
  heading: {
    fontSize: 28,
    fontWeight: '700',
    color: ACCENT,
    marginBottom: 2,
    fontFamily: Platform.OS === "ios" ? "System" : "sans-serif-medium",
  },
  subheading: {
    fontSize: 16,
    color: '#6c6f7b',
    fontWeight: '500',
    marginBottom: 18,
    fontFamily: Platform.OS === "ios" ? "System" : "sans-serif",
  },
  logo: {
    width: 60,
    height: 60,
    marginBottom: 8,
    borderRadius: 14,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
  },
  appName: {
    fontSize: 26,
    fontWeight: "700",
    color: ACCENT,
    fontFamily: Platform.OS === "ios" ? "System" : "sans-serif-medium",
    marginBottom: 32,
    letterSpacing: 0.5,
  },
  formCard: {
    width: width * 0.9,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 22,
    padding: 28,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius: 18,
    elevation: 10,
    marginTop: 16,
  },
  title: {
    fontSize: 18,
    color: "#22223b",
    fontWeight: "600",
    fontFamily: Platform.OS === "ios" ? "System" : "sans-serif",
    marginBottom: 22,
    letterSpacing: 0.2,
  },
  input: {
    width: "100%",
    borderWidth: 0,
    borderRadius: 14,
    padding: 16,
    marginBottom: 18,
    fontSize: 16,
    backgroundColor: "#f3f6fa",
    color: "#222",
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
    fontFamily: Platform.OS === "ios" ? "System" : "sans-serif",
  },
  button: {
    backgroundColor: ACCENT,
    paddingVertical: 15,
    paddingHorizontal: 60,
    borderRadius: 30,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 3,
    marginTop: 8,
    transitionDuration: "200ms",
  },
  buttonPressed: {
    backgroundColor: "#304ffe",
    shadowOpacity: 0.28,
    transform: [{ scale: 0.97 }],
  },
  buttonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.5,
    fontFamily: Platform.OS === "ios" ? "System" : "sans-serif-medium",
  },
  demoToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 16,
    backgroundColor: '#f3f6fa',
    marginBottom: 4,
  },
  demoToggleText: {
    color: ACCENT,
    fontWeight: '600',
    fontSize: 15,
  },
  demoBox: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginTop: 6,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  demoText: {
    color: '#b0b3b8',
    fontSize: 13,
    textAlign: 'center',
    fontFamily: Platform.OS === "ios" ? "System" : "sans-serif",
    marginTop: 8,
    lineHeight: 18,
  },
}); 