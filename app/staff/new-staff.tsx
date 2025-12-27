import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Animated, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { createStaff } from "../utils/api";
import ConnectionStatus from "../components/ConnectionStatus";
import { androidUI } from "../utils/androidUI";
import { useToast } from "../contexts/ToastContext";

const ACCENT = "#3D5AFE";
const roleOptions = ["Admin", "Staff", "Executive", "Inventory Manager"];

export default function NewStaffScreen() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '',
    role: roleOptions[0],
    phone: '',
    password: '',
  });
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const chevronAnim = useState(new Animated.Value(0))[0];
  const [submitAnim] = useState(new Animated.Value(1));
  const isMounted = useRef(true);
  const { showToast } = useToast();

  useEffect(() => {
    return () => { isMounted.current = false; };
  }, []);

  // Animate chevron on open/close
  const openDropdown = () => {
    setRoleDropdownOpen(true);
    Animated.timing(chevronAnim, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    }).start();
  };
  const closeDropdown = () => {
    setRoleDropdownOpen(false);
    Animated.timing(chevronAnim, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  };
  const chevronRotate = chevronAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const handleChange = (field: string, value: any) => {
    setForm({ ...form, [field]: value });
  };

  const handleSubmit = async () => {
    if (!form.name || !form.role || !form.phone || !form.password) {
      showToast('Please fill all fields.', 'error');
      return;
    }

    setCreating(true);
    try {
      await createStaff({ 
        name: form.name, 
        role: form.role, 
        phone: form.phone, 
        password: form.password 
      });
      if (isMounted.current) {
        showToast('Staff created successfully!', 'success');
        // Navigate after showing toast
        setTimeout(() => {
          router.replace('/staff');
        }, 1500);
      }
    } catch (err: any) {
      console.error('Staff creation error:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to create staff';
      showToast(errorMessage, 'error');
    }
    setCreating(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
      <LinearGradient
        colors={['#f9fbff', '#f1f5ff']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.screenWrap}>
          {/* Modern Nav Bar */}
          <View style={styles.headerBar}>
            <Pressable style={styles.backBtn} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={22} color={ACCENT} />
            </Pressable>
            <Text style={styles.headerTitle}>New Staff</Text>
            <ConnectionStatus />
          </View>
          <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
            {/* Form Fields */}
            <View style={styles.sectionGroup}>
              <View style={styles.floatingLabelInputWrap}>
                <Text style={styles.floatingLabel}>Staff Name</Text>
                <View style={styles.inputRow}>
                  <Ionicons name="person-outline" size={20} color={ACCENT} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={form.name}
                    onChangeText={v => handleChange('name', v)}
                    placeholder="Enter staff name"
                    placeholderTextColor="#b0b3b8"
                  />
                </View>
              </View>
              <View style={[styles.floatingLabelInputWrap, { position: 'relative' }]}>
                <Text style={styles.floatingLabel}>Staff Role</Text>
                <Pressable style={[styles.dropdownPicker, styles.inputRow]} onPress={roleDropdownOpen ? closeDropdown : openDropdown}>
                  <Ionicons name="briefcase-outline" size={20} color={ACCENT} style={styles.inputIcon} />
                  <Text style={styles.dropdownPickerText}>{form.role}</Text>
                  <Animated.View style={{ marginLeft: 8, transform: [{ rotate: chevronRotate }] }}>
                    <Ionicons name="chevron-down" size={18} color={ACCENT} />
                  </Animated.View>
                </Pressable>
                {roleDropdownOpen && (
                  <>
                    <Pressable 
                      style={styles.dropdownOverlay} 
                      onPress={closeDropdown}
                    />
                    <Animated.View
                      style={[
                        styles.inlineDropdown,
                        {
                          opacity: chevronAnim,
                          transform: [
                            { translateY: chevronAnim.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }) }
                          ]
                        }
                      ]}
                    >
                      {roleOptions.map((item) => (
                        <Pressable
                          key={item}
                          style={({ pressed }) => [
                            styles.inlineDropdownOption,
                            form.role === item && styles.inlineDropdownOptionSelected,
                            pressed && { opacity: 0.7 }
                          ]}
                          onPress={() => { handleChange('role', item); closeDropdown(); }}
                        >
                          <Text style={[
                            styles.inlineDropdownOptionText,
                            form.role === item && styles.inlineDropdownOptionTextSelected
                          ]}>
                            {item}
                          </Text>
                        </Pressable>
                      ))}
                    </Animated.View>
                  </>
                )}
              </View>
              <View style={styles.floatingLabelInputWrap}>
                <Text style={styles.floatingLabel}>Staff Phone No</Text>
                <View style={styles.inputRow}>
                  <Ionicons name="call-outline" size={20} color={ACCENT} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={form.phone}
                    onChangeText={v => handleChange('phone', v.replace(/[^0-9]/g, ''))}
                    keyboardType="phone-pad"
                    placeholder="Enter phone number"
                    placeholderTextColor="#b0b3b8"
                  />
                </View>
              </View>
              <View style={styles.floatingLabelInputWrap}>
                <Text style={styles.floatingLabel}>Password</Text>
                <View style={styles.inputRow}>
                  <Ionicons name="lock-closed-outline" size={20} color={ACCENT} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={form.password}
                    onChangeText={v => handleChange('password', v)}
                    placeholder="Enter password"
                    placeholderTextColor="#b0b3b8"
                    secureTextEntry
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
                disabled={creating}
              >
                <View style={styles.btnContentRow}>
                  <Text style={styles.btnIcon}>👤</Text>
                  <Text style={styles.orderSubmitBtnText}>{creating ? 'Creating...' : 'Create Staff'}</Text>
                </View>
              </Pressable>
            </Animated.View>
            <Pressable style={({ pressed }) => [styles.orderCancelBtn, styles.ghostBtn]} onPress={() => router.back()}>
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
}); 