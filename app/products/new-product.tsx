import { useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, SafeAreaView, Animated } from "react-native";
import { createProduct, getBrands } from "../utils/api";
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from "expo-router";
import { androidUI } from "../utils/androidUI";
import { useToast } from "../contexts/ToastContext";

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
    brandName: '',
    stockQuantity: '',
    dimension: dimensionOptions[0],
    lowStockThreshold: '',
  });
  const [allBrands, setAllBrands] = useState<string[]>([]);
  const [brandSuggestions, setBrandSuggestions] = useState<string[]>([]);
  const [brandFocused, setBrandFocused] = useState(false);
  const [brandDropdownOpen, setBrandDropdownOpen] = useState(false);
  const [dimensionDropdownOpen, setDimensionDropdownOpen] = useState(false);
  const [dropdownAnim] = useState(new Animated.Value(0));
  const [submitAnim] = useState(new Animated.Value(1));
  const { showToast } = useToast();

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
  const chevronRotate = dropdownAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const handleSubmit = async () => {
    // Validate required fields
    const requiredFields = [
      { label: 'Product Name', value: form.name },
      { label: 'Brand Name', value: form.brandName },
      { label: 'Stock Quantity', value: form.stockQuantity },
      { label: 'Dimension', value: form.dimension },
      { label: 'Low Stock Threshold Value', value: form.lowStockThreshold },
    ];
    const emptyField = requiredFields.find(f => f.value === '' || f.value === undefined || f.value === null);
    if (emptyField) {
      showToast(`Please fill in the ${emptyField.label}.`, 'error');
      return;
    }
    const productData = {
      name: form.name,
      brandName: form.brandName.trim(),
      stockQuantity: Number(form.stockQuantity),
      dimension: form.dimension,
      lowStockThreshold: Number(form.lowStockThreshold),
    };
    try {
      await createProduct(productData);
      showToast('Product created successfully!', 'success');
      setTimeout(() => {
        if (params.returnTo === 'orderitems') {
          router.replace({ pathname: '/orders/orderitems', params: { productName: form.name } });
        } else {
          router.back();
        }
      }, 1500);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to create product';
      showToast(errorMessage, 'error');
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
              {/* Brand Name with suggestions */}
              <View style={styles.floatingLabelInputWrap}>
                <Text style={styles.floatingLabel}>Brand Name</Text>
                <View style={{ position: 'relative' }}>
                  <View style={styles.inputRow}>
                    <Text style={styles.inputIcon}>🏷️</Text>
                    <TextInput
                      style={styles.input}
                      value={form.brandName}
                      onChangeText={(v) => {
                        handleChange('brandName', v);
                        const filtered = allBrands.filter((b: string) => b.toLowerCase().includes(v.toLowerCase()));
                        setBrandSuggestions(filtered);
                        setBrandDropdownOpen(filtered.length > 0 && brandFocused);
                      }}
                      placeholder="Enter brand name"
                      placeholderTextColor="#b0b3b8"
                      onFocus={async () => {
                        setBrandFocused(true);
                        try {
                          const res = await getBrands();
                          const all = Array.isArray(res.data) ? res.data : [];
                          setAllBrands(all);
                          setBrandSuggestions(all);
                          setBrandDropdownOpen(all.length > 0);
                        } catch {
                          setAllBrands([]);
                          setBrandSuggestions([]);
                          setBrandDropdownOpen(false);
                        }
                      }}
                      onBlur={() => setTimeout(() => { setBrandFocused(false); setBrandDropdownOpen(false); }, 150)}
                    />
                  </View>
                  {brandDropdownOpen && brandSuggestions.length > 0 && (
                    <View style={[styles.inlineDropdown, { top: '100%', left: 0, right: 0, zIndex: 12000 }]}> 
                      <ScrollView keyboardShouldPersistTaps="handled" style={styles.dropdownScrollView}>
                        {brandSuggestions.map((bn, idx) => (
                          <Pressable
                            key={bn + idx}
                            style={({ pressed }) => [
                              styles.inlineDropdownOption,
                              pressed && { opacity: 0.7 }
                            ]}
                            onPress={() => {
                              handleChange('brandName', bn);
                              setBrandDropdownOpen(false);
                            }}
                          >
                            <Text style={styles.inlineDropdownOptionText}>{bn}</Text>
                          </Pressable>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
              </View>
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
              <View style={[styles.floatingLabelInputWrap, { position: 'relative' }]}>
                <Text style={styles.floatingLabel}>Dimension</Text>
                <Pressable style={[styles.dropdownPicker, styles.inputRow]} onPress={dimensionDropdownOpen ? closeDropdown : openDropdown}>
                  <Text style={styles.inputIcon}>📐</Text>
                  <Text style={styles.dropdownPickerText}>{form.dimension}</Text>
                  <Animated.View style={{ marginLeft: 8, transform: [{ rotate: chevronRotate }] }}>
                    <Ionicons name="chevron-down" size={18} color={ACCENT} />
                  </Animated.View>
                </Pressable>
                {dimensionDropdownOpen && (
                  <>
                    <Pressable 
                      style={styles.dropdownOverlay} 
                      onPress={closeDropdown}
                    />
                    <Animated.View
                      style={[
                        styles.inlineDropdown,
                        {
                          opacity: dropdownAnim,
                          transform: [
                            { translateY: dropdownAnim.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }) }
                          ]
                        }
                      ]}
                    >
                      <ScrollView 
                        style={styles.dropdownScrollView}
                        showsVerticalScrollIndicator={false}
                        nestedScrollEnabled={true}
                      >
                        {dimensionOptions.map((item) => (
                          <Pressable
                            key={item}
                            style={({ pressed }) => [
                              styles.inlineDropdownOption,
                              form.dimension === item && styles.inlineDropdownOptionSelected,
                              pressed && { opacity: 0.7 }
                            ]}
                            onPress={() => { handleChange('dimension', item); closeDropdown(); }}
                          >
                            <Text style={styles.inlineDropdownOptionIcon}>{dimensionIcons[item] || '📦'}</Text>
                            <Text style={[
                              styles.inlineDropdownOptionText,
                              form.dimension === item && styles.inlineDropdownOptionTextSelected
                            ]}>
                              {item}
                            </Text>
                          </Pressable>
                        ))}
                      </ScrollView>
                    </Animated.View>
                  </>
                )}
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
    minHeight: 400,
    flexGrow: 1,
  },
  sectionGroup: {
    marginBottom: androidUI.spacing.lg,
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
    backgroundColor: '#f3f6fa',
    borderRadius: androidUI.borderRadius.large,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 2,
    marginBottom: androidUI.spacing.sm,
  },
  orderCancelBtnText: {
    color: ACCENT,
    fontWeight: '600',
    fontSize: 15,
  },
  orderSubmitBtnPressed: {
    ...androidUI.buttonPress,
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: androidUI.spacing.lg,
    borderRadius: androidUI.borderRadius.small,
    marginHorizontal: 4,
    marginVertical: 2,
  },
  inlineDropdownOptionSelected: {
    backgroundColor: ACCENT,
  },
  inlineDropdownOptionIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  inlineDropdownOptionText: {
    color: androidUI.colors.text.primary,
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
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