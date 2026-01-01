import { memo } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { androidUI } from "../../utils/androidUI";
import { ACCENT } from "./constants";
import { MenuOption } from "./types";
import { getValidNextStatuses } from "./constants";

const styles = StyleSheet.create({
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
  menuIconBtnActive: {
    backgroundColor: '#e3eaff',
    transform: [{ scale: 1.05 }],
  },
  cardRowMid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  chipGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
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
  paymentChip: {
    backgroundColor: '#ffeaea',
    borderColor: '#ffeaea',
  },
  statusPartiallyDispatched: {
    backgroundColor: '#fff3e0',
    borderColor: '#ffe0b2',
  },
  cardRowBot: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
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
    flexWrap: 'wrap',
    lineHeight: 20,
  },
  orderRoute: {
    fontSize: 14,
    fontWeight: '500',
    color: androidUI.colors.text.secondary,
    marginBottom: 4,
    marginTop: 2,
    flex: 1,
    marginRight: 8,
  },
  orderCardTotalRegular: {
    fontSize: 15,
    fontWeight: '600',
    color: androidUI.colors.text.primary,
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
    color: ACCENT,
    fontWeight: '600',
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

interface OrderCardProps {
  item: any;
  expandedOrderId: string | null;
  showStatusOptions: string | null;
  animatedHeight: Animated.Value;
  userRole: string;
  onPress: () => void;
  onMenuPress: () => void;
  onSelectStatus: (status: string) => void;
  getMenuOptions: () => MenuOption[];
}

const OrderCard = memo(({ 
  item, 
  expandedOrderId, 
  showStatusOptions, 
  animatedHeight, 
  userRole, 
  onPress, 
  onMenuPress, 
  onSelectStatus, 
  getMenuOptions,
}: OrderCardProps) => {
  const isExpanded = expandedOrderId === item._id;
  const showStatus = showStatusOptions === item._id;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed
      ]}
      onPress={onPress}
    >
      {/* Line 1: Order ID and Three Dots */}
      <View style={styles.cardRowTop}>
        <Text style={styles.orderId}>{item.orderId}</Text>
        {/* Hide menu button for Inventory Manager - they can only view orders */}
        {userRole !== 'Inventory Manager' && (
          <Pressable 
            style={[styles.menuIconBtn, isExpanded && styles.menuIconBtnActive]} 
            onPress={onMenuPress}
          >
            <Ionicons 
              name={isExpanded ? "chevron-up" : "ellipsis-vertical"} 
              size={20} 
              color={isExpanded ? "#3D5AFE" : "#b0b3b8"} 
            />
          </Pressable>
        )}
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
      
      {/* Line 3: Order Route and Badges */}
      <View style={styles.cardRowMid}>
        {item.orderRoute && (
          <Text style={styles.orderRoute}>🛣️ {item.orderRoute}</Text>
        )}
        <View style={styles.chipGroup}>
        </View>
      </View>
      
      {/* Line 4: Total Amount and Payment Due Badge */}
      <View style={styles.cardRowMid}>
        <Text style={styles.orderCardTotalRegular}>
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
      
      {/* Inline Action Menu */}
      {isExpanded && (
        <Animated.View style={[styles.actionMenu, { height: animatedHeight }]}>
          <View style={styles.actionGrid}>
            {showStatus ? (
              // Show only valid next status options
              getValidNextStatuses(item.orderStatus).map((status) => (
                <Pressable
                  key={status}
                  style={[styles.actionButton, styles.statusButton]}
                  onPress={() => onSelectStatus(status)}
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
  );
});

export default OrderCard;

