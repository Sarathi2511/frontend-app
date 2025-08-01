import { useRouter } from "expo-router";
import { useEffect, useState, useCallback } from "react";
import { FlatList, Modal, Platform, Pressable, StyleSheet, Text, TouchableOpacity, View, TextInput, ActivityIndicator, ScrollView, Alert, Animated } from "react-native";
import { useFocusEffect } from '@react-navigation/native';
import { getOrders, updateOrder, deleteOrder, getStaff } from "../api";
import { Ionicons } from '@expo/vector-icons';
import DropDownPicker from 'react-native-dropdown-picker';
import { useLocalSearchParams } from "expo-router";
import { useSocket } from "../contexts/SocketContext";
import { androidUI } from "../utils/androidUI";

const ACCENT = "#3D5AFE";

const statusOptions = ["Pending", "DC", "Invoice", "Dispatched"];

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
    backgroundColor: androidUI.colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: androidUI.colors.background,
    paddingTop: androidUI.safeAreaTop,
    paddingHorizontal: androidUI.spacing.md,
  },
  header: {
    fontSize: 20,
    fontWeight: '700',
    color: ACCENT,
    marginBottom: androidUI.spacing.lg,
    textAlign: 'center',
    fontFamily: androidUI.fontFamily.medium,
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
  cardPressed: {
    ...androidUI.buttonPress,
    shadowOpacity: 0.18,
    elevation: 8,
  },
  cardRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  menuIconBtn: {
    padding: 6,
    borderRadius: androidUI.borderRadius.large,
    backgroundColor: '#f3f6fa',
  },
  cardRowMid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  chipGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f6fa',
    borderRadius: 14,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginLeft: 6,
    borderWidth: 1,
    borderColor: '#e3e9f9',
  },
  statusChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#222',
  },
  urgentChip: {
    backgroundColor: '#ffd1dc',
    borderColor: '#ffd1dc',
  },
  paymentChip: {
    backgroundColor: '#ffeaea',
    borderColor: '#ffeaea',
  },
  cardRowBot: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  orderId: {
    fontSize: 15,
    fontWeight: '700',
    color: androidUI.colors.text.primary,
    letterSpacing: 0.2,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: ACCENT,
    marginBottom: 4,
    marginTop: 2,
  },
  created: {
    fontSize: 13,
    color: androidUI.colors.text.secondary,
  },
  createdDate: {
    fontWeight: '600',
    color: androidUI.colors.text.primary,
  },
  status: {
    fontSize: 13,
    fontWeight: '700',
    paddingVertical: 2,
    paddingHorizontal: 10,
    borderRadius: 8,
    overflow: 'hidden',
    textTransform: 'capitalize',
  },
  statusPending: {
    backgroundColor: '#fff3cd',
    color: '#b8860b',
  },
  statusDC: {
    backgroundColor: '#e3f2fd',
    color: '#1976d2',
  },
  statusInvoice: {
    backgroundColor: '#e8f5e9',
    color: '#388e3c',
  },
  statusDispatched: {
    backgroundColor: '#f3e5f5',
    color: '#8e24aa',
  },
  priorityWrap: {
    minWidth: 60,
    alignItems: 'flex-start',
  },
  urgentBadge: {
    fontWeight: '700',
    fontSize: 12,
    borderRadius: 8,
    paddingVertical: 2,
    paddingHorizontal: 10,
    overflow: 'hidden',
    color: '#fff',
    textAlign: 'center',
  },
  urgentRed: {
    backgroundColor: '#ffd1dc', // light pink
    color: '#c2185b', // deep pink text
  },
  urgentYellow: {
    backgroundColor: '#fff3cd',
    color: '#b8860b',
  },
  urgentBlank: {
    color: 'transparent',
    fontSize: 12,
    paddingVertical: 2,
    paddingHorizontal: 10,
  },
  total: {
    fontSize: 15,
    fontWeight: '700',
    color: androidUI.colors.text.primary,
  },
  actionBtn: {
    padding: 6,
    borderRadius: 16,
  },
  actionDots: {
    fontSize: 22,
    color: androidUI.colors.text.disabled,
    fontWeight: '700',
    marginTop: -2,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  menuSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: androidUI.colors.surface,
    borderTopLeftRadius: androidUI.borderRadius.xxlarge,
    borderTopRightRadius: androidUI.borderRadius.xxlarge,
    paddingVertical: androidUI.spacing.lg,
    paddingHorizontal: androidUI.spacing.xxl,
    ...androidUI.modalShadow,
  },
  menuItem: {
    paddingVertical: androidUI.spacing.lg,
    paddingHorizontal: androidUI.spacing.sm,
    borderRadius: androidUI.borderRadius.medium,
    marginBottom: 6,
    backgroundColor: '#f6f9fc',
    shadowColor: 'transparent',
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: androidUI.colors.text.primary,
    fontFamily: androidUI.fontFamily.medium,
  },
  paymentDueBadge: {
    backgroundColor: '#ff5252',
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
    borderRadius: 8,
    paddingVertical: 2,
    paddingHorizontal: 10,
    overflow: 'hidden',
    marginLeft: 8,
    textAlign: 'center',
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
    marginBottom: androidUI.spacing.sm,
    fontSize: 15,
    color: androidUI.colors.text.primary,
  },
  statusFilterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statusFilterBtn: {
    backgroundColor: '#f3f6fa',
    borderRadius: androidUI.borderRadius.small,
    paddingVertical: 6,
    paddingHorizontal: androidUI.spacing.md,
    marginRight: 6,
  },
  statusFilterBtnActive: {
    backgroundColor: ACCENT,
  },
  statusFilterText: {
    color: androidUI.colors.text.primary,
    fontWeight: '500',
  },
  statusFilterTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  dateInput: {
    backgroundColor: '#f3f6fa',
    borderRadius: androidUI.borderRadius.small,
    padding: 10,
    fontSize: 15,
    color: androidUI.colors.text.primary,
  },
  dateRangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  dateRangeBtn: {
    backgroundColor: '#f3f6fa',
    borderRadius: androidUI.borderRadius.small,
    paddingVertical: androidUI.spacing.sm,
    paddingHorizontal: 14,
    minWidth: 90,
    alignItems: 'center',
  },
  dateRangeBtnText: {
    color: androidUI.colors.text.primary,
    fontSize: 15,
  },
  clearDateBtn: {
    marginLeft: androidUI.spacing.sm,
    backgroundColor: '#eee',
    borderRadius: androidUI.borderRadius.medium,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearDateBtnText: {
    color: androidUI.colors.text.disabled,
    fontSize: 18,
    fontWeight: '700',
    marginTop: -2,
  },
  chipScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 2,
    paddingHorizontal: 2,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: ACCENT,
    borderRadius: 22,
    paddingVertical: 7,
    paddingHorizontal: 16,
    marginRight: 8,
    backgroundColor: '#fff',
    marginBottom: 4,
    elevation: 0,
  },
  chipActive: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
    elevation: 2,
  },
  chipText: {
    color: ACCENT,
    fontWeight: '600',
    fontSize: 15,
  },
  chipTextActive: {
    color: '#fff',
  },
  chipIcon: {
    marginRight: 7,
  },
  chipClearBtn: {
    marginLeft: 6,
    backgroundColor: '#ff5252',
    borderRadius: 10,
    padding: 1,
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
  createOrderBtn: {
    backgroundColor: ACCENT,
    paddingVertical: 14,
    paddingHorizontal: 38,
    borderRadius: 30,
    ...androidUI.cardShadow,
    shadowColor: ACCENT,
    alignItems: 'center',
  },
  createOrderBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.2,
    fontFamily: androidUI.fontFamily.medium,
  },
  orderCardTotal: {
    fontSize: 15,
    fontWeight: '700',
    color: androidUI.colors.text.primary,
    marginTop: 4,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f6f9fc',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e3e9f9',
    height: 45,
  },
  dropdownButtonText: {
    fontSize: 15,
    color: '#22223b',
  },
  pickerModalSheet: {
    position: 'absolute',
    left: '5%',
    right: '5%',
    top: '20%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e3e9f9',
    marginBottom: 8,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#22223b',
  },
  pickerOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginVertical: 2,
  },
  pickerOptionSelected: {
    backgroundColor: ACCENT,
  },
  pickerOptionText: {
    fontSize: 15,
    color: '#22223b',
  },
  pickerOptionTextSelected: {
    color: '#fff',
  },
  pickerLoadingContainer: {
    padding: 24,
    alignItems: 'center',
  },
  pickerLoadingText: {
    marginTop: 12,
    color: '#666',
    fontSize: 15,
  },
  pickerErrorContainer: {
    padding: 24,
    alignItems: 'center',
  },
  pickerErrorText: {
    color: '#ff5252',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 12,
  },
  pickerRetryButton: {
    backgroundColor: ACCENT,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  pickerRetryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  dropdownList: {
    backgroundColor: '#fff',
    borderColor: '#e3e9f9',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dropdownItemLabel: {
    fontSize: 15,
    color: '#22223b',
  },
  dropdownSelectedLabel: {
    color: ACCENT,
    fontWeight: '600',
  },
  dropdownPlaceholder: {
    color: '#b0b3b8',
    fontSize: 15,
  },
  menuItemDisabled: {
    opacity: 0.4,
    backgroundColor: '#f0f0f0',
  },
  menuItemTextDisabled: {
    color: '#999',
  },
  menuItemDestructive: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    marginTop: 6,
  },
  menuItemTextDestructive: {
    color: '#ff5252',
    fontWeight: '700',
  },
  menuIconBtnActive: {
    backgroundColor: '#e3eaff',
    transform: [{ scale: 1.05 }],
  },
  actionMenu: {
    marginTop: androidUI.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: androidUI.spacing.sm,
    overflow: 'hidden',
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  actionButton: {
    width: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: '1.5%',
    marginBottom: 4,
    borderRadius: androidUI.borderRadius.medium,
    backgroundColor: '#f6f9fc',
    borderWidth: 1,
    borderColor: '#e3e9f9',
  },
  actionButtonDisabled: {
    opacity: 0.5,
    backgroundColor: '#f0f0f0',
  },
  actionButtonDestructive: {
    backgroundColor: '#fff5f5',
    borderColor: '#fecaca',
  },
  actionButtonIcon: {
    marginRight: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: androidUI.colors.text.primary,
    flex: 1,
  },
  actionButtonTextDisabled: {
    color: '#999',
  },
  actionButtonTextDestructive: {
    color: '#e53935',
  },
  statusButton: {
    backgroundColor: '#f3f6fa',
    borderColor: '#e3e9f9',
    borderRadius: androidUI.borderRadius.small,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginRight: 6,
    marginBottom: 6,
  },
  statusButtonText: {
    color: '#3D5AFE',
    fontWeight: '600',
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
});

function getStatusStyle(status: string) {
  switch (status) {
    case 'Pending': return styles.statusPending;
    case 'DC': return styles.statusDC;
    case 'Invoice': return styles.statusInvoice;
    case 'Dispatched': return styles.statusDispatched;
    default: return {};
  }
}

interface MenuOption {
  key: string;
  label: string;
  action: () => void;
  disabled?: boolean;
  destructive?: boolean;
}

export default function OrdersScreen() {
  const router = useRouter();
  const { role, name } = useLocalSearchParams();
  const userRole = role ? String(role) : "User";
  const userName = name ? String(name) : "Unknown";
  const [orders, setOrders] = useState<any[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuOrder, setMenuOrder] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{start: Date|null, end: Date|null}>({start: null, end: null});
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Staff List State
  const [staffList, setStaffList] = useState<any[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffError, setStaffError] = useState<string | null>(null);

  // Delivery Partner State
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [openDeliveryDropdown, setOpenDeliveryDropdown] = useState(false);
  const [selectedDeliveryPartner, setSelectedDeliveryPartner] = useState<string | null>(null);
  const [pendingStatusChange, setPendingStatusChange] = useState<{orderId: string, newStatus: string, prevStatus: string} | null>(null);

  // Payment State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [openMarkedByDropdown, setOpenMarkedByDropdown] = useState(false);
  const [openRecievedByDropdown, setOpenRecievedByDropdown] = useState(false);
  const [selectedMarkedBy, setSelectedMarkedBy] = useState<string | null>(null);
  const [selectedRecievedBy, setSelectedRecievedBy] = useState<string | null>(null);
  const [paymentOrder, setPaymentOrder] = useState<any>(null);
  
  // Inline dropdown state
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [showStatusOptions, setShowStatusOptions] = useState<string | null>(null);
  const animatedHeight = useState(new Animated.Value(0))[0];

  // Convert staff list to dropdown format
  const staffDropdownItems = staffList.map(staff => ({
    label: `${staff.name} (${staff.role})`,
    value: staff.name
  }));

  const fetchAndSetOrders = async () => {
    setRefreshing(true);
    try {
      const response = await getOrders();
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

  // Fetch staff list on component mount
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
    fetchStaffList(); // Fetch staff list on component mount
  }, []);

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchAndSetOrders();
      fetchStaffList();
    }, [])
  );

  useEffect(() => {
    let filtered = [...orders];
    if (search.trim()) {
      filtered = filtered.filter(o =>
        o.customerName.toLowerCase().includes(search.toLowerCase()) ||
        o.orderId.toLowerCase().includes(search.toLowerCase())
      );
    }
    if (statusFilter) {
      filtered = filtered.filter(o => o.orderStatus === statusFilter);
    }
    setFilteredOrders(filtered);
  }, [search, statusFilter, orders]);

  // WebSocket event listeners for real-time updates
  const { socket } = useSocket();
  
  // Animate dropdown expansion/collapse
  useEffect(() => {
    Animated.timing(animatedHeight, {
      toValue: expandedOrderId ? 150 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [expandedOrderId]);

  useEffect(() => {
    if (!socket) return;

    // Listen for order creation events
    const handleOrderCreated = (data: any) => {
      // Add the new order to the list
      setOrders(prevOrders => {
        const newOrder = data.order;
        // Check if order already exists to avoid duplicates
        const exists = prevOrders.find(order => order._id === newOrder._id);
        if (exists) return prevOrders;
        return [newOrder, ...prevOrders];
      });
    };

    // Listen for order update events
    const handleOrderUpdated = (data: any) => {
      // Update the order in the list
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order._id === data.order._id ? data.order : order
        )
      );
    };

    // Listen for order deletion events
    const handleOrderDeleted = (data: any) => {
      // Remove the order from the list
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

  const handleMenu = (order: any) => {
    if (expandedOrderId === order._id) {
      setExpandedOrderId(null);
      setShowStatusOptions(null);
    } else {
      setExpandedOrderId(order._id);
      setMenuOrder(order);
      setShowStatusOptions(null);
    }
  };
  const closeMenu = () => {
    setExpandedOrderId(null);
    setMenuOrder(null);
    setShowStatusOptions(null);
  };

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
      // Try to fetch staff list if empty
      await fetchStaffList();
    }
    setSelectedMarkedBy(null);
    setSelectedRecievedBy(null);
    setPaymentOrder(menuOrder);
    setShowPaymentModal(true);
  };

  const handleChangeStatus = () => {
    setShowStatusOptions(menuOrder._id);
  };

  const handleSelectStatus = async (status: string) => {
    setShowStatusOptions(null);
    if (!menuOrder) return;
    if (status === 'Dispatched') {
      // Open delivery partner modal
      setPendingStatusChange({ orderId: menuOrder.orderId, newStatus: status, prevStatus: menuOrder.orderStatus });
      setSelectedDeliveryPartner(null);
      setShowDeliveryModal(true);
      return;
    }
    try {
      await updateOrder(menuOrder.orderId, { orderStatus: status });
      fetchAndSetOrders();
    } catch (err: any) {
      console.error('Status update failed:', err.response?.data || err.message);
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
              console.error('Delete failed:', err.response?.data || err.message);
              Alert.alert("Error", err.response?.data?.message || "Failed to delete order");
            }
          }
        }
      ]
    );
  };

  // Delivery Partner Modal Handlers
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
      console.error('Delivery partner update failed:', err.response?.data || err.message);
      Alert.alert("Error", err.response?.data?.message || "Failed to update status");
    }
    setPendingStatusChange(null);
    setSelectedDeliveryPartner(null);
  };
  const handleDeliveryModalClose = () => {
    // Prevent closing if not selected
    if (!selectedDeliveryPartner) {
      alert('Please Choose Delivery Partner');
      // Revert status if needed
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
      console.error('Payment update failed:', err.response?.data || err.message);
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

    // Add edit/status/payment options based on role
    if (['Admin', 'Staff'].includes(userRole)) {
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
      // Executive can edit their orders
      options.push(
        { key: 'edit', label: 'Edit Order', action: handleEditOrder }
      );
    }

    // Add delete option for Admin only
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
    <View style={styles.screenWrap}>
      {/* Fixed Header */}
      <View style={styles.headerBar}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#3D5AFE" />
        </Pressable>
        <Text style={styles.headerTitle}>Orders</Text>
      </View>
      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={ACCENT} />
        </View>
      ) : (
        <>
        {/* Search and Filter Controls */}
        <View style={styles.filterBar}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by Name or ID"
            value={search}
            onChangeText={setSearch}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
            {/* Status Filter Chips */}
            <Pressable
              style={[styles.chip, statusFilter === null && styles.chipActive]}
              onPress={() => setStatusFilter(null)}
            >
              <Ionicons name="list" size={16} color={statusFilter === null ? '#fff' : ACCENT} style={styles.chipIcon} />
              <Text style={[styles.chipText, statusFilter === null && styles.chipTextActive]}>All</Text>
            </Pressable>
            {statusOptions.map(opt => (
              <Pressable
                key={opt}
                style={[styles.chip, statusFilter === opt && styles.chipActive]}
                onPress={() => setStatusFilter(statusFilter === opt ? null : opt)}
              >
                <Ionicons
                  name={
                    opt === 'Pending' ? 'time-outline' :
                    opt === 'Invoice' ? 'document-text-outline' :
                    opt === 'Dispatched' ? 'send-outline' :
                    opt === 'DC' ? 'cube-outline' : 'ellipse-outline'
                  }
                  size={16}
                  color={statusFilter === opt ? '#fff' : ACCENT}
                  style={styles.chipIcon}
                />
                <Text style={[styles.chipText, statusFilter === opt && styles.chipTextActive]}>{opt}</Text>
              </Pressable>
            ))}
          </ScrollView>
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
            >
              {/* Line 1: Order ID and menu icon */}
              <View style={styles.cardRowTop}>
                <Text style={styles.orderId}>{item.orderId}</Text>
              <Pressable 
                style={[styles.menuIconBtn, expandedOrderId === item._id && styles.menuIconBtnActive]} 
                onPress={() => handleMenu(item)}
              >
                <Ionicons 
                  name={expandedOrderId === item._id ? "chevron-up" : "ellipsis-vertical"} 
                  size={20} 
                  color={expandedOrderId === item._id ? "#3D5AFE" : "#b0b3b8"} 
                />
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
              
              {/* Inline Action Menu */}
              {expandedOrderId === item._id && (
                <Animated.View style={[styles.actionMenu, { height: animatedHeight }]}>
                  <View style={styles.actionGrid}>
                    {showStatusOptions === item._id ? (
                      // Show status options
                      statusOptions.filter(s => s !== item.orderStatus).map((status) => (
                        <Pressable
                          key={status}
                          style={[styles.actionButton, styles.statusButton]}
                          onPress={() => handleSelectStatus(status)}
                        >
                          <Ionicons
                            name={
                              status === 'Pending' ? 'time-outline' :
                              status === 'DC' ? 'cube-outline' :
                              status === 'Invoice' ? 'document-text-outline' :
                              status === 'Dispatched' ? 'send-outline' : 'ellipse-outline'
                            }
                            size={20}
                            color="#3D5AFE"
                            style={styles.actionButtonIcon}
                          />
                          <Text style={[styles.actionButtonText, styles.statusButtonText]}>
                            {status}
                          </Text>
                        </Pressable>
                      ))
                    ) : (
                      // Show regular menu options
                      getMenuOptions().map((option) => (
                        <Pressable
                          key={option.key}
                          style={[
                            styles.actionButton,
                            option.disabled && styles.actionButtonDisabled,
                            option.destructive && styles.actionButtonDestructive
                          ]}
                          onPress={option.disabled ? undefined : option.action}
                          disabled={option.disabled}
                        >
                          <Ionicons
                            name={
                              option.key === 'view' ? 'eye-outline' :
                              option.key === 'print' ? 'print-outline' :
                              option.key === 'edit' ? 'create-outline' :
                              option.key === 'status' ? 'swap-horizontal' :
                              option.key === 'paid' ? 'checkmark-circle-outline' :
                              option.key === 'delete' ? 'trash-outline' : 'ellipse-outline'
                            }
                            size={20}
                            color={
                              option.disabled ? '#999' :
                              option.destructive ? '#e53935' : '#3D5AFE'
                            }
                            style={styles.actionButtonIcon}
                          />
                          <Text style={[
                            styles.actionButtonText,
                            option.disabled && styles.actionButtonTextDisabled,
                            option.destructive && styles.actionButtonTextDestructive
                          ]}>
                            {option.label}
                          </Text>
                        </Pressable>
                      ))
                    )}
                  </View>
                </Animated.View>
              )}
            </Pressable>
          )}
          refreshing={refreshing}
          onRefresh={fetchAndSetOrders}
          ListEmptyComponent={() => (
            statusFilter === null ? (
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyText}>No Orders Yet</Text>
                <Pressable style={styles.createOrderBtn} onPress={() => router.push({ pathname: '/orders/new-order', params: { role } })}>
                  <Text style={styles.createOrderBtnText}>Create Order</Text>
                </Pressable>
              </View>
            ) : statusFilter === 'Pending' ? (
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyText}>You don't have any pending orders</Text>
              </View>
            ) : statusFilter === 'DC' ? (
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyText}>No DC orders</Text>
              </View>
            ) : statusFilter === 'Invoice' ? (
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyText}>No invoice orders</Text>
              </View>
            ) : statusFilter === 'Dispatched' ? (
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyText}>No dispatched orders</Text>
              </View>
            ) : null
          )}
        />
        {/* Delivery Partner Modal */}
        <Modal
          visible={showDeliveryModal}
          transparent
          animationType="fade"
          onRequestClose={handleDeliveryModalClose}
        >
          <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={handleDeliveryModalClose} />
          <View style={[styles.menuSheet, { minHeight: 180 }]}> 
            <Text style={[styles.menuItemText, { fontSize: 18, marginBottom: 18 }]}>Assign Delivery Partner</Text>
            
            <View style={{ zIndex: 1000 }}>
              <DropDownPicker
                loading={staffLoading}
                items={staffDropdownItems}
                open={openDeliveryDropdown}
                value={selectedDeliveryPartner}
                setOpen={setOpenDeliveryDropdown}
                setValue={setSelectedDeliveryPartner}
                placeholder="Select Delivery Partner"
                style={styles.dropdownButton}
                textStyle={styles.dropdownButtonText}
                dropDownContainerStyle={styles.dropdownList}
                listItemLabelStyle={styles.dropdownItemLabel}
                selectedItemLabelStyle={styles.dropdownSelectedLabel}
                placeholderStyle={styles.dropdownPlaceholder}
                searchable={false}
                listMode="SCROLLVIEW"
                scrollViewProps={{ nestedScrollEnabled: true }}
              />
            </View>

            <Pressable
              style={[styles.menuItem, { backgroundColor: selectedDeliveryPartner ? ACCENT : '#eee', marginTop: 24 }]}
              onPress={selectedDeliveryPartner ? handleDeliveryPartnerSelect : undefined}
              disabled={!selectedDeliveryPartner}
            >
              <Text style={[styles.menuItemText, { color: selectedDeliveryPartner ? '#fff' : '#b0b3b8', textAlign: 'center' }]}>Assign</Text>
            </Pressable>
          </View>
        </Modal>

        {/* Mark as Paid Modal */}
        <Modal
          visible={showPaymentModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowPaymentModal(false)}
        >
          <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setShowPaymentModal(false)} />
          <View style={[styles.menuSheet, { minHeight: 260 }]}> 
            <Text style={[styles.menuItemText, { fontSize: 18, marginBottom: 18 }]}>Mark as Paid</Text>
            
            <Text style={{ marginBottom: 8, fontWeight: '600' }}>Payment Marked By</Text>
            <View style={{ zIndex: 1000 }}>
              <DropDownPicker
                loading={staffLoading}
                items={staffDropdownItems}
                open={openMarkedByDropdown}
                value={selectedMarkedBy}
                setOpen={setOpenMarkedByDropdown}
                setValue={setSelectedMarkedBy}
                placeholder="Select Staff Member"
                style={styles.dropdownButton}
                textStyle={styles.dropdownButtonText}
                dropDownContainerStyle={styles.dropdownList}
                listItemLabelStyle={styles.dropdownItemLabel}
                selectedItemLabelStyle={styles.dropdownSelectedLabel}
                placeholderStyle={styles.dropdownPlaceholder}
                searchable={false}
                listMode="SCROLLVIEW"
                scrollViewProps={{ nestedScrollEnabled: true }}
              />
            </View>

            <Text style={{ marginBottom: 8, marginTop: 16, fontWeight: '600' }}>Payment Recieved By</Text>
            <View style={{ zIndex: 999 }}>
              <DropDownPicker
                loading={staffLoading}
                items={staffDropdownItems}
                open={openRecievedByDropdown}
                value={selectedRecievedBy}
                setOpen={setOpenRecievedByDropdown}
                setValue={setSelectedRecievedBy}
                placeholder="Select Staff Member"
                style={styles.dropdownButton}
                textStyle={styles.dropdownButtonText}
                dropDownContainerStyle={styles.dropdownList}
                listItemLabelStyle={styles.dropdownItemLabel}
                selectedItemLabelStyle={styles.dropdownSelectedLabel}
                placeholderStyle={styles.dropdownPlaceholder}
                searchable={false}
                listMode="SCROLLVIEW"
                scrollViewProps={{ nestedScrollEnabled: true }}
              />
            </View>

            <Pressable
              style={[styles.menuItem, { backgroundColor: selectedMarkedBy && selectedRecievedBy ? ACCENT : '#eee', marginTop: 24 }]}
              onPress={selectedMarkedBy && selectedRecievedBy ? handlePaymentSubmit : undefined}
              disabled={!(selectedMarkedBy && selectedRecievedBy)}
            >
              <Text style={[styles.menuItemText, { color: selectedMarkedBy && selectedRecievedBy ? '#fff' : '#b0b3b8', textAlign: 'center' }]}>Mark as Paid</Text>
            </Pressable>
          </View>
        </Modal>
        </>
      )}
    </View>
  );
} 