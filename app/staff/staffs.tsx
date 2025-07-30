import { Ionicons } from '@expo/vector-icons';
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { deleteStaff, getStaff } from "../api";
import { useSocket } from "../contexts/SocketContext";
import ConnectionStatus from "../components/ConnectionStatus";

const ACCENT = "#3D5AFE";

export default function StaffsScreen() {
  const router = useRouter();
  const [staffs, setStaffs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [menuStaff, setMenuStaff] = useState<any>(null);
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

  const handleMenu = (staff: any) => setMenuStaff(staff);
  const closeMenu = () => setMenuStaff(null);

  const handleEditStaff = () => {
    closeMenu();
    if (menuStaff && menuStaff._id) {
      router.push({ pathname: '/staff/EditStaff', params: { id: menuStaff._id } });
    }
  };

  const handleDeleteStaff = async () => {
    closeMenu();
    if (!menuStaff) return;
    Alert.alert(
      'Delete Staff',
      `Are you sure you want to delete "${menuStaff.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive', onPress: async () => {
            try {
              await deleteStaff(menuStaff._id);
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
                  <Pressable style={styles.menuIconBtn} onPress={() => handleMenu(item)}>
                    <Ionicons name="ellipsis-vertical" size={20} color="#b0b3b8" />
                  </Pressable>
                </View>
                {/* Bottom Row: Phone */}
                <View style={styles.cardRowBot}>
                  <Text style={styles.infoLabel}>Phone</Text>
                  <Text style={styles.infoValue}>{item.phone}</Text>
                </View>
              </View>
            )}
            ListEmptyComponent={() => (
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyText}>No Staff Found</Text>
              </View>
            )}
          />
          {/* Menu Modal */}
          <Modal
            visible={!!menuStaff}
            transparent
            animationType="fade"
            onRequestClose={closeMenu}
          >
            <Pressable style={styles.menuOverlay} onPress={closeMenu} />
            <View style={styles.menuSheetBottom}>
              <Pressable style={styles.menuItem} onPress={handleEditStaff}>
                <Text style={styles.menuItemText}>Edit Staff</Text>
              </Pressable>
              <Pressable style={[styles.menuItem, { borderTopWidth: 1, borderTopColor: '#eee', marginTop: 6 }]} onPress={handleDeleteStaff}>
                <Text style={[styles.menuItemText, { color: '#e53935', fontWeight: '700' }]}>Delete Staff</Text>
              </Pressable>
            </View>
          </Modal>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screenWrap: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'ios' ? 48 : 24,
    paddingBottom: 18,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#e3e9f9',
    elevation: 4,
    zIndex: 10,
    minHeight: 68,
  },
  backBtn: {
    backgroundColor: '#e3e9f9',
    borderRadius: 18,
    padding: 8,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#22223b',
    letterSpacing: 0.2,
    fontFamily: Platform.OS === "ios" ? "System" : "sans-serif-medium",
  },
  loaderWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f7fa',
  },
  filterBar: {
    marginBottom: 16,
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  searchInput: {
    backgroundColor: '#f3f6fa',
    borderRadius: 8,
    padding: 10,
    marginBottom: 0,
    fontSize: 15,
    color: '#222',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 5,
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
    color: '#3D5AFE',
    marginBottom: 4,
    marginTop: 2,
    flex: 1,
  },
  roleChip: {
    backgroundColor: '#e3eaff',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 12,
    marginLeft: 8,
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
    color: '#6c6f7b',
    marginRight: 6,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#22223b',
  },
  emptyWrap: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyText: {
    fontSize: 18,
    color: '#b0b3b8',
    marginBottom: 24,
    fontWeight: '600',
  },
  menuIconBtn: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: '#f3f6fa',
    marginLeft: 8,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  menuSheetBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingVertical: 18,
    paddingHorizontal: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 12,
  },
  menuItem: {
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 14,
    marginBottom: 6,
    backgroundColor: '#f6f9fc',
    shadowColor: 'transparent',
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#22223b',
    fontFamily: Platform.OS === "ios" ? "System" : "sans-serif-medium",
  },
}); 