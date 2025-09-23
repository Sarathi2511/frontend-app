import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { getStaff, updateStaff } from "../utils/api";
import { useSocket } from "../contexts/SocketContext";
import ConnectionStatus from "../components/ConnectionStatus";
import { androidUI } from "../utils/androidUI";

const ACCENT = "#3D5AFE";
const roleOptions = ["Admin", "Staff", "Executive"];

export default function EditStaffScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { isConnected } = useSocket();
  const [form, setForm] = useState({
    name: '',
    role: roleOptions[0],
    phone: '',
    password: '',
  });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);

  useEffect(() => {
    if (id) {
      const fetchStaffMember = async () => {
        try {
          const response = await getStaff();
          const staffMember = response.data.find((s: any) => s._id === id);
          if (staffMember) {
            setForm({
              name: staffMember.name || '',
              role: staffMember.role || roleOptions[0],
              phone: staffMember.phone || '',
              password: staffMember.password || '',
            });
          }
        } catch (err) {
          Alert.alert("Error", "Failed to fetch staff details");
        }
        setLoading(false);
      };
      fetchStaffMember();
    }
  }, [id]);

  const handleChange = (field: string, value: any) => {
    setForm({ ...form, [field]: value });
  };

  const handleUpdate = async () => {
    setUpdating(true);
    if (!form.name || !form.role || !form.phone || !form.password) {
      Alert.alert("Error", "Please fill all fields.");
      setUpdating(false);
      return;
    }
    const staffData = {
      name: form.name,
      role: form.role,
      phone: form.phone,
      password: form.password,
    };
    try {
      await updateStaff(id as string, staffData);
      Alert.alert("Success", "Staff updated successfully!");
      router.back();
    } catch (err) {
      Alert.alert("Error", "Failed to update staff");
    }
    setUpdating(false);
  };

  if (loading) return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f7fa' }}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={ACCENT} />
      </View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f7fa' }}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <View style={styles.screenWrap}>
          {/* Modern Nav Bar */}
          <View style={styles.headerBar}>
            <Pressable style={styles.backBtn} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={22} color={ACCENT} />
            </Pressable>
            <Text style={styles.headerTitle}>Edit Staff</Text>
            <ConnectionStatus />
          </View>
          <ScrollView 
            contentContainerStyle={styles.container} 
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {/* Form Fields */}
            <View style={styles.sectionGroup}>
              <View style={styles.floatingLabelInputWrap}>
                <Text style={styles.floatingLabel}>Staff Name</Text>
                <TextInput
                  style={styles.input}
                  value={form.name}
                  onChangeText={v => handleChange('name', v)}
                  placeholder="Enter staff name"
                  placeholderTextColor="#b0b3b8"
                />
              </View>
              <View style={styles.floatingLabelInputWrap}>
                <Text style={styles.floatingLabel}>Staff Role</Text>
                <Pressable style={styles.dropdownPicker} onPress={() => setRoleDropdownOpen(true)}>
                  <Text style={styles.dropdownPickerText}>{form.role}</Text>
                  <Ionicons name="chevron-down" size={18} color={ACCENT} style={{ marginLeft: 8 }} />
                </Pressable>
                <Modal
                  visible={roleDropdownOpen}
                  transparent
                  animationType="fade"
                  onRequestClose={() => setRoleDropdownOpen(false)}
                >
                  <Pressable style={styles.modalOverlay} onPress={() => setRoleDropdownOpen(false)} />
                  <View style={styles.pickerModalSheet}>
                    <FlatList
                      data={roleOptions}
                      keyExtractor={item => item}
                      renderItem={({ item }) => (
                        <Pressable
                          style={({ pressed }) => [styles.pickerOption, form.role === item && styles.pickerOptionSelected, pressed && { opacity: 0.7 }]}
                          onPress={() => { handleChange('role', item); setRoleDropdownOpen(false); }}
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
                <TextInput
                  style={styles.input}
                  value={form.phone}
                  onChangeText={v => handleChange('phone', v.replace(/[^0-9]/g, ''))}
                  keyboardType="phone-pad"
                  placeholder="Enter phone number"
                  placeholderTextColor="#b0b3b8"
                />
              </View>
              <View style={styles.floatingLabelInputWrap}>
                <Text style={styles.floatingLabel}>Password</Text>
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
            {/* Update Button */}
            <Pressable style={({ pressed }) => [styles.orderSubmitBtn, pressed && styles.orderSubmitBtnPressed]} onPress={handleUpdate} disabled={updating}>
              <Text style={styles.orderSubmitBtnText}>{updating ? 'Updating...' : 'Update Staff'}</Text>
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
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    paddingHorizontal: androidUI.spacing.lg,
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
  input: {
    width: '100%',
    borderWidth: 0,
    borderRadius: androidUI.borderRadius.medium,
    padding: androidUI.spacing.lg,
    fontSize: 16,
    backgroundColor: '#f3f6fa',
    color: androidUI.colors.text.primary,
    ...androidUI.shadow,
    fontFamily: androidUI.fontFamily.regular,
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
}); 