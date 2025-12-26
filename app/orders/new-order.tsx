import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Animated, KeyboardAvoidingView, Modal, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { createOrder, getProducts, getStaff, getCustomerNames, getOrderRoutes, getCustomerByName } from "../utils/api";
import { useOrder } from "./OrderContext";
import { useToast } from "../contexts/ToastContext";
import { androidUI } from "../utils/androidUI";

const ACCENT = "#3D5AFE";
const orderStatusOptions = ["Pending", "DC", "Invoice", "Dispatched"];
// Remove mockStaff; use real staff from backend
const paymentOptions = ["Immediate", "15 Days", "30 Days"];

interface OrderItem {
  productId: string;
  name: string;
  dimension?: string;
  qty: number;
  price: number;
  total: number;
  index?: number;
}

export default function NewOrderScreen() {
  const params = useLocalSearchParams();
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
    additionalNotes: '',
  });
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [assignedDropdownOpen, setAssignedDropdownOpen] = useState(false);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [staffLoading, setStaffLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  // Order Items State
  const { orderItems, setAllOrderItems, clearOrderItems } = useOrder();
  const [productSearch, setProductSearch] = useState("");
  const [productResults, setProductResults] = useState<any[]>([]);
  const [productLoading, setProductLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [qty, setQty] = useState("");
  const [price, setPrice] = useState("");
  const [showProductSearch, setShowProductSearch] = useState(false);
  
  // Add a flag to track if we are returning from new-product
  const [reopenProductModal, setReopenProductModal] = useState(false);

  // Add new state for edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<OrderItem | null>(null);
  const [editQty, setEditQty] = useState("");
  const [editPrice, setEditPrice] = useState("");

  const [statusChevronAnim] = useState(new Animated.Value(0));
  const [assignedChevronAnim] = useState(new Animated.Value(0));


  const [customerSuggestions, setCustomerSuggestions] = useState<string[]>([]);
  const [customerNameFocused, setCustomerNameFocused] = useState(false);
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);
  const [customerDetailsLoading, setCustomerDetailsLoading] = useState(false);

  // Route suggestions state
  const [routeSuggestions, setRouteSuggestions] = useState<string[]>([]);
  const [routeFocused, setRouteFocused] = useState(false);
  const [routeDropdownOpen, setRouteDropdownOpen] = useState(false);

  const isMounted = useRef(true);
  useEffect(() => {
    return () => { isMounted.current = false; };
  }, []);

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
  const statusChevronRotate = statusChevronAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

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
  const assignedChevronRotate = assignedChevronAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const handleChange = (field: string, value: any) => {
    setForm({ ...form, [field]: value });
  };


  // Fetch products for search
  const fetchAndSetProducts = async (search: string) => {
    setProductLoading(true);
    try {
      const response = await getProducts();
      let products = response.data;
      if (search.trim()) {
        products = products.filter((p: any) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          (p.dimension && p.dimension.toLowerCase().includes(search.toLowerCase()))
        );
      }
      setProductResults(products);
    } catch (err) {
      setProductResults([]);
      Alert.alert("Error", "Failed to fetch products");
    }
    setProductLoading(false);
  };

  // Handle product search
  const handleProductSearch = (text: string) => {
    setProductSearch(text);
    fetchAndSetProducts(text);
  };

  // Remove local add/remove product logic; all orderItems come from context

  // Total order amount
  const orderTotal = orderItems.reduce((sum: number, item: any) => sum + item.total, 0);

  // Fetch staff list
  useEffect(() => {
    const fetchStaffList = async () => {
      try {
        const response = await getStaff();
        if (Array.isArray(response.data)) {
          setStaffList(response.data);
          // Set default assignedTo and assignedToId if not already set
          if (!form.assignedTo && response.data.length > 0) {
            setForm(f => ({ ...f, assignedTo: response.data[0].name, assignedToId: response.data[0]._id }));
          }
        }
      } catch (err) {
        Alert.alert("Error", "Failed to fetch staff list");
      }
      setStaffLoading(false);
    };
    fetchStaffList();
  }, []);

  // Fetch customer suggestions as user types
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (form.customerName.trim().length === 0) {
        setCustomerSuggestions([]);
        setCustomerDropdownOpen(false);
        return;
      }
      try {
        const res = await getCustomerNames();
        const names: string[] = res.data || [];
        const filtered = names.filter(n => n.toLowerCase().includes(form.customerName.toLowerCase()) && n.trim() !== '');
        setCustomerSuggestions(filtered);
        setCustomerDropdownOpen(filtered.length > 0 && customerNameFocused);
      } catch (err) {
        setCustomerSuggestions([]);
        setCustomerDropdownOpen(false);
      }
    };
    if (customerNameFocused) fetchSuggestions();
  }, [form.customerName, customerNameFocused]);

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

  // Function to handle customer selection and auto-fill details
  const handleCustomerSelection = async (customerName: string) => {
    setCustomerDetailsLoading(true);
    try {
      const response = await getCustomerByName(customerName);
      const customer = response.data;
      
      if (customer) {
        setForm(prev => ({
          ...prev,
          customerName: customer.name,
          customerPhone: customer.phone || '',
          address: customer.address || ''
        }));
        
        // Show success message if details were auto-filled
        if (customer.phone || customer.address) {
        }
      }
    } catch (err) {
      console.error('Error fetching customer details:', err);
      // If customer details can't be fetched, just set the name
      setForm(prev => ({
        ...prev,
        customerName: customerName
      }));
      
      // Show info message
    } finally {
      setCustomerDetailsLoading(false);
    }
  };

  const handleSubmit = async () => {
    // Validate required fields
    const requiredFields = [
      { label: 'Customer Name', value: form.customerName },
      { label: 'Order Route', value: form.orderRoute },
      { label: 'Customer Phone', value: form.customerPhone },
      { label: 'Address', value: form.address },
      { label: 'Order Status', value: form.orderStatus },
      { label: 'Payment Condition', value: form.payment },
      { label: 'Assigned To', value: form.assignedTo },
      { label: 'Assigned To ID', value: form.assignedToId },
    ];
    const emptyField = requiredFields.find(f => f.value === '' || f.value === undefined || f.value === null);
    if (emptyField) {
      Alert.alert("Error", `Please fill in the ${emptyField.label}.`);
      return;
    }

    // Check if at least one item is provided
    if (orderItems.length === 0) {
      Alert.alert("Error", "Please add at least one item to the order.");
      return;
    }

    setCreating(true);
    try {
      await createOrder({
        customerName: form.customerName,
        orderRoute: form.orderRoute,
        customerPhone: form.customerPhone,
        customerAddress: form.address,
        orderStatus: form.orderStatus,
        paymentCondition: form.payment,
        assignedTo: form.assignedTo,
        assignedToId: form.assignedToId,
        createdBy: params.name ? String(params.name) : "Unknown",
        orderItems: orderItems,
        ...(form.additionalNotes ? { additionalNotes: form.additionalNotes } : {}),
      });
             if (isMounted.current) {
         router.replace({ pathname: '/orders/orders', params: { role: params.role, name: params.name } });
       }
    } catch (err: any) {
      console.error('Order creation failed:', err.response?.data || err.message);
      
      // Handle stock validation errors
      if (err.response?.data?.stockErrors && Array.isArray(err.response.data.stockErrors)) {
        const errorMessage = err.response.data.stockErrors.join('\n• ');
        Alert.alert(
          "Insufficient Stock", 
          `The following products have insufficient stock:\n\n• ${errorMessage}\n\nPlease adjust quantities or remove items with insufficient stock.`
        );
        return;
      }
      
      // Handle other errors
      const errorMessage = err.response?.data?.message || 
                         err.response?.data?.error || 
                         err.message || 
                         'Failed to create order';
      Alert.alert("Error", errorMessage);
    }
    setCreating(false);
  };

  // When returning from new-product, reopen modal and focus search
  useEffect(() => {
    if (reopenProductModal) {
      setShowProductSearch(true);
      setReopenProductModal(false);
    }
  }, [reopenProductModal]);

  // Clear order items when this screen is first opened
  useEffect(() => {
    clearOrderItems();
  }, []);

  // Add handlers for editing and deleting items
  const handleEditItem = (item: any, index: number) => {
    setEditingItem({ ...item, index });
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

    const newItems = [...orderItems];
    if (editingItem?.index !== undefined) {
      // Update existing item
      newItems[editingItem.index] = newItem;
    } else {
      // Add new item
      newItems.push(newItem);
    }
    setAllOrderItems(newItems);

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
            const newItems = orderItems.filter((_: OrderItem, i: number) => i !== index);
            setAllOrderItems(newItems);
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f7fa' }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={'padding'}>
        <View style={styles.screenWrap}>
          {/* Modern Nav Bar */}
          <View style={styles.headerBar}>
            <Pressable style={styles.backBtn} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={22} color={ACCENT} />
            </Pressable>
            <Text style={styles.headerTitle}>New Order</Text>
          </View>
          <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
            {/* CUSTOMER DETAILS */}
            <Text style={styles.sectionLabel}>Customer Details</Text>
            <View style={styles.sectionGroup}>
              <View style={styles.floatingLabelInputWrap}>
                <Text style={styles.floatingLabel}>Customer Name</Text>
                <View style={{ position: 'relative' }}>
                  <View style={styles.inputRow}>
                    <Text style={styles.inputIcon}>👤</Text>
                    <TextInput
                      style={styles.input}
                      value={form.customerName}
                      onChangeText={v => handleChange('customerName', v)}
                      placeholder="Enter customer name"
                      placeholderTextColor="#b0b3b8"
                      onFocus={() => setCustomerNameFocused(true)}
                      onBlur={() => setTimeout(() => setCustomerNameFocused(false), 200)}
                    />
                  </View>
                  {customerDropdownOpen && customerSuggestions.length > 0 && (
                    <View style={[styles.inlineDropdown, { top: '100%', left: 0, right: 0, zIndex: 12000 }]}> 
                      <ScrollView keyboardShouldPersistTaps="handled" style={styles.dropdownScrollView}>
                        {customerSuggestions.map((name, idx) => (
                          <Pressable
                            key={name + idx}
                            style={({ pressed }) => [
                              styles.inlineDropdownOption,
                              pressed && { opacity: 0.7 }
                            ]}
                            onPress={() => {
                              handleCustomerSelection(name);
                              setCustomerDropdownOpen(false);
                            }}
                          >
                            <Text style={styles.inlineDropdownOptionText}>{name}</Text>
                          </Pressable>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
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
                <View style={styles.inputRow}>
                  <Text style={styles.inputIcon}>📞</Text>
                  <TextInput
                    style={styles.input}
                    value={form.customerPhone}
                    onChangeText={v => handleChange('customerPhone', v)}
                    keyboardType="phone-pad"
                    placeholder={customerDetailsLoading ? "Loading..." : "Enter phone number"}
                    placeholderTextColor="#b0b3b8"
                    editable={!customerDetailsLoading}
                  />
                  {customerDetailsLoading && (
                    <ActivityIndicator size="small" color={ACCENT} style={{ marginRight: 12 }} />
                  )}
                </View>
              </View>
              <View style={styles.floatingLabelInputWrap}>
                <Text style={styles.floatingLabel}>Address</Text>
                <View style={styles.inputRow}>
                  <Text style={styles.inputIcon}>📍</Text>
                  <TextInput
                    style={styles.input}
                    value={form.address}
                    onChangeText={v => handleChange('address', v)}
                    placeholder={customerDetailsLoading ? "Loading..." : "Enter address"}
                    placeholderTextColor="#b0b3b8"
                    multiline
                    editable={!customerDetailsLoading}
                  />
                  {customerDetailsLoading && (
                    <ActivityIndicator size="small" color={ACCENT} style={{ marginRight: 12 }} />
                  )}
                </View>
              </View>
              <View style={styles.floatingLabelInputWrap}>
                <Text style={styles.floatingLabel}>Additional Notes</Text>
                <View style={styles.inputRow}>
                  <Text style={styles.inputIcon}>📝</Text>
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
            </View>
            {/* Divider */}
            <View style={styles.sectionDivider} />
            {/* ORDER DETAILS */}
            <Text style={styles.sectionLabel}>Order Details</Text>
            <View style={styles.sectionGroup}>
              {/* Order Status Dropdown */}
              <View style={[styles.floatingLabelInputWrap, { position: 'relative' }]}>
                <Text style={styles.floatingLabel}>Order Status</Text>
                <Pressable style={[styles.dropdownPicker, styles.inputRow, styles.dropdownPickerEmphasis]} onPress={statusDropdownOpen ? closeStatusDropdown : openStatusDropdown}>
                  <Text style={styles.inputIcon}>📄</Text>
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
                      {orderStatusOptions.map((item) => (
                        <Pressable
                          key={item}
                          style={({ pressed }) => [
                            styles.inlineDropdownOption,
                            form.orderStatus === item && styles.inlineDropdownOptionSelected,
                            pressed && { opacity: 0.7 }
                          ]}
                          onPress={() => { handleChange('orderStatus', item); closeStatusDropdown(); }}
                        >
                          <Text style={[
                            styles.inlineDropdownOptionText,
                            form.orderStatus === item && styles.inlineDropdownOptionTextSelected
                          ]}>
                            {item}
                          </Text>
                        </Pressable>
                      ))}
                    </Animated.View>
                  </>
                )}
              </View>
              {/* Assigned To Dropdown */}
              <View style={[styles.floatingLabelInputWrap, { position: 'relative' }]}>
                <Text style={styles.floatingLabel}>Assigned To</Text>
                {staffLoading ? (
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
              {/* Payment Condition */}
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
            </View>
            {/* Divider */}
            <View style={styles.sectionDivider} />
            {/* ORDER ITEMS */}
            <Text style={styles.sectionLabel}>Order Items</Text>
            <View style={styles.sectionGroup}>
              <Text style={styles.floatingLabel}>Order Items</Text>
              {orderItems.length === 0 ? (
                <View style={{ marginBottom: 12 }}>
                  <Pressable style={[styles.addProductBtn, styles.ghostAddProductBtn]} onPress={() => router.push('/orders/orderitems')}>
                    <Text style={styles.inputIcon}>➕</Text>
                    <Text style={styles.ghostAddProductBtnText}>Add Products</Text>
                  </Pressable>
                </View>
              ) : (
                <>
                  <View style={{ marginBottom: 18 }}>
                    {orderItems.map((item: any, idx: number) => (
                      <View key={item._tempId || `item-${idx}`} style={styles.orderItemCard}>
                        <View style={styles.orderItemHeader}>
                          <Text style={styles.orderItemName} numberOfLines={1}>{item.name}</Text>
                          <View style={styles.orderItemActions}>
                            <Pressable 
                              style={[styles.itemActionButton, { marginRight: 8 }]}
                              onPress={() => handleEditItem(item, idx)}
                            >
                              <Ionicons name="pencil" size={16} color={ACCENT} />
                            </Pressable>
                            <Pressable 
                              style={styles.itemActionButton}
                              onPress={() => handleDeleteItem(idx)}
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
                        ₹{orderItems.reduce((sum: number, item: OrderItem) => sum + item.total, 0)}
                      </Text>
                    </View>
                  </View>
                  <Pressable style={[styles.addProductBtn, styles.ghostAddProductBtn]} onPress={() => router.push('/orders/orderitems')}>
                    <Text style={styles.inputIcon}>➕</Text>
                    <Text style={styles.ghostAddProductBtnText}>Add More Products</Text>
                  </Pressable>
                </>
              )}
            </View>

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

            {/* Submit Button */}
            <Pressable 
              style={({ pressed }) => [styles.orderSubmitBtn, pressed && styles.orderSubmitBtnPressed]} 
              onPress={handleSubmit}
              disabled={creating}
            >
              <Text style={styles.orderSubmitBtnText}>{creating ? 'Creating...' : 'Create Order'}</Text>
            </Pressable>
            <Pressable style={styles.orderCancelBtn} onPress={() => router.back()}>
              <Text style={styles.orderCancelBtnText}>Cancel</Text>
            </Pressable>
          </ScrollView>
                 </View>
       </KeyboardAvoidingView>
    </SafeAreaView>
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
    paddingVertical: 32,
    paddingHorizontal: androidUI.spacing.lg,
    minHeight: 600,
    flexGrow: 1,
  },
  sectionGroup: {
    marginBottom: androidUI.spacing.xxl,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: androidUI.colors.border,
    marginVertical: androidUI.spacing.xxl,
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
  dropdownWrap: {
    marginBottom: 18,
  },
  dropdownLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#22223b',
    marginBottom: 8,
    fontFamily: 'System',
  },
  dropdownBox: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dropdownOption: {
    backgroundColor: '#f3f6fa',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  dropdownOptionSelected: {
    backgroundColor: ACCENT,
  },
  dropdownOptionText: {
    color: '#22223b',
    fontSize: 15,
    fontWeight: '500',
  },
  dropdownOptionTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  radioRow: {
    flexDirection: 'row',
    gap: 12,
  },
  radioBtn: {
    backgroundColor: '#f3f6fa',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
  },
  radioBtnSelected: {
    backgroundColor: ACCENT,
  },
  radioBtnText: {
    color: '#22223b',
    fontSize: 15,
    fontWeight: '500',
  },
  radioBtnTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  placeholderText: {
    color: '#b0b3b8',
    fontSize: 14,
    fontStyle: 'italic',
  },
  orderSubmitBtn: {
    backgroundColor: ACCENT,
    borderRadius: androidUI.borderRadius.large,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 4,
    ...androidUI.cardShadow,
    shadowColor: ACCENT,
  },
  orderSubmitBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  orderCancelBtn: {
    backgroundColor: 'transparent',
    borderRadius: androidUI.borderRadius.large,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: androidUI.spacing.lg,
},
orderCancelBtnText: {
  color: androidUI.colors.text.secondary,
  fontWeight: '600',
  fontSize: 15,
},
  dropdownPicker: {
    backgroundColor: '#f3f6fa',
    borderRadius: androidUI.borderRadius.small,
    paddingVertical: androidUI.spacing.md,
    paddingHorizontal: androidUI.spacing.lg,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: androidUI.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownPickerText: {
    color: androidUI.colors.text.primary,
    fontSize: 15,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  pickerModalSheet: {
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
    maxHeight: 320,
  },
  pickerOption: {
    paddingVertical: 14,
    paddingHorizontal: androidUI.spacing.sm,
    borderRadius: androidUI.borderRadius.small,
    marginBottom: 2,
    backgroundColor: '#f3f6fa',
  },
  pickerOptionSelected: {
    backgroundColor: ACCENT,
  },
  pickerOptionText: {
    color: androidUI.colors.text.primary,
    fontSize: 16,
    fontWeight: '500',
  },
  pickerOptionTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  segmentedToggleRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  segmentedToggleBtn: {
    backgroundColor: '#f3f6fa',
    borderRadius: 20,
    paddingVertical: androidUI.spacing.sm,
    paddingHorizontal: androidUI.spacing.lg,
    borderWidth: 1,
    borderColor: androidUI.colors.border,
  },
  segmentedToggleBtnActive: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
  },
  segmentedToggleText: {
    color: androidUI.colors.text.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  segmentedToggleTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  comingSoonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f6fa',
    borderRadius: 10,
    paddingVertical: 15,
    paddingHorizontal: 18,
    marginBottom: 8,
  },
  comingSoonText: {
    color: '#b0b3b8',
    fontSize: 14,
    fontStyle: 'italic',
    marginLeft: 8,
  },
  orderSubmitBtnPressed: {
    ...androidUI.buttonPress,
  },
  orderItemsTable: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  orderItemsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  orderItemsCol: {
    fontSize: 14,
    fontWeight: '600',
    color: '#22223b',
    flex: 1,
  },
  orderItemsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  orderItemsFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  removeOrderItemBtn: {
    padding: 5,
  },
  addProductBtn: {
    backgroundColor: ACCENT,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 12,
  },
  addProductBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
    marginLeft: 8,
  },
  productSearchSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingVertical: 24,
    paddingHorizontal: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 12,
    maxHeight: 400,
  },
  productSearchTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: ACCENT,
    marginBottom: 16,
    textAlign: 'center',
  },
  productResultRow: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  productResultRowSelected: {
    backgroundColor: '#f3f6fa',
  },
  productResultName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#22223b',
  },
  productResultDim: {
    fontSize: 13,
    color: '#b0b3b8',
    marginTop: 2,
  },
  createProductBtn: {
    backgroundColor: ACCENT,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createProductBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  centeredModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  centeredModalWrap: {
    flex: 1,
  },
  centeredModalSheet: {
    width: '100%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingVertical: 24,
    paddingHorizontal: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 12,
    maxHeight: 400,
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
    padding: androidUI.spacing.xl,
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
    marginBottom: androidUI.spacing.lg,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: androidUI.colors.text.primary,
  },
  editForm: {
    padding: androidUI.spacing.lg,
  },
  editItemName: {
    fontSize: 18,
    fontWeight: '600',
    color: androidUI.colors.text.primary,
    marginBottom: 4,
  },
  editItemDimension: {
    fontSize: 14,
    color: androidUI.colors.text.secondary,
    marginBottom: androidUI.spacing.lg,
  },
  editFieldRow: {
    flexDirection: 'row',
    gap: androidUI.spacing.lg,
    marginBottom: androidUI.spacing.lg,
  },
  editField: {
    flex: 1,
  },
  editFieldLabel: {
    fontSize: 14,
    color: androidUI.colors.text.secondary,
    marginBottom: androidUI.spacing.sm,
  },
  editInput: {
    backgroundColor: '#f3f6fa',
    borderRadius: androidUI.borderRadius.small,
    padding: androidUI.spacing.md,
    fontSize: 16,
  },
  editTotal: {
    fontSize: 18,
    fontWeight: '700',
    color: ACCENT,
    textAlign: 'right',
    marginBottom: androidUI.spacing.lg,
  },
  saveButton: {
    backgroundColor: ACCENT,
    borderRadius: androidUI.borderRadius.small,
    padding: androidUI.spacing.lg,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  sectionLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 12,
    marginTop: 18,
    textTransform: 'uppercase',
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
  ghostAddProductBtn: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#106eea',
  },
     ghostAddProductBtnText: {
     color: '#106eea',
     fontWeight: '700',
     fontSize: 15,
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
  orderItemCheckboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: androidUI.spacing.sm,
  },
  orderItemCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#ccc',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: androidUI.spacing.sm,
  },
  orderItemCheckboxSelected: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
  },
  orderItemCardUnselected: {
    opacity: 0.6,
    backgroundColor: '#f8f9fa',
  },
  orderItemNameUnselected: {
    color: '#999',
    textDecorationLine: 'line-through',
  },
  orderItemMetaUnselected: {
    color: '#999',
  },
  orderItemTotalUnselected: {
    color: '#999',
  },
}); 