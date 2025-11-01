import { useRouter } from "expo-router";
import { useEffect, useState, useCallback, useMemo, memo, useRef } from "react";
import { FlatList, Modal, Platform, Pressable, StyleSheet, Text, TouchableOpacity, View, TextInput, ActivityIndicator, ScrollView, Alert, Animated, KeyboardAvoidingView } from "react-native";
// Removed react-native-modal import - using built-in Modal instead
import { useFocusEffect } from '@react-navigation/native';
import { getOrders, updateOrder, deleteOrder, getStaff, getDispatchConfirmation, dispatchOrder } from "../utils/api";
import { Ionicons } from '@expo/vector-icons';
import DropDownPicker from 'react-native-dropdown-picker';
import { useLocalSearchParams } from "expo-router";
import { useSocket } from "../contexts/SocketContext";
import { androidUI } from "../utils/androidUI";
import { useToast } from "../contexts/ToastContext";

const ACCENT = "#3D5AFE";

const statusOptions = ["Pending", "DC", "Invoice", "Dispatched"];

// Define valid status transitions for flexible workflow
const getValidNextStatuses = (currentStatus: string): string[] => {
  const validTransitions = {
    'Pending': ['DC'],
    'DC': ['Invoice', 'Dispatched'], // Allow both Invoice and Dispatched from DC
    'Invoice': ['Dispatched'],
    'Dispatched': [] // Final state, no further transitions
  };
  return validTransitions[currentStatus as keyof typeof validTransitions] || [];
};

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
  customerNameRow: {
    marginBottom: 6,
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
  urgentChip: {
    backgroundColor: '#ffd1dc',
    borderColor: '#ffd1dc',
  },
  partialChip: {
    backgroundColor: '#fff3e0',
    borderColor: '#fff3e0',
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
  chipCount: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
    minWidth: 20,
    alignItems: 'center',
  },
  chipCountText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  chipCountTextInactive: {
    color: ACCENT,
    fontSize: 12,
    fontWeight: '700',
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
  orderCardTotalBold: {
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
    position: 'relative',
    maxHeight: 150,
    minHeight: 50,
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
  // Centered Modal Styles
  centeredModalContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  centeredModalContent: {
    backgroundColor: androidUI.colors.surface,
    borderRadius: androidUI.borderRadius.xxlarge,
    padding: androidUI.spacing.xxl,
    width: '90%',
    maxWidth: 400,
    ...androidUI.modalShadow,
    alignSelf: 'center',
  },
  centeredModalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: androidUI.colors.text.primary,
    textAlign: 'center',
    marginBottom: 24,
    fontFamily: androidUI.fontFamily.medium,
  },
  centeredModalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: androidUI.colors.text.primary,
    marginBottom: 8,
    fontFamily: androidUI.fontFamily.medium,
  },
  centeredDropdownButton: {
    backgroundColor: '#f3f6fa',
    borderColor: '#e3e9f9',
    borderRadius: androidUI.borderRadius.medium,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    height: 45,
  },
  centeredDropdownButtonText: {
    fontSize: 15,
    color: androidUI.colors.text.primary,
    fontFamily: androidUI.fontFamily.regular,
  },
  centeredDropdownList: {
    backgroundColor: '#fff',
    borderColor: '#e3e9f9',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
    maxHeight: 150,
    minHeight: 50,
  },
  centeredDropdownItemLabel: {
    fontSize: 15,
    color: androidUI.colors.text.primary,
    fontFamily: androidUI.fontFamily.regular,
  },
  centeredDropdownSelectedLabel: {
    color: ACCENT,
    fontWeight: '600',
    fontFamily: androidUI.fontFamily.medium,
  },
  centeredDropdownPlaceholder: {
    color: '#b0b3b8',
    fontSize: 15,
    fontFamily: androidUI.fontFamily.regular,
  },
  centeredModalButton: {
    backgroundColor: ACCENT,
    borderRadius: androidUI.borderRadius.large,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    ...androidUI.cardShadow,
    shadowColor: ACCENT,
  },
  centeredModalButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
    fontFamily: androidUI.fontFamily.medium,
  },
  // Inline dropdown styles for centered modal
  centeredDropdownWrap: {
    position: 'relative',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  dropdownPickerEmphasis: {
    borderWidth: 1.5,
    borderColor: ACCENT,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  inlineDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: androidUI.colors.surface,
    borderRadius: androidUI.borderRadius.medium,
    marginTop: 4,
    paddingVertical: 8,
    paddingHorizontal: 4,
    ...androidUI.cardShadow,
    borderWidth: 1,
    borderColor: androidUI.colors.border,
    zIndex: 1000,
    elevation: 10,
  },
  inlineDropdownOption: {
    paddingVertical: 12,
    paddingHorizontal: androidUI.spacing.lg,
    borderRadius: androidUI.borderRadius.small,
    marginHorizontal: 4,
    marginVertical: 2,
  },
  inlineDropdownOptionSelected: {
    backgroundColor: ACCENT,
  },
  inlineDropdownOptionText: {
    color: androidUI.colors.text.primary,
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  inlineDropdownOptionTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  dropdownOverlay: {
    position: 'absolute',
    top: -1000,
    left: -1000,
    right: -1000,
    bottom: -1000,
    backgroundColor: 'transparent',
    zIndex: 999,
  },
  dropdownScrollView: {
    maxHeight: 200,
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

// Memoized Order Card Component for better performance
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
  getValidNextStatuses 
}: {
  item: any;
  expandedOrderId: string | null;
  showStatusOptions: string | null;
  animatedHeight: Animated.Value;
  userRole: string;
  onPress: () => void;
  onMenuPress: () => void;
  onSelectStatus: (status: string) => void;
  getMenuOptions: () => MenuOption[];
  getValidNextStatuses: (status: string) => string[];
}) => {
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
      </View>
      
      {/* Line 2: Customer Name and Order Status */}
      <View style={styles.cardRowMid}>
        <Text style={styles.customerName} numberOfLines={2}>{item.customerName}</Text>
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
      </View>
      
      {/* Line 3: Order Route and Badges */}
      <View style={styles.cardRowMid}>
        {item.orderRoute && (
          <Text style={styles.orderRoute}>🛣️ {item.orderRoute}</Text>
        )}
        <View style={styles.chipGroup}>
          {item.urgent && (
            <View style={[styles.statusChip, styles.urgentChip]}>
              <Ionicons name="alert-circle" size={14} color="#c2185b" style={{ marginRight: 4 }} />
              <Text style={[styles.statusChipText, { color: '#c2185b' }]}>Urgent</Text>
            </View>
          )}
          {item.isPartialOrder && (
            <View style={[styles.statusChip, styles.partialChip]}>
              <Ionicons name="file-tray-stacked" size={14} color="#ff6f00" style={{ marginRight: 4 }} />
              <Text style={[styles.statusChipText, { color: '#ff6f00' }]}>Partial</Text>
            </View>
          )}
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
  );
});

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
  const { showToast } = useToast();
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
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [openDeliveryDropdown, setOpenDeliveryDropdown] = useState(false);
  const [selectedDeliveryPartner, setSelectedDeliveryPartner] = useState<string | null>(null);
  const [pendingStatusChange, setPendingStatusChange] = useState<{orderId: string, newStatus: string, prevStatus: string} | null>(null);

  // Dispatch Confirmation State
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [dispatchData, setDispatchData] = useState<any>(null);
  const [dispatchLoading, setDispatchLoading] = useState(false);
  const [invoiceCreated, setInvoiceCreated] = useState(false);
  const [dispatchUpdating, setDispatchUpdating] = useState(false);
  const [dispatchQuantities, setDispatchQuantities] = useState<{[key: number]: string}>({});
  const [pickerLayout, setPickerLayout] = useState<{x: number, y: number, width: number, height: number} | null>(null);
  const deliveryPartnerPickerRef = useRef<View>(null);
  const modalContainerRef = useRef<View>(null);

  // Payment State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [openMarkedByDropdown, setOpenMarkedByDropdown] = useState(false);
  const [openRecievedByDropdown, setOpenRecievedByDropdown] = useState(false);
  const [selectedMarkedBy, setSelectedMarkedBy] = useState<string | null>(null);
  const [selectedRecievedBy, setSelectedRecievedBy] = useState<string | null>(null);
  const [paymentOrder, setPaymentOrder] = useState<any>(null);
  
  // Animation values for inline dropdowns
  const [markedByChevronAnim] = useState(new Animated.Value(0));
  const [receivedByChevronAnim] = useState(new Animated.Value(0));
  
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
    fetchStaffList(); // Fetch staff list on component mount
  }, []);

  // Handle dispatch modal opening
  useEffect(() => {
    if (showDispatchModal && pendingStatusChange) {
      handleDispatchModalOpen();
    }
  }, [showDispatchModal, pendingStatusChange]);

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
        o.orderId.toLowerCase().includes(search.toLowerCase()) ||
        (o.orderRoute && o.orderRoute.toLowerCase().includes(search.toLowerCase()))
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
      
      // Update order counts
      setOrderCounts(prevCounts => ({
        ...prevCounts,
        [data.order.orderStatus]: (prevCounts[data.order.orderStatus] || 0) + 1
      }));
    };

    // Listen for order update events
    const handleOrderUpdated = (data: any) => {
      // Update the order in the list and recalculate counts
      setOrders(prevOrders => {
        const updatedOrders = prevOrders.map(order => 
          order._id === data.order._id ? data.order : order
        );
        
        // Recalculate counts after update
        const counts = {
          Pending: 0,
          DC: 0,
          Invoice: 0,
          Dispatched: 0
        };
        
        updatedOrders.forEach((order: any) => {
          if (counts.hasOwnProperty(order.orderStatus)) {
            counts[order.orderStatus as keyof typeof counts]++;
          }
        });
        
        setOrderCounts(counts);
        return updatedOrders;
      });
    };

    // Listen for order deletion events
    const handleOrderDeleted = (data: any) => {
      // Remove the order from the list and update counts
      setOrders(prevOrders => {
        const deletedOrder = prevOrders.find(order => order._id === data.orderId);
        const updatedOrders = prevOrders.filter(order => order._id !== data.orderId);
        
        if (deletedOrder) {
          setOrderCounts(prevCounts => ({
            ...prevCounts,
            [deletedOrder.orderStatus]: Math.max(0, (prevCounts[deletedOrder.orderStatus] || 0) - 1)
          }));
        }
        
        return updatedOrders;
      });
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

  const handleViewDetails = () => {
    closeMenu();
    router.push({ pathname: '/orders/orderdetails', params: { id: menuOrder.orderId, role } });
  };
  const handlePrintPDF = () => { closeMenu(); alert('Print to PDF (mock)'); };
  const handleEditOrder = () => {
    closeMenu();
    router.push({ pathname: '/orders/EditOrder', params: { id: menuOrder.orderId, role } });
  };
  // Dropdown animation interpolations
  const markedByChevronRotate = markedByChevronAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg']
  });
  const receivedByChevronRotate = receivedByChevronAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg']
  });

  // Dropdown open/close functions
  const openMarkedByDropdownFunc = () => {
    setOpenMarkedByDropdown(true);
    Animated.timing(markedByChevronAnim, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    }).start();
  };
  const closeMarkedByDropdown = () => {
    Animated.timing(markedByChevronAnim, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start(() => setOpenMarkedByDropdown(false));
  };

  const openReceivedByDropdownFunc = () => {
    setOpenRecievedByDropdown(true);
    Animated.timing(receivedByChevronAnim, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    }).start();
  };
  const closeReceivedByDropdown = () => {
    Animated.timing(receivedByChevronAnim, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start(() => setOpenRecievedByDropdown(false));
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

  const handleSelectStatus = useCallback(async (status: string) => {
    setShowStatusOptions(null);
    if (!menuOrder) return;
    if (status === 'Dispatched') {
      // Open dispatch confirmation modal
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
      
      // Initialize dispatch quantities with original quantities
      const initialQuantities: {[key: number]: string} = {};
      response.data.orderItems.forEach((item: any, index: number) => {
        initialQuantities[index] = String(item.qty);
      });
      setDispatchQuantities(initialQuantities);
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

    // Prepare dispatch items with updated quantities
    const dispatchItems = dispatchData.orderItems.map((item: any, index: number) => ({
      ...item,
      dispatchQty: Number(dispatchQuantities[index] || 0)
    }));

    // Validate quantities
    const hasInvalidQty = dispatchItems.some((item: any) => {
      const dispatchQty = item.dispatchQty;
      return dispatchQty < 0 || dispatchQty > item.qty || isNaN(dispatchQty);
    });

    if (hasInvalidQty) {
      Alert.alert("Error", "Please enter valid quantities (0 to original qty)");
      return;
    }

    setDispatchUpdating(true);
    try {
      await dispatchOrder(pendingStatusChange.orderId, {
        orderStatus: pendingStatusChange.newStatus,
        deliveryPartner: selectedDeliveryPartner,
        dispatchItems: dispatchItems
      });
      
      setShowDispatchModal(false);
      setPendingStatusChange(null);
      setSelectedDeliveryPartner(null);
      setDispatchData(null);
      setDispatchQuantities({});
      fetchAndSetOrders();
    } catch (err: any) {
      console.error('Dispatch failed:', err.response?.data || err.message);
      const errorMessage = err.response?.data?.message || "Failed to dispatch order";
      showToast(errorMessage, 'error');
    } finally {
      setDispatchUpdating(false);
    }
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
      const errorMessage = err.response?.data?.message || "Failed to update status";
      showToast(errorMessage, 'error');
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
      const errorMessage = err.response?.data?.message || "Failed to mark as paid";
      showToast(errorMessage, 'error');
    }
    setPaymentOrder(null);
    setSelectedMarkedBy(null);
    setSelectedRecievedBy(null);
  };

  // Get available menu options based on role - memoized for performance
  const getMenuOptions = useCallback((): MenuOption[] => {
    const options: MenuOption[] = [
      { key: 'view', label: 'View Details', action: handleViewDetails },
      { key: 'print', label: 'Print To PDF', action: handlePrintPDF },
    ];

    // Add edit/status/payment options based on role
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
  }, [userRole, menuOrder, handleViewDetails, handlePrintPDF, handleEditOrder, handleChangeStatus, handleMarkPaid, handleDeleteOrder]);

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
            placeholder="Search by Name, ID, or Route"
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
              <View style={styles.chipCount}>
                <Text style={[styles.chipCountText, statusFilter !== null && styles.chipCountTextInactive]}>
                  {orders.length}
                </Text>
              </View>
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
                <View style={styles.chipCount}>
                  <Text style={[styles.chipCountText, statusFilter !== opt && styles.chipCountTextInactive]}>
                    {orderCounts[opt] || 0}
                  </Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>
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
              getValidNextStatuses={getValidNextStatuses}
            />
          )}
          refreshing={refreshing}
          onRefresh={fetchAndSetOrders}
          // Performance optimizations
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          updateCellsBatchingPeriod={50}
          initialNumToRender={10}
          windowSize={10}
          getItemLayout={(data, index) => ({
            length: 200, // Approximate height of each item
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

        {/* Dispatch Confirmation Modal */}
        <Modal
          visible={showDispatchModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => {
            setShowDispatchModal(false);
            setOpenDeliveryDropdown(false);
            setPickerLayout(null);
          }}
        >
          <View style={dispatchModalStyles.modalBackdrop}>
            <KeyboardAvoidingView 
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={dispatchModalStyles.keyboardAvoid}
            >
              <View ref={modalContainerRef} style={dispatchModalStyles.modalContainer}>
                {/* Header */}
                <View style={dispatchModalStyles.modalHeader}>
                  <Text style={dispatchModalStyles.modalTitle}>Dispatch Confirmation</Text>
                  <Pressable 
                    style={dispatchModalStyles.closeButton}
                    onPress={() => {
                      setShowDispatchModal(false);
                      setOpenDeliveryDropdown(false);
                      setPickerLayout(null);
                    }}
                  >
                    <Ionicons name="close" size={24} color="#666" />
                  </Pressable>
                </View>
                
                {/* Scrollable Content using FlatList */}
                {dispatchLoading ? (
                  <View style={dispatchModalStyles.loadingContainer}>
                    <ActivityIndicator size="large" color={ACCENT} />
                    <Text style={dispatchModalStyles.loadingText}>Loading dispatch data...</Text>
                  </View>
                ) : dispatchData ? (
                  <FlatList
                    data={dispatchData.orderItems}
                    keyExtractor={(item, index) => `dispatch-item-${index}`}
                    showsVerticalScrollIndicator={true}
                    contentContainerStyle={dispatchModalStyles.flatListContent}
                    removeClippedSubviews={false}
                    style={{ zIndex: 1 }}
                    ListHeaderComponent={
                      <>
                        {/* Invoice Created Checkbox */}
                        <View style={[dispatchModalStyles.section, { marginTop: 16 }]}>
                          <Pressable 
                            style={dispatchModalStyles.checkboxRow}
                            onPress={() => setInvoiceCreated(!invoiceCreated)}
                          >
                            <View style={[
                              dispatchModalStyles.checkbox,
                              invoiceCreated && dispatchModalStyles.checkboxSelected
                            ]}>
                              {invoiceCreated && <Ionicons name="checkmark" size={16} color="#fff" />}
                            </View>
                            <Text style={dispatchModalStyles.checkboxLabel}>Invoice has been created</Text>
                          </Pressable>
                        </View>

                        {/* Delivery Partner Selection */}
                        <View style={dispatchModalStyles.section}>
                          <Text style={dispatchModalStyles.sectionTitle}>Delivery Partner</Text>
                          <View 
                            ref={deliveryPartnerPickerRef}
                            collapsable={false}
                          >
                            <Pressable 
                              style={dispatchModalStyles.deliveryPartnerPicker} 
                              onPress={() => {
                                if (!openDeliveryDropdown && deliveryPartnerPickerRef.current && modalContainerRef.current) {
                                  deliveryPartnerPickerRef.current.measure((px, py, width, height, pickerPageX, pickerPageY) => {
                                    modalContainerRef.current?.measure((mx, my, mwidth, mheight, modalPageX, modalPageY) => {
                                      // Calculate position relative to modal container
                                      const relativeX = pickerPageX - modalPageX;
                                      const relativeY = pickerPageY - modalPageY;
                                      setPickerLayout({ x: relativeX, y: relativeY, width, height });
                                    });
                                  });
                                }
                                setOpenDeliveryDropdown(!openDeliveryDropdown);
                              }}
                            >
                              <Text style={styles.inputIcon}>🚚</Text>
                              <Text style={[
                                dispatchModalStyles.deliveryPartnerPickerText,
                                !selectedDeliveryPartner && dispatchModalStyles.deliveryPartnerPickerPlaceholder
                              ]}>
                                {selectedDeliveryPartner ? 
                                  staffDropdownItems.find(item => item.value === selectedDeliveryPartner)?.label || 'Select Delivery Partner' :
                                  'Select Delivery Partner'
                                }
                              </Text>
                              <Ionicons 
                                name={openDeliveryDropdown ? "chevron-up" : "chevron-down"} 
                                size={18} 
                                color={ACCENT} 
                              />
                            </Pressable>
                          </View>
                        </View>

                        {/* Products Section Header */}
                        <View style={[dispatchModalStyles.section, { zIndex: 1 }]}>
                          <Text style={dispatchModalStyles.sectionTitle}>Products to Dispatch</Text>
                          <Text style={dispatchModalStyles.sectionSubtitle}>
                            Edit quantities to dispatch (0 = not dispatching this item)
                          </Text>
                        </View>
                      </>
                    }
                    renderItem={({ item, index }) => (
                      <View key={index} style={dispatchModalStyles.productCard}>
                        <View style={dispatchModalStyles.productCardHeader}>
                          <Text style={dispatchModalStyles.productName} numberOfLines={2}>{item.name}</Text>
                          {item.dimension && (
                            <Text style={dispatchModalStyles.productDimension}>{item.dimension}</Text>
                          )}
                        </View>
                        
                        <View style={dispatchModalStyles.productDetails}>
                          <View style={dispatchModalStyles.productDetailRow}>
                            <Text style={dispatchModalStyles.productLabel}>Original Qty:</Text>
                            <Text style={dispatchModalStyles.productValue}>{item.qty}</Text>
                          </View>
                          <View style={dispatchModalStyles.productDetailRow}>
                            <Text style={dispatchModalStyles.productLabel}>Price:</Text>
                            <Text style={dispatchModalStyles.productValue}>₹{item.price}</Text>
                          </View>
                          <View style={dispatchModalStyles.productDetailRow}>
                            <Text style={dispatchModalStyles.productLabel}>Available Stock:</Text>
                            <Text style={[
                              dispatchModalStyles.productValue,
                              !item.canFulfill && { color: '#ff5252', fontWeight: '700' }
                            ]}>
                              {item.availableStock}
                              {!item.canFulfill && ' ⚠️'}
                            </Text>
                          </View>
                        </View>

                        <View style={dispatchModalStyles.qtyInputContainer}>
                          <Text style={dispatchModalStyles.qtyInputLabel}>Dispatch Qty:</Text>
                          <TextInput
                            style={dispatchModalStyles.qtyInput}
                            value={dispatchQuantities[index] || ''}
                            onChangeText={(text) => {
                              const newQuantities = { ...dispatchQuantities };
                              newQuantities[index] = text;
                              setDispatchQuantities(newQuantities);
                            }}
                            keyboardType="numeric"
                            placeholder="0"
                            maxLength={6}
                          />
                          <View style={dispatchModalStyles.qtyButtons}>
                            <Pressable 
                              style={dispatchModalStyles.qtyButton}
                              onPress={() => {
                                const current = Number(dispatchQuantities[index] || 0);
                                if (current > 0) {
                                  const newQuantities = { ...dispatchQuantities };
                                  newQuantities[index] = String(current - 1);
                                  setDispatchQuantities(newQuantities);
                                }
                              }}
                            >
                              <Ionicons name="remove" size={16} color="#666" />
                            </Pressable>
                            <Pressable 
                              style={dispatchModalStyles.qtyButton}
                              onPress={() => {
                                const current = Number(dispatchQuantities[index] || 0);
                                if (current < item.qty) {
                                  const newQuantities = { ...dispatchQuantities };
                                  newQuantities[index] = String(current + 1);
                                  setDispatchQuantities(newQuantities);
                                }
                              }}
                            >
                              <Ionicons name="add" size={16} color="#666" />
                            </Pressable>
                          </View>
                        </View>

                        {!item.canFulfill && (
                          <View style={dispatchModalStyles.stockWarningBanner}>
                            <Ionicons name="warning" size={16} color="#ff5252" />
                            <Text style={dispatchModalStyles.stockWarningText}>
                              Insufficient stock! Only {item.availableStock} available.
                            </Text>
                          </View>
                        )}
                      </View>
                    )}
                  />
                ) : null}

                {/* Delivery Partner Dropdown - Rendered outside FlatList for proper z-index */}
                {openDeliveryDropdown && pickerLayout && (
                  <>
                    <Pressable 
                      style={dispatchModalStyles.dropdownOverlayFullScreen} 
                      onPress={() => setOpenDeliveryDropdown(false)}
                    />
                    <View 
                      style={[
                        dispatchModalStyles.deliveryPartnerDropdownAbsolute,
                        {
                          top: pickerLayout.y + pickerLayout.height + 4,
                          left: pickerLayout.x,
                          width: pickerLayout.width,
                        }
                      ]}
                      renderToHardwareTextureAndroid={true}
                      needsOffscreenAlphaCompositing={true}
                    >
                      <ScrollView 
                        style={dispatchModalStyles.dropdownScrollView}
                        showsVerticalScrollIndicator={false}
                        nestedScrollEnabled={true}
                      >
                        {staffDropdownItems.map((item) => (
                          <Pressable
                            key={item.value}
                            style={({ pressed }) => [
                              dispatchModalStyles.deliveryPartnerOption,
                              selectedDeliveryPartner === item.value && dispatchModalStyles.deliveryPartnerOptionSelected,
                              pressed && { opacity: 0.7 }
                            ]}
                            onPress={() => { 
                              setSelectedDeliveryPartner(item.value); 
                              setOpenDeliveryDropdown(false); 
                            }}
                          >
                            <Text style={styles.inputIcon}>👤</Text>
                            <Text style={[
                              dispatchModalStyles.deliveryPartnerOptionText,
                              selectedDeliveryPartner === item.value && dispatchModalStyles.deliveryPartnerOptionTextSelected
                            ]}>
                              {item.label}
                            </Text>
                          </Pressable>
                        ))}
                      </ScrollView>
                    </View>
                  </>
                )}

                {/* Action Buttons - Sticky at Bottom */}
                <View style={dispatchModalStyles.modalFooter}>
                  <Pressable
                    style={[dispatchModalStyles.actionButton, dispatchModalStyles.cancelButton]}
                    onPress={() => {
                      setShowDispatchModal(false);
                      setOpenDeliveryDropdown(false);
                      setPickerLayout(null);
                    }}
                  >
                    <Text style={dispatchModalStyles.cancelButtonText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={[
                      dispatchModalStyles.actionButton,
                      dispatchModalStyles.dispatchButton,
                      { 
                        backgroundColor: (invoiceCreated && selectedDeliveryPartner) ? ACCENT : '#eee' 
                      }
                    ]}
                    onPress={handleDispatchConfirm}
                    disabled={!invoiceCreated || !selectedDeliveryPartner || dispatchUpdating}
                  >
                    <Text style={[
                      dispatchModalStyles.dispatchButtonText,
                      { 
                        color: (invoiceCreated && selectedDeliveryPartner) ? '#fff' : '#b0b3b8'
                      }
                    ]}>
                      {dispatchUpdating ? 'Dispatching...' : 'Dispatch Order'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </KeyboardAvoidingView>
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
          <View style={styles.centeredModalContainer}>
            <View style={styles.centeredModalContent}>
              <Text style={styles.centeredModalTitle}>Mark as Paid</Text>
              
              <Text style={styles.centeredModalLabel}>Payment Marked By</Text>
              <View style={[styles.centeredDropdownWrap, { position: 'relative', zIndex: openMarkedByDropdown ? 12000 : 10000, marginBottom: 16 }]}>
                <Pressable style={[styles.centeredDropdownButton, styles.inputRow, styles.dropdownPickerEmphasis]} onPress={openMarkedByDropdown ? closeMarkedByDropdown : openMarkedByDropdownFunc}>
                  <Text style={styles.inputIcon}>👤</Text>
                  <Text style={styles.centeredDropdownButtonText}>
                    {selectedMarkedBy || 'Select Staff Member'}
                  </Text>
                  <Animated.View style={{ marginLeft: 8, transform: [{ rotate: markedByChevronRotate }] }}>
                    <Ionicons name="chevron-down" size={18} color={ACCENT} />
                  </Animated.View>
                </Pressable>
                {openMarkedByDropdown && (
                  <>
                    <Pressable 
                      style={[styles.dropdownOverlay, { zIndex: 11999 }]} 
                      onPress={closeMarkedByDropdown}
                    />
                    <Animated.View
                      style={[
                        styles.inlineDropdown,
                        {
                          opacity: markedByChevronAnim,
                          transform: [
                            { translateY: markedByChevronAnim.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }) }
                          ],
                          zIndex: 12000
                        }
                      ]}
                    >
                      <ScrollView 
                        style={styles.dropdownScrollView}
                        showsVerticalScrollIndicator={false}
                        nestedScrollEnabled={true}
                      >
                        {staffList.map((item) => (
                          <Pressable
                            key={item._id}
                            style={({ pressed }) => [
                              styles.inlineDropdownOption,
                              selectedMarkedBy === item.name && styles.inlineDropdownOptionSelected,
                              pressed && { opacity: 0.7 }
                            ]}
                            onPress={() => {
                              setSelectedMarkedBy(item.name);
                              closeMarkedByDropdown();
                            }}
                          >
                            <Text style={[
                              styles.inlineDropdownOptionText,
                              selectedMarkedBy === item.name && styles.inlineDropdownOptionTextSelected
                            ]}>
                              {item.name}
                            </Text>
                          </Pressable>
                        ))}
                      </ScrollView>
                    </Animated.View>
                  </>
                )}
              </View>

              <Text style={styles.centeredModalLabel}>Payment Received By</Text>
              <View style={[styles.centeredDropdownWrap, { position: 'relative', zIndex: openMarkedByDropdown ? 9000 : 11000, marginBottom: 24, marginTop: openMarkedByDropdown ? 120 : 0 }]}>
                <Pressable style={[styles.centeredDropdownButton, styles.inputRow, styles.dropdownPickerEmphasis]} onPress={openRecievedByDropdown ? closeReceivedByDropdown : openReceivedByDropdownFunc}>
                  <Text style={styles.inputIcon}>👤</Text>
                  <Text style={styles.centeredDropdownButtonText}>
                    {selectedRecievedBy || 'Select Staff Member'}
                  </Text>
                  <Animated.View style={{ marginLeft: 8, transform: [{ rotate: receivedByChevronRotate }] }}>
                    <Ionicons name="chevron-down" size={18} color={ACCENT} />
                  </Animated.View>
                </Pressable>
                {openRecievedByDropdown && (
                  <>
                    <Pressable 
                      style={[styles.dropdownOverlay, { zIndex: 10999 }]} 
                      onPress={closeReceivedByDropdown}
                    />
                    <Animated.View
                      style={[
                        styles.inlineDropdown,
                        {
                          opacity: receivedByChevronAnim,
                          transform: [
                            { translateY: receivedByChevronAnim.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }) }
                          ],
                          zIndex: 11000
                        }
                      ]}
                    >
                      <ScrollView 
                        style={styles.dropdownScrollView}
                        showsVerticalScrollIndicator={false}
                        nestedScrollEnabled={true}
                      >
                        {staffList.map((item) => (
                          <Pressable
                            key={item._id}
                            style={({ pressed }) => [
                              styles.inlineDropdownOption,
                              selectedRecievedBy === item.name && styles.inlineDropdownOptionSelected,
                              pressed && { opacity: 0.7 }
                            ]}
                            onPress={() => {
                              setSelectedRecievedBy(item.name);
                              closeReceivedByDropdown();
                            }}
                          >
                            <Text style={[
                              styles.inlineDropdownOptionText,
                              selectedRecievedBy === item.name && styles.inlineDropdownOptionTextSelected
                            ]}>
                              {item.name}
                            </Text>
                          </Pressable>
                        ))}
                      </ScrollView>
                    </Animated.View>
                  </>
                )}
              </View>

              <Pressable
                style={[styles.centeredModalButton, { backgroundColor: selectedMarkedBy && selectedRecievedBy ? ACCENT : '#eee' }]}
                onPress={selectedMarkedBy && selectedRecievedBy ? handlePaymentSubmit : undefined}
                disabled={!(selectedMarkedBy && selectedRecievedBy)}
              >
                <Text style={[styles.centeredModalButtonText, { color: selectedMarkedBy && selectedRecievedBy ? '#fff' : '#b0b3b8' }]}>
                  Mark as Paid
                </Text>
              </Pressable>
            </View>
          </View>
        </Modal>
        </>
      )}
    </View>
  );
} 

