import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, Alert, FlatList, Modal, TouchableOpacity, ActivityIndicator, Animated } from "react-native";
import { getOrders, updateOrder, getProducts, getStaff, getOrderByOrderId, getOrderRoutes } from "../api";
import { Ionicons } from '@expo/vector-icons';
import { androidUI } from "../utils/androidUI";
import { useToast } from "../contexts/ToastContext";

const ACCENT = "#3D5AFE";
const orderStatusOptions = ["Pending", "DC", "Invoice", "Dispatched"];

// Define valid status transitions for strict workflow
const getValidNextStatuses = (currentStatus: string): string[] => {
  const validTransitions = {
    'Pending': ['DC'],
    'DC': ['Invoice'],
    'Invoice': ['Dispatched'],
    'Dispatched': [] // Final state, no further transitions
  };
  return validTransitions[currentStatus as keyof typeof validTransitions] || [];
};
const paymentOptions = ["Immediate", "15 Days", "30 Days"];

export default function EditOrderScreen() {
  const { id, role } = useLocalSearchParams();
  const router = useRouter();
  const { showToast } = useToast();
  const [form, setForm] = useState({
    customerName: '',
    customerPhone: '',
    address: '',
    orderRoute: '', // New field for order route
    orderStatus: orderStatusOptions[0],
    assignedTo: '',
    assignedToId: '',
    payment: paymentOptions[0],
    urgent: false,
    deliveryPartner: '',
    additionalNotes: '',
  });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [assignedDropdownOpen, setAssignedDropdownOpen] = useState(false);
  const [deliveryPartnerDropdownOpen, setDeliveryPartnerDropdownOpen] = useState(false);
  
  // Route suggestions state
  const [routeSuggestions, setRouteSuggestions] = useState<string[]>([]);
  const [routeFocused, setRouteFocused] = useState(false);
  const [routeDropdownOpen, setRouteDropdownOpen] = useState(false);
  
  // Animation values for inline dropdowns
  const [statusChevronAnim] = useState(new Animated.Value(0));
  const [assignedChevronAnim] = useState(new Animated.Value(0));
  const [deliveryPartnerChevronAnim] = useState(new Animated.Value(0));
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(true);
  
  // Product Search State
  const [showProductModal, setShowProductModal] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [products, setProducts] = useState<any[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  
  // Edit Item State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editQty, setEditQty] = useState("");
  const [editPrice, setEditPrice] = useState("");

  // Fetch staff list
  useEffect(() => {
    const fetchStaffList = async () => {
      try {
        const response = await getStaff();
        if (Array.isArray(response.data)) {
          setStaffList(response.data);
          // Set default assignedTo if not already set
          if (!form.assignedTo && response.data.length > 0) {
            setForm(f => ({ ...f, assignedTo: response.data[0].name }));
          }
        }
      } catch (err) {
        Alert.alert("Error", "Failed to fetch staff list");
      }
      setLoadingStaff(false);
    };
    fetchStaffList();
  }, []);

  // Fetch route suggestions as user types
  useEffect(() => {
    const fetchRouteSuggestions = async () => {
      if (form.orderRoute.trim().length === 0) {
        setRouteSuggestions([]);
        setRouteDropdownOpen(false);
        return;
      }
      try {
        const res = await getOrderRoutes();
        const routes: string[] = res.data || [];
        const filtered = routes.filter(r => r.toLowerCase().includes(form.orderRoute.toLowerCase()) && r.trim() !== '');
        setRouteSuggestions(filtered);
        setRouteDropdownOpen(filtered.length > 0 && routeFocused);
      } catch (err) {
        setRouteSuggestions([]);
        setRouteDropdownOpen(false);
      }
    };
    if (routeFocused) fetchRouteSuggestions();
  }, [form.orderRoute, routeFocused]);

  // Fetch order details
  useEffect(() => {
    if (id) {
      const fetchOrder = async () => {
        try {
          const response = await getOrderByOrderId(id as string);
          const order = response.data;
          if (order) {
            setForm({
              customerName: order.customerName,
              customerPhone: order.customerPhone,
              address: order.customerAddress,
              orderRoute: order.orderRoute || '', // Add order route
              orderStatus: order.orderStatus,
              assignedTo: order.assignedTo,
              assignedToId: order.assignedToId || '',
              payment: order.paymentCondition,
              urgent: order.urgent || false,
              deliveryPartner: order.deliveryPartner || '',
              additionalNotes: order.additionalNotes || '',
            });
            setOrderItems(order.orderItems || []);
          }
        } catch (err) {
          Alert.alert("Error", "Failed to fetch order details");
        }
        setLoading(false);
      };
      fetchOrder();
    }
  }, [id]);

  // Dropdown animation interpolations
  const statusChevronRotate = statusChevronAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg']
  });
  const assignedChevronRotate = assignedChevronAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg']
  });
  const deliveryPartnerChevronRotate = deliveryPartnerChevronAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg']
  });

  // Dropdown open/close functions
  const openStatusDropdown = () => {
    setStatusDropdownOpen(true);
    Animated.timing(statusChevronAnim, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    }).start();
  };
  const closeStatusDropdown = () => {
    Animated.timing(statusChevronAnim, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start(() => setStatusDropdownOpen(false));
  };

  const openAssignedDropdown = () => {
    setAssignedDropdownOpen(true);
    Animated.timing(assignedChevronAnim, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    }).start();
  };
  const closeAssignedDropdown = () => {
    Animated.timing(assignedChevronAnim, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start(() => setAssignedDropdownOpen(false));
  };

  const openDeliveryPartnerDropdown = () => {
    setDeliveryPartnerDropdownOpen(true);
    Animated.timing(deliveryPartnerChevronAnim, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    }).start();
  };
  const closeDeliveryPartnerDropdown = () => {
    Animated.timing(deliveryPartnerChevronAnim, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start(() => setDeliveryPartnerDropdownOpen(false));
  };

  // Handle status change with delivery partner validation
  const handleStatusChange = (newStatus: string) => {
    if (newStatus === 'Dispatched' && !form.deliveryPartner) {
      Alert.alert(
        "Delivery Partner Required",
        "Please select a delivery partner before marking the order as Dispatched.",
        [
          { text: "OK" }
        ]
      );
      openDeliveryPartnerDropdown();
      return;
    }
    setForm(prev => ({ ...prev, orderStatus: newStatus }));
    closeStatusDropdown();
  };

  // Fetch products when product modal opens
  const handleOpenProductModal = async () => {
    setShowProductModal(true);
    setLoadingProducts(true);
    try {
      const response = await getProducts();
      setProducts(response.data);
      setFilteredProducts(response.data);
    } catch (err) {
      Alert.alert("Error", "Failed to fetch products");
    }
    setLoadingProducts(false);
  };

  // Filter products based on search
  useEffect(() => {
    if (productSearch.trim()) {
      const filtered = products.filter(p => 
        p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        (p.dimension && p.dimension.toLowerCase().includes(productSearch.toLowerCase()))
      );
      setFilteredProducts(filtered);
    } else {
      setFilteredProducts(products);
    }
  }, [productSearch, products]);

  const handleChange = (field: string, value: any) => {
    setForm({ ...form, [field]: value });
  };

  const handleSelectProduct = (product: any) => {
    setEditingItem({
      productId: product._id,
      name: product.name,
      dimension: product.dimension,
      qty: "1",
      price: String(product.price || "0"),
    });
    setEditQty("1");
    setEditPrice(String(product.price || "0"));
    setShowProductModal(false);
    setShowEditModal(true);
  };

  const handleEditItem = (item: any) => {
    setEditingItem(item);
    setEditQty(String(item.qty));
    setEditPrice(String(item.price));
    setShowEditModal(true);
  };

  const handleSaveItem = () => {
    const qty = parseInt(editQty) || 0;
    const price = parseFloat(editPrice) || 0;
    const total = qty * price;

    if (qty <= 0) {
      Alert.alert("Invalid quantity");
      return;
    }
    if (price <= 0) {
      Alert.alert("Invalid price");
      return;
    }

    const newItem = {
      ...editingItem,
      qty,
      price,
      total,
    };

    if (editingItem.index !== undefined) {
      // Update existing item
      const newItems = [...orderItems];
      newItems[editingItem.index] = newItem;
      setOrderItems(newItems);
    } else {
      // Add new item
      setOrderItems([...orderItems, newItem]);
    }

    setShowEditModal(false);
    setEditingItem(null);
    setEditQty("");
    setEditPrice("");
  };

  const handleDeleteItem = (index: number) => {
    Alert.alert(
      "Delete Item",
      "Are you sure you want to remove this item?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: () => {
            const newItems = orderItems.filter((_, i) => i !== index);
            setOrderItems(newItems);
          }
        }
      ]
    );
  };

  const handleUpdate = async () => {
    // Validate delivery partner for Dispatched status
    if (form.orderStatus === 'Dispatched' && !form.deliveryPartner) {
      Alert.alert("Error", "Please select a delivery partner before marking the order as Dispatched");
      return;
    }

    if (!id) {
      Alert.alert("Error", "Invalid order ID");
      return;
    }

    setUpdating(true);
    const orderData = {
      customerName: form.customerName,
      orderRoute: form.orderRoute,
      customerPhone: form.customerPhone,
      customerAddress: form.address,
      orderStatus: form.orderStatus,
      paymentCondition: form.payment,
      assignedTo: form.assignedTo,
      assignedToId: form.assignedToId,
      urgent: form.urgent,
      orderItems: orderItems,
      deliveryPartner: form.deliveryPartner,
      ...(form.additionalNotes ? { additionalNotes: form.additionalNotes } : {}),
    };

    console.log('Attempting to update order:', {
      orderId: id,
      currentStatus: form.orderStatus,
      deliveryPartner: form.deliveryPartner,
      data: orderData
    });

    try {
      const response = await updateOrder(id as string, orderData);
      console.log('Update response:', response.data);
      Alert.alert("Success", "Order updated successfully!");
      router.back();
    } catch (err: any) {
      console.error('Update failed:', err.response?.data || err.message);
      
      // Show detailed error message
      const errorMessage = err.response?.data?.message || 
                         err.response?.data?.error || 
                         err.message || 
                         'Failed to update order';
      
      // Show toast instead of alert
      showToast(errorMessage, 'error');
      
      // If error mentions delivery partner, open the selection modal
      if (errorMessage.toLowerCase().includes('delivery partner')) {
        setDeliveryPartnerDropdownOpen(true);
      }
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <Text style={{ margin: 32 }}>Loading...</Text>;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.screenWrap}>
        {/* Modern Nav Bar */}
        <View style={styles.headerBar}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={ACCENT} />
          </Pressable>
          <Text style={styles.headerTitle}>Edit Order</Text>
        </View>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          {/* Sticky Subheading */}
          <View style={styles.stickySubheadingWrap}>
            <Text style={styles.stickySubheading}>Order Details</Text>
            <View style={styles.stickyDivider} />
          </View>
          {/* Form Fields */}
          <View style={styles.sectionGroup}>
            <View style={styles.floatingLabelInputWrap}>
              <Text style={styles.floatingLabel}>Customer Name</Text>
              <TextInput
                style={styles.input}
                value={form.customerName}
                onChangeText={v => handleChange('customerName', v)}
                placeholder="Enter customer name"
                placeholderTextColor="#b0b3b8"
              />
            </View>
            <View style={styles.floatingLabelInputWrap}>
              <Text style={styles.floatingLabel}>Order Route</Text>
              <View style={{ position: 'relative' }}>
                <View style={styles.inputRow}>
                  <Text style={styles.inputIcon}>🛣️</Text>
                  <TextInput
                    style={styles.input}
                    value={form.orderRoute}
                    onChangeText={v => handleChange('orderRoute', v)}
                    placeholder="Enter order route"
                    placeholderTextColor="#b0b3b8"
                    onFocus={() => setRouteFocused(true)}
                    onBlur={() => setTimeout(() => setRouteFocused(false), 200)}
                  />
                </View>
                {routeDropdownOpen && routeSuggestions.length > 0 && (
                  <View style={[styles.inlineDropdown, { top: '100%', left: 0, right: 0, zIndex: 12000 }]}> 
                    <ScrollView keyboardShouldPersistTaps="handled" style={styles.dropdownScrollView}>
                      {routeSuggestions.map((route, idx) => (
                        <Pressable
                          key={route + idx}
                          style={({ pressed }) => [
                            styles.inlineDropdownOption,
                            pressed && { opacity: 0.7 }
                          ]}
                          onPress={() => {
                            handleChange('orderRoute', route);
                            setRouteDropdownOpen(false);
                          }}
                        >
                          <Text style={styles.inlineDropdownOptionText}>{route}</Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
            </View>
            <View style={styles.floatingLabelInputWrap}>
              <Text style={styles.floatingLabel}>Customer Phone No</Text>
              <TextInput
                style={styles.input}
                value={form.customerPhone}
                onChangeText={v => handleChange('customerPhone', v)}
                keyboardType="phone-pad"
                placeholder="Enter phone number"
                placeholderTextColor="#b0b3b8"
              />
            </View>
            <View style={styles.floatingLabelInputWrap}>
              <Text style={styles.floatingLabel}>Address</Text>
              <TextInput
                style={styles.input}
                value={form.address}
                onChangeText={v => handleChange('address', v)}
                placeholder="Enter address"
                placeholderTextColor="#b0b3b8"
                multiline
              />
            </View>
            <View style={styles.floatingLabelInputWrap}>
              <Text style={styles.floatingLabel}>Additional Notes</Text>
              <TextInput
                style={styles.input}
                value={form.additionalNotes || ''}
                onChangeText={v => handleChange('additionalNotes', v)}
                placeholder="Enter any additional notes (optional)"
                placeholderTextColor="#b0b3b8"
                multiline
              />
            </View>
          </View>
          {/* Divider */}
          <View style={styles.sectionDivider} />
          {/* Assignment & Status */}
          <View style={styles.sectionGroup}>
            {/* Order Status Dropdown */}
            <View style={[styles.floatingLabelInputWrap, { position: 'relative' }]}>
              <Text style={styles.floatingLabel}>Order Status</Text>
              <Pressable style={[styles.dropdownPicker, styles.inputRow, styles.dropdownPickerEmphasis]} onPress={statusDropdownOpen ? closeStatusDropdown : openStatusDropdown}>
                <Text style={styles.inputIcon}>📋</Text>
                <Text style={styles.dropdownPickerText}>{form.orderStatus}</Text>
                <Animated.View style={{ marginLeft: 8, transform: [{ rotate: statusChevronRotate }] }}>
                  <Ionicons name="chevron-down" size={18} color={ACCENT} />
                </Animated.View>
              </Pressable>
              {statusDropdownOpen && (
                <>
                  <Pressable 
                    style={styles.dropdownOverlay} 
                    onPress={closeStatusDropdown}
                  />
                  <Animated.View
                    style={[
                      styles.inlineDropdown,
                      {
                        opacity: statusChevronAnim,
                        transform: [
                          { translateY: statusChevronAnim.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }) }
                        ]
                      }
                    ]}
                  >
                    {getValidNextStatuses(form.orderStatus).map((item) => (
                      <Pressable
                        key={item}
                        style={({ pressed }) => [
                          styles.inlineDropdownOption,
                          form.orderStatus === item && styles.inlineDropdownOptionSelected,
                          pressed && { opacity: 0.7 }
                        ]}
                        onPress={() => handleStatusChange(item)}
                      >
                        <Text style={[
                          styles.inlineDropdownOptionText,
                          form.orderStatus === item && styles.inlineDropdownOptionTextSelected
                        ]}>
                          {item}
                        </Text>
                      </Pressable>
                    ))}
                    {getValidNextStatuses(form.orderStatus).length === 0 && (
                      <View style={{ padding: 16, alignItems: 'center' }}>
                        <Text style={{ color: '#666', fontSize: 14, textAlign: 'center' }}>
                          No further status changes allowed
                        </Text>
                      </View>
                    )}
                  </Animated.View>
                </>
              )}
            </View>

            {/* Assigned To Dropdown */}
            <View style={[styles.floatingLabelInputWrap, { position: 'relative' }]}>
              <Text style={styles.floatingLabel}>Assigned To</Text>
              {loadingStaff ? (
                <ActivityIndicator size="small" color={ACCENT} />
              ) : (
                <>
                  <Pressable style={[styles.dropdownPicker, styles.inputRow, styles.dropdownPickerEmphasis]} onPress={assignedDropdownOpen ? closeAssignedDropdown : openAssignedDropdown}>
                    <Text style={styles.inputIcon}>👤</Text>
                    <Text style={styles.dropdownPickerText}>{form.assignedTo}</Text>
                    <Animated.View style={{ marginLeft: 8, transform: [{ rotate: assignedChevronRotate }] }}>
                      <Ionicons name="chevron-down" size={18} color={ACCENT} />
                    </Animated.View>
                  </Pressable>
                  {assignedDropdownOpen && (
                    <>
                      <Pressable 
                        style={styles.dropdownOverlay} 
                        onPress={closeAssignedDropdown}
                      />
                      <Animated.View
                        style={[
                          styles.inlineDropdown,
                          {
                            opacity: assignedChevronAnim,
                            transform: [
                              { translateY: assignedChevronAnim.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }) }
                            ]
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
                                form.assignedToId === item._id && styles.inlineDropdownOptionSelected,
                                pressed && { opacity: 0.7 }
                              ]}
                              onPress={() => {
                                setForm(f => ({ ...f, assignedTo: item.name, assignedToId: item._id }));
                                closeAssignedDropdown();
                              }}
                            >
                              <Text style={[
                                styles.inlineDropdownOptionText,
                                form.assignedToId === item._id && styles.inlineDropdownOptionTextSelected
                              ]}>
                                {item.name}
                              </Text>
                            </Pressable>
                          ))}
                        </ScrollView>
                      </Animated.View>
                    </>
                  )}
                </>
              )}
            </View>

            {/* Delivery Partner Dropdown */}
            {form.orderStatus === 'Dispatched' && (
              <View style={[styles.floatingLabelInputWrap, { position: 'relative' }]}>
                <Text style={styles.floatingLabel}>Delivery Partner</Text>
                {loadingStaff ? (
                  <ActivityIndicator size="small" color={ACCENT} />
                ) : (
                  <>
                    <Pressable 
                      style={[
                        styles.dropdownPicker,
                        styles.inputRow,
                        styles.dropdownPickerEmphasis,
                        form.orderStatus === 'Dispatched' && !form.deliveryPartner && styles.dropdownPickerRequired
                      ]} 
                      onPress={deliveryPartnerDropdownOpen ? closeDeliveryPartnerDropdown : openDeliveryPartnerDropdown}
                    >
                      <Text style={styles.inputIcon}>🚚</Text>
                      <Text style={styles.dropdownPickerText}>
                        {form.deliveryPartner || 'Select Delivery Partner'}
                      </Text>
                      <Animated.View style={{ marginLeft: 8, transform: [{ rotate: deliveryPartnerChevronRotate }] }}>
                        <Ionicons name="chevron-down" size={18} color={ACCENT} />
                      </Animated.View>
                    </Pressable>
                    {deliveryPartnerDropdownOpen && (
                      <>
                        <Pressable 
                          style={styles.dropdownOverlay} 
                          onPress={closeDeliveryPartnerDropdown}
                        />
                        <Animated.View
                          style={[
                            styles.inlineDropdown,
                            {
                              opacity: deliveryPartnerChevronAnim,
                              transform: [
                                { translateY: deliveryPartnerChevronAnim.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }) }
                              ]
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
                                  form.deliveryPartner === item.name && styles.inlineDropdownOptionSelected,
                                  pressed && { opacity: 0.7 }
                                ]}
                                onPress={() => {
                                  setForm(f => ({ ...f, deliveryPartner: item.name }));
                                  closeDeliveryPartnerDropdown();
                                }}
                              >
                                <Text style={[
                                  styles.inlineDropdownOptionText,
                                  form.deliveryPartner === item.name && styles.inlineDropdownOptionTextSelected
                                ]}>
                                  {item.name}
                                </Text>
                              </Pressable>
                            ))}
                          </ScrollView>
                        </Animated.View>
                      </>
                    )}
                  </>
                )}
              </View>
            )}
          </View>
          {/* Divider */}
          <View style={styles.sectionDivider} />
          {/* Payment & Urgent Toggles */}
          <View style={styles.sectionGroup}>
            <Text style={styles.floatingLabel}>Payment Condition</Text>
            <View style={styles.segmentedToggleRow}>
              {paymentOptions.map(opt => (
                <Pressable
                  key={opt}
                  style={[styles.segmentedToggleBtn, form.payment === opt && styles.segmentedToggleBtnActive]}
                  onPress={() => handleChange('payment', opt)}
                >
                  <Text style={[styles.segmentedToggleText, form.payment === opt && styles.segmentedToggleTextActive]}>{opt}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={[styles.floatingLabel, { marginTop: 18 }]}>Urgent Order</Text>
            <View style={styles.segmentedToggleRow}>
              {[true, false].map(val => (
                <Pressable
                  key={val ? 'yes' : 'no'}
                  style={[styles.segmentedToggleBtn, form.urgent === val && styles.segmentedToggleBtnActive, val && form.urgent ? styles.urgentToggleActive : null]}
                  onPress={() => handleChange('urgent', val)}
                >
                  <Text style={[styles.segmentedToggleText, form.urgent === val && styles.segmentedToggleTextActive]}>{val ? 'Yes' : 'No'}</Text>
                </Pressable>
              ))}
            </View>
          </View>
          {/* Divider */}
          <View style={styles.sectionDivider} />
          {/* Order Items Section */}
          <View style={styles.sectionGroup}>
            <View style={styles.sectionHeader}>
              <Text style={styles.floatingLabel}>Order Items</Text>
              <Pressable 
                style={styles.addItemButton}
                onPress={handleOpenProductModal}
              >
                <Ionicons name="add" size={20} color={ACCENT} />
                <Text style={styles.addItemButtonText}>Add Item</Text>
              </Pressable>
            </View>

            {orderItems.length === 0 ? (
              <Text style={styles.noItemsText}>No items added to this order</Text>
            ) : (
              <View style={styles.orderItemsList}>
                {orderItems.map((item, index) => (
                  <View key={index} style={styles.orderItemCard}>
                    <View style={styles.orderItemHeader}>
                      <Text style={styles.orderItemName} numberOfLines={1}>{item.name}</Text>
                      <View style={styles.orderItemActions}>
                        <Pressable 
                          style={[styles.itemActionButton, { marginRight: 8 }]}
                          onPress={() => handleEditItem({ ...item, index })}
                        >
                          <Ionicons name="pencil" size={16} color={ACCENT} />
                        </Pressable>
                        <Pressable 
                          style={styles.itemActionButton}
                          onPress={() => handleDeleteItem(index)}
                        >
                          <Ionicons name="trash" size={16} color="#ff5252" />
                        </Pressable>
                      </View>
                    </View>
                    <View style={styles.orderItemDetails}>
                      <Text style={styles.orderItemMeta}>
                        Qty: <Text style={styles.orderItemMetaValue}>{item.qty}</Text>
                      </Text>
                      <Text style={styles.orderItemMeta}>
                        Price: <Text style={styles.orderItemMetaValue}>₹{item.price}</Text>
                      </Text>
                      {item.dimension && (
                        <Text style={styles.orderItemMeta}>
                          {item.dimension}
                        </Text>
                      )}
                    </View>
                    <View style={styles.orderItemFooter}>
                      <Text style={styles.orderItemTotal}>Total: ₹{item.total}</Text>
                    </View>
                  </View>
                ))}
                <View style={styles.orderTotalCard}>
                  <Text style={styles.orderTotalLabel}>Order Total</Text>
                  <Text style={styles.orderTotalValue}>
                    ₹{Math.round(orderItems.reduce((sum, item) => sum + item.total, 0))}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Product Search Modal */}
          <Modal
            visible={showProductModal}
            transparent
            animationType="fade"
            onRequestClose={() => setShowProductModal(false)}
          >
            <View style={styles.modalContainer}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Select Product</Text>
                  <Pressable onPress={() => setShowProductModal(false)}>
                    <Ionicons name="close" size={24} color="#666" />
                  </Pressable>
                </View>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search products..."
                  value={productSearch}
                  onChangeText={setProductSearch}
                />
                {loadingProducts ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={ACCENT} />
                  </View>
                ) : (
                  <FlatList
                    data={filteredProducts}
                    keyExtractor={item => item._id}
                    style={styles.productList}
                    renderItem={({ item }) => (
                      <Pressable
                        style={styles.productItem}
                        onPress={() => handleSelectProduct(item)}
                      >
                        <Text style={styles.productName}>{item.name}</Text>
                        {item.dimension && (
                          <Text style={styles.productDimension}>{item.dimension}</Text>
                        )}
                      </Pressable>
                    )}
                    ListEmptyComponent={() => (
                      <Text style={styles.emptyListText}>No products found</Text>
                    )}
                  />
                )}
              </View>
            </View>
          </Modal>

          {/* Edit Item Modal */}
          <Modal
            visible={showEditModal}
            transparent
            animationType="fade"
            onRequestClose={() => setShowEditModal(false)}
          >
            <View style={styles.modalContainer}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>
                    {editingItem?.index !== undefined ? 'Edit Item' : 'Add Item'}
                  </Text>
                  <Pressable onPress={() => setShowEditModal(false)}>
                    <Ionicons name="close" size={24} color="#666" />
                  </Pressable>
                </View>
                <View style={styles.editForm}>
                  <Text style={styles.editItemName}>{editingItem?.name}</Text>
                  {editingItem?.dimension && (
                    <Text style={styles.editItemDimension}>{editingItem.dimension}</Text>
                  )}
                  <View style={styles.editFieldRow}>
                    <View style={styles.editField}>
                      <Text style={styles.editFieldLabel}>Quantity</Text>
                      <TextInput
                        style={styles.editInput}
                        value={editQty}
                        onChangeText={setEditQty}
                        keyboardType="numeric"
                        placeholder="Enter quantity"
                      />
                    </View>
                    <View style={styles.editField}>
                      <Text style={styles.editFieldLabel}>Price</Text>
                      <TextInput
                        style={styles.editInput}
                        value={editPrice}
                        onChangeText={setEditPrice}
                        keyboardType="numeric"
                        placeholder="Enter price"
                      />
                    </View>
                  </View>
                  <Text style={styles.editTotal}>
                    Total: ₹{(parseFloat(editPrice || "0") * parseInt(editQty || "0")).toFixed(2)}
                  </Text>
                  <Pressable
                    style={styles.saveButton}
                    onPress={handleSaveItem}
                  >
                    <Text style={styles.saveButtonText}>Save Item</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </Modal>

          {/* Update Button */}
          <Pressable style={({ pressed }) => [styles.orderSubmitBtn, pressed && styles.orderSubmitBtnPressed]} onPress={handleUpdate} disabled={updating}>
            <Text style={styles.orderSubmitBtnText}>{updating ? 'Updating...' : 'Update Order'}</Text>
          </Pressable>
          <Pressable style={styles.orderCancelBtn} onPress={() => router.back()}>
            <Text style={styles.orderCancelBtnText}>Cancel</Text>
          </Pressable>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
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
  stickySubheadingWrap: {
    backgroundColor: androidUI.colors.surface,
    paddingTop: androidUI.spacing.sm,
    paddingBottom: 2,
    marginBottom: androidUI.spacing.sm,
    position: 'sticky',
    top: 0,
    zIndex: 2,
  },
  stickySubheading: {
    fontSize: 16,
    fontWeight: '700',
    color: ACCENT,
    marginBottom: 2,
    letterSpacing: 0.2,
  },
  stickyDivider: {
    height: 2,
    backgroundColor: androidUI.colors.border,
    borderRadius: 2,
    marginTop: 2,
  },
  sectionGroup: {
    marginBottom: androidUI.spacing.xxl,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: androidUI.colors.border,
    marginVertical: androidUI.spacing.sm,
    borderRadius: 1,
  },
  floatingLabelInputWrap: {
    marginBottom: androidUI.spacing.lg,
  },
  floatingLabel: {
    fontSize: 13,
    color: androidUI.colors.text.disabled,
    marginBottom: androidUI.spacing.sm,
    fontFamily: androidUI.fontFamily.regular,
  },
  input: {
    flex: 1,
    borderWidth: 0,
    borderRadius: androidUI.borderRadius.medium,
    paddingVertical: androidUI.spacing.lg,
    paddingRight: androidUI.spacing.lg,
    fontSize: 16,
    backgroundColor: 'transparent',
    color: androidUI.colors.text.primary,
    fontFamily: androidUI.fontFamily.regular,
    minHeight: 44,
  },
  disabledInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: androidUI.colors.border,
    borderRadius: androidUI.borderRadius.medium,
    padding: androidUI.spacing.lg,
    fontSize: 16,
    backgroundColor: '#f3f6fa',
    color: androidUI.colors.text.disabled,
    fontStyle: 'italic',
    marginBottom: 0,
  },
  dropdownPicker: {
    width: '100%',
    borderWidth: 1,
    borderColor: androidUI.colors.border,
    borderRadius: androidUI.borderRadius.medium,
    padding: androidUI.spacing.lg,
    backgroundColor: '#f3f6fa',
    color: androidUI.colors.text.primary,
    fontSize: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownPickerText: {
    color: androidUI.colors.text.primary,
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  pickerModalSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: androidUI.colors.surface,
    borderTopLeftRadius: androidUI.borderRadius.xxlarge,
    borderTopRightRadius: androidUI.borderRadius.xxlarge,
    padding: androidUI.spacing.xl,
    maxHeight: '50%',
    ...androidUI.modalShadow,
  },
  pickerOption: {
    paddingVertical: androidUI.spacing.md,
    paddingHorizontal: androidUI.spacing.lg,
    borderRadius: androidUI.borderRadius.small,
    marginBottom: androidUI.spacing.sm,
  },
  pickerOptionSelected: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
    borderWidth: 1,
  },
  pickerOptionText: {
    color: androidUI.colors.text.primary,
    fontSize: 16,
    fontFamily: androidUI.fontFamily.regular,
  },
  pickerOptionTextSelected: {
    color: '#fff',
  },
  segmentedToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: androidUI.spacing.sm,
    marginBottom: androidUI.spacing.sm,
    gap: androidUI.spacing.sm,
  },
  segmentedToggleBtn: {
    flex: 1,
    backgroundColor: '#f3f6fa',
    borderRadius: androidUI.borderRadius.large,
    paddingVertical: androidUI.spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: androidUI.colors.border,
    marginHorizontal: 2,
    transitionDuration: '200ms',
  },
  segmentedToggleBtnActive: {
    backgroundColor: '#e3eaff',
    borderColor: ACCENT,
    elevation: 2,
  },
  segmentedToggleText: {
    color: ACCENT,
    fontWeight: '600',
    fontSize: 15,
    letterSpacing: 0.1,
  },
  segmentedToggleTextActive: {
    color: '#304ffe',
    fontWeight: '700',
  },
  urgentToggleActive: {
    backgroundColor: '#ffd1dc',
    borderColor: '#ffd1dc',
  },
  orderSubmitBtn: {
    backgroundColor: ACCENT,
    borderRadius: androidUI.borderRadius.large,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: androidUI.spacing.sm,
    ...androidUI.cardShadow,
    shadowColor: ACCENT,
    transitionDuration: '200ms',
  },
  orderSubmitBtnPressed: {
    backgroundColor: '#304ffe',
    ...androidUI.buttonPress,
  },
  orderSubmitBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 18,
    letterSpacing: 0.5,
  },
  orderCancelBtn: {
    backgroundColor: androidUI.colors.surface,
    borderRadius: androidUI.borderRadius.large,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 0,
    marginBottom: androidUI.spacing.lg,
    borderWidth: 1,
    borderColor: ACCENT,
  },
  orderCancelBtnText: {
    color: ACCENT,
    fontWeight: '700',
    fontSize: 16,
  },
  container: {
    backgroundColor: androidUI.colors.background,
    paddingVertical: 32,
    paddingHorizontal: androidUI.spacing.lg,
    minHeight: 600,
    flexGrow: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e3eaff',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  addItemButtonText: {
    color: ACCENT,
    fontWeight: '600',
    marginLeft: 4,
  },
  noItemsText: {
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
    marginVertical: 20,
  },
  orderItemsList: {
    marginTop: 8,
  },
  orderItemCard: {
    backgroundColor: androidUI.colors.surface,
    borderRadius: androidUI.borderRadius.medium,
    padding: androidUI.spacing.lg,
    marginBottom: androidUI.spacing.md,
    ...androidUI.shadow,
  },
  orderItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: androidUI.colors.text.primary,
    flex: 1,
    marginRight: androidUI.spacing.sm,
  },
  orderItemActions: {
    flexDirection: 'row',
  },
  itemActionButton: {
    padding: 6,
    backgroundColor: '#f3f6fa',
    borderRadius: androidUI.borderRadius.small,
  },
  orderItemDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  orderItemMeta: {
    fontSize: 14,
    color: androidUI.colors.text.secondary,
  },
  orderItemMetaValue: {
    color: ACCENT,
    fontWeight: '600',
  },
  orderItemFooter: {
    borderTopWidth: 1,
    borderTopColor: androidUI.colors.border,
    paddingTop: androidUI.spacing.md,
    alignItems: 'flex-end',
  },
  orderItemTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: ACCENT,
  },
  orderTotalCard: {
    backgroundColor: androidUI.colors.surface,
    borderRadius: androidUI.borderRadius.medium,
    padding: androidUI.spacing.lg,
    marginTop: androidUI.spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...androidUI.shadow,
  },
  orderTotalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: androidUI.colors.text.primary,
  },
  orderTotalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: ACCENT,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: androidUI.colors.surface,
    borderRadius: androidUI.borderRadius.medium,
    padding: androidUI.spacing.xl,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: androidUI.colors.text.primary,
  },
  searchInput: {
    backgroundColor: '#f3f6fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  productList: {
    maxHeight: 400,
  },
  productItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  productName: {
    fontSize: 16,
    color: '#22223b',
    marginBottom: 4,
  },
  productDimension: {
    fontSize: 14,
    color: '#666',
  },
  emptyListText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 20,
  },
  editForm: {
    padding: 16,
  },
  editItemName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#22223b',
    marginBottom: 4,
  },
  editItemDimension: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  editFieldRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  editField: {
    flex: 1,
  },
  editFieldLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  editInput: {
    backgroundColor: '#f3f6fa',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  editTotal: {
    fontSize: 18,
    fontWeight: '700',
    color: ACCENT,
    textAlign: 'right',
    marginBottom: 16,
  },
  saveButton: {
    backgroundColor: ACCENT,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  dropdownPickerRequired: {
    borderColor: '#ff5252',
    borderWidth: 1,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f6fa',
    borderRadius: androidUI.borderRadius.medium,
    borderWidth: 1,
    borderColor: androidUI.colors.border,
    ...androidUI.shadow,
    marginBottom: 2,
  },
  inputIcon: {
    marginLeft: 12,
    marginRight: 8,
    fontSize: 18,
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