import { useLocalSearchParams, useRouter } from "expo-router";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Platform, Alert, Image, Modal, TextInput } from "react-native";
import { useEffect, useState } from "react";
import { getOrders, cancelOrder, getOrderStockStatus } from "../api";
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { androidUI } from "../utils/androidUI";
import { useToast } from "../contexts/ToastContext";

const ACCENT = "#3D5AFE";

export default function OrderDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { showToast } = useToast();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stockStatus, setStockStatus] = useState<any[]>([]);
  const [loadingStock, setLoadingStock] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (id) {
      const fetchOrder = async () => {
        try {
          const response = await getOrders();
          const foundOrder = response.data.find((o: any) => o.orderId === id);
          if (foundOrder) {
            setOrder(foundOrder);
            // Fetch stock status for the order
            fetchStockStatus(foundOrder.orderId);
          } else {
            setOrder(null);
          }
        } catch (err) {
          Alert.alert("Error", "Failed to fetch order details");
          setOrder(null);
        }
        setLoading(false);
      };
      fetchOrder();
    }
  }, [id]);

  const fetchStockStatus = async (orderId: string) => {
    setLoadingStock(true);
    try {
      const response = await getOrderStockStatus(orderId);
      setStockStatus(response.data.stockStatus || []);
    } catch (err) {
      console.error('Failed to fetch stock status:', err);
    }
    setLoadingStock(false);
  };

  const handleCancelOrder = async () => {
    if (!order) return;
    
    setCancelling(true);
    try {
      await cancelOrder(order.orderId, cancellationReason);
      showToast('Order cancelled successfully', 'success');
      setShowCancelModal(false);
      setCancellationReason('');
      // Refresh order data
      const response = await getOrders();
      const updatedOrder = response.data.find((o: any) => o.orderId === order.orderId);
      if (updatedOrder) {
        setOrder(updatedOrder);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to cancel order';
      showToast(errorMessage, 'error');
    }
    setCancelling(false);
  };

  if (loading) return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f7fa' }}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={ACCENT} />
      </View>
    </SafeAreaView>
  );
  
  if (!order) return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f7fa' }}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 16, color: '#666' }}>Order not found.</Text>
      </View>
    </SafeAreaView>
  );

  const sectionHeader = (icon: string, label: string) => (
    <Text style={styles.sectionHeader}>{icon} {label.toUpperCase()}</Text>
  );

  // Add pill badge component
  const Pill = ({ icon, text, color, bg }: { icon: string; text: string; color: string; bg: string }) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: bg, borderRadius: 16, paddingVertical: 4, paddingHorizontal: 12, marginRight: 8 }}>
      <Text style={{ fontSize: 14, marginRight: 4 }}>{icon}</Text>
      <Text style={{ color, fontWeight: '700', fontSize: 14 }}>{text}</Text>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f7fa' }}>
      <View style={styles.screenWrap}>
        {/* Header Bar */}
        <View style={styles.headerBar}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={ACCENT} />
          </Pressable>
          <Text style={styles.headerTitle}>Order Details</Text>
        </View>

        <ScrollView 
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Order Image */}
          {order.orderImage ? (
            <View style={styles.orderImageContainer}>
              <Image source={{ uri: order.orderImage }} style={styles.orderImage} resizeMode="cover" />
            </View>
          ) : null}
          {/* Order Summary */}
          <View style={styles.sectionCard}>
            {sectionHeader('🧾', 'Order Summary')}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={styles.orderIdText}>{order.orderId}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="calendar" size={16} color="#6B7280" style={{ marginRight: 4 }} />
                <Text style={styles.orderDateText}>{new Date(order.date).toLocaleDateString()}</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <Pill
                icon={order.orderStatus === 'Dispatched' ? '✅' : order.orderStatus === 'Pending' ? '⏳' : order.orderStatus === 'Invoice' ? '🧾' : '📦'}
                text={order.orderStatus}
                color={order.orderStatus === 'Dispatched' ? '#43a047' : order.orderStatus === 'Pending' ? '#b8860b' : order.orderStatus === 'Invoice' ? '#388e3c' : '#3D5AFE'}
                bg={order.orderStatus === 'Dispatched' ? '#e8f5e9' : order.orderStatus === 'Pending' ? '#fff3cd' : order.orderStatus === 'Invoice' ? '#e8f5e9' : '#e3e9f9'}
              />
              <Pill
                icon={order.paymentCondition === 'Immediate' ? '💵' : '⏳'}
                text={order.paymentCondition}
                color={order.paymentCondition === 'Immediate' ? '#43a047' : '#3D5AFE'}
                bg={order.paymentCondition === 'Immediate' ? '#e8f5e9' : '#e3e9f9'}
              />
            </View>
          </View>

          {/* Delivery Details */}
          <View style={styles.sectionCard}>
            {sectionHeader('📦', 'Delivery Details')}
            <Detail label="Customer Name" value={order.customerName} />
            <Detail label="Order Route" value={order.orderRoute} />
            <Detail label="Customer Phone" value={order.customerPhone} />
            <Detail label="Customer Address" value={order.customerAddress} />
            {order.additionalNotes ? (
              <Detail label="Additional Notes" value={order.additionalNotes} />
            ) : null}
            <Detail label="Delivery Partner" value={order.deliveryPartner || 'Not Assigned'} />
          </View>

          {/* Payment Info */}
          <View style={styles.sectionCard}>
            {sectionHeader('💳', 'Payment Info')}
            <Detail label="Payment Condition" value={order.paymentCondition} />
            <Detail label="Payment Marked By" value={order.paymentMarkedBy || 'Not Set'} />
            <Detail label="Payment Received By" value={order.paymentRecievedBy || 'Not Set'} />
            {/* Payment Badge */}
            {order.paymentMarkedBy && order.paymentRecievedBy ? (
              <View style={styles.badgeContainer}>
                <View style={styles.paidBadge}>
                  <Ionicons name="checkmark-circle" size={16} color="#43a047" style={{ marginRight: 4 }} />
                  <Text style={styles.paidBadgeText}>Paid</Text>
                </View>
              </View>
            ) : order.paymentCondition === 'Immediate' ? (
              <View style={styles.badgeContainer}>
                <View style={styles.dueBadge}>
                  <Ionicons name="alert-circle" size={16} color="#ff5252" style={{ marginRight: 4 }} />
                  <Text style={styles.dueBadgeText}>Payment Due</Text>
                </View>
              </View>
            ) : null}
          </View>

          {/* Staff Involved */}
          <View style={styles.sectionCard}>
            {sectionHeader('🧍', 'Staff Involved')}
            <Detail label="Assigned To" value={order.assignedTo} />
            <Detail label="Created By" value={order.createdBy} />
          </View>

          {/* Order Items */}
          <View style={styles.sectionCard}>
            {sectionHeader('📦', 'Order Items')}
            {order.orderItems && order.orderItems.length > 0 ? (
              <View style={styles.orderItemsContainer}>
                {order.orderItems.map((item: any, idx: number) => (
                  <View key={idx} style={styles.orderItemCard}>
                    <View style={styles.orderItemRow}>
                      {item.image || item.productImage ? (
                        <Image source={{ uri: item.image || item.productImage }} style={styles.productThumb} />
                      ) : (
                        <View style={styles.productThumbPlaceholder}>
                          <Ionicons name="cube-outline" size={28} color="#b0b3b8" />
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={styles.orderItemName} numberOfLines={1}>{item.name}</Text>
                        <View style={styles.orderItemMetaRow}>
                          <Text style={styles.orderItemMeta}>Qty: {item.qty} × ₹{item.price}</Text>
                          <Text style={styles.orderItemTotal}>₹{item.total}</Text>
                        </View>
                        {item.dimension && (
                          <Text style={[styles.orderItemMeta, { marginTop: 2 }]}>{item.dimension}</Text>
                        )}
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.noItemsText}>No items in this order.</Text>
            )}
          </View>

          {/* Stock Status */}
          {stockStatus.length > 0 && (
            <View style={styles.sectionCard}>
              {sectionHeader('📊', 'Stock Status')}
              {loadingStock ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={ACCENT} />
                  <Text style={styles.loadingText}>Checking stock availability...</Text>
                </View>
              ) : (
                <View style={styles.stockStatusContainer}>
                  {stockStatus.map((item: any, idx: number) => (
                    <View key={idx} style={styles.stockStatusItem}>
                      <View style={styles.stockStatusHeader}>
                        <Text style={styles.stockProductName}>{item.productName}</Text>
                        <View style={[
                          styles.stockStatusBadge,
                          item.sufficient ? styles.stockSufficient : styles.stockInsufficient
                        ]}>
                          <Text style={[
                            styles.stockStatusText,
                            item.sufficient ? styles.stockSufficientText : styles.stockInsufficientText
                          ]}>
                            {item.sufficient ? '✓ Sufficient' : '✗ Insufficient'}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.stockDetails}>
                        <Text style={styles.stockDetailText}>
                          Required: <Text style={styles.stockDetailValue}>{item.requiredQuantity}</Text>
                        </Text>
                        <Text style={styles.stockDetailText}>
                          Available: <Text style={[
                            styles.stockDetailValue,
                            item.lowStock ? styles.lowStockText : null
                          ]}>{item.availableStock}</Text>
                          {item.lowStock && <Text style={styles.lowStockIndicator}> (Low Stock)</Text>}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Cancellation Info */}
          {order.status === 'cancelled' && (
            <View style={styles.sectionCard}>
              {sectionHeader('❌', 'Cancellation Details')}
              <Detail label="Cancelled By" value={order.cancelledBy || 'Unknown'} />
              <Detail label="Cancelled At" value={order.cancelledAt ? new Date(order.cancelledAt).toLocaleString() : 'Unknown'} />
              <Detail label="Reason" value={order.cancellationReason || 'No reason provided'} />
            </View>
          )}

          {/* Action Buttons */}
          {order.status !== 'cancelled' && order.orderStatus !== 'Dispatched' && (
            <View style={styles.sectionCard}>
              {sectionHeader('⚡', 'Actions')}
              <Pressable 
                style={styles.cancelButton}
                onPress={() => setShowCancelModal(true)}
              >
                <Ionicons name="close-circle" size={20} color="#fff" />
                <Text style={styles.cancelButtonText}>Cancel Order</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
        <View style={styles.stickyTotalCard}>
          <Text style={styles.stickyTotalLabel}>Order Total</Text>
          <Text style={styles.stickyTotalValue}>
            ₹{order.orderItems ? Math.round(order.orderItems.reduce((sum: number, item: any) => sum + item.total, 0)) : 0}
          </Text>
        </View>
      </View>

      {/* Cancellation Modal */}
      <Modal
        visible={showCancelModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCancelModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Cancel Order</Text>
            <Text style={styles.modalSubtitle}>
              Are you sure you want to cancel this order? This action will restore the stock quantities.
            </Text>
            
            <View style={styles.reasonInputContainer}>
              <Text style={styles.reasonLabel}>Cancellation Reason (Optional):</Text>
              <TextInput
                style={styles.reasonInput}
                value={cancellationReason}
                onChangeText={setCancellationReason}
                placeholder="Enter reason for cancellation..."
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.modalButtons}>
              <Pressable 
                style={styles.modalButtonSecondary}
                onPress={() => {
                  setShowCancelModal(false);
                  setCancellationReason('');
                }}
                disabled={cancelling}
              >
                <Text style={styles.modalButtonSecondaryText}>Cancel</Text>
              </Pressable>
              <Pressable 
                style={[styles.modalButtonPrimary, cancelling && styles.modalButtonDisabled]}
                onPress={handleCancelOrder}
                disabled={cancelling}
              >
                {cancelling ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalButtonPrimaryText}>Confirm Cancellation</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}:</Text>
      <Text style={styles.detailValue}>{value}</Text>
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
  container: {
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    paddingHorizontal: androidUI.spacing.lg,
    flexGrow: 1,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  detailLabel: {
    fontWeight: '600',
    color: androidUI.colors.text.primary,
    width: 140,
    fontSize: 15,
  },
  detailValue: {
    flex: 1,
    color: androidUI.colors.text.secondary,
    fontSize: 15,
  },
  badgeContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  paidBadge: {
    backgroundColor: '#e8f5e9',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  paidBadgeText: {
    color: '#43a047',
    fontWeight: '700',
    fontSize: 14,
  },
  dueBadge: {
    backgroundColor: '#ffeaea',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dueBadgeText: {
    color: '#ff5252',
    fontWeight: '700',
    fontSize: 14,
  },
  itemsHeader: {
    fontSize: 18,
    fontWeight: '600',
    color: '#22223b',
    marginBottom: 12,
  },
  orderItemsContainer: {
    marginBottom: 20,
  },
  orderItemCard: {
    backgroundColor: androidUI.colors.surface,
    borderRadius: androidUI.borderRadius.medium,
    padding: androidUI.spacing.lg,
    marginBottom: androidUI.spacing.md,
    ...androidUI.shadow,
  },
  orderItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productThumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
    marginRight: 14,
    backgroundColor: '#f3f6fa',
  },
  productThumbPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 8,
    marginRight: 14,
    backgroundColor: '#f3f6fa',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderItemMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  orderItemTotal: {
    fontWeight: '700',
    color: ACCENT,
    fontSize: 16,
    marginLeft: 12,
  },
  orderItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#22223b',
  },
  orderItemCardMidRow: {
    marginBottom: 12,
  },
  orderItemMetaGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  orderItemMeta: {
    fontSize: 14,
    color: '#666',
  },
  orderItemMetaValue: {
    fontWeight: '600',
    color: ACCENT,
  },
  orderItemCardBotRow: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
    alignItems: 'flex-end',
  },
  orderItemsFooterCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  orderItemsFooterTotalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#22223b',
  },
  orderItemsFooterTotalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: ACCENT,
  },
  noItemsText: {
    color: '#b0b3b8',
    fontSize: 15,
    marginBottom: 20,
    textAlign: 'center',
  },
  sectionHeader: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '700',
    letterSpacing: 1.2,
    marginTop: 22,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  orderIdText: {
    fontWeight: '700',
    fontSize: 16,
    color: '#3D5AFE',
    letterSpacing: 0.2,
  },
  orderDateText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
  stickyTotalCard: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 32,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 12,
    zIndex: 100,
  },
  stickyTotalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#22223b',
  },
  stickyTotalValue: {
    fontSize: 24,
    fontWeight: '800',
    color: ACCENT,
    letterSpacing: 0.5,
  },
  orderImageContainer: {
    alignItems: 'center',
    marginBottom: 18,
  },
  orderImage: {
    width: '100%',
    maxWidth: 340,
    height: 180,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    backgroundColor: '#f3f6fa',
    marginBottom: 8,
  },
  // Stock Status Styles
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  loadingText: {
    marginLeft: 8,
    color: '#6B7280',
    fontSize: 14,
  },
  stockStatusContainer: {
    gap: 12,
  },
  stockStatusItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#e9ecef',
  },
  stockStatusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  stockProductName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#22223b',
    flex: 1,
  },
  stockStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  stockSufficient: {
    backgroundColor: '#d4edda',
  },
  stockInsufficient: {
    backgroundColor: '#f8d7da',
  },
  stockStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  stockSufficientText: {
    color: '#155724',
  },
  stockInsufficientText: {
    color: '#721c24',
  },
  stockDetails: {
    gap: 4,
  },
  stockDetailText: {
    fontSize: 14,
    color: '#6B7280',
  },
  stockDetailValue: {
    fontWeight: '600',
    color: '#22223b',
  },
  lowStockText: {
    color: '#ff9800',
  },
  lowStockIndicator: {
    color: '#ff9800',
    fontSize: 12,
    fontStyle: 'italic',
  },
  // Cancellation Button Styles
  cancelButton: {
    backgroundColor: '#dc3545',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#22223b',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 20,
  },
  reasonInputContainer: {
    marginBottom: 24,
  },
  reasonLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#22223b',
    marginBottom: 8,
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    color: '#22223b',
    backgroundColor: '#f8f9fa',
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButtonSecondary: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
  },
  modalButtonSecondaryText: {
    color: '#22223b',
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonPrimary: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: '#dc3545',
    alignItems: 'center',
  },
  modalButtonPrimaryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonDisabled: {
    opacity: 0.6,
  },
}); 