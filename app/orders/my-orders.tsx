import { useRouter, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { FlatList, Modal, Platform, Pressable, StyleSheet, Text, TouchableOpacity, View, TextInput, ActivityIndicator, ScrollView, Alert } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { getOrdersAssignedTo, getStaff, getCurrentUserId, updateOrder, deleteOrder } from "../api";
import { Ionicons } from '@expo/vector-icons';
import DropDownPicker from 'react-native-dropdown-picker';
import { useSocket } from "../contexts/SocketContext";
import { androidUI } from "../utils/androidUI";

const ACCENT = "#3D5AFE";
const statusOptions = ["Pending", "DC", "Invoice", "Dispatched"];

function getStatusStyle(status: string) {
  switch (status) {
    case 'Pending': return styles.statusPending;
    case 'DC': return styles.statusDC;
    case 'Invoice': return styles.statusInvoice;
    case 'Dispatched': return styles.statusDispatched;
    default: return {};
  }
}

// Add MenuOption type
interface MenuOption {
  key: string;
  label: string;
  action: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

export default function MyOrdersScreen() {
  const router = useRouter();
  const { role, name } = useLocalSearchParams();
  const userRole = role ? String(role) : "User";
  const userName = name ? String(name) : "Unknown";
  const [orders, setOrders] = useState<any[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuOrder, setMenuOrder] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffError, setStaffError] = useState<string | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusOrder, setStatusOrder] = useState<any>(null);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [openDeliveryDropdown, setOpenDeliveryDropdown] = useState(false);
  const [selectedDeliveryPartner, setSelectedDeliveryPartner] = useState<string | null>(null);
  const [pendingStatusChange, setPendingStatusChange] = useState<{orderId: string, newStatus: string, prevStatus: string} | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [openMarkedByDropdown, setOpenMarkedByDropdown] = useState(false);
  const [openRecievedByDropdown, setOpenRecievedByDropdown] = useState(false);
  const [selectedMarkedBy, setSelectedMarkedBy] = useState<string | null>(null);
  const [selectedRecievedBy, setSelectedRecievedBy] = useState<string | null>(null);
  const [paymentOrder, setPaymentOrder] = useState<any>(null);
  // Remove statusFilter state and logic

  // Convert staff list to dropdown format
  const staffDropdownItems = staffList.map(staff => ({
    label: `${staff.name} (${staff.role})`,
    value: staff.name
  }));

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

  // Fetch staff list for menu actions
  const fetchStaffList = async () => {
    try {
      setStaffLoading(true);
      setStaffError(null);
      const response = await getStaff();
      if (Array.isArray(response.data)) {
        setStaffList(response.data);
      } else {
        setStaffError('Failed to load staff list');
        setStaffList([]);
      }
    } catch (err) {
      setStaffError('Failed to connect to server');
      setStaffList([]);
    } finally {
      setStaffLoading(false);
    }
  };

  useEffect(() => {
    fetchAndSetOrders();
    fetchStaffList();
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

    // Listen for order creation events (only if assigned to current user)
    const handleOrderCreated = async (data: any) => {
      try {
        const userId = await getCurrentUserId();
        if (!userId) return;
        
        // Check if the new order is assigned to current user
        if (data.order.assignedToId === userId) {
          setOrders(prevOrders => {
            const newOrder = data.order;
            // Check if order already exists to avoid duplicates
            const exists = prevOrders.find(order => order._id === newOrder._id);
            if (exists) return prevOrders;
            return [newOrder, ...prevOrders];
          });
        }
      } catch (err) {
        console.error('Error handling order created event:', err);
      }
    };

    // Listen for order update events (only if assigned to current user)
    const handleOrderUpdated = async (data: any) => {
      try {
        const userId = await getCurrentUserId();
        if (!userId) return;
        
        // Check if the updated order is assigned to current user
        if (data.order.assignedToId === userId) {
          setOrders(prevOrders => 
            prevOrders.map(order => 
              order._id === data.order._id ? data.order : order
            )
          );
        }
      } catch (err) {
        console.error('Error handling order updated event:', err);
      }
    };

    // Listen for order deletion events (only if assigned to current user)
    const handleOrderDeleted = async (data: any) => {
      try {
        const userId = await getCurrentUserId();
        if (!userId) return;
        
        // Remove the order from the list if it was assigned to current user
        setOrders(prevOrders => 
          prevOrders.filter(order => order._id !== data.orderId)
        );
      } catch (err) {
        console.error('Error handling order deleted event:', err);
      }
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

  // Menu actions (replicated from orders.tsx)
  const handleMenu = (order: any) => setMenuOrder(order);
  const closeMenu = () => setMenuOrder(null);
  const handleViewDetails = () => {
    closeMenu();
    router.push({ pathname: '/orders/orderdetails', params: { id: menuOrder.orderId, role } });
  };
  const handlePrintPDF = () => { closeMenu(); alert('Print to PDF (mock)'); };
  const handleEditOrder = () => {
    closeMenu();
    router.push({ pathname: '/orders/EditOrder', params: { id: menuOrder.orderId, role } });
  };
  const handleMarkPaid = async () => {
    closeMenu();
    if (staffList.length === 0 && !staffLoading && !staffError) {
      await fetchStaffList();
    }
    setSelectedMarkedBy(null);
    setSelectedRecievedBy(null);
    setPaymentOrder(menuOrder);
    setShowPaymentModal(true);
  };
  const handleChangeStatus = () => {
    setStatusOrder(menuOrder);
    setMenuOrder(null);
    setTimeout(() => setShowStatusModal(true), 200);
  };
  const handleSelectStatus = async (status: string) => {
    setShowStatusModal(false);
    if (!statusOrder) return;
    if (status === 'Dispatched') {
      setPendingStatusChange({ orderId: statusOrder.orderId, newStatus: status, prevStatus: statusOrder.orderStatus });
      setSelectedDeliveryPartner(null);
      setShowDeliveryModal(true);
      setStatusOrder(null);
      return;
    }
    setStatusOrder(null);
    try {
      await updateOrder(statusOrder.orderId, { orderStatus: status });
      fetchAndSetOrders();
    } catch (err: any) {
      Alert.alert("Error", err.response?.data?.message || "Failed to update status");
    }
  };
  const handleDeleteOrder = () => {
    closeMenu();
    if (!menuOrder || userRole !== 'Admin') return;
    Alert.alert(
      "Delete Order",
      "Are you sure you want to delete this order?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteOrder(menuOrder.orderId);
              fetchAndSetOrders();
            } catch (err: any) {
              Alert.alert("Error", "Failed to delete order");
            }
          }
        }
      ]
    );
  };
  const handleDeliveryPartnerSelect = async () => {
    if (!pendingStatusChange || !selectedDeliveryPartner) return;
    setShowDeliveryModal(false);
    try {
      await updateOrder(pendingStatusChange.orderId, {
        orderStatus: pendingStatusChange.newStatus,
        deliveryPartner: selectedDeliveryPartner
      });
      fetchAndSetOrders();
    } catch (err: any) {
      Alert.alert("Error", err.response?.data?.message || "Failed to update status");
    }
    setPendingStatusChange(null);
    setSelectedDeliveryPartner(null);
  };
  const handleDeliveryModalClose = () => {
    if (!selectedDeliveryPartner) {
      alert('Please Choose Delivery Partner');
      if (pendingStatusChange) {
        updateOrder(pendingStatusChange.orderId, pendingStatusChange.prevStatus);
        setPendingStatusChange(null);
      }
      return;
    }
    setShowDeliveryModal(false);
    setPendingStatusChange(null);
    setSelectedDeliveryPartner(null);
  };
  const handlePaymentSubmit = async () => {
    if (!selectedMarkedBy || !selectedRecievedBy || !paymentOrder) return;
    setShowPaymentModal(false);
    try {
      await updateOrder(paymentOrder.orderId, {
        paymentMarkedBy: selectedMarkedBy,
        paymentRecievedBy: selectedRecievedBy
      });
      fetchAndSetOrders();
    } catch (err: any) {
      Alert.alert("Error", err.response?.data?.message || "Failed to mark as paid");
    }
    setPaymentOrder(null);
    setSelectedMarkedBy(null);
    setSelectedRecievedBy(null);
  };

  // Get available menu options based on role
  const getMenuOptions = (): MenuOption[] => {
    const options: MenuOption[] = [
      { key: 'view', label: 'View Details', action: handleViewDetails },
      { key: 'print', label: 'Print To PDF', action: handlePrintPDF },
    ];
    if (["Admin", "Staff"].includes(userRole)) {
      options.push(
        { key: 'edit', label: 'Edit Order', action: handleEditOrder },
        { key: 'status', label: 'Change Status', action: handleChangeStatus },
        { 
          key: 'paid', 
          label: 'Mark as Paid',
          action: handleMarkPaid,
          disabled: !(menuOrder && menuOrder.orderStatus === 'Dispatched')
        }
      );
    } else if (userRole === 'Executive') {
      options.push(
        { key: 'edit', label: 'Edit Order', action: handleEditOrder }
      );
    }
    if (userRole === 'Admin') {
      options.push({
        key: 'delete',
        label: 'Delete Order',
        action: handleDeleteOrder,
        destructive: true
      });
    }
    return options;
  };

  return (
    <SafeAreaView style={styles.screenWrap} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.headerBar}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={ACCENT} />
        </Pressable>
        <Text style={styles.headerTitle}>My Orders</Text>
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
            placeholder="Search by Name or ID"
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <FlatList
          data={filteredOrders}
          keyExtractor={item => item._id}
          contentContainerStyle={{ paddingBottom: 32 }}
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [
                styles.card,
                pressed && styles.cardPressed
              ]}
              onPress={() => handleMenu(item)}
            >
              {/* Line 1: Order ID and menu icon */}
              <View style={styles.cardRowTop}>
                <Text style={styles.orderId}>{item.orderId}</Text>
                <Pressable style={styles.menuIconBtn} onPress={() => handleMenu(item)}>
                  <Ionicons name="ellipsis-vertical" size={20} color="#b0b3b8" />
                </Pressable>
              </View>
              {/* Line 2: Name and status chips */}
              <View style={styles.cardRowMid}>
                <Text style={styles.customerName}>{item.customerName}</Text>
                <View style={styles.chipGroup}>
                  <View style={[styles.statusChip, getStatusStyle(item.orderStatus)]}>
                    <Ionicons
                      name={
                        item.orderStatus === 'Pending' ? 'time-outline' :
                        item.orderStatus === 'Invoice' ? 'document-text-outline' :
                        item.orderStatus === 'Dispatched' ? 'send-outline' :
                        item.orderStatus === 'DC' ? 'cube-outline' : 'ellipse-outline'
                      }
                      size={14}
                      color={item.orderStatus === 'Pending' ? '#b8860b' :
                             item.orderStatus === 'Invoice' ? '#388e3c' :
                             item.orderStatus === 'Dispatched' ? '#8e24aa' :
                             item.orderStatus === 'DC' ? '#1976d2' : '#222'}
                      style={{ marginRight: 4 }}
                    />
                    <Text style={styles.statusChipText}>{item.orderStatus}</Text>
                  </View>
                  {item.urgent && (
                    <View style={[styles.statusChip, styles.urgentChip]}>
                      <Ionicons name="alert-circle" size={14} color="#c2185b" style={{ marginRight: 4 }} />
                      <Text style={[styles.statusChipText, { color: '#c2185b' }]}>Urgent</Text>
                    </View>
                  )}
                </View>
              </View>
              {/* Line 2.5: Total Price */}
              <View style={{ marginTop: 4, marginBottom: 2 }}>
                <Text style={styles.orderCardTotal}>
                  Total: ₹{Array.isArray(item.orderItems) ? item.orderItems.reduce((sum: number, oi: any) => sum + (oi.total || 0), 0) : 0}
                </Text>
              </View>
              {/* Line 3: Created date and payment chip */}
              <View style={styles.cardRowBot}>
                <Text style={styles.created}>Created: <Text style={styles.createdDate}>{new Date(item.date).toLocaleDateString()}</Text></Text>
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
            </Pressable>
          )}
          refreshing={refreshing}
          onRefresh={fetchAndSetOrders}
          ListEmptyComponent={() => (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>No Orders Yet</Text>
            </View>
          )}
        />
        {/* Action Menu Modal */}
        <Modal
          visible={!!menuOrder}
          transparent
          animationType="fade"
          onRequestClose={closeMenu}
        >
          <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={closeMenu} />
          <View style={styles.menuSheet}>
            {getMenuOptions().map(option => (
              <Pressable
                key={option.key}
                style={[styles.menuItem, option.destructive && styles.menuItemDestructive, option.disabled && styles.menuItemDisabled]}
                onPress={option.disabled ? undefined : option.action}
                disabled={option.disabled}
              >
                <Text style={[styles.menuItemText, option.destructive && styles.menuItemTextDestructive, option.disabled && styles.menuItemTextDisabled]}>
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </Modal>
        {/* Status Change Modal */}
        <Modal
          visible={showStatusModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowStatusModal(false)}
        >
          <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setShowStatusModal(false)} />
          <View style={styles.menuSheet}>
            {statusOrder && statusOptions.filter(s => s !== statusOrder.orderStatus).map(status => (
              <Pressable key={status} style={styles.menuItem} onPress={() => handleSelectStatus(status)}>
                <Text style={styles.menuItemText}>{status}</Text>
              </Pressable>
            ))}
          </View>
        </Modal>
        {/* Delivery Partner Modal */}
        <Modal
          visible={showDeliveryModal}
          transparent
          animationType="fade"
          onRequestClose={handleDeliveryModalClose}
        >
          <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={handleDeliveryModalClose} />
          <View style={styles.menuSheet}>
            <Text style={styles.menuItemText}>Select Delivery Partner for Order {pendingStatusChange?.orderId}</Text>
            <DropDownPicker
              open={openDeliveryDropdown}
              setOpen={setOpenDeliveryDropdown}
              items={staffDropdownItems}
              setItems={setStaffList} // This is a bit hacky, ideally setItems should be a function
              value={selectedDeliveryPartner}
              setValue={setSelectedDeliveryPartner}
              placeholder="Select Delivery Partner"
              style={styles.dropdown}
            />
            <Pressable
              style={[styles.menuItem, styles.menuItemDestructive]}
              onPress={handleDeliveryPartnerSelect}
            >
              <Text style={styles.menuItemText}>Confirm Delivery Partner</Text>
            </Pressable>
            <Pressable
              style={styles.menuItem}
              onPress={handleDeliveryModalClose}
            >
              <Text style={styles.menuItemText}>Cancel</Text>
            </Pressable>
          </View>
        </Modal>
        {/* Payment Modal */}
        <Modal
          visible={showPaymentModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowPaymentModal(false)}
        >
          <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setShowPaymentModal(false)} />
          <View style={styles.menuSheet}>
            <Text style={styles.menuItemText}>Mark Order {paymentOrder?.orderId} as Paid</Text>
            <DropDownPicker
              open={openMarkedByDropdown}
              setOpen={setOpenMarkedByDropdown}
              items={staffDropdownItems}
              setItems={setStaffList} // This is a bit hacky, ideally setItems should be a function
              value={selectedMarkedBy}
              setValue={setSelectedMarkedBy}
              placeholder="Marked By"
              style={styles.dropdown}
            />
            <DropDownPicker
              open={openRecievedByDropdown}
              setOpen={setOpenRecievedByDropdown}
              items={staffDropdownItems}
              setItems={setStaffList} // This is a bit hacky, ideally setItems should be a function
              value={selectedRecievedBy}
              setValue={setSelectedRecievedBy}
              placeholder="Recieved By"
              style={styles.dropdown}
            />
            <Pressable
              style={[styles.menuItem, styles.menuItemDestructive]}
              onPress={handlePaymentSubmit}
            >
              <Text style={styles.menuItemText}>Confirm Payment</Text>
            </Pressable>
            <Pressable
              style={styles.menuItem}
              onPress={() => {
                setPaymentOrder(null);
                setSelectedMarkedBy(null);
                setSelectedRecievedBy(null);
                setShowPaymentModal(false);
              }}
            >
              <Text style={styles.menuItemText}>Cancel</Text>
            </Pressable>
          </View>
        </Modal>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screenWrap: {
    flex: 1,
    backgroundColor: androidUI.colors.background,
    paddingHorizontal: androidUI.spacing.lg,
    paddingTop: 32,
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
    marginBottom: androidUI.spacing.lg,
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
  filterBar: {
    backgroundColor: androidUI.colors.surface,
    borderRadius: androidUI.borderRadius.medium,
    padding: androidUI.spacing.md,
    marginBottom: androidUI.spacing.md,
    ...androidUI.shadow,
  },
  searchInput: {
    fontSize: 15,
    color: androidUI.colors.text.primary,
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
  menuIconBtn: {
    padding: 8,
  },
  cardRowMid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  customerName: {
    fontSize: 15,
    fontWeight: '600',
    color: androidUI.colors.text.primary,
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
    marginRight: androidUI.spacing.sm,
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
    backgroundColor: '#d4edda',
    borderColor: '#c3e6cb',
  },
  statusInvoice: {
    backgroundColor: '#e3f2fd',
    borderColor: '#bbdefb',
  },
  statusDispatched: {
    backgroundColor: '#e1bee7',
    borderColor: '#d1c4e9',
  },
  urgentChip: {
    backgroundColor: '#ffebee',
    borderColor: '#ffcdd2',
  },
  orderCardTotal: {
    fontSize: 15,
    fontWeight: '600',
    color: ACCENT,
  },
  cardRowBot: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  created: {
    fontSize: 13,
    color: androidUI.colors.text.secondary,
  },
  createdDate: {
    fontWeight: '600',
    color: ACCENT,
  },
  paymentChip: {
    backgroundColor: '#ffebee',
    borderColor: '#ffcdd2',
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  menuSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: androidUI.colors.surface,
    borderTopLeftRadius: androidUI.borderRadius.xxlarge,
    borderTopRightRadius: androidUI.borderRadius.xxlarge,
    padding: androidUI.spacing.lg,
    ...androidUI.modalShadow,
  },
  menuItem: {
    paddingVertical: androidUI.spacing.md,
    paddingHorizontal: androidUI.spacing.lg,
    borderRadius: androidUI.borderRadius.small,
    marginBottom: androidUI.spacing.sm,
  },
  menuItemText: {
    fontSize: 16,
    color: androidUI.colors.text.primary,
  },
  menuItemDestructive: {
    backgroundColor: '#ffebee',
    borderColor: '#ffcdd2',
  },
  menuItemTextDestructive: {
    color: '#d32f2f',
  },
  menuItemDisabled: {
    opacity: 0.5,
    backgroundColor: '#f0f0f0',
  },
  menuItemTextDisabled: {
    color: '#9e9e9e',
  },
  dropdown: {
    marginBottom: androidUI.spacing.md,
  },
  chipScroll: {
    flexDirection: 'row',
    marginBottom: androidUI.spacing.md,
    paddingHorizontal: androidUI.spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: androidUI.spacing.md,
    borderRadius: 20,
    marginRight: androidUI.spacing.sm,
    backgroundColor: '#e0e0e0',
  },
  chipActive: {
    backgroundColor: ACCENT,
  },
  chipIcon: {
    marginRight: 6,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: ACCENT,
  },
  chipTextActive: {
    color: '#fff',
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 18,
    color: androidUI.colors.text.secondary,
    textAlign: 'center',
  },
}); 