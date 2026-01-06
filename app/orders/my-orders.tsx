import { useRouter, useLocalSearchParams } from "expo-router";
import { useEffect, useState, memo } from "react";
import { FlatList, Platform, Pressable, StyleSheet, Text, View, TextInput, ActivityIndicator, Alert } from "react-native";
import { getOrdersAssignedTo, getCurrentUserId } from "../utils/api";
import { Ionicons } from '@expo/vector-icons';
import { androidUI } from "../utils/androidUI";
import OrdersHeader from "./components/OrdersHeader";

const ACCENT = "#3D5AFE";

function getStatusStyle(status: string) {
  switch (status) {
    case 'Pending': return styles.statusPending;
    case 'DC': return styles.statusDC;
    case 'Invoice': return styles.statusInvoice;
    case 'Dispatched': return styles.statusDispatched;
    default: return {};
  }
}

// Order Card Component matching orders.tsx layout
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
        {/* Show "Partially Dispatched" badge for dispatched orders with partial delivery */}
        {item.orderStatus === 'Dispatched' && item.isPartialDelivery ? (
          <View style={[styles.statusChip, styles.statusPartiallyDispatched]}>
            <Ionicons name="alert-circle-outline" size={14} color="#e65100" style={{ marginRight: 4 }} />
            <Text style={[styles.statusChipText, { color: '#e65100' }]}>Partially Dispatched</Text>
          </View>
        ) : (
          <View style={[styles.statusChip, getStatusStyle(item.orderStatus)]}>
            <Ionicons
              name={
                item.orderStatus === 'Pending' ? 'time-outline' :
                item.orderStatus === 'Invoice' ? 'document-text-outline' :
                item.orderStatus === 'Dispatched' ? 'send-outline' :
                item.orderStatus === 'DC' ? 'cube-outline' : 'ellipse-outline'
              }
              size={14}
              color={
                item.orderStatus === 'Pending' ? '#b8860b' :
                item.orderStatus === 'Invoice' ? '#388e3c' :
                item.orderStatus === 'Dispatched' ? '#8e24aa' :
                item.orderStatus === 'DC' ? '#1976d2' : '#222'
              }
              style={{ marginRight: 4 }}
            />
            <Text style={styles.statusChipText}>{item.orderStatus}</Text>
          </View>
        )}
      </View>
      
      {/* Line 3: Order Route */}
      <View style={styles.cardRowMid}>
        {item.orderRoute && (
          <Text style={styles.orderRoute}>🛣️ {item.orderRoute}</Text>
        )}
        <View style={styles.chipGroup} />
      </View>
      
      {/* Line 4: Total Amount and Payment Badge */}
      <View style={styles.cardRowMid}>
        <Text style={styles.orderCardTotal}>
          Total: ₹{Array.isArray(item.orderItems) ? Math.round(item.orderItems.reduce((sum: number, oi: any) => sum + (oi.total || 0), 0)) : 0}
        </Text>
        {item.paymentMarkedBy && item.paymentRecievedBy ? (
          <View style={[styles.statusChip, { backgroundColor: '#e8f5e9', borderColor: '#e8f5e9' }]}> 
            <Ionicons name="checkmark-circle" size={14} color="#43a047" style={{ marginRight: 4 }} />
            <Text style={[styles.statusChipText, { color: '#43a047' }]}>Paid</Text>
          </View>
        ) : item.paymentCondition === 'Immediate' ? (
          <View style={[styles.statusChip, styles.paymentChip]}>
            <Ionicons name="card" size={14} color="#ff5252" style={{ marginRight: 4 }} />
            <Text style={[styles.statusChipText, { color: '#ff5252' }]}>Payment Due</Text>
          </View>
        ) : null}
      </View>
      
      {/* Line 5: Created At Date */}
      <View style={styles.cardRowBot}>
        <Text style={styles.created}>Created: <Text style={styles.createdDate}>{new Date(item.date).toLocaleDateString()}</Text></Text>
      </View>
    </Pressable>
  );
});

export default function MyOrdersScreen() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  // Fetch orders assigned to this user
  const fetchAndSetOrders = async () => {
    setRefreshing(true);
    try {
      const userId = await getCurrentUserId();
      if (!userId) throw new Error('User ID not found');
      const response = await getOrdersAssignedTo(userId);
      setOrders(response.data);
      setFilteredOrders(response.data);
    } catch (err) {
      setOrders([]);
      setFilteredOrders([]);
      Alert.alert("Error", "Failed to fetch orders");
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


  // Navigate to order details when card is pressed
  const handleCardPress = (order: any) => {
    router.push({
      pathname: '/orders/orderdetails',
      params: { id: order.orderId }
    });
  };

  return (
    <View style={styles.screenWrap}>
      <OrdersHeader title="My Orders" />
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
                <Text style={styles.emptyText}>No Orders Assigned</Text>
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
  filterBar: {
    backgroundColor: androidUI.colors.surface,
    borderRadius: androidUI.borderRadius.medium,
    padding: androidUI.spacing.md,
    marginBottom: androidUI.spacing.md,
    ...androidUI.shadow,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchIcon: {
    marginRight: androidUI.spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: androidUI.colors.text.primary,
  },
  clearBtn: {
    padding: 4,
  },
  loaderWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: androidUI.colors.background,
  },
  card: {
    backgroundColor: androidUI.colors.surface,
    borderRadius: androidUI.borderRadius.medium,
    padding: androidUI.spacing.lg,
    marginBottom: androidUI.spacing.md,
    ...androidUI.cardShadow,
    shadowColor: ACCENT,
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
  orderRoute: {
    fontSize: 13,
    fontWeight: '500',
    color: androidUI.colors.text.secondary,
  },
  chipGroup: {
    flexDirection: 'row',
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
  statusPending: {
    backgroundColor: '#fff3cd',
    borderColor: '#ffeeba',
  },
  statusDC: {
    backgroundColor: '#e3f2fd',
    borderColor: '#bbdefb',
  },
  statusInvoice: {
    backgroundColor: '#d4edda',
    borderColor: '#c3e6cb',
  },
  statusDispatched: {
    backgroundColor: '#e1bee7',
    borderColor: '#d1c4e9',
  },
  statusPartiallyDispatched: {
    backgroundColor: '#fff3e0',
    borderColor: '#ffe0b2',
  },
  orderCardTotal: {
    fontSize: 15,
    fontWeight: '700',
    color: androidUI.colors.text.primary,
  },
  paymentChip: {
    backgroundColor: '#ffebee',
    borderColor: '#ffcdd2',
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
    textAlign: 'center',
    fontWeight: '600',
  },
});