const dispatchModalStyles = StyleSheet.create({
  // Modal container styles
  modal: {
    margin: 0,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  keyboardAvoid: {
    width: '100%',
    maxHeight: '95%',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    width: '100%',
    maxHeight: '100%',
    flexDirection: 'column',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
    position: 'relative',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    position: 'relative',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    top: 14,
    padding: 4,
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#fff',
    gap: 12,
  },
  
  // Delivery Partner Dropdown styles
  deliveryPartnerPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f6fa',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginTop: 8,
  },
  deliveryPartnerPickerText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    marginLeft: 8,
  },
  deliveryPartnerPickerPlaceholder: {
    color: '#b0b3b8',
  },
  deliveryPartnerDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginTop: 4,
    paddingVertical: 8,
    paddingHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 9999,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    zIndex: 99999,
  },
  deliveryPartnerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginHorizontal: 4,
    marginVertical: 2,
  },
  deliveryPartnerOptionSelected: {
    backgroundColor: ACCENT,
  },
  deliveryPartnerOptionText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
    marginLeft: 8,
  },
  deliveryPartnerOptionTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  dropdownOverlay: {
    position: 'absolute',
    top: -1000,
    left: -1000,
    right: -1000,
    bottom: -1000,
    backgroundColor: 'transparent',
    zIndex: 99998,
    elevation: 9998,
  },
  dropdownOverlayFullScreen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 99997,
    elevation: 9997,
  },
  deliveryPartnerDropdownAbsolute: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 9999,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    zIndex: 99999,
    maxHeight: 200,
  },
  dropdownScrollView: {
    maxHeight: 200,
  },

  // Loading styles
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  
  // Scroll view styles
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  flatListContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  
  // Section styles
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  
  // Checkbox styles
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#ccc',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
  },
  checkboxLabel: {
    marginLeft: 12,
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  
  sectionSubtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
    fontStyle: 'italic',
  },

  // Product Card Styles
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    zIndex: 1,
  },
  productCardHeader: {
    marginBottom: 12,
  },
  productName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  productDimension: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
  },
  productDetails: {
    marginBottom: 12,
  },
  productDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  productLabel: {
    fontSize: 14,
    color: '#666',
  },
  productValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  qtyInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f6fa',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  qtyInputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginRight: 12,
  },
  qtyInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    textAlign: 'center',
  },
  qtyButtons: {
    flexDirection: 'row',
    marginLeft: 12,
    gap: 8,
  },
  qtyButton: {
    width: 36,
    height: 36,
    backgroundColor: '#fff',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  stockWarningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff5f5',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#ffcdd2',
  },
  stockWarningText: {
    fontSize: 13,
    color: '#ff5252',
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  
  // Item styles
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  itemDetails: {
    flex: 1,
    marginLeft: 12,
  },
  dispatchItemCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  dispatchItemCardUnselected: {
    opacity: 0.6,
    backgroundColor: '#f8f9fa',
  },
  dispatchItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
    lineHeight: 22,
  },
  dispatchItemNameUnselected: {
    color: '#999',
    textDecorationLine: 'line-through',
  },
  dispatchItemMeta: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  dispatchItemMetaUnselected: {
    color: '#999',
  },
  stockWarning: {
    fontSize: 12,
    color: '#ff5252',
    fontWeight: '600',
    marginTop: 4,
  },
  
  // Action button styles
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  dispatchButton: {
    backgroundColor: ACCENT,
  },
  dispatchButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
}); 