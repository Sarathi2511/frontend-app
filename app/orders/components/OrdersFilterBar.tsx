import { ScrollView, StyleSheet, Text, TextInput, View, Pressable } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { androidUI } from "../../utils/androidUI";
import { ACCENT, statusOptions } from "./constants";

interface OrdersFilterBarProps {
  search: string;
  statusFilter: string | null;
  orderCounts: { [key: string]: number };
  totalOrders: number;
  onSearchChange: (text: string) => void;
  onStatusFilterChange: (status: string | null) => void;
}

const styles = StyleSheet.create({
  filterBar: {
    marginBottom: androidUI.spacing.lg,
    padding: 10,
    backgroundColor: androidUI.colors.surface,
    borderRadius: androidUI.borderRadius.medium,
    ...androidUI.shadow,
  },
  searchInput: {
    backgroundColor: '#f3f6fa',
    borderRadius: androidUI.borderRadius.small,
    padding: 10,
    marginBottom: androidUI.spacing.sm,
    fontSize: 15,
    color: androidUI.colors.text.primary,
  },
  chipScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 2,
    paddingHorizontal: 2,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: ACCENT,
    borderRadius: 22,
    paddingVertical: 7,
    paddingHorizontal: 16,
    marginRight: 8,
    backgroundColor: '#fff',
    marginBottom: 4,
    elevation: 0,
  },
  chipActive: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
    elevation: 2,
  },
  chipText: {
    color: ACCENT,
    fontWeight: '600',
    fontSize: 15,
  },
  chipTextActive: {
    color: '#fff',
  },
  chipIcon: {
    marginRight: 7,
  },
  chipCount: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
    minWidth: 20,
    alignItems: 'center',
  },
  chipCountText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  chipCountTextInactive: {
    color: ACCENT,
    fontSize: 12,
    fontWeight: '700',
  },
});

export default function OrdersFilterBar({
  search,
  statusFilter,
  orderCounts,
  totalOrders,
  onSearchChange,
  onStatusFilterChange,
}: OrdersFilterBarProps) {
  return (
    <View style={styles.filterBar}>
      <TextInput
        style={styles.searchInput}
        placeholder="Search by Name, ID, or Route"
        placeholderTextColor="#666"
        value={search}
        onChangeText={onSearchChange}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
        {/* All Orders Chip */}
        <Pressable
          style={[styles.chip, statusFilter === null && styles.chipActive]}
          onPress={() => onStatusFilterChange(null)}
        >
          <Ionicons name="list" size={16} color={statusFilter === null ? '#fff' : ACCENT} style={styles.chipIcon} />
          <Text style={[styles.chipText, statusFilter === null && styles.chipTextActive]}>All</Text>
          <View style={styles.chipCount}>
            <Text style={[styles.chipCountText, statusFilter !== null && styles.chipCountTextInactive]}>
              {totalOrders}
            </Text>
          </View>
        </Pressable>
        {/* Status Filter Chips */}
        {statusOptions.map(opt => (
          <Pressable
            key={opt}
            style={[styles.chip, statusFilter === opt && styles.chipActive]}
            onPress={() => onStatusFilterChange(statusFilter === opt ? null : opt)}
          >
            <Ionicons
              name={
                opt === 'Pending' ? 'time-outline' :
                opt === 'Invoice' ? 'document-text-outline' :
                opt === 'Dispatched' ? 'send-outline' :
                opt === 'DC' ? 'cube-outline' : 'ellipse-outline'
              }
              size={16}
              color={statusFilter === opt ? '#fff' : ACCENT}
              style={styles.chipIcon}
            />
            <Text style={[styles.chipText, statusFilter === opt && styles.chipTextActive]}>{opt}</Text>
            <View style={styles.chipCount}>
              <Text style={[styles.chipCountText, statusFilter !== opt && styles.chipCountTextInactive]}>
                {orderCounts[opt] || 0}
              </Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

