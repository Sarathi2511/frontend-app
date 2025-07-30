import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { getStaff, updateStaff } from "../api";
import { useSocket } from "../contexts/SocketContext";
import ConnectionStatus from "../components/ConnectionStatus";

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
    height: Platform.OS === 'ios' ? 44 : 56,
  },
  backBtn: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: ACCENT,
    marginLeft: 10,
    fontFamily: Platform.OS === "ios" ? "System" : "sans-serif-medium",
  },
  container: {
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    paddingHorizontal: 18,
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
  input: {
    width: '100%',
    borderWidth: 0,
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#f3f6fa',
    color: '#222',
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
    fontFamily: Platform.OS === "ios" ? "System" : "sans-serif",
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
}); 