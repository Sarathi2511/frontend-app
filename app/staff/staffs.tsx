import { Ionicons } from '@expo/vector-icons';
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Animated, FlatList, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { deleteStaff, getStaff } from "../utils/api";
import { useSocket } from "../contexts/SocketContext";
import ConnectionStatus from "../components/ConnectionStatus";
import { androidUI } from "../utils/androidUI";

const ACCENT = "#3D5AFE";

export default function StaffsScreen() {
  const router = useRouter();
  const [staffs, setStaffs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedStaffId, setExpandedStaffId] = useState<string | null>(null);
  const [animatedHeight] = useState(new Animated.Value(0));
  const { lastProductEvent } = useSocket();

  const fetchAndSetStaffs = async () => {
    setLoading(true);
    try {
      const response = await getStaff();
      setStaffs(response.data);
    } catch (err) {
      setStaffs([]);
      Alert.alert("Error", "Failed to fetch staff");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAndSetStaffs();
  }, []);

  // Listen for real-time staff updates
  useEffect(() => {
    if (lastProductEvent) {
      // Refresh staff list when real-time events occur
      if (lastProductEvent.type === 'staff_created' || lastProductEvent.type === 'staff_updated' || lastProductEvent.type === 'staff_deleted') {
        fetchAndSetStaffs();
      }
    }
  }, [lastProductEvent]);

  // Filter staff by search
  const filteredStaffs = staffs.filter(
    (s) =>
      (s.name && s.name.toLowerCase().includes(search.toLowerCase())) ||
      (s.phone && s.phone.toLowerCase().includes(search.toLowerCase()))
  );

  const handleMenuToggle = (staffId: string) => {
    if (expandedStaffId === staffId) {
      // Close the menu
      Animated.timing(animatedHeight, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start(() => setExpandedStaffId(null));
    } else {
      // Open the menu
      setExpandedStaffId(staffId);
      Animated.timing(animatedHeight, {
        toValue: 120, // Height for two menu items
        duration: 200,
        useNativeDriver: false,
      }).start();
    }
  };

  const handleEditStaff = (staff: any) => {
    setExpandedStaffId(null);
    Animated.timing(animatedHeight, {
      toValue: 0,
      duration: 150,
      useNativeDriver: false,
    }).start();
    if (staff && staff._id) {
      router.push({ pathname: '/staff/EditStaff', params: { id: staff._id } });
    }
  };

  const handleDeleteStaff = async (staff: any) => {
    setExpandedStaffId(null);
    Animated.timing(animatedHeight, {
      toValue: 0,
      duration: 150,
      useNativeDriver: false,
    }).start();
    if (!staff) return;
    Alert.alert(
      'Delete Staff',
      `Are you sure you want to delete "${staff.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive', onPress: async () => {
            try {
              await deleteStaff(staff._id);
              fetchAndSetStaffs();
            } catch (err) {
              Alert.alert('Error', 'Failed to delete staff');
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.screenWrap}>
      {/* Header */}
      <View style={styles.headerBar}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={ACCENT} />
        </Pressable>
        <Text style={styles.headerTitle}>Staff</Text>
        <ConnectionStatus />
      </View>
      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={ACCENT} />
        </View>
      ) : (
        <>
          {/* Search Bar */}
          <View style={styles.filterBar}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by Name or Phone"
              value={search}
              onChangeText={setSearch}
            />
          </View>
          <FlatList
            data={filteredStaffs}
            keyExtractor={item => item._id}
            contentContainerStyle={{ paddingBottom: 32 }}
            renderItem={({ item }) => (
              <View style={styles.card}>
                {/* Top Row: Staff Name and Role */}
                <View style={styles.cardRowTop}>
                  <Text style={styles.staffName} numberOfLines={1}>{item.name}</Text>
                  <View style={styles.roleChip}>
                    <Text style={styles.roleChipText}>{item.role}</Text>
                  </View>
                  <Pressable 
                    style={[styles.menuIconBtn, expandedStaffId === item._id && styles.menuIconBtnActive]} 
                    onPress={() => handleMenuToggle(item._id)}
                  >
                    <Animated.View style={{
                      transform: [{
                        rotate: expandedStaffId === item._id ? '180deg' : '0deg'
                      }]
                    }}>
                      <Ionicons name="chevron-down" size={20} color={expandedStaffId === item._id ? ACCENT : "#b0b3b8"} />
                    </Animated.View>
                  </Pressable>
                </View>
                {/* Bottom Row: Phone */}
                <View style={styles.cardRowBot}>
                  <Text style={styles.infoLabel}>Phone</Text>
                  <Text style={styles.infoValue}>{item.phone}</Text>
                </View>
                
                {/* Animated Action Menu */}
                {expandedStaffId === item._id && (
                  <Animated.View style={[styles.actionMenu, { height: animatedHeight }]}>
                    <Pressable 
                      style={[styles.actionButton, styles.editButton]} 
                      onPress={() => handleEditStaff(item)}
                    >
                      <Ionicons name="pencil" size={18} color="#3D5AFE" />
                      <Text style={[styles.actionButtonText, styles.editButtonText]}>Edit Staff</Text>
                    </Pressable>
                    
                    <Pressable 
                      style={[styles.actionButton, styles.deleteButton]} 
                      onPress={() => handleDeleteStaff(item)}
                    >
                      <Ionicons name="trash" size={18} color="#e53935" />
                      <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Delete Staff</Text>
                    </Pressable>
                  </Animated.View>
                )}
              </View>
            )}
            ListEmptyComponent={() => (
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyText}>No Staff Found</Text>
              </View>
            )}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screenWrap: {
    flex: 1,
    backgroundColor: androidUI.colors.background,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: androidUI.colors.surface,
    paddingTop: Platform.OS === 'ios' ? 48 : androidUI.statusBarHeight + 12,
    paddingBottom: androidUI.spacing.lg,
    paddingHorizontal: androidUI.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: androidUI.colors.border,
    elevation: 4,
    zIndex: 10,
    minHeight: 68,
  },
  backBtn: {
    backgroundColor: androidUI.colors.border,
    borderRadius: androidUI.borderRadius.large,
    padding: androidUI.spacing.sm,
    marginRight: androidUI.spacing.md,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: androidUI.colors.text.primary,
    letterSpacing: 0.2,
    fontFamily: androidUI.fontFamily.medium,
  },
  loaderWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: androidUI.colors.background,
  },
  filterBar: {
    marginBottom: androidUI.spacing.lg,
    padding: 10,
    backgroundColor: androidUI.colors.surface,
    borderRadius: androidUI.borderRadius.medium,
    ...androidUI.shadow,
  },
  searchInput: {
    backgroundColor: '#f3f6fa',
    borderRadius: androidUI.borderRadius.small,
    padding: 10,
    marginBottom: 0,
    fontSize: 15,
    color: androidUI.colors.text.primary,
  },
  card: {
    backgroundColor: androidUI.colors.surface,
    borderRadius: androidUI.borderRadius.large,
    padding: androidUI.spacing.lg,
    marginBottom: androidUI.spacing.lg,
    ...androidUI.cardShadow,
    marginHorizontal: 6,
    transitionDuration: '200ms',
  },
  cardRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  staffName: {
    fontSize: 16,
    fontWeight: '600',
    color: ACCENT,
    marginBottom: 4,
    marginTop: 2,
    flex: 1,
  },
  roleChip: {
    backgroundColor: '#e3eaff',
    borderRadius: androidUI.borderRadius.medium,
    paddingVertical: 4,
    paddingHorizontal: androidUI.spacing.md,
    marginLeft: androidUI.spacing.sm,
  },
  roleChipText: {
    fontSize: 14,
    fontWeight: '700',
    color: ACCENT,
    textTransform: 'capitalize',
  },
  cardRowBot: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 12,
  },
  infoLabel: {
    fontSize: 13,
    color: androidUI.colors.text.secondary,
    marginRight: 6,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '700',
    color: androidUI.colors.text.primary,
  },
  emptyWrap: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyText: {
    fontSize: 18,
    color: androidUI.colors.text.disabled,
    marginBottom: androidUI.spacing.xxl,
    fontWeight: '600',
  },
  menuIconBtn: {
    padding: 8,
    borderRadius: androidUI.borderRadius.large,
    backgroundColor: '#f3f6fa',
    marginLeft: androidUI.spacing.sm,
  },
  menuIconBtnActive: {
    backgroundColor: '#e3eaff',
    transform: [{ scale: 1.05 }],
  },
  actionMenu: {
    marginTop: androidUI.spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: androidUI.spacing.md,
    overflow: 'hidden',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: androidUI.spacing.md,
    borderRadius: androidUI.borderRadius.medium,
    marginBottom: 8,
    gap: 12,
  },
  editButton: {
    backgroundColor: '#f0f7ff',
    borderWidth: 1,
    borderColor: '#e3eaff',
  },
  deleteButton: {
    backgroundColor: '#fff5f5',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: androidUI.fontFamily.medium,
  },
  editButtonText: {
    color: ACCENT,
  },
  deleteButtonText: {
    color: '#e53935',
  },
});
