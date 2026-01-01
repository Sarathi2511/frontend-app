import { useLocalSearchParams, useRouter } from "expo-router";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Platform, Alert, Image } from "react-native";
import { useEffect, useState } from "react";
import { getOrders } from "../utils/api";
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { androidUI } from "../utils/androidUI";
import { useToast } from "../contexts/ToastContext";

const ACCENT = "#3D5AFE";

// Status timeline component
function StatusTimeline({ currentStatus, statusHistory }: { currentStatus: string; statusHistory: any[] }) {
  const statusFlow = ['Pending', 'DC', 'Invoice', 'Dispatched'];
  const statusIcons: { [key: string]: string } = {
    'Pending': '⏳',
    'DC': '📝',
    'Invoice': '🧾',
    'Dispatched': '🚚'
  };
  const statusColors: { [key: string]: string } = {
    'Pending': '#b8860b',
    'DC': '#3D5AFE',
    'Invoice': '#388e3c',
    'Dispatched': '#43a047'
  };

  const currentIndex = statusFlow.indexOf(currentStatus);
  
  // Create a map of status to history entry (get the latest entry for each status)
  const statusHistoryMap = new Map<string, any>();
  if (statusHistory && Array.isArray(statusHistory)) {
    statusHistory.forEach((entry: any) => {
      const existing = statusHistoryMap.get(entry.status);
      if (!existing || new Date(entry.updatedAt) > new Date(existing.updatedAt)) {
        statusHistoryMap.set(entry.status, entry);
      }
    });
  }
  
  const formatDate = (date: Date | string | null) => {
    if (!date) return 'N/A';
    try {
      const d = typeof date === 'string' ? new Date(date) : date;
      return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'N/A';
    }
  };

  return (
    <View style={styles.timelineContainer}>
      {statusFlow.map((status, index) => {
        const isCompleted = index <= currentIndex;
        const isCurrent = status === currentStatus;
        const historyEntry = statusHistoryMap.get(status);

        return (
          <View key={status} style={styles.timelineItem}>
            <View style={styles.timelineLeft}>
              <View style={[
                styles.timelineIcon,
                isCompleted && styles.timelineIconCompleted,
                isCurrent && styles.timelineIconCurrent,
                { backgroundColor: isCompleted ? (statusColors[status] || ACCENT) + '20' : '#f0f0f0' }
              ]}>
                <Text style={styles.timelineIconText}>{statusIcons[status] || '○'}</Text>
              </View>
              {index < statusFlow.length - 1 && (
                <View style={[
                  styles.timelineLine,
                  isCompleted && styles.timelineLineCompleted
                ]} />
              )}
            </View>
            <View style={styles.timelineRight}>
              <View style={styles.timelineContent}>
                <View style={styles.timelineHeader}>
                  <Text style={[
                    styles.timelineStatusText,
                    isCompleted && styles.timelineStatusTextCompleted,
                    isCurrent && styles.timelineStatusTextCurrent
                  ]}>
                    {status}
                  </Text>
                  {isCurrent && (
                    <View style={styles.currentBadge}>
                      <Text style={styles.currentBadgeText}>Current</Text>
                    </View>
                  )}
                </View>
                {historyEntry && (
                  <View style={styles.timelineDetails}>
                    {historyEntry.updatedAt && (
                      <Text style={styles.timelineDetailText}>
                        {formatDate(historyEntry.updatedAt)}
                        {historyEntry.updatedBy && typeof historyEntry.updatedBy === 'object' && historyEntry.updatedBy.name 
                          ? ` • ${historyEntry.updatedBy.name}` 
                          : ''}
                      </Text>
                    )}
                  </View>
                )}
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

export default function OrderDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { showToast } = useToast();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      const fetchOrder = async () => {
        try {
          const response = await getOrders();
          const foundOrder = response.data.find((o: any) => o.orderId === id);
          if (foundOrder) {
            setOrder(foundOrder);
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

          {/* Status Timeline */}
          <View style={styles.sectionCard}>
            {sectionHeader('📋', 'Status Timeline')}
            <StatusTimeline currentStatus={order.orderStatus} statusHistory={order.statusHistory || []} />
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
                  <View key={item._tempId || item._id || `item-${idx}`} style={styles.orderItemCard}>
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
        </ScrollView>
        <View style={styles.stickyTotalCard}>
          <Text style={styles.stickyTotalLabel}>Order Total</Text>
          <Text style={styles.stickyTotalValue}>
            ₹{order.orderItems ? Math.round(order.orderItems.reduce((sum: number, item: any) => sum + item.total, 0)) : 0}
          </Text>
        </View>
      </View>
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
  timelineContainer: {
    marginTop: 4,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  timelineLeft: {
    alignItems: 'center',
    marginRight: 12,
    width: 32,
  },
  timelineIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  timelineIconCompleted: {
    borderColor: ACCENT,
  },
  timelineIconCurrent: {
    borderWidth: 3,
    borderColor: ACCENT,
    elevation: 2,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  timelineIconText: {
    fontSize: 14,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#e0e0e0',
    marginTop: 2,
    minHeight: 12,
  },
  timelineLineCompleted: {
    backgroundColor: ACCENT,
  },
  timelineRight: {
    flex: 1,
    paddingTop: 2,
  },
  timelineContent: {
    flex: 1,
  },
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  timelineStatusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9e9e9e',
    marginRight: 8,
  },
  timelineStatusTextCompleted: {
    color: '#424242',
  },
  timelineStatusTextCurrent: {
    color: ACCENT,
    fontWeight: '700',
  },
  currentBadge: {
    backgroundColor: ACCENT + '20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  currentBadgeText: {
    color: ACCENT,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  timelineDetails: {
    marginTop: 2,
  },
  timelineDetailText: {
    fontSize: 11,
    color: '#6B7280',
    lineHeight: 16,
  },
}); 