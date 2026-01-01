import { useState, useRef, useEffect } from "react";
import { 
  Modal, 
  View, 
  Text, 
  Pressable, 
  ScrollView, 
  ActivityIndicator, 
  Platform, 
  TextInput,
  StyleSheet,
  Keyboard
} from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { ACCENT } from "./constants";

interface DispatchModalProps {
  visible: boolean;
  loading: boolean;
  dispatchData: any;
  staffDropdownItems: Array<{ label: string; value: string }>;
  deliveredItems: { [productId: string]: { qty: number; isDelivered: boolean } };
  selectedDeliveryPartner: string | null;
  invoiceCreated: boolean;
  dispatchUpdating: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onDeliveryPartnerChange: (partner: string) => void;
  onInvoiceCreatedChange: (created: boolean) => void;
  onDeliveredItemsChange: (items: { [productId: string]: { qty: number; isDelivered: boolean } }) => void;
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdropTouchable: {
    flex: 1,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    width: '100%',
    maxHeight: '80%',
    flexDirection: 'column',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
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
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 24,
  },
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
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
  dropdownScrollView: {
    maxHeight: 200,
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
  dispatchProductRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  dispatchProductRowUnselected: {
    backgroundColor: '#f8f9fa',
    borderColor: '#e0e0e0',
  },
  dispatchCheckboxWrap: {
    marginRight: 12,
  },
  dispatchProductInfo: {
    flex: 1,
    marginRight: 12,
  },
  dispatchProductName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    lineHeight: 20,
  },
  dispatchProductNameUnselected: {
    color: '#999',
    textDecorationLine: 'line-through',
  },
  dispatchOrderedQty: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  dispatchQtyWrap: {
    width: 60,
  },
  dispatchQtyInput: {
    backgroundColor: '#f3f6fa',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  dispatchQtyInputError: {
    borderColor: '#ff5252',
    borderWidth: 2,
    backgroundColor: '#fff5f5',
  },
  stockWarningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff5f5',
    borderRadius: 8,
    padding: 10,
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
  inputIcon: {
    fontSize: 18,
    marginRight: 12,
  },
});

