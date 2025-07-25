import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Animated, FlatList, Image, KeyboardAvoidingView, Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
// @ts-ignore
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { createOrder, getProducts, getStaff } from "../api";
import { useOrder } from "./OrderContext";

const ACCENT = "#3D5AFE";
const orderStatusOptions = ["Pending", "DC", "Invoice", "Dispatched"];
// Remove mockStaff; use real staff from backend
const paymentOptions = ["Immediate", "15 Days", "30 Days"];
const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/duyuamwm2/image/upload'; // Replace <your_cloud_name>
const CLOUDINARY_UPLOAD_PRESET = 'sarathiapp'; // Replace with your preset

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
  const [form, setForm] = useState({
    customerName: '',
    customerPhone: '',
    address: '',
    orderStatus: orderStatusOptions[0],
    assignedTo: '',
    assignedToId: '',
    payment: paymentOptions[0],
    urgent: false,
    image: null as string | null, // local uri
    orderImage: null as string | null, // cloudinary url
  });
  const [imageUploading, setImageUploading] = useState(false);
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
  const [showToast, setShowToast] = useState(false);
  const toastAnim = useRef(new Animated.Value(0)).current;

  const [scheduledFor, setScheduledFor] = useState<Date | null>(null);
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);

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

  const handleImagePick = async () => {
    setImageUploading(true);
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const localUri = result.assets[0].uri;
      setForm(f => ({ ...f, image: localUri }));
      // Upload to Cloudinary
      try {
        const formData = new FormData();
        formData.append('file', {
          uri: localUri,
          type: 'image/jpeg',
          name: 'order-image.jpg',
        } as any);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
        const response = await axios.post(CLOUDINARY_URL, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        if (response.data && response.data.secure_url) {
          setForm(f => ({ ...f, orderImage: response.data.secure_url }));
        } else {
          Alert.alert('Error', 'Failed to upload image to Cloudinary.');
        }
      } catch (err) {
        Alert.alert('Error', 'Failed to upload image to Cloudinary.');
      }
    }
    setImageUploading(false);
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

  const handleSubmit = async () => {
    // Validate required fields
    const requiredFields = [
      { label: 'Customer Name', value: form.customerName },
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
    setCreating(true);
    try {
      await createOrder({
        customerName: form.customerName,
        customerPhone: form.customerPhone,
        customerAddress: form.address,
        orderStatus: form.orderStatus,
        paymentCondition: form.payment,
        assignedTo: form.assignedTo,
        assignedToId: form.assignedToId,
        createdBy: params.name ? String(params.name) : "Unknown",
        urgent: form.urgent,
        orderItems: orderItems,
        orderImage: form.orderImage || '',
        ...(scheduledFor ? { scheduledFor: scheduledFor.toISOString() } : {}),
      });
      if (isMounted.current) {
        setShowToast(true);
        Animated.timing(toastAnim, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }).start(() => {
          setShowToast(false);
          toastAnim.setValue(0);
          router.replace('/orders/orders');
        });
      }
    } catch (err) {
      Alert.alert("Error", "Failed to create order");
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
                <View style={styles.inputRow}>
                  <Text style={styles.inputIcon}>👤</Text>
                  <TextInput
                    style={styles.input}
                    value={form.customerName}
                    onChangeText={v => handleChange('customerName', v)}
                    placeholder="Enter customer name"
                    placeholderTextColor="#b0b3b8"
                  />
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
                    placeholder="Enter phone number"
                    placeholderTextColor="#b0b3b8"
                  />
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
                    placeholder="Enter address"
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
              <View style={styles.floatingLabelInputWrap}>
                <Text style={styles.floatingLabel}>Order Status</Text>
                <Pressable style={[styles.dropdownPicker, styles.inputRow, styles.dropdownPickerEmphasis]} onPress={openStatusDropdown}>
                  <Text style={styles.inputIcon}>📄</Text>
                  <Text style={styles.dropdownPickerText}>{form.orderStatus}</Text>
                  <Animated.View style={{ marginLeft: 8, transform: [{ rotate: statusChevronRotate }] }}>
                    <Ionicons name="chevron-down" size={18} color={ACCENT} />
                  </Animated.View>
                </Pressable>
                <Modal
                  visible={statusDropdownOpen}
                  transparent
                  animationType="fade"
                  onRequestClose={closeStatusDropdown}
                >
                  <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => closeStatusDropdown()} />
                  <View style={styles.pickerModalSheet}>
                    <FlatList
                      data={orderStatusOptions}
                      keyExtractor={item => item}
                      renderItem={({ item }) => (
                        <Pressable
                          style={({ pressed }) => [styles.pickerOption, form.orderStatus === item && styles.pickerOptionSelected, pressed && { opacity: 0.7 }]}
                          onPress={() => { handleChange('orderStatus', item); closeStatusDropdown(); }}
                        >
                          <Text style={[styles.pickerOptionText, form.orderStatus === item && styles.pickerOptionTextSelected]}>{item}</Text>
                        </Pressable>
                      )}
                    />
                  </View>
                </Modal>
              </View>
              {/* Assigned To Dropdown */}
              <View style={styles.floatingLabelInputWrap}>
                <Text style={styles.floatingLabel}>Assigned To</Text>
                {staffLoading ? (
                  <ActivityIndicator size="small" color={ACCENT} />
                ) : (
                  <>
                    <Pressable style={[styles.dropdownPicker, styles.inputRow, styles.dropdownPickerEmphasis]} onPress={openAssignedDropdown}>
                      <Text style={styles.inputIcon}>👤</Text>
                      <Text style={styles.dropdownPickerText}>{form.assignedTo}</Text>
                      <Animated.View style={{ marginLeft: 8, transform: [{ rotate: assignedChevronRotate }] }}>
                        <Ionicons name="chevron-down" size={18} color={ACCENT} />
                      </Animated.View>
                    </Pressable>
                    <Modal
                      visible={assignedDropdownOpen}
                      transparent
                      animationType="fade"
                      onRequestClose={closeAssignedDropdown}
                    >
                      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => closeAssignedDropdown()} />
                      <View style={styles.pickerModalSheet}>
                        <FlatList
                          data={staffList}
                          keyExtractor={item => item._id}
                          renderItem={({ item }) => (
                            <Pressable
                              style={({ pressed }) => [styles.pickerOption, form.assignedToId === item._id && styles.pickerOptionSelected, pressed && { opacity: 0.7 }]}
                              onPress={() => {
                                setForm(f => ({ ...f, assignedTo: item.name, assignedToId: item._id }));
                                closeAssignedDropdown();
                              }}
                            >
                              <Text style={[styles.pickerOptionText, form.assignedToId === item._id && styles.pickerOptionTextSelected]}>{item.name}</Text>
                            </Pressable>
                          )}
                        />
                      </View>
                    </Modal>
                  </>
                )}
              </View>
              {/* Payment & Urgent Toggles */}
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
              <Text style={[styles.floatingLabel, { marginTop: 18 }]}>Urgent Order <Text style={{ fontSize: 16 }}>⚡</Text></Text>
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
              {/* Scheduled For Date/Time Picker */}
              <View style={{ marginVertical: 12 }}>
                <Text style={styles.floatingLabel}>Scheduled For</Text>
                <Pressable
                  style={[
                    styles.dropdownPicker,
                    styles.inputRow,
                    styles.dropdownPickerEmphasis,
                    { flex: 1, backgroundColor: '#f8fafd', borderColor: '#b0b3b8', paddingVertical: 16 }
                  ]}
                  onPress={() => setDatePickerVisibility(true)}
                >
                  <Text style={styles.inputIcon}>🗓️</Text>
                  <Text style={[styles.dropdownPickerText, { color: scheduledFor ? '#22223b' : '#b0b3b8' }]}> 
                    {scheduledFor ? scheduledFor.toLocaleString() : 'Select date & time'}
                  </Text>
                  <Ionicons name="calendar" size={18} color={ACCENT} style={{ marginLeft: 8 }} />
                </Pressable>
                {scheduledFor && (
                  <Pressable
                    onPress={() => setScheduledFor(null)}
                    style={{ marginLeft: 10, padding: 6 }}
                    accessibilityLabel="Clear scheduled date"
                  >
                    <Ionicons name="close-circle" size={22} color="#ff5252" />
                  </Pressable>
                )}
                <DateTimePickerModal
                  isVisible={isDatePickerVisible}
                  mode="datetime"
                  date={scheduledFor || new Date()}
                  onConfirm={date => {
                    setScheduledFor(date);
                    setDatePickerVisibility(false);
                  }}
                  onCancel={() => setDatePickerVisibility(false)}
                  minimumDate={new Date()}
                />
              </View>
            </View>
            {/* Divider */}
            <View style={styles.sectionDivider} />
            {/* ATTACHMENTS */}
            <Text style={styles.sectionLabel}>Attachments</Text>
            <View style={styles.sectionGroup}>
              <Text style={styles.floatingLabel}>Order Image</Text>
              <Pressable style={styles.uploadCard} onPress={handleImagePick}>
                <Ionicons name="cloud-upload-outline" size={36} color={ACCENT} style={{ marginBottom: 10 }} />
                <Text style={styles.uploadCardText}>{form.image ? 'Change Image' : 'Upload Image'}</Text>
                {form.image && (
                  <Image source={{ uri: form.image }} style={styles.uploadedImage} />
                )}
              </Pressable>
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
                      <View key={idx} style={styles.orderItemCard}>
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
        {showToast && (
          <Animated.View
            style={[
              styles.toast,
              {
                opacity: toastAnim,
                transform: [
                  { translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }
                ]
              }
            ]}
            pointerEvents="none"
          >
            <Text style={styles.toastText}>✅ Order Created Successfully!</Text>
          </Animated.View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screenWrap: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backBtn: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: ACCENT,
    marginLeft: 10,
    fontFamily: 'System',
  },
  container: {
    paddingVertical: 32,
    paddingHorizontal: 18,
    minHeight: 600,
    flexGrow: 1,
  },
  sectionGroup: {
    marginBottom: 24,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 24,
  },
  floatingLabelInputWrap: {
    marginBottom: 18,
  },
  floatingLabel: {
    fontSize: 13,
    color: '#b0b3b8',
    marginBottom: 8,
    fontFamily: 'System',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f6fa',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
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
    borderRadius: 14,
    paddingVertical: 16,
    paddingRight: 16,
    fontSize: 16,
    backgroundColor: 'transparent',
    color: '#222',
    fontFamily: 'System',
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
  imageUploadBtn: {
    backgroundColor: '#f3f6fa',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 18,
    alignItems: 'center',
    marginBottom: 8,
  },
  imageUploadBtnText: {
    color: ACCENT,
    fontWeight: '600',
    fontSize: 15,
  },
  uploadedImage: {
    width: 120,
    height: 90,
    borderRadius: 10,
    marginTop: 6,
    marginBottom: 8,
    alignSelf: 'center',
  },
  placeholderText: {
    color: '#b0b3b8',
    fontSize: 14,
    fontStyle: 'italic',
  },
  orderSubmitBtn: {
    backgroundColor: ACCENT,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 4,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 3,
  },
  orderSubmitBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  orderCancelBtn: {
    backgroundColor: 'transparent',
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 16,
},
orderCancelBtnText: {
  color: '#888',
  fontWeight: '600',
  fontSize: 15,
},
  dropdownPicker: {
    backgroundColor: '#f3f6fa',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownPickerText: {
    color: '#22223b',
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
    backgroundColor: '#fff',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingVertical: 18,
    paddingHorizontal: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 12,
    maxHeight: 320,
  },
  pickerOption: {
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 10,
    marginBottom: 2,
    backgroundColor: '#f3f6fa',
  },
  pickerOptionSelected: {
    backgroundColor: ACCENT,
  },
  pickerOptionText: {
    color: '#22223b',
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
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  segmentedToggleBtnActive: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
  },
  segmentedToggleText: {
    color: '#22223b',
    fontSize: 14,
    fontWeight: '500',
  },
  segmentedToggleTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  urgentToggleActive: {
    backgroundColor: ACCENT,
  },
  uploadCard: {
    backgroundColor: '#f3f6fa',
    borderRadius: 10,
    paddingVertical: 28,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: ACCENT,
    flexDirection: 'column',
  },
  uploadCardText: {
    color: ACCENT,
    fontWeight: '600',
    fontSize: 15,
    marginLeft: 10,
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
    opacity: 0.8,
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
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
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
    color: '#22223b',
    flex: 1,
    marginRight: 8,
  },
  orderItemActions: {
    flexDirection: 'row',
  },
  itemActionButton: {
    padding: 6,
    backgroundColor: '#f3f6fa',
    borderRadius: 6,
  },
  orderItemDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  orderItemMeta: {
    fontSize: 14,
    color: '#666',
  },
  orderItemMetaValue: {
    color: ACCENT,
    fontWeight: '600',
  },
  orderItemFooter: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
    alignItems: 'flex-end',
  },
  orderItemTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: ACCENT,
  },
  orderTotalCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  orderTotalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#22223b',
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
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
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
    color: '#22223b',
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
  toast: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 48,
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    alignItems: 'center',
  },
  toastText: {
    color: ACCENT,
    fontWeight: '700',
    fontSize: 16,
    textAlign: 'center',
  },
}); 