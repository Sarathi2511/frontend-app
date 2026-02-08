import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import { Platform, Pressable, StyleSheet, Text, View, TextInput, ActivityIndicator, Alert, ScrollView } from "react-native";
import { getProducts } from "../utils/api";
import { Ionicons } from '@expo/vector-icons';
import { useToast } from "../contexts/ToastContext";
import { androidUI } from "../utils/androidUI";
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

const ACCENT = "#3D5AFE";

export default function DownloadStockScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [brandSearch, setBrandSearch] = useState('');

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await getProducts();
        setProducts(response.data);
      } catch (err) {
        Alert.alert("Error", "Failed to fetch products");
      }
      setLoading(false);
    };
    fetchProducts();
  }, []);

  // Toggle brand selection
  const toggleBrand = (brand: string) => {
    setSelectedBrands(prev =>
      prev.includes(brand) ? prev.filter(b => b !== brand) : [...prev, brand]
    );
  };

  // Count how many products match the current filter
  const matchingCount = selectedBrands.length > 0
    ? products.filter(p => selectedBrands.includes(p.brandName)).length
    : products.length;

  // Get unique brands for display
  const uniqueBrands = [...new Set(products.map(p => p.brandName).filter(Boolean))].sort((a, b) =>
    a.toLowerCase().localeCompare(b.toLowerCase())
  );

  const handleExportCSV = async () => {
    try {
      setExporting(true);

      let filteredData = selectedBrands.length > 0
        ? products.filter(p => selectedBrands.includes(p.brandName))
        : products;

      if (filteredData.length === 0) {
        showToast('No products found for selected brands', 'error');
        setExporting(false);
        return;
      }

      // Generate CSV content
      const headers = ['Name', 'Brand Name', 'Dimension', 'Stock Quantity', 'Low Stock Threshold'];
      const csvRows = [headers.join(',')];

      filteredData.forEach(product => {
        const row = [
          `"${(product.name || '').replace(/"/g, '""')}"`,
          `"${(product.brandName || '').replace(/"/g, '""')}"`,
          `"${(product.dimension || '').replace(/"/g, '""')}"`,
          product.stockQuantity || 0,
          product.lowStockThreshold || 0
        ];
        csvRows.push(row.join(','));
      });

      const csvContent = csvRows.join('\n');
      const fileName = `stock_export_${new Date().getTime()}.csv`;
      const fileUri = FileSystem.documentDirectory + fileName;

      // Write CSV file
      await FileSystem.writeAsStringAsync(fileUri, csvContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      // Share the file
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Download Product Stock CSV',
          UTI: 'public.comma-separated-values-text',
        });
        const message = selectedBrands.length > 0
          ? `Exported ${filteredData.length} products for ${selectedBrands.length} brand${selectedBrands.length > 1 ? 's' : ''}`
          : `Exported all ${filteredData.length} products`;
        showToast(message, 'success');
      } else {
        showToast('Sharing is not available on this device', 'error');
      }
    } catch (error: any) {
      console.error('Export error:', error);
      showToast('Failed to export CSV: ' + (error.message || 'Unknown error'), 'error');
    } finally {
      setExporting(false);
    }
  };

  return (
    <View style={styles.screenWrap}>
      {/* Header */}
      <View style={styles.headerBar}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={ACCENT} />
        </Pressable>
        <Text style={styles.headerTitle}>Download Stock</Text>
      </View>

      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={ACCENT} />
        </View>
      ) : (
        <View style={styles.content}>
          {/* Brand Filter */}
          <View style={styles.filterCard}>
            {/* Search Bar */}
            <View style={styles.searchRow}>
              <Ionicons name="search" size={18} color="#888" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search brands..."
                placeholderTextColor="#888"
                value={brandSearch}
                onChangeText={setBrandSearch}
              />
              {brandSearch !== '' && (
                <Pressable onPress={() => setBrandSearch('')} hitSlop={8}>
                  <Ionicons name="close-circle" size={18} color="#b0b3b8" />
                </Pressable>
              )}
            </View>

            {/* Brand List */}
            <ScrollView style={styles.brandList} showsVerticalScrollIndicator={false} nestedScrollEnabled>
              {uniqueBrands
                .filter(brand => brand.toLowerCase().includes(brandSearch.toLowerCase()))
                .map(brand => {
                  const count = products.filter(p => p.brandName === brand).length;
                  const isSelected = selectedBrands.includes(brand);
                  return (
                    <Pressable
                      key={brand}
                      style={[styles.brandOption, isSelected && styles.brandOptionSelected]}
                      onPress={() => toggleBrand(brand)}
                    >
                      <Ionicons
                        name={isSelected ? "checkbox" : "square-outline"}
                        size={20}
                        color={isSelected ? '#fff' : androidUI.colors.text.secondary}
                      />
                      <Text style={[styles.brandOptionText, isSelected && styles.brandOptionTextSelected]}>
                        {brand}
                      </Text>
                      <Text style={[styles.brandOptionCount, isSelected && styles.brandOptionCountSelected]}>
                        {count}
                      </Text>
                    </Pressable>
                  );
                })}
            </ScrollView>
          </View>

          {/* Match Count */}
          <View style={styles.matchCard}>
            <Ionicons
              name={matchingCount > 0 ? "checkmark-circle" : "alert-circle"}
              size={20}
              color={matchingCount > 0 ? "#00C853" : "#F44336"}
            />
            <Text style={[styles.matchText, matchingCount === 0 && { color: '#F44336' }]}>
              {selectedBrands.length === 0
                ? `All ${matchingCount} products will be exported`
                : matchingCount > 0
                  ? `${matchingCount} product${matchingCount !== 1 ? 's' : ''} from ${selectedBrands.length} brand${selectedBrands.length > 1 ? 's' : ''}`
                  : 'No products match this filter'}
            </Text>
          </View>

          {/* Download Button */}
          <Pressable
            style={[styles.downloadBtn, (matchingCount === 0 || exporting) && { opacity: 0.5 }]}
            onPress={handleExportCSV}
            disabled={matchingCount === 0 || exporting}
          >
            <Ionicons name="download-outline" size={22} color="#fff" style={{ marginRight: 10 }} />
            <Text style={styles.downloadBtnText}>
              {exporting ? 'Exporting...' : 'Download CSV'}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
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
  loaderWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: androidUI.spacing.lg,
  },
  filterCard: {
    backgroundColor: androidUI.colors.surface,
    borderRadius: androidUI.borderRadius.large,
    padding: androidUI.spacing.lg,
    marginBottom: androidUI.spacing.lg,
    ...androidUI.cardShadow,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f6fa',
    borderRadius: androidUI.borderRadius.small,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: androidUI.colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: androidUI.colors.text.primary,
    padding: 0,
  },
  brandList: {
    maxHeight: 400,
  },
  brandOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: androidUI.borderRadius.medium,
    marginBottom: 6,
    backgroundColor: '#f3f6fa',
    gap: 10,
  },
  brandOptionSelected: {
    backgroundColor: ACCENT,
  },
  brandOptionText: {
    flex: 1,
    fontSize: 15,
    color: androidUI.colors.text.primary,
    fontFamily: androidUI.fontFamily.regular,
  },
  brandOptionTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  brandOptionCount: {
    fontSize: 13,
    color: androidUI.colors.text.secondary,
    fontWeight: '600',
    backgroundColor: '#e3e9f9',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  brandOptionCountSelected: {
    color: ACCENT,
    backgroundColor: '#fff',
  },
  matchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: androidUI.colors.surface,
    borderRadius: androidUI.borderRadius.large,
    padding: androidUI.spacing.lg,
    marginBottom: androidUI.spacing.xl,
    ...androidUI.cardShadow,
    gap: 10,
  },
  matchText: {
    fontSize: 15,
    color: '#00C853',
    fontWeight: '600',
    fontFamily: androidUI.fontFamily.medium,
  },
  downloadBtn: {
    backgroundColor: '#00C853',
    paddingVertical: 16,
    borderRadius: androidUI.borderRadius.large,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...androidUI.cardShadow,
    shadowColor: '#00C853',
  },
  downloadBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 17,
    letterSpacing: 0.3,
    fontFamily: androidUI.fontFamily.medium,
  },
});
