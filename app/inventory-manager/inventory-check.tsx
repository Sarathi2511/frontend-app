import { useRouter } from "expo-router";
import { useEffect, useState, memo } from "react";
import { FlatList, Platform, Pressable, StyleSheet, Text, View, TextInput, ActivityIndicator, Alert } from "react-native";
import { getOrdersByStatus } from "../utils/api";
import { Ionicons } from '@expo/vector-icons';
import { useSocket } from "../contexts/SocketContext";
import { androidUI } from "../utils/androidUI";

const ACCENT = "#3D5AFE";

function getStatusStyle() {
  return styles.statusInvCheck;
}

// Order Card Component
const OrderCard = memo(({ 
  item, 
  onPress 
}: { 
  item: any; 
  onPress: (order: any) => void;
}) => {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed
      ]}
      onPress={() => onPress(item)}
    >
      {/* Line 1: Order ID */}
      <View style={styles.cardRowTop}>
        <Text style={styles.orderId}>{item.orderId}</Text>
      </View>
      
      {/* Line 2: Customer Name and Order Status */}
      <View style={styles.cardRowMid}>
        <Text style={styles.customerName} numberOfLines={2}>{item.customerName}</Text>
        <View style={[styles.statusChip, getStatusStyle()]}>
          <Ionicons
            name="checkmark-circle-outline"
            size={14}
            color="#f57c00"
            style={{ marginRight: 4 }}
          />
          <Text style={styles.statusChipText}>{item.orderStatus}</Text>
        </View>
      </View>
      
      {/* Line 3: Created At Date */}
      <View style={styles.cardRowBot}>
        <Text style={styles.created}>Created: <Text style={styles.createdDate}>{new Date(item.date).toLocaleDateString()}</Text></Text>
      </View>
    </Pressable>
  );
});

