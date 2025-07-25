import { useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, Modal, FlatList, SafeAreaView, Alert, Animated } from "react-native";
import { createProduct } from "../api";
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from "expo-router";

const ACCENT = "#3D5AFE";
const dimensionOptions = [
  "Bag", "Bundle", "Box", "Carton", "Coils", "Dozen", "Ft", "Gross", "kg", "mtr", "Pc", "Pkt", "Set", "Not Applicable"
];

const dimensionIcons: { [key: string]: string } = {
  'Bag': '👜',
  'Bundle': '📦',
  'Box': '📦',
  'Carton': '📦',
  'Coils': '🌀',
  'Dozen': '🔢',
  'Ft': '📏',
  'Gross': '🔢',
  'kg': '⚖️',
  'mtr': '📏',
  'Pc': '🧩',
  'Pkt': '📦',
  'Set': '🧰',
  'Not Applicable': '❌',
};

export default function NewProductScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [form, setForm] = useState({
    name: '',
    stockQuantity: '',
    dimension: dimensionOptions[0],
    lowStockThreshold: '',
  });
  const [dimensionDropdownOpen, setDimensionDropdownOpen] = useState(false);
  const [dropdownAnim] = useState(new Animated.Value(0));
  const [submitAnim] = useState(new Animated.Value(1));

  const handleChange = (field: string, value: any) => {
    setForm({ ...form, [field]: value });
  };

  const openDropdown = () => {
    setDimensionDropdownOpen(true);
    Animated.timing(dropdownAnim, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  };
  const closeDropdown = () => {
    Animated.timing(dropdownAnim, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start(() => setDimensionDropdownOpen(false));
  };

  const handleSubmit = async () => {
    // Validate required fields
    const requiredFields = [
      { label: 'Product Name', value: form.name },
      { label: 'Stock Quantity', value: form.stockQuantity },
      { label: 'Dimension', value: form.dimension },
      { label: 'Low Stock Threshold Value', value: form.lowStockThreshold },
    ];
    const emptyField = requiredFields.find(f => f.value === '' || f.value === undefined || f.value === null);
    if (emptyField) {
      Alert.alert("Error", `Please fill in the ${emptyField.label}.`);
      return;
    }
    const productData = {
      name: form.name,
      stockQuantity: Number(form.stockQuantity),
      dimension: form.dimension,
      lowStockThreshold: Number(form.lowStockThreshold),
    };
    try {
      await createProduct(productData);
      Alert.alert("Success", "Product created successfully!");
      if (params.returnTo === 'orderitems') {
        router.replace({ pathname: '/orders/orderitems', params: { productName: form.name } });
      } else {
        router.back();
      }
    } catch (err) {
      Alert.alert("Error", "Failed to create product");
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f7fa' }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.screenWrap}>
          {/* Modern Nav Bar */}
          <View style={styles.headerBar}>
            <Pressable style={styles.backBtn} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={22} color={ACCENT} />
            </Pressable>
            <Text style={styles.headerTitle}>New Product</Text>
          </View>
          <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
            {/* Form Fields */}
            <View style={styles.sectionGroup}>
              <View style={styles.floatingLabelInputWrap}>
                <Text style={styles.floatingLabel}>Product Name</Text>
                <View style={styles.inputRow}>
                  <Text style={styles.inputIcon}>📦</Text>
                  <TextInput
                    style={styles.input}
                    value={form.name}
                    onChangeText={v => handleChange('name', v)}
                    placeholder="Enter product name"
                    placeholderTextColor="#b0b3b8"
                  />
                </View>
              </View>
              <View style={styles.floatingLabelInputWrap}>
                <Text style={styles.floatingLabel}>Stock Quantity</Text>
                <View style={styles.inputRow}>
                  <Text style={styles.inputIcon}>📊</Text>
                  <TextInput
                    style={styles.input}
                    value={form.stockQuantity}
                    onChangeText={v => handleChange('stockQuantity', v.replace(/[^0-9]/g, ''))}
                    keyboardType="numeric"
                    placeholder="Enter stock quantity"
                    placeholderTextColor="#b0b3b8"
                  />
                </View>
              </View>
              <View style={styles.floatingLabelInputWrap}>
                <Text style={styles.floatingLabel}>Dimension</Text>
                <Pressable style={[styles.dropdownPicker, styles.inputRow]} onPress={openDropdown}>
                  <Text style={styles.inputIcon}>📐</Text>
                  <Text style={styles.dropdownPickerText}>{form.dimension}</Text>
                  <Ionicons name="chevron-down" size={18} color={ACCENT} style={{ marginLeft: 8 }} />
                </Pressable>
                <Modal
                  visible={dimensionDropdownOpen}
                  transparent
                  animationType="none"
                  onRequestClose={closeDropdown}
                >
                  <Pressable style={styles.modalOverlay} onPress={closeDropdown} />
                  <Animated.View
                    style={[
                      styles.pickerModalSheetCard,
                      {
                        opacity: dropdownAnim,
                        transform: [
                          { translateY: dropdownAnim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }
                        ]
                      }
                    ]}
                  >
                    <FlatList
                      data={dimensionOptions}
                      keyExtractor={item => item}
                      renderItem={({ item }) => (
                        <Pressable
                          style={({ pressed }) => [styles.pickerOptionCard, form.dimension === item && styles.pickerOptionSelected, pressed && { opacity: 0.7 }]}
                          onPress={() => { handleChange('dimension', item); closeDropdown(); }}
                        >
                          <Text style={styles.pickerOptionIcon}>{dimensionIcons[item] || '📦'}</Text>
                          <Text style={[styles.pickerOptionText, form.dimension === item && styles.pickerOptionTextSelected]}>{item}</Text>
                        </Pressable>
                      )}
                    />
                  </Animated.View>
                </Modal>
              </View>
              <View style={styles.floatingLabelInputWrap}>
                <Text style={styles.floatingLabel}>Low Stock Threshold Value</Text>
                <View style={styles.inputRow}>
                  <Text style={styles.inputIcon}>⚠️</Text>
                  <TextInput
                    style={styles.input}
                    value={form.lowStockThreshold}
                    onChangeText={v => handleChange('lowStockThreshold', v.replace(/[^0-9]/g, ''))}
                    keyboardType="numeric"
                    placeholder="Enter threshold value"
                    placeholderTextColor="#b0b3b8"
                  />
                </View>
              </View>
            </View>
            {/* Submit Button */}
            <Animated.View style={{ transform: [{ scale: submitAnim }] }}>
              <Pressable
                style={({ pressed }) => [styles.orderSubmitBtn, pressed && styles.orderSubmitBtnPressed]}
                onPressIn={() => Animated.spring(submitAnim, { toValue: 0.96, useNativeDriver: true }).start()}
                onPressOut={() => Animated.spring(submitAnim, { toValue: 1, useNativeDriver: true }).start()}
                onPress={handleSubmit}
              >
                <View style={styles.btnContentRow}>
                  <Text style={styles.btnIcon}>➕</Text>
                  <Text style={styles.orderSubmitBtnText}>Submit Product</Text>
                </View>
              </Pressable>
            </Animated.View>
            <Pressable style={[styles.orderCancelBtn, styles.ghostBtn]} onPress={() => router.back()}>
              <Text style={styles.ghostBtnText}>Cancel</Text>
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
    fontFamily: Platform.OS === "ios" ? "System" : "sans-serif-medium",
  },
  container: {
    paddingVertical: 32,
    paddingHorizontal: 18,
    minHeight: 400,
    flexGrow: 1,
  },
  sectionGroup: {
    marginBottom: 18,
  },
  floatingLabelInputWrap: {
    marginBottom: 18,
  },
  floatingLabel: {
    fontSize: 13,
    color: '#b0b3b8',
    marginBottom: 8,
    fontFamily: Platform.OS === "ios" ? "System" : "sans-serif-medium",
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f6fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dde3f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
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
    borderRadius: 12,
    paddingVertical: 16,
    paddingRight: 16,
    fontSize: 16,
    backgroundColor: 'transparent',
    color: '#222',
    fontFamily: Platform.OS === "ios" ? "System" : "sans-serif",
    minHeight: 44,
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
    backgroundColor: '#f3f6fa',
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 8,
  },
  orderCancelBtnText: {
    color: ACCENT,
    fontWeight: '600',
    fontSize: 15,
  },
  orderSubmitBtnPressed: {
    opacity: 0.8,
  },
  pickerModalSheetCard: {
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
    shadowRadius: 16,
    elevation: 16,
    maxHeight: 340,
  },
  pickerOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 6,
    backgroundColor: '#f3f6fa',
  },
  pickerOptionIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  gradientBtnBg: {
    flex: 1,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    width: '100%',
    height: '100%',
  },
  btnContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  ghostBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: ACCENT,
  },
  ghostBtnText: {
    color: ACCENT,
    fontWeight: '700',
    fontSize: 15,
  },
}); 