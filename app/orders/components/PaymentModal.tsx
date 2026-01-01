import { useState } from "react";
import { Modal, View, Text, Pressable, ScrollView, TouchableOpacity, Animated, StyleSheet } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { androidUI } from "../../utils/androidUI";
import { ACCENT } from "./constants";

interface PaymentModalProps {
  visible: boolean;
  staffList: Array<{ _id: string; name: string }>;
  selectedMarkedBy: string | null;
  selectedReceivedBy: string | null;
  onClose: () => void;
  onSubmit: () => void;
  onMarkedByChange: (name: string) => void;
  onReceivedByChange: (name: string) => void;
}

const styles = StyleSheet.create({
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  centeredModalContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  centeredModalContent: {
    backgroundColor: androidUI.colors.surface,
    borderRadius: androidUI.borderRadius.xxlarge,
    padding: androidUI.spacing.xxl,
    width: '90%',
    maxWidth: 400,
    ...androidUI.modalShadow,
    alignSelf: 'center',
  },
  centeredModalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: androidUI.colors.text.primary,
    textAlign: 'center',
    marginBottom: 24,
    fontFamily: androidUI.fontFamily.medium,
  },
  centeredModalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: androidUI.colors.text.primary,
    marginBottom: 8,
    fontFamily: androidUI.fontFamily.medium,
  },
  centeredDropdownWrap: {
    position: 'relative',
  },
  centeredDropdownButton: {
    backgroundColor: '#f3f6fa',
    borderColor: '#e3e9f9',
    borderRadius: androidUI.borderRadius.medium,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    height: 45,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputIcon: {
    fontSize: 18,
    marginRight: 12,
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
  centeredDropdownButtonText: {
    fontSize: 15,
    color: androidUI.colors.text.primary,
    fontFamily: androidUI.fontFamily.regular,
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
  centeredModalButton: {
    backgroundColor: ACCENT,
    borderRadius: androidUI.borderRadius.large,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    ...androidUI.cardShadow,
    shadowColor: ACCENT,
  },
  centeredModalButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
    fontFamily: androidUI.fontFamily.medium,
  },
});

