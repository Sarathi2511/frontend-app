import Constants from 'expo-constants';
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { Animated, Dimensions, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get("window");
const ACCENT = "#3D5AFE";

export default function Welcome() {
  const router = useRouter();
  const buttonAnim = useRef(new Animated.Value(1)).current;
  const iconAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(iconAnim, {
        toValue: 1,
        duration: 1800,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const spin = iconAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const handlePressIn = () => {
    Animated.spring(buttonAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 30,
      bounciness: 8,
    }).start();
  };
  const handlePressOut = () => {
    Animated.spring(buttonAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 30,
      bounciness: 8,
    }).start();
  };

  return (
    <View style={styles.gradientBg}>
      <View style={styles.card}>
        <View style={styles.illustrationWrap}>
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <Ionicons name="cube" size={54} color={ACCENT} />
          </Animated.View>
        </View>
        <Text style={styles.heading}>Sarathi Orders</Text>
        <Text style={styles.description}>
          All your shop orders, products, and staff in one place.
        </Text>
        <Animated.View style={{ width: '100%', alignItems: 'center', transform: [{ scale: buttonAnim }] }}>
          <Pressable
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            android_ripple={{ color: '#e3e9f9' }}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onPress={() => router.push("./login")}
          >
            <LinearGradient
              colors={["#3b82f6", "#2563eb"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.buttonGradient}
            >
              <Text style={styles.buttonText}>Login</Text>
            </LinearGradient>
          </Pressable>
        </Animated.View>
        <Text style={styles.tagline}>New here? Contact your admin to register.</Text>
      </View>
      <Text style={styles.versionInfo}>v{Constants.manifest?.version || '1.0.0'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  gradientBg: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    height: "100%",
    backgroundColor: "#f6f9fc",
    ...Platform.select({
      ios: {
        backgroundImage: 'linear-gradient(180deg, #f6f9fc 0%, #ffffff 100%)',
      },
      android: {
        backgroundColor: "#f6f9fc",
      },
      default: {},
    }),
  },
  card: {
    width: width * 0.9,
    backgroundColor: "#fff",
    borderRadius: 24,
    paddingVertical: 40,
    paddingHorizontal: 28,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.10,
    shadowRadius: 24,
    elevation: 12,
  },
  illustrationWrap: {
    backgroundColor: "#e3e9f9",
    borderRadius: 32,
    width: 64,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 4,
  },
  heading: {
    fontSize: 26,
    fontWeight: "800",
    color: ACCENT,
    marginBottom: 12,
    textAlign: "center",
    fontFamily: Platform.OS === "ios" ? "System" : "sans-serif-medium",
    letterSpacing: 0.2,
  },
  description: {
    fontSize: 15,
    fontWeight: "400",
    color: "#6c6f7b",
    marginBottom: 36,
    textAlign: "center",
    lineHeight: 22,
    fontFamily: Platform.OS === "ios" ? "System" : "sans-serif",
  },
  button: {
    borderRadius: 30,
    marginBottom: 10,
    width: '100%',
    alignItems: 'center',
    transitionDuration: "200ms",
    overflow: 'hidden',
  },
  buttonGradient: {
    width: '100%',
    paddingVertical: 15,
    paddingHorizontal: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.97 }],
  },
  buttonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.5,
    fontFamily: Platform.OS === "ios" ? "System" : "sans-serif-medium",
  },
  tagline: {
    color: '#b0b3b8',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 18,
    fontFamily: Platform.OS === "ios" ? "System" : "sans-serif",
  },
  versionInfo: {
    position: 'absolute',
    bottom: 18,
    color: '#b0b3b8',
    fontSize: 11,
    letterSpacing: 0.2,
    fontFamily: Platform.OS === "ios" ? "System" : "sans-serif",
    opacity: 0.5,
  },
});
