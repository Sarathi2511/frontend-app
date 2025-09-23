import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from "expo-router";
// import * as ScreenOrientation from 'expo-screen-orientation';
import { useEffect, useRef, useState } from "react";
import { Alert, Animated, Dimensions, Modal, Platform, Pressable, Animated as RNAnimated, StyleSheet, Text, TouchableWithoutFeedback, View } from "react-native";
import { getCurrentUserId, getOrdersAssignedTo, logout } from './utils/api';
import NotificationButton from './components/NotificationButton';
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
    roles: ["Admin", "Staff", "Executive"]
  },
  {
    key: "inventory",
    title: "Inventory",
    icon: "💡",
    color: "#00C853",
    description: "Check and update stock levels.",
    roles: ["Admin", "Staff"]  // Executive can't view inventory
  },
  {
    key: "staff",
    title: "Staff",
    icon: "👤",
    color: "#FF9100",
    description: "Manage staff information.",
    roles: ["Admin"]
  },
  {
    key: "analytics",
    title: "Analytics",
    icon: "📊",
    color: "#D500F9",
    description: "View business analytics and insights.",
    roles: ["Admin"]
  },
];



const orderStatusOptions = ["Pending", "DC", "Invoice", "Dispatched"];
const mockStaff = ["Ravi Kumar", "Priya Singh", "Amit Patel", "Sunita Rao"];
const paymentOptions = ["Immediate", "15 Days", "30 Days"];

export default function DashboardScreen() {
  const { role, name } = useLocalSearchParams();
  const userName = typeof name === 'string' ? name : Array.isArray(name) ? name[0] : "User";
  const userRole = typeof role === 'string' ? role : Array.isArray(role) ? role[0] : "User";
  const router = useRouter();

  const [myOrdersCount, setMyOrdersCount] = useState<number>(0);
  const [showQuickActions, setShowQuickActions] = useState(false);



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
  


  const handleImagePick = async () => {
    // setImageUploading(true); // Removed
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      // setOrderForm({ ...orderForm, image: result.assets[0].uri }); // Removed
    }
    // setImageUploading(false); // Removed
  };

  const handleOrderChange = (field: string, value: any) => {
    // setOrderForm({ ...orderForm, [field]: value }); // Removed
  };

  const handleOrderSubmit = () => {
    // For now, just log the order // Removed
    // setOrderModal(false); // Removed
    console.log('Order Submitted:', 'Order Form Data'); // Modified
  };

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
              router.replace('/login');
            } catch (err) {
              console.error('Logout failed:', err);
              Alert.alert("Error", "Failed to logout. Please try again.");
            }
          }
        }
      ]
    );
  };

  // Helper for animated card
  const [pressedCard, setPressedCard] = useState<string | null>(null);

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
              <NotificationButton />
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
          {/* My Orders Card */}
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
                <Pressable 
                  style={styles.quickActionButton}
                  onPress={() => handleQuickAction('order')}
                >
                  <Text style={styles.quickActionIcon}>📝</Text>
                  <Text style={styles.quickActionLabel}>Orders</Text>
                </Pressable>
                <Pressable 
                  style={styles.quickActionButton}
                  onPress={() => handleQuickAction('product')}
                >
                  <Text style={styles.quickActionIcon}>📦</Text>
                  <Text style={styles.quickActionLabel}>Products</Text>
                </Pressable>
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
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: androidUI.colors.surface,
    borderRadius: androidUI.borderRadius.large,
    padding: androidUI.spacing.xl,
    marginBottom: androidUI.spacing.lg,
    width: width * 0.92,
    ...androidUI.cardShadow,
    shadowColor: ACCENT,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 14,
    marginRight: 18,
  },
  userName: {
    fontSize: 19,
    fontWeight: "700",
    color: androidUI.colors.text.primary,
    fontFamily: androidUI.fontFamily.medium,
    marginBottom: 2,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: "700",
    color: androidUI.colors.text.primary,
    alignSelf: "flex-start",
    marginLeft: width * 0.04,
    marginBottom: 10,
    marginTop: 2,
    letterSpacing: 0.2,
    fontFamily: androidUI.fontFamily.medium,
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

  orderModalSheetWrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  orderModalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingVertical: 28,
    paddingHorizontal: 24,
    minHeight: 480,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 12,
  },
  orderHeader: {
    fontSize: 20,
    fontWeight: '700',
    color: ACCENT,
    marginBottom: 18,
    textAlign: 'center',
    fontFamily: Platform.OS === "ios" ? "System" : "sans-serif-medium",
  },
  input: {
    width: '100%',
    borderWidth: 0,
    borderRadius: 14,
    padding: 16,
    marginBottom: 18,
    fontSize: 16,
    backgroundColor: '#f3f6fa',
    color: '#222',
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
    fontFamily: Platform.OS === "ios" ? "System" : "sans-serif",
  },
  dropdownWrap: {
    marginBottom: 18,
  },
  dropdownLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#22223b',
    marginBottom: 8,
    fontFamily: Platform.OS === "ios" ? "System" : "sans-serif-medium",
  },
  dropdownBox: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dropdownOption: {
    backgroundColor: '#f3f6fa',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  dropdownOptionSelected: {
    backgroundColor: ACCENT,
  },
  dropdownOptionText: {
    color: '#22223b',
    fontSize: 15,
    fontWeight: '500',
  },
  dropdownOptionTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  radioRow: {
    flexDirection: 'row',
    gap: 12,
  },
  radioBtn: {
    backgroundColor: '#f3f6fa',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
  },
  radioBtnSelected: {
    backgroundColor: ACCENT,
  },
  radioBtnText: {
    color: '#22223b',
    fontSize: 15,
    fontWeight: '500',
  },
  radioBtnTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  imageUploadBtn: {
    backgroundColor: '#f3f6fa',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 18,
    alignItems: 'center',
    marginBottom: 8,
  },
  imageUploadBtnText: {
    color: ACCENT,
    fontWeight: '600',
    fontSize: 15,
  },
  uploadedImage: {
    width: 120,
    height: 90,
    borderRadius: 10,
    marginTop: 6,
    marginBottom: 8,
    alignSelf: 'center',
  },
  placeholderText: {
    color: '#b0b3b8',
    fontSize: 14,
    fontStyle: 'italic',
  },
  orderSubmitBtn: {
    backgroundColor: ACCENT,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 4,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 3,
  },
  orderSubmitBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  orderCancelBtn: {
    backgroundColor: '#f3f6fa',
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 8,
  },
  orderCancelBtnText: {
    color: ACCENT,
    fontWeight: '600',
    fontSize: 15,
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
}); 