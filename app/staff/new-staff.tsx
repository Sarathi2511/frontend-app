import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Alert, Animated, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { createStaff } from "../api";

const ACCENT = "#3D5AFE";
const roleOptions = ["Admin", "Staff", "Executive"];

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
  const [showToast, setShowToast] = useState(false);
  const toastAnim = useRef(new Animated.Value(0)).current;
  const isMounted = useRef(true);

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
      Alert.alert("Error", "Please fill all fields.");
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
        setShowToast(true);
        Animated.timing(toastAnim, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }).start(() => {
          setShowToast(false);
          toastAnim.setValue(0);
          router.replace({ pathname: '/dashboard', params: { role: form.role } });
        });
      }
    } catch (err) {
      Alert.alert("Error", "Failed to create staff");
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
              <View style={styles.floatingLabelInputWrap}>
                <Text style={styles.floatingLabel}>Staff Role</Text>
                <Pressable style={[styles.dropdownPicker, styles.inputRow]} onPress={openDropdown}>
                  <Ionicons name="briefcase-outline" size={20} color={ACCENT} style={styles.inputIcon} />
                  <Text style={styles.dropdownPickerText}>{form.role}</Text>
                  <Animated.View style={{ marginLeft: 8, transform: [{ rotate: chevronRotate }] }}>
                    <Ionicons name="chevron-down" size={18} color={ACCENT} />
                  </Animated.View>
                </Pressable>
                <Modal
                  visible={roleDropdownOpen}
                  transparent
                  animationType="fade"
                  onRequestClose={closeDropdown}
                >
                  <Pressable style={styles.modalOverlay} onPress={closeDropdown} />
                  <View style={styles.pickerModalSheetCard}>
                    <FlatList
                      data={roleOptions}
                      keyExtractor={item => item}
                      renderItem={({ item }) => (
                        <Pressable
                          style={({ pressed }) => [styles.pickerOptionCard, form.role === item && styles.pickerOptionSelected, pressed && { opacity: 0.7 }]}
                          onPress={() => { handleChange('role', item); closeDropdown(); }}
                        >
                          <Text style={[styles.pickerOptionText, form.role === item && styles.pickerOptionTextSelected]}>{item}</Text>
                        </Pressable>
                      )}
                    />
                  </View>
                </Modal>
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
          <Text style={styles.toastText}>🎉 Staff Created Successfully!</Text>
        </Animated.View>
      )}
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
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#dfe4f1',
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
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 6,
    backgroundColor: '#f3f6fa',
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