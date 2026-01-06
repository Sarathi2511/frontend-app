import { useRouter } from "expo-router";
import { useEffect, useState, useCallback } from "react";
import { FlatList, StyleSheet, Text, View, ActivityIndicator, Pressable, Alert } from "react-native";
import { getOrders, updateOrder, deleteOrder, getStaff, getDispatchConfirmation, dispatchOrder } from "../utils/api";
import { useLocalSearchParams } from "expo-router";
import { androidUI } from "../utils/androidUI";
import { useToast } from "../contexts/ToastContext";
import { Animated } from "react-native";
import OrdersHeader from "./components/OrdersHeader";
import OrdersFilterBar from "./components/OrdersFilterBar";
import OrderCard from "./components/OrderCard";
import DispatchModal from "./components/DispatchModal";
import PaymentModal from "./components/PaymentModal";
import { ACCENT, getValidNextStatuses } from "./components/constants";
import { MenuOption } from "./components/types";

const styles = StyleSheet.create({
  screenWrap: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  loaderWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: androidUI.colors.background,
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
});

export default function OrdersScreen() {
  const router = useRouter();
  const { role } = useLocalSearchParams();
  const userRole = role ? String(role) : "User";
  const { showToast } = useToast();
  const [orders, setOrders] = useState<any[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuOrder, setMenuOrder] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // Order counts for status filters
  const [orderCounts, setOrderCounts] = useState<{[key: string]: number}>({
    Pending: 0,
    DC: 0,
    Invoice: 0,
    Dispatched: 0
  });
  
  // Staff List State
  const [staffList, setStaffList] = useState<any[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffError, setStaffError] = useState<string | null>(null);

  // Delivery Partner State
  const [selectedDeliveryPartner, setSelectedDeliveryPartner] = useState<string | null>(null);
  const [pendingStatusChange, setPendingStatusChange] = useState<{orderId: string, newStatus: string, prevStatus: string} | null>(null);

  // Dispatch Confirmation State
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [dispatchData, setDispatchData] = useState<any>(null);
  const [dispatchLoading, setDispatchLoading] = useState(false);
  const [invoiceCreated, setInvoiceCreated] = useState(false);
  const [dispatchUpdating, setDispatchUpdating] = useState(false);
  
  // Partial Delivery State - tracks delivered quantities for each product
  const [deliveredItems, setDeliveredItems] = useState<{[productId: string]: {qty: number, isDelivered: boolean}}>({});

  // Payment State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
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
      
      // Calculate order counts for each status
      const counts = {
        Pending: 0,
        DC: 0,
        Invoice: 0,
        Dispatched: 0
      };
      
      response.data.forEach((order: any) => {
        if (counts.hasOwnProperty(order.orderStatus)) {
          counts[order.orderStatus as keyof typeof counts]++;
        }
      });
      
      setOrderCounts(counts);
    } catch (err) {
      setOrders([]);
      setFilteredOrders([]);
      setOrderCounts({ Pending: 0, DC: 0, Invoice: 0, Dispatched: 0 });
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
    fetchStaffList();
  }, []);

  // Handle dispatch modal opening
  useEffect(() => {
    if (showDispatchModal && pendingStatusChange) {
      handleDispatchModalOpen();
    }
  }, [showDispatchModal, pendingStatusChange]);

  useEffect(() => {
    let filtered = [...orders];
    if (search.trim()) {
      filtered = filtered.filter(o =>
        o.customerName.toLowerCase().includes(search.toLowerCase()) ||
        o.orderId.toLowerCase().includes(search.toLowerCase()) ||
        (o.orderRoute && o.orderRoute.toLowerCase().includes(search.toLowerCase()))
      );
    }
    if (statusFilter) {
      filtered = filtered.filter(o => o.orderStatus === statusFilter);
    }
    setFilteredOrders(filtered);
  }, [search, statusFilter, orders]);

  // Animate dropdown expansion/collapse
  useEffect(() => {
    Animated.timing(animatedHeight, {
      toValue: expandedOrderId ? 100 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [expandedOrderId]);

  const handleMenu = useCallback((order: any) => {
    if (expandedOrderId === order._id) {
      setExpandedOrderId(null);
      setShowStatusOptions(null);
    } else {
      setExpandedOrderId(order._id);
      setMenuOrder(order);
      setShowStatusOptions(null);
    }
  }, [expandedOrderId]);

  const closeMenu = () => {
    setExpandedOrderId(null);
    setMenuOrder(null);
    setShowStatusOptions(null);
  };

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
    setShowStatusOptions(menuOrder._id);
  };

  const handleSelectStatus = useCallback(async (status: string) => {
    setShowStatusOptions(null);
    if (!menuOrder) return;
    if (status === 'Dispatched') {
      setPendingStatusChange({ orderId: menuOrder.orderId, newStatus: status, prevStatus: menuOrder.orderStatus });
      setSelectedDeliveryPartner(null);
      setShowDispatchModal(true);
      return;
    }
    try {
      await updateOrder(menuOrder.orderId, { orderStatus: status });
      fetchAndSetOrders();
    } catch (err: any) {
      console.error('Status update failed:', err.response?.data || err.message);
      const errorMessage = err.response?.data?.message || "Failed to update status";
      showToast(errorMessage, 'error');
    }
  }, [menuOrder, showToast]);

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
              const errorMessage = err.response?.data?.message || "Failed to delete order";
              showToast(errorMessage, 'error');
            }
          }
        }
      ]
    );
  };

  // Dispatch Confirmation Modal Handlers
  const handleDispatchModalOpen = async () => {
    if (!pendingStatusChange) return;
    
    setDispatchLoading(true);
    try {
      const response = await getDispatchConfirmation(pendingStatusChange.orderId);
      setDispatchData(response.data);
      setInvoiceCreated(false);
      
      const initialDeliveredItems: {[productId: string]: {qty: number, isDelivered: boolean}} = {};
      response.data.orderItems.forEach((item: any) => {
        const defaultQty = Math.min(item.qty, item.availableStock);
        initialDeliveredItems[item.productId.toString()] = {
          qty: defaultQty,
          isDelivered: true
        };
      });
      setDeliveredItems(initialDeliveredItems);
    } catch (err: any) {
      console.error('Failed to load dispatch data:', err.response?.data || err.message);
      showToast('Failed to load dispatch data', 'error');
      setShowDispatchModal(false);
    } finally {
      setDispatchLoading(false);
    }
  };

  const handleDispatchConfirm = async () => {
    if (!pendingStatusChange || !selectedDeliveryPartner) {
      Alert.alert("Error", "Please select a delivery partner");
      return;
    }

    if (!invoiceCreated) {
      Alert.alert("Error", "Please confirm that the invoice has been created");
      return;
    }

    const hasDeliveredItems = Object.values(deliveredItems).some(item => item.isDelivered && item.qty > 0);
    if (!hasDeliveredItems) {
      Alert.alert("Error", "Please select at least one item to deliver");
      return;
    }

    setDispatchUpdating(true);
    try {
      const deliveredItemsArray = dispatchData.orderItems.map((item: any) => {
        const productId = item.productId.toString();
        const delivered = deliveredItems[productId] || { qty: 0, isDelivered: false };
        return {
          productId,
          deliveredQty: delivered.isDelivered ? delivered.qty : 0,
          isDelivered: delivered.isDelivered
        };
      });

      await dispatchOrder(pendingStatusChange.orderId, {
        deliveryPartner: selectedDeliveryPartner,
        deliveredItems: deliveredItemsArray
      });
      
      setShowDispatchModal(false);
      setPendingStatusChange(null);
      setSelectedDeliveryPartner(null);
      setDispatchData(null);
      setDeliveredItems({});
      fetchAndSetOrders();
      showToast('Order dispatched successfully', 'success');
    } catch (err: any) {
      console.error('Dispatch failed:', err.response?.data || err.message);
      const errorMessage = err.response?.data?.message || "Failed to dispatch order";
      showToast(errorMessage, 'error');
    } finally {
      setDispatchUpdating(false);
    }
  };

  const handleDispatchClose = () => {
    setShowDispatchModal(false);
    setSelectedDeliveryPartner(null);
    setDeliveredItems({});
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
      const errorMessage = err.response?.data?.message || "Failed to mark as paid";
      showToast(errorMessage, 'error');
    }
    setPaymentOrder(null);
    setSelectedMarkedBy(null);
    setSelectedRecievedBy(null);
  };

  // Get available menu options based on role
  const getMenuOptions = useCallback((): MenuOption[] => {
    const options: MenuOption[] = [];

    if (['Admin', 'Staff'].includes(userRole)) {
      options.push(
        { key: 'edit', label: 'Edit Order', action: handleEditOrder },
        { 
          key: 'status', 
          label: 'Change Status', 
          action: handleChangeStatus,
          disabled: getValidNextStatuses(menuOrder?.orderStatus || '').length === 0
        },
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
  }, [userRole, menuOrder]);

  return (
    <View style={styles.screenWrap}>
      <OrdersHeader />
      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={ACCENT} />
        </View>
      ) : (
        <>
          <OrdersFilterBar
            search={search}
            statusFilter={statusFilter}
            orderCounts={orderCounts}
            totalOrders={orders.length}
            onSearchChange={setSearch}
            onStatusFilterChange={setStatusFilter}
          />
          <FlatList
            data={filteredOrders}
            keyExtractor={item => item._id}
            contentContainerStyle={{ paddingBottom: 32 }}
            renderItem={({ item }) => (
              <OrderCard
                item={item}
                expandedOrderId={expandedOrderId}
                showStatusOptions={showStatusOptions}
                animatedHeight={animatedHeight}
                userRole={userRole}
                onPress={() => router.push({ pathname: '/orders/orderdetails', params: { id: item.orderId, role } })}
                onMenuPress={() => handleMenu(item)}
                onSelectStatus={handleSelectStatus}
                getMenuOptions={getMenuOptions}
              />
            )}
            refreshing={refreshing}
            onRefresh={fetchAndSetOrders}
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            updateCellsBatchingPeriod={50}
            initialNumToRender={10}
            windowSize={10}
            getItemLayout={(data, index) => ({
              length: 200,
              offset: 200 * index,
              index,
            })}
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
          <DispatchModal
            visible={showDispatchModal}
            loading={dispatchLoading}
            dispatchData={dispatchData}
            staffDropdownItems={staffDropdownItems}
            deliveredItems={deliveredItems}
            selectedDeliveryPartner={selectedDeliveryPartner}
            invoiceCreated={invoiceCreated}
            dispatchUpdating={dispatchUpdating}
            onClose={handleDispatchClose}
            onConfirm={handleDispatchConfirm}
            onDeliveryPartnerChange={setSelectedDeliveryPartner}
            onInvoiceCreatedChange={setInvoiceCreated}
            onDeliveredItemsChange={setDeliveredItems}
          />
          <PaymentModal
            visible={showPaymentModal}
            staffList={staffList}
            selectedMarkedBy={selectedMarkedBy}
            selectedReceivedBy={selectedRecievedBy}
            onClose={() => setShowPaymentModal(false)}
            onSubmit={handlePaymentSubmit}
            onMarkedByChange={setSelectedMarkedBy}
            onReceivedByChange={setSelectedRecievedBy}
          />
        </>
      )}
    </View>
  );
}
