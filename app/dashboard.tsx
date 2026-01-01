import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Dimensions, Platform, Pressable, Animated as RNAnimated, StyleSheet, Text, TouchableWithoutFeedback, View } from "react-native";
import { getCurrentUserId, getOrdersAssignedTo, logout } from './utils/api';
import { androidUI } from './utils/androidUI';

const { width } = Dimensions.get("window");
const ACCENT = "#3D5AFE";

const modules = [
  {
    key: "orders",
    title: "Orders",
    icon: "📦",
    color: "#3D5AFE",
    description: "View and create shop orders.",
    roles: ["Admin", "Staff", "Executive", "Inventory Manager"]
  },
  {
    key: "inventory",
    title: "Inventory",
    icon: "💡",
    color: "#00C853",
    description: "Check and update stock levels.",
    roles: ["Admin", "Inventory Manager"]
  },
  {
    key: "staff",
    title: "Staff",
    icon: "👤",
    color: "#FF9100",
    description: "Manage staff information.",
    roles: ["Admin"]  // Admin only
  },
  {
    key: "analytics",
    title: "Analytics",
    icon: "📊",
    color: "#D500F9",
    description: "View business analytics and insights.",
    roles: ["Admin"]  // Admin only
  },
];

export default function DashboardScreen() {
  const { role, name } = useLocalSearchParams();
  const userName = typeof name === 'string' ? name : Array.isArray(name) ? name[0] : "User";
  const userRole = typeof role === 'string' ? role : Array.isArray(role) ? role[0] : "User";
  const router = useRouter();

  const [myOrdersCount, setMyOrdersCount] = useState<number>(0);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [pressedCard, setPressedCard] = useState<string | null>(null);



  useEffect(() => {
    const fetchMyOrdersCount = async () => {
      try {
        const userId = await getCurrentUserId();
        if (userId) {
          const response = await getOrdersAssignedTo(userId);
          setMyOrdersCount(Array.isArray(response.data) ? response.data.length : 0);
        }
      } catch {
        setMyOrdersCount(0);
      }
    };
    fetchMyOrdersCount();
  }, []);

  // Dynamic greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };
  const greeting = getGreeting();
  const firstName = userName.split(' ')[0];

  // Profile initials (if no image)
  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };
  const initials = getInitials(userName);

  // Filter modules based on user role
  const allowedModules = modules.filter(mod => mod.roles.includes(userRole));
  
  const handleQuickAction = (action: string) => {
    setShowQuickActions(false);
    if (action === 'order') {
      router.push({ pathname: './orders/new-order', params: { name, role } });
    } else if (action === 'product') {
      router.push({ pathname: './products/new-product', params: { role } });
    } else if (action === 'staff' && userRole === 'Admin') {
      router.push({ pathname: './staff/new-staff', params: { role } });
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            try {
              await logout();
              router.replace('/');
            } catch (err) {
              console.error('Logout failed:', err);
              Alert.alert("Error", "Failed to logout. Please try again.");
            }
          }
        }
      ]
    );
  };
  
  return (
    <View style={{ flex: 1 }}>
      {/* Soft Gradient Background */}
      <LinearGradient
        colors={["#e3e9f9", "#f5f7fa", "#f8fafc"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.bg}>
        {/* Modern Header Card */}
        <LinearGradient
          colors={["#e3e9f9", "#f5f7fa"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerCard}
        >
          <View style={styles.headerRow}>
            {/* Profile Circle */}
            <View style={styles.profileCircle}>
              {/* If you have a profile image, use <Image ... /> here */}
              <Text style={styles.profileInitials}>{initials}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text style={styles.greetingText}>{greeting},</Text>
              <Text style={styles.greetingName}>{firstName} <Text style={{ fontSize: 20 }}>👋</Text></Text>
              <Text style={styles.userRole}>{userRole}</Text>
            </View>
            <View style={styles.headerActions}>
              <Pressable 
                style={({ pressed }) => [
                  styles.logoutButton,
                  pressed && { opacity: 0.7 }
                ]} 
                onPress={handleLogout}
              >
                <Ionicons name="log-out-outline" size={24} color={ACCENT} />
              </Pressable>
            </View>
          </View>
        </LinearGradient>
        {/* Dashboard Title Section */}
        <View style={styles.dashboardTitleWrap}>
          <View style={styles.dashboardTitleRow}>
            <View style={styles.dashboardTitleLeft}>
              <Text style={styles.dashboardIcon}>🧭</Text>
              <Text style={styles.dashboardTitle}>Dashboard</Text>
            </View>
            <Pressable 
              style={styles.dashboardAddButton}
              onPress={() => setShowQuickActions(true)}
            >
              <Text style={styles.dashboardAddButtonText}>+</Text>
            </Pressable>
          </View>
          <View style={styles.dashboardDivider} />
        </View>
        {/* Dashboard Modules */}
        <View style={styles.modulesWrap}>
          {/* My Orders Card - Hide for Inventory Manager */}
          {userRole !== 'Inventory Manager' && (
            <RNAnimated.View
              style={{
                transform: [ { scale: pressedCard === 'my-orders' ? 0.97 : 1 } ],
                shadowColor: ACCENT,
                shadowOffset: { width: 0, height: pressedCard === 'my-orders' ? 12 : 8 },
                shadowOpacity: pressedCard === 'my-orders' ? 0.18 : 0.10,
                shadowRadius: pressedCard === 'my-orders' ? 18 : 10,
                elevation: pressedCard === 'my-orders' ? 12 : 6,
                marginBottom: 18,
                borderRadius: 16,
              }}
            >
              <Pressable
                style={[styles.moduleCard, { borderColor: ACCENT + '33', borderWidth: 1 }]}
                onPressIn={() => setPressedCard('my-orders')}
                onPressOut={() => setPressedCard(null)}
                onPress={() => router.push({ pathname: './orders/my-orders', params: { role, name } })}
              >
                <View style={[styles.iconCircle, { backgroundColor: ACCENT + '22', position: 'relative' }]}> 
                  <Text style={{ fontSize: 28 }}>🗂️</Text>
                  <View style={{
                    position: 'absolute',
                    top: -6,
                    right: -6,
                    backgroundColor: '#ff5252',
                    borderRadius: 10,
                    minWidth: 20,
                    height: 20,
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: 6,
                    zIndex: 2,
                  }}>
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>{myOrdersCount}</Text>
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.moduleTitle}>My Orders</Text>
                  <Text style={styles.moduleDesc}>View orders assigned to you</Text>
                </View>
                <View style={styles.ctaArrowWrap}>
                  <Ionicons name="chevron-forward" size={22} color={ACCENT} />
                </View>
              </Pressable>
            </RNAnimated.View>
          )}
          {/* Render the rest of the modules */}
          {allowedModules.map((mod) => {
            const isPressed = pressedCard === mod.key;
            return (
              <RNAnimated.View
                key={mod.key}
                style={{
                  transform: [
                    { scale: isPressed ? 0.97 : 1 }
                  ],
                  shadowColor: mod.color,
                  shadowOffset: { width: 0, height: isPressed ? 12 : 8 },
                  shadowOpacity: isPressed ? 0.18 : 0.10,
                  shadowRadius: isPressed ? 18 : 10,
                  elevation: isPressed ? 12 : 6,
                  marginBottom: 18,
                  borderRadius: 16,
                }}
              >
                <Pressable
                  style={[styles.moduleCard, { borderColor: mod.color + '33', borderWidth: 1 }]}
                  onPressIn={() => setPressedCard(mod.key)}
                  onPressOut={() => setPressedCard(null)}
                  onPress={() => {
                    if (mod.key === 'orders') router.push({ pathname: './orders', params: { role } });
                    else if (mod.key === 'inventory') router.push({ pathname: './products', params: { role } });
                    else if (mod.key === 'staff') router.push({ pathname: './staff', params: { role } });
                    else if (mod.key === 'analytics') router.push({ pathname: './analytics', params: { role } });
                  }}
                >
                  <View style={[styles.iconCircle, { backgroundColor: mod.color + '22' }]}> 
                    <Text style={{ fontSize: 28 }}>{mod.icon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.moduleTitle}>{mod.title}</Text>
                    <Text style={styles.moduleDesc}>{mod.description}</Text>
                  </View>
                  <View style={styles.ctaArrowWrap}>
                    <Ionicons name="chevron-forward" size={22} color={mod.color} />
                  </View>
                </Pressable>
              </RNAnimated.View>
            );
          })}
        </View>
        
        {/* Quick Actions Overlay */}
        {showQuickActions && (
          <TouchableWithoutFeedback onPress={() => setShowQuickActions(false)}>
            <View style={styles.quickActionsOverlay}>
              <View style={styles.quickActionsContainer}>
                {/* Orders - Hide for Inventory Manager */}
                {userRole !== 'Inventory Manager' && (
                  <Pressable 
                    style={styles.quickActionButton}
                    onPress={() => handleQuickAction('order')}
                  >
                    <Text style={styles.quickActionIcon}>📝</Text>
                    <Text style={styles.quickActionLabel}>Orders</Text>
                  </Pressable>
                )}
                {/* Products - Available for Admin and Inventory Manager only (not Staff or Executive) */}
                {(userRole === 'Admin' || userRole === 'Inventory Manager') && (
                  <Pressable 
                    style={styles.quickActionButton}
                    onPress={() => handleQuickAction('product')}
                  >
                    <Text style={styles.quickActionIcon}>📦</Text>
                    <Text style={styles.quickActionLabel}>Products</Text>
                  </Pressable>
                )}
                {/* Staff - Admin only */}
                {userRole === 'Admin' && (
                  <Pressable 
                    style={styles.quickActionButton}
                    onPress={() => handleQuickAction('staff')}
                  >
                    <Text style={styles.quickActionIcon}>👤</Text>
                    <Text style={styles.quickActionLabel}>Staff</Text>
                  </Pressable>
                )}
              </View>
            </View>
          </TouchableWithoutFeedback>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    paddingTop: androidUI.safeAreaTop,
    alignItems: "center",
  },
  headerCard: {
    width: width * 0.92,
    borderRadius: androidUI.borderRadius.xxlarge,
    padding: androidUI.spacing.xxl,
    marginBottom: androidUI.spacing.lg,
    ...androidUI.cardShadow,
    shadowColor: ACCENT,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#3D5AFE22',
    alignItems: 'center',
    justifyContent: 'center',
    ...androidUI.shadow,
    shadowColor: ACCENT,
  },
  profileInitials: {
    fontSize: 26,
    fontWeight: '700',
    color: ACCENT,
    fontFamily: androidUI.fontFamily.medium,
  },
  greetingText: {
    fontSize: 16,
    color: androidUI.colors.text.primary,
    fontWeight: '500',
    marginBottom: 2,
    fontFamily: androidUI.fontFamily.regular,
  },
  greetingName: {
    fontSize: 22,
    fontWeight: '700',
    color: ACCENT,
    fontFamily: androidUI.fontFamily.medium,
    marginBottom: 2,
  },
  userRole: {
    fontSize: 14,
    color: ACCENT,
    fontWeight: "600",
    fontFamily: androidUI.fontFamily.regular,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoutButton: {
    padding: androidUI.spacing.sm,
    borderRadius: androidUI.borderRadius.medium,
    backgroundColor: '#f3f6fa',
    marginLeft: androidUI.spacing.sm,
  },
  modulesWrap: {
    width: width * 0.92,
    flexDirection: "column",
    gap: androidUI.spacing.lg,
  },
  moduleCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: androidUI.colors.surface,
    borderRadius: androidUI.borderRadius.large,
    padding: androidUI.spacing.lg,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: androidUI.spacing.lg,
  },
  moduleTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: androidUI.colors.text.primary,
    marginBottom: 2,
    fontFamily: androidUI.fontFamily.medium,
  },
  moduleDesc: {
    fontSize: 13,
    color: androidUI.colors.text.secondary,
    fontFamily: androidUI.fontFamily.regular,
  },
  dashboardTitleWrap: {
    width: width * 0.92,
    alignSelf: 'center',
    marginBottom: 18,
  },
  dashboardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  dashboardTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dashboardAddButton: {
    backgroundColor: ACCENT,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    ...androidUI.shadow,
  },
  dashboardAddButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    fontFamily: androidUI.fontFamily.medium,
  },
  dashboardIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  dashboardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#22223b',
    fontFamily: Platform.OS === "ios" ? "System" : "sans-serif-medium",
  },
  dashboardDivider: {
    height: 2,
    backgroundColor: '#e3e9f9',
    borderRadius: 2,
    marginVertical: 6,
    width: '100%',
  },

  ctaArrowWrap: {
    marginLeft: 12,
    backgroundColor: '#f3f6fa',
    borderRadius: 16,
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Quick Actions Styles
  quickActionsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  quickActionsContainer: {
    backgroundColor: androidUI.colors.surface,
    borderRadius: androidUI.borderRadius.xxlarge,
    padding: androidUI.spacing.xxl,
    flexDirection: 'row',
    gap: androidUI.spacing.xl,
    ...androidUI.modalShadow,
  },
  quickActionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: androidUI.spacing.lg,
    borderRadius: androidUI.borderRadius.medium,
    backgroundColor: '#f6f9fc',
    minWidth: 80,
  },
  quickActionIcon: {
    fontSize: 32,
    marginBottom: androidUI.spacing.sm,
  },
  quickActionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: androidUI.colors.text.primary,
    fontFamily: androidUI.fontFamily.medium,
  },
  welcomeContainer: {
    width: width * 0.92,
    backgroundColor: androidUI.colors.surface,
    borderRadius: androidUI.borderRadius.xxlarge,
    padding: androidUI.spacing.xxl * 2,
    alignItems: 'center',
    justifyContent: 'center',
    ...androidUI.cardShadow,
    shadowColor: ACCENT,
    marginTop: androidUI.spacing.xl,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: '700',
    color: ACCENT,
    textAlign: 'center',
    fontFamily: androidUI.fontFamily.medium,
    letterSpacing: 0.5,
  },
}); 