export default function PaymentModal({
  visible,
  staffList,
  selectedMarkedBy,
  selectedReceivedBy,
  onClose,
  onSubmit,
  onMarkedByChange,
  onReceivedByChange,
}: PaymentModalProps) {
  const [openMarkedByDropdown, setOpenMarkedByDropdown] = useState(false);
  const [openReceivedByDropdown, setOpenReceivedByDropdown] = useState(false);
  const [markedByChevronAnim] = useState(new Animated.Value(0));
  const [receivedByChevronAnim] = useState(new Animated.Value(0));

  // Dropdown animation interpolations
  const markedByChevronRotate = markedByChevronAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg']
  });
  const receivedByChevronRotate = receivedByChevronAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg']
  });

  // Dropdown open/close functions
  const openMarkedByDropdownFunc = () => {
    setOpenMarkedByDropdown(true);
    Animated.timing(markedByChevronAnim, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    }).start();
  };

  const closeMarkedByDropdown = () => {
    Animated.timing(markedByChevronAnim, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start(() => setOpenMarkedByDropdown(false));
  };

  const openReceivedByDropdownFunc = () => {
    setOpenReceivedByDropdown(true);
    Animated.timing(receivedByChevronAnim, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    }).start();
  };

  const closeReceivedByDropdown = () => {
    Animated.timing(receivedByChevronAnim, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start(() => setOpenReceivedByDropdown(false));
  };

  const handleMarkedBySelect = (name: string) => {
    onMarkedByChange(name);
    closeMarkedByDropdown();
  };

  const handleReceivedBySelect = (name: string) => {
    onReceivedByChange(name);
    closeReceivedByDropdown();
  };

  const canSubmit = selectedMarkedBy && selectedReceivedBy;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={onClose} />
      <View style={styles.centeredModalContainer}>
        <View style={styles.centeredModalContent}>
          <Text style={styles.centeredModalTitle}>Mark as Paid</Text>
          
          <Text style={styles.centeredModalLabel}>Payment Marked By</Text>
          <View style={[styles.centeredDropdownWrap, { position: 'relative', zIndex: openMarkedByDropdown ? 12000 : 10000, marginBottom: 16 }]}>
            <Pressable 
              style={[styles.centeredDropdownButton, styles.inputRow, styles.dropdownPickerEmphasis]} 
              onPress={openMarkedByDropdown ? closeMarkedByDropdown : openMarkedByDropdownFunc}
            >
              <Text style={styles.inputIcon}>👤</Text>
              <Text style={styles.centeredDropdownButtonText}>
                {selectedMarkedBy || 'Select Staff Member'}
              </Text>
              <Animated.View style={{ marginLeft: 8, transform: [{ rotate: markedByChevronRotate }] }}>
                <Ionicons name="chevron-down" size={18} color={ACCENT} />
              </Animated.View>
            </Pressable>
            {openMarkedByDropdown && (
              <>
                <Pressable 
                  style={[styles.dropdownOverlay, { zIndex: 11999 }]} 
                  onPress={closeMarkedByDropdown}
                />
                <Animated.View
                  style={[
                    styles.inlineDropdown,
                    {
                      opacity: markedByChevronAnim,
                      transform: [
                        { translateY: markedByChevronAnim.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }) }
                      ],
                      zIndex: 12000
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
                          selectedMarkedBy === item.name && styles.inlineDropdownOptionSelected,
                          pressed && { opacity: 0.7 }
                        ]}
                        onPress={() => handleMarkedBySelect(item.name)}
                      >
                        <Text style={[
                          styles.inlineDropdownOptionText,
                          selectedMarkedBy === item.name && styles.inlineDropdownOptionTextSelected
                        ]}>
                          {item.name}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </Animated.View>
              </>
            )}
          </View>

          <Text style={styles.centeredModalLabel}>Payment Received By</Text>
          <View style={[styles.centeredDropdownWrap, { position: 'relative', zIndex: openMarkedByDropdown ? 9000 : 11000, marginBottom: 24, marginTop: openMarkedByDropdown ? 120 : 0 }]}>
            <Pressable 
              style={[styles.centeredDropdownButton, styles.inputRow, styles.dropdownPickerEmphasis]} 
              onPress={openReceivedByDropdown ? closeReceivedByDropdown : openReceivedByDropdownFunc}
            >
              <Text style={styles.inputIcon}>👤</Text>
              <Text style={styles.centeredDropdownButtonText}>
                {selectedReceivedBy || 'Select Staff Member'}
              </Text>
              <Animated.View style={{ marginLeft: 8, transform: [{ rotate: receivedByChevronRotate }] }}>
                <Ionicons name="chevron-down" size={18} color={ACCENT} />
              </Animated.View>
            </Pressable>
            {openReceivedByDropdown && (
              <>
                <Pressable 
                  style={[styles.dropdownOverlay, { zIndex: 10999 }]} 
                  onPress={closeReceivedByDropdown}
                />
                <Animated.View
                  style={[
                    styles.inlineDropdown,
                    {
                      opacity: receivedByChevronAnim,
                      transform: [
                        { translateY: receivedByChevronAnim.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }) }
                      ],
                      zIndex: 11000
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
                          selectedReceivedBy === item.name && styles.inlineDropdownOptionSelected,
                          pressed && { opacity: 0.7 }
                        ]}
                        onPress={() => handleReceivedBySelect(item.name)}
                      >
                        <Text style={[
                          styles.inlineDropdownOptionText,
                          selectedReceivedBy === item.name && styles.inlineDropdownOptionTextSelected
                        ]}>
                          {item.name}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </Animated.View>
              </>
            )}
          </View>

          <Pressable
            style={[styles.centeredModalButton, { backgroundColor: canSubmit ? ACCENT : '#eee' }]}
            onPress={canSubmit ? onSubmit : undefined}
            disabled={!canSubmit}
          >
            <Text style={[styles.centeredModalButtonText, { color: canSubmit ? '#fff' : '#b0b3b8' }]}>
              Mark as Paid
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