export default function InventoryCheckScreen() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  // Fetch orders with "Inv Check" status
  const fetchAndSetOrders = async () => {
    setRefreshing(true);
    try {
      const response = await getOrdersByStatus('Inv Check');
      setOrders(response.data);
      setFilteredOrders(response.data);
    } catch (err: any) {
      setOrders([]);
      setFilteredOrders([]);
      Alert.alert("Error", err.response?.data?.message || "Failed to fetch orders");
    }
    setRefreshing(false);
    setLoading(false);
  };

  useEffect(() => {
    fetchAndSetOrders();
  }, []);

  useEffect(() => {
    let filtered = [...orders];
    if (search.trim()) {
      filtered = filtered.filter(o =>
        o.customerName.toLowerCase().includes(search.toLowerCase()) ||
        o.orderId.toLowerCase().includes(search.toLowerCase())
      );
    }
    setFilteredOrders(filtered);
  }, [search, orders]);

  // WebSocket event listeners for real-time updates
  const { socket } = useSocket();
  
  useEffect(() => {
    if (!socket) return;

    // Listen for order update events (only for Inv Check status)
    const handleOrderUpdated = (data: any) => {
      const updatedOrder = data.order;
      // If order status changed from Inv Check, remove it from list
      if (updatedOrder.orderStatus !== 'Inv Check') {
        setOrders(prevOrders => 
          prevOrders.filter(order => order._id !== updatedOrder._id)
        );
      } else {
        // Update the order if it's still in Inv Check status
        setOrders(prevOrders => 
          prevOrders.map(order => 
            order._id === updatedOrder._id ? updatedOrder : order
          )
        );
      }
    };

    // Listen for order creation events (only if status is Inv Check)
    const handleOrderCreated = (data: any) => {
      const newOrder = data.order;
      if (newOrder.orderStatus === 'Inv Check') {
        setOrders(prevOrders => {
          // Check if order already exists to avoid duplicates
          const exists = prevOrders.find(order => order._id === newOrder._id);
          if (exists) return prevOrders;
          return [newOrder, ...prevOrders];
        });
      }
    };

    // Listen for order deletion events
    const handleOrderDeleted = (data: any) => {
      setOrders(prevOrders => 
        prevOrders.filter(order => order._id !== data.orderId)
      );
    };

    // Add event listeners
    socket.on('order:created', handleOrderCreated);
    socket.on('order:updated', handleOrderUpdated);
    socket.on('order:deleted', handleOrderDeleted);

    // Cleanup event listeners
    return () => {
      socket.off('order:created', handleOrderCreated);
      socket.off('order:updated', handleOrderUpdated);
      socket.off('order:deleted', handleOrderDeleted);
    };
  }, [socket]);

  // Navigate to inventory product screen when card is pressed
  const handleCardPress = (order: any) => {
    router.push({
      pathname: './inventory-product',
      params: { orderId: order.orderId }
    });
  };

  return (
    <View style={styles.screenWrap}>
      {/* Header */}
      <View style={styles.headerBar}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={ACCENT} />
        </Pressable>
        <Text style={styles.headerTitle}>Inventory Check Orders</Text>
      </View>
      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={ACCENT} />
        </View>
      ) : (
        <>
          {/* Search Bar */}
          <View style={styles.filterBar}>
            <View style={styles.searchRow}>
              <Ionicons name="search" size={20} color="#b0b3b8" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by Name or ID"
                placeholderTextColor="#666"
                value={search}
                onChangeText={setSearch}
              />
              {search.length > 0 && (
                <Pressable onPress={() => setSearch('')} style={styles.clearBtn}>
                  <Ionicons name="close-circle" size={20} color="#b0b3b8" />
                </Pressable>
              )}
            </View>
          </View>
          <FlatList
            data={filteredOrders}
            keyExtractor={item => item._id}
            contentContainerStyle={{ paddingBottom: 32 }}
            renderItem={({ item }) => (
              <OrderCard
                item={item}
                onPress={handleCardPress}
              />
            )}
            refreshing={refreshing}
            onRefresh={fetchAndSetOrders}
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            updateCellsBatchingPeriod={50}
            initialNumToRender={10}
            windowSize={10}
            ListEmptyComponent={() => (
              <View style={styles.emptyWrap}>
                <Ionicons name="checkbox-outline" size={64} color="#b0b3b8" style={{ marginBottom: 16 }} />
                <Text style={styles.emptyText}>No Orders in Inventory Check</Text>
                <Text style={styles.emptySubtext}>Orders with "Inv Check" status will appear here</Text>
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
    backgroundColor: '#f5f7fa',
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
  },
  filterBar: {
    backgroundColor: androidUI.colors.surface,
    paddingVertical: androidUI.spacing.md,
    paddingHorizontal: androidUI.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: androidUI.colors.border,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f6f9fc',
    borderRadius: androidUI.borderRadius.large,
    paddingHorizontal: androidUI.spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
  },
  searchIcon: {
    marginRight: androidUI.spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: androidUI.colors.text.primary,
    paddingVertical: 0,
  },
  clearBtn: {
    padding: 4,
  },
  card: {
    backgroundColor: androidUI.colors.surface,
    borderRadius: androidUI.borderRadius.large,
    padding: androidUI.spacing.lg,
    marginHorizontal: androidUI.spacing.lg,
    marginTop: androidUI.spacing.md,
    ...androidUI.cardShadow,
  },
  cardPressed: {
    ...androidUI.buttonPress,
    transform: [{ scale: 1.02 }],
  },
  cardRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderId: {
    fontSize: 16,
    fontWeight: '700',
    color: ACCENT,
  },
  cardRowMid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  customerName: {
    fontSize: 15,
    fontWeight: '600',
    color: androidUI.colors.text.primary,
    flex: 1,
    marginRight: androidUI.spacing.sm,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: androidUI.spacing.sm,
    borderRadius: androidUI.borderRadius.medium,
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusInvCheck: {
    backgroundColor: '#fff3e0',
    borderColor: '#ffe0b2',
  },
  cardRowBot: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  created: {
    fontSize: 13,
    color: androidUI.colors.text.secondary,
  },
  createdDate: {
    fontWeight: '600',
    color: ACCENT,
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 18,
    color: androidUI.colors.text.disabled,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: androidUI.colors.text.disabled,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});