export default function DispatchModal({
  visible,
  loading,
  dispatchData,
  staffDropdownItems,
  deliveredItems,
  selectedDeliveryPartner,
  invoiceCreated,
  dispatchUpdating,
  onClose,
  onConfirm,
  onDeliveryPartnerChange,
  onInvoiceCreatedChange,
  onDeliveredItemsChange,
}: DispatchModalProps) {
  const [openDeliveryDropdown, setOpenDeliveryDropdown] = useState(false);
  const [pickerLayout, setPickerLayout] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const deliveryPartnerPickerRef = useRef<View>(null);
  const modalContainerRef = useRef<View>(null);

  const handleClose = () => {
    setOpenDeliveryDropdown(false);
    setPickerLayout(null);
    onClose();
  };

  const handleDeliveryPartnerToggle = () => {
    if (!openDeliveryDropdown && deliveryPartnerPickerRef.current && modalContainerRef.current) {
      deliveryPartnerPickerRef.current.measure((px, py, width, height, pickerPageX, pickerPageY) => {
        modalContainerRef.current?.measure((mx, my, mwidth, mheight, modalPageX, modalPageY) => {
          const relativeX = pickerPageX - modalPageX;
          const relativeY = pickerPageY - modalPageY;
          setPickerLayout({ x: relativeX, y: relativeY, width, height });
        });
      });
    }
    setOpenDeliveryDropdown(!openDeliveryDropdown);
  };

  const handleDeliveryPartnerSelect = (partner: string) => {
    onDeliveryPartnerChange(partner);
    setOpenDeliveryDropdown(false);
  };

  const handleDeliveredItemToggle = (productId: string) => {
    onDeliveredItemsChange({
      ...deliveredItems,
      [productId]: {
        ...deliveredItems[productId],
        isDelivered: !deliveredItems[productId]?.isDelivered
      }
    });
  };

  const handleQtyChange = (productId: string, text: string, maxQty: number) => {
    const numValue = parseInt(text) || 0;
    onDeliveredItemsChange({
      ...deliveredItems,
      [productId]: {
        ...deliveredItems[productId],
        qty: Math.max(0, Math.min(numValue, maxQty))
      }
    });
  };

  // Check if any item has stock issues
  const hasStockIssues = dispatchData?.orderItems?.some((item: any) => {
    const productId = item.productId.toString();
    const delivered = deliveredItems[productId];
    return delivered?.isDelivered && delivered.qty > item.availableStock;
  });

  // Check if at least one item is being delivered
  const hasDeliveredItems = Object.values(deliveredItems).some(
    item => item.isDelivered && item.qty > 0
  );

  const canDispatch = invoiceCreated && selectedDeliveryPartner && !hasStockIssues && hasDeliveredItems;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.modalBackdrop}>
        <Pressable style={styles.backdropTouchable} onPress={Keyboard.dismiss} />
        <View ref={modalContainerRef} style={styles.modalContainer}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Dispatch Confirmation</Text>
              <Pressable style={styles.closeButton} onPress={handleClose}>
                <Ionicons name="close" size={24} color="#666" />
              </Pressable>
            </View>
            
            {/* Content */}
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={ACCENT} />
                <Text style={styles.loadingText}>Loading dispatch data...</Text>
              </View>
            ) : (
              <ScrollView 
                style={styles.scrollView}
                contentContainerStyle={styles.scrollViewContent}
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled={true}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="interactive"
              >
                {/* Invoice Created Checkbox */}
                <View style={[styles.section, { marginTop: 16 }]}>
                  <Pressable 
                    style={styles.checkboxRow}
                    onPress={() => onInvoiceCreatedChange(!invoiceCreated)}
                  >
                    <View style={[
                      styles.checkbox,
                      invoiceCreated && styles.checkboxSelected
                    ]}>
                      {invoiceCreated && <Ionicons name="checkmark" size={16} color="#fff" />}
                    </View>
                    <Text style={styles.checkboxLabel}>Invoice has been created</Text>
                  </Pressable>
                </View>

                {/* Delivery Partner Selection */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Delivery Partner</Text>
                  <View ref={deliveryPartnerPickerRef} collapsable={false}>
                    <Pressable 
                      style={styles.deliveryPartnerPicker} 
                      onPress={handleDeliveryPartnerToggle}
                    >
                      <Text style={styles.inputIcon}>🚚</Text>
                      <Text style={[
                        styles.deliveryPartnerPickerText,
                        !selectedDeliveryPartner && styles.deliveryPartnerPickerPlaceholder
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

                {/* Products to Dispatch Section */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Products to Dispatch</Text>
                  
                  {dispatchData?.orderItems?.map((item: any) => {
                    const productId = item.productId.toString();
                    const deliveredItem = deliveredItems[productId] || { qty: 0, isDelivered: false };
                    const hasStockIssue = deliveredItem.qty > item.availableStock;
                    
                    return (
                      <View 
                        key={productId} 
                        style={[
                          styles.dispatchProductRow,
                          !deliveredItem.isDelivered && styles.dispatchProductRowUnselected
                        ]}
                      >
                        {/* Checkbox */}
                        <Pressable 
                          style={styles.dispatchCheckboxWrap}
                          onPress={() => handleDeliveredItemToggle(productId)}
                        >
                          <View style={[
                            styles.checkbox,
                            deliveredItem.isDelivered && styles.checkboxSelected
                          ]}>
                            {deliveredItem.isDelivered && <Ionicons name="checkmark" size={16} color="#fff" />}
                          </View>
                        </Pressable>

                        {/* Product Name & Ordered Qty */}
                        <View style={styles.dispatchProductInfo}>
                          <Text 
                            style={[
                              styles.dispatchProductName,
                              !deliveredItem.isDelivered && styles.dispatchProductNameUnselected
                            ]}
                            numberOfLines={2}
                          >
                            {item.name}
                          </Text>
                          <Text style={styles.dispatchOrderedQty}>
                            Ordered: {item.qty}
                          </Text>
                        </View>

                        {/* Delivery Qty Input */}
                        {deliveredItem.isDelivered && (
                          <View style={styles.dispatchQtyWrap}>
                            <TextInput
                              style={[
                                styles.dispatchQtyInput,
                                hasStockIssue && styles.dispatchQtyInputError
                              ]}
                              value={deliveredItem.qty.toString()}
                              onChangeText={(text) => handleQtyChange(productId, text, item.qty)}
                              keyboardType="number-pad"
                              placeholder="0"
                              placeholderTextColor="#b0b3b8"
                              selectTextOnFocus
                            />
                          </View>
                        )}
                        
                        {/* Stock Issue Icon */}
                        {hasStockIssue && deliveredItem.isDelivered && (
                          <Ionicons name="warning" size={18} color="#ff5252" style={{ marginLeft: 6 }} />
                        )}
                      </View>
                    );
                  })}
                  
                  {/* Stock Warning Banner */}
                  {hasStockIssues && (
                    <View style={styles.stockWarningBanner}>
                      <Ionicons name="warning" size={16} color="#ff5252" />
                      <Text style={styles.stockWarningText}>
                        Some items exceed available stock
                      </Text>
                    </View>
                  )}
                </View>
              </ScrollView>
            )}

            {/* Delivery Partner Dropdown */}
            {openDeliveryDropdown && pickerLayout && (
              <>
                <Pressable 
                  style={styles.dropdownOverlayFullScreen} 
                  onPress={() => setOpenDeliveryDropdown(false)}
                />
                <View 
                  style={[
                    styles.deliveryPartnerDropdownAbsolute,
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
                    style={styles.dropdownScrollView}
                    showsVerticalScrollIndicator={false}
                    nestedScrollEnabled={true}
                  >
                    {staffDropdownItems.map((item) => (
                      <Pressable
                        key={item.value}
                        style={({ pressed }) => [
                          styles.deliveryPartnerOption,
                          selectedDeliveryPartner === item.value && styles.deliveryPartnerOptionSelected,
                          pressed && { opacity: 0.7 }
                        ]}
                        onPress={() => handleDeliveryPartnerSelect(item.value)}
                      >
                        <Text style={styles.inputIcon}>👤</Text>
                        <Text style={[
                          styles.deliveryPartnerOptionText,
                          selectedDeliveryPartner === item.value && styles.deliveryPartnerOptionTextSelected
                        ]}>
                          {item.label}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              </>
            )}

            {/* Action Buttons */}
            <View style={styles.modalFooter}>
              <Pressable
                style={[styles.actionButton, styles.cancelButton]}
                onPress={handleClose}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.actionButton,
                  styles.dispatchButton,
                  { backgroundColor: canDispatch ? ACCENT : '#eee' }
                ]}
                onPress={onConfirm}
                disabled={!canDispatch || dispatchUpdating}
              >
                <Text style={[
                  styles.dispatchButtonText,
                  { color: canDispatch ? '#fff' : '#b0b3b8' }
                ]}>
                  {dispatchUpdating ? 'Dispatching...' : 'Dispatch Order'}
                </Text>
              </Pressable>
            </View>
          </View>
      </View>
    </Modal>
  );
}

