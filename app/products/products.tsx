import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, Platform, Pressable, StyleSheet, Text, View, ActivityIndicator, Alert, TextInput, Animated, Modal } from "react-native";
import { getProducts, deleteProduct, importProductsCSV } from "../utils/api";
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from "expo-router";
import { useSocket } from "../contexts/SocketContext";
import { useToast } from "../contexts/ToastContext";
import ConnectionStatus from "../components/ConnectionStatus";
import { androidUI } from "../utils/androidUI";
import * as DocumentPicker from 'expo-document-picker';

const ACCENT = "#3D5AFE";

export default function ProductsScreen() {
  const router = useRouter();
  const { role } = useLocalSearchParams();
  const userRole = role ? String(role) : "User";
  const canImport = ['Admin', 'Staff', 'Executive'].includes(userRole);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);
  const [animatedHeight] = useState(new Animated.Value(0));
  const { lastProductEvent } = useSocket();
  const [importing, setImporting] = useState(false);
  const { showToast } = useToast();

  // Import progress state
  const [importProgress, setImportProgress] = useState({
    visible: false,
    progress: 0,
    status: '',
    fileName: '',
    totalRows: 0,
    created: 0,
    updated: 0,
    errors: [] as any[],
    warnings: [] as any[],
    isComplete: false
  });

  const fetchAndSetProducts = async () => {
    setLoading(true);
    try {
      const response = await getProducts();
      setProducts(response.data);
    } catch (err) {
      setProducts([]);
      Alert.alert("Error", "Failed to fetch products");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAndSetProducts();
  }, []);

  // Listen for real-time product updates
  useEffect(() => {
    if (lastProductEvent) {
      fetchAndSetProducts();
    }
  }, [lastProductEvent]);

  const handleMenuToggle = (productId: string) => {
    if (expandedProductId === productId) {
      // Close the menu
      Animated.timing(animatedHeight, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start(() => setExpandedProductId(null));
    } else {
      // Open the menu
      setExpandedProductId(productId);
      Animated.timing(animatedHeight, {
        toValue: 120, // Height for two menu items (Edit and Delete)
        duration: 200,
        useNativeDriver: false,
      }).start();
    }
  };

  const handleEditProduct = (product: any) => {
    setExpandedProductId(null);
    Animated.timing(animatedHeight, {
      toValue: 0,
      duration: 150,
      useNativeDriver: false,
    }).start();
    if (product && product._id) {
      router.push({ pathname: '/products/EditProduct', params: { id: product._id, role } });
    }
  };

  const handleDeleteProduct = async (product: any) => {
    setExpandedProductId(null);
    Animated.timing(animatedHeight, {
      toValue: 0,
      duration: 150,
      useNativeDriver: false,
    }).start();
    if (!product || userRole !== 'Admin') return;
    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete "${product.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive', onPress: async () => {
            try {
              await deleteProduct(product._id);
              fetchAndSetProducts();
            } catch (err) {
              Alert.alert('Error', 'Failed to delete product');
            }
          }
        }
      ]
    );
  };

  const handleImportCSV = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ 
        type: ['text/csv', 'application/vnd.ms-excel', 'application/octet-stream'] 
      });
      
      if (result.canceled) return;
      const file = result.assets?.[0];
      if (!file) return;

      // Initialize import progress
      setImportProgress({
        visible: true,
        progress: 0,
        status: 'Starting import...',
        fileName: file.name || 'products.csv',
        totalRows: 0,
        created: 0,
        updated: 0,
        errors: [],
        warnings: [],
        isComplete: false
      });

      setImporting(true);

      // Simulate progress updates (since backend doesn't provide real-time progress)
      const progressInterval = setInterval(() => {
        setImportProgress(prev => {
          if (prev.progress < 90) {
            return {
              ...prev,
              progress: prev.progress + Math.random() * 10,
              status: prev.progress < 30 ? 'Reading CSV file...' :
                      prev.progress < 60 ? 'Processing data...' :
                      prev.progress < 90 ? 'Importing products...' : 'Finalizing...'
            };
          }
          return prev;
        });
      }, 200);

      const response = await importProductsCSV({ 
        uri: file.uri, 
        name: file.name, 
        mimeType: file.mimeType 
      });
      
      const summary = response.data;
      
      // Clear progress interval and show final results
      clearInterval(progressInterval);
      
      setImportProgress(prev => ({
        ...prev,
        progress: 100,
        status: 'Import completed!',
        totalRows: summary.totalRows || 0,
        created: summary.created || 0,
        updated: summary.updated || 0,
        errors: summary.errors || [],
        warnings: summary.warnings || [],
        isComplete: true
      }));

      await fetchAndSetProducts();
    } catch (e: any) {
      setImportProgress(prev => ({
        ...prev,
        progress: 0,
        status: 'Import failed',
        isComplete: true
      }));
      
      const errorMessage = e.message || 'Import failed. Please check your CSV file and try again.';
      showToast(errorMessage, 'error');
    } finally {
      setImporting(false);
      
      // Auto-hide progress modal after 3 seconds
      setTimeout(() => {
        setImportProgress(prev => ({ ...prev, visible: false }));
      }, 3000);
    }
  };

  const closeImportProgress = () => {
    setImportProgress(prev => ({ ...prev, visible: false }));
  };

  // Filter products by search
  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.brandName && p.brandName.toLowerCase().includes(search.toLowerCase())) ||
      (p.dimension && p.dimension.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <View style={styles.screenWrap}>
      {/* Header */}
      <View style={styles.headerBar}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={ACCENT} />
        </Pressable>
        <Text style={styles.headerTitle}>Products</Text>
        <ConnectionStatus />
      </View>
      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={ACCENT} />
        </View>
      ) : (
        <>
          {/* Search Bar */}
          <View style={styles.filterBar}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by Name or Dimension"
              value={search}
              onChangeText={setSearch}
            />
            {canImport && (
              <>
                <View style={{ height: 10 }} />
                <Pressable
                  disabled={importing}
                  style={[styles.importBtn, importing && { opacity: 0.6 }]}
                  onPress={handleImportCSV}
                >
                  <Ionicons name="cloud-upload" size={20} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.importBtnText}>
                    {importing ? 'Importing...' : 'Import CSV'}
                  </Text>
                </Pressable>
              </>
            )}
          </View>

          {/* Import Progress Modal */}
          <Modal
            visible={importProgress.visible}
            transparent={true}
            animationType="fade"
            onRequestClose={closeImportProgress}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.progressModal}>
                <View style={styles.progressHeader}>
                  <Ionicons 
                    name={importProgress.isComplete ? "checkmark-circle" : "cloud-upload"} 
                    size={32} 
                    color={importProgress.isComplete ? "#4CAF50" : ACCENT} 
                  />
                  <Text style={styles.progressTitle}>
                    {importProgress.isComplete ? 'Import Complete' : 'Importing Products'}
                  </Text>
                  <Text style={styles.fileName}>{importProgress.fileName}</Text>
                </View>

                <View style={styles.progressBarContainer}>
                  <View style={styles.progressBar}>
                    <Animated.View 
                      style={[
                        styles.progressFill, 
                        { width: `${importProgress.progress}%` }
                      ]} 
                    />
                  </View>
                  <Text style={styles.progressText}>{Math.round(importProgress.progress)}%</Text>
                </View>

                <Text style={styles.statusText}>{importProgress.status}</Text>

                {importProgress.isComplete && importProgress.totalRows > 0 && (
                  <View style={styles.resultsContainer}>
                    <View style={styles.resultRow}>
                      <Text style={styles.resultLabel}>Total Rows:</Text>
                      <Text style={styles.resultValue}>{importProgress.totalRows}</Text>
                    </View>
                    <View style={styles.resultRow}>
                      <Text style={styles.resultLabel}>Created:</Text>
                      <Text style={[styles.resultValue, { color: '#4CAF50' }]}>{importProgress.created}</Text>
                    </View>
                    <View style={styles.resultRow}>
                      <Text style={styles.resultLabel}>Updated:</Text>
                      <Text style={[styles.resultValue, { color: '#2196F3' }]}>{importProgress.updated}</Text>
                    </View>
                    {importProgress.errors.length > 0 && (
                      <View style={styles.resultRow}>
                        <Text style={styles.resultLabel}>Errors:</Text>
                        <Text style={[styles.resultValue, { color: '#F44336' }]}>{importProgress.errors.length}</Text>
                      </View>
                    )}
                  </View>
                )}

                {importProgress.warnings.length > 0 && (
                  <View style={styles.warningsContainer}>
                    <Text style={styles.warningsTitle}>Warnings:</Text>
                    <View style={styles.warningsList}>
                      {importProgress.warnings.slice(0, 3).map((warning, index) => (
                        <Text key={index} style={styles.warningText}>
                          Row {warning.row}: {warning.message}
                        </Text>
                      ))}
                      {importProgress.warnings.length > 3 && (
                        <Text style={styles.warningText}>
                          ...and {importProgress.warnings.length - 3} more warnings
                        </Text>
                      )}
                    </View>
                  </View>
                )}

                {importProgress.errors.length > 0 && (
                  <View style={styles.errorsContainer}>
                    <Text style={styles.errorsTitle}>Errors Found:</Text>
                    <View style={styles.errorsList}>
                      {importProgress.errors.slice(0, 3).map((error, index) => (
                        <Text key={index} style={styles.errorText}>
                          Row {error.row}: {error.message}
                        </Text>
                      ))}
                      {importProgress.errors.length > 3 && (
                        <Text style={styles.errorText}>
                          ...and {importProgress.errors.length - 3} more errors
                        </Text>
                      )}
                    </View>
                  </View>
                )}

                <Pressable 
                  style={styles.closeButton} 
                  onPress={closeImportProgress}
                >
                  <Text style={styles.closeButtonText}>Close</Text>
                </Pressable>
              </View>
            </View>
          </Modal>

          <FlatList
            data={filteredProducts}
            keyExtractor={(item, index) => `${item._id || 'product'}-${index}`}
            contentContainerStyle={{ paddingBottom: 32 }}
            renderItem={({ item }) => (
              <View style={styles.card}>
                {/* Top Row: Product Name and Menu Icon */}
                <View style={styles.cardRowTop}>
                  <Text style={styles.productName}>{item.name}</Text>
                  <Pressable 
                    style={[styles.menuIconBtn, expandedProductId === item._id && styles.menuIconBtnActive]} 
                    onPress={() => handleMenuToggle(item._id)}
                  >
                    <Animated.View style={{
                      transform: [{
                        rotate: expandedProductId === item._id ? '180deg' : '0deg'
                      }]
                    }}>
                      <Ionicons name="chevron-down" size={20} color={expandedProductId === item._id ? ACCENT : "#b0b3b8"} />
                    </Animated.View>
                  </Pressable>
                </View>
                {/* Middle Row: Brand, Stock and Dimension */}
                <View style={styles.cardRowMid}>
                  <View style={styles.infoGroup}>
                    <Text style={styles.infoLabel}>Brand</Text>
                    <Text style={styles.infoValue}>{item.brandName || '-'}</Text>
                  </View>
                  <View style={styles.infoGroup}>
                    <Text style={styles.infoLabel}>Stock</Text>
                    <Text style={[
                      styles.infoValue,
                      item.stockQuantity <= item.lowStockThreshold && styles.lowStockValue
                    ]}>
                      {item.stockQuantity}
                      {item.stockQuantity <= item.lowStockThreshold && (
                        <Text style={styles.lowStockIndicator}> ⚠️</Text>
                      )}
                    </Text>
                  </View>
                  <View style={styles.infoGroup}>
                    <Text style={styles.infoLabel}>Dimension</Text>
                    <Text style={styles.infoValue}>{item.dimension}</Text>
                  </View>
                </View>
                {/* Bottom Row: Threshold */}
                <View style={styles.cardRowBot}>
                  <View style={styles.infoGroup}>
                    <Text style={styles.infoLabel}>Threshold</Text>
                    <Text style={styles.infoValue}>{item.lowStockThreshold}</Text>
                  </View>
                </View>
                
                {/* Animated Action Menu */}
                {expandedProductId === item._id && (
                  <Animated.View style={[styles.actionMenu, { height: animatedHeight }]}>
                    <Pressable 
                      style={[styles.actionButton, styles.editButton]} 
                      onPress={() => handleEditProduct(item)}
                    >
                      <Ionicons name="pencil" size={18} color="#3D5AFE" />
                      <Text style={[styles.actionButtonText, styles.editButtonText]}>Edit Product</Text>
                    </Pressable>
                    
                    {userRole === 'Admin' && (
                      <Pressable 
                        style={[styles.actionButton, styles.deleteButton]} 
                        onPress={() => handleDeleteProduct(item)}
                      >
                        <Ionicons name="trash" size={18} color="#e53935" />
                        <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Delete Product</Text>
                      </Pressable>
                    )}
                  </Animated.View>
                )}
              </View>
            )}
            ListEmptyComponent={() => (
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyText}>No Products Yet</Text>
                <Pressable style={styles.createProductBtn} onPress={() => router.push({ pathname: '/products/new-product', params: { role } })}>
                  <Text style={styles.createProductBtnText}>Create Product</Text>
                </Pressable>
              </View>
            )}
          />
        </>
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
    backgroundColor: androidUI.colors.background,
  },
  card: {
    backgroundColor: androidUI.colors.surface,
    borderRadius: androidUI.borderRadius.large,
    padding: androidUI.spacing.lg,
    marginBottom: androidUI.spacing.lg,
    ...androidUI.cardShadow,
    marginHorizontal: 6,
    transitionDuration: '200ms',
  },
  cardRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  menuIconBtn: {
    padding: 8,
    borderRadius: androidUI.borderRadius.large,
    backgroundColor: '#f3f6fa',
    marginLeft: androidUI.spacing.sm,
  },
  menuIconBtnActive: {
    backgroundColor: '#e3eaff',
    transform: [{ scale: 1.05 }],
  },
  cardRowMid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardRowBot: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginTop: 2,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: ACCENT,
    marginBottom: 4,
    marginTop: 2,
    flex: 1,
    flexWrap: 'wrap',
    paddingRight: 8,
  },
  infoGroup: {
    marginRight: 24,
  },
  infoLabel: {
    fontSize: 13,
    color: androidUI.colors.text.secondary,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '700',
    color: androidUI.colors.text.primary,
  },
  actionMenu: {
    marginTop: androidUI.spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: androidUI.spacing.md,
    overflow: 'hidden',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: androidUI.spacing.md,
    borderRadius: androidUI.borderRadius.medium,
    marginBottom: 8,
    gap: 12,
  },
  editButton: {
    backgroundColor: '#f0f7ff',
    borderWidth: 1,
    borderColor: '#e3eaff',
  },
  deleteButton: {
    backgroundColor: '#fff5f5',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: androidUI.fontFamily.medium,
  },
  editButtonText: {
    color: ACCENT,
  },
  deleteButtonText: {
    color: '#e53935',
  },
  emptyWrap: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyText: {
    fontSize: 18,
    color: androidUI.colors.text.disabled,
    marginBottom: androidUI.spacing.xxl,
    fontWeight: '600',
  },
  createProductBtn: {
    backgroundColor: ACCENT,
    paddingVertical: 14,
    paddingHorizontal: 38,
    borderRadius: 30,
    ...androidUI.cardShadow,
    shadowColor: ACCENT,
    alignItems: 'center',
  },
  createProductBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.2,
    fontFamily: androidUI.fontFamily.medium,
  },
  backBtn: {
    backgroundColor: androidUI.colors.border,
    borderRadius: androidUI.borderRadius.large,
    padding: androidUI.spacing.sm,
    marginRight: androidUI.spacing.md,
  },
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
    marginBottom: 0,
    fontSize: 15,
    color: androidUI.colors.text.primary,
  },
  importBtn: {
    backgroundColor: ACCENT,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: androidUI.borderRadius.medium,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  importBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 0.2,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  progressModal: {
    backgroundColor: androidUI.colors.surface,
    borderRadius: androidUI.borderRadius.large,
    padding: androidUI.spacing.lg,
    width: '80%',
    alignItems: 'center',
    ...androidUI.cardShadow,
  },
  progressHeader: {
    alignItems: 'center',
    marginBottom: androidUI.spacing.md,
  },
  progressTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: androidUI.colors.text.primary,
    marginTop: androidUI.spacing.sm,
  },
  fileName: {
    fontSize: 14,
    color: androidUI.colors.text.secondary,
    marginTop: androidUI.spacing.xs,
  },
  progressBarContainer: {
    width: '100%',
    marginBottom: androidUI.spacing.md,
  },
  progressBar: {
    height: 10,
    backgroundColor: '#e0e0e0',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: ACCENT,
    borderRadius: 5,
  },
  progressText: {
    fontSize: 14,
    color: androidUI.colors.text.primary,
    fontWeight: '600',
  },
  statusText: {
    fontSize: 16,
    color: androidUI.colors.text.primary,
    marginBottom: androidUI.spacing.md,
    textAlign: 'center',
  },
  resultsContainer: {
    width: '100%',
    marginTop: androidUI.spacing.md,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: androidUI.spacing.xs,
  },
  resultLabel: {
    fontSize: 14,
    color: androidUI.colors.text.secondary,
  },
  resultValue: {
    fontSize: 14,
    fontWeight: '600',
    color: androidUI.colors.text.primary,
  },
  warningsContainer: {
    width: '100%',
    marginTop: androidUI.spacing.md,
  },
  warningsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF9800',
    marginBottom: androidUI.spacing.xs,
  },
  warningsList: {
    maxHeight: 100, // Limit height for scrollable warnings
    overflow: 'hidden',
  },
  warningText: {
    fontSize: 13,
    color: '#FF9800',
    marginBottom: 2,
  },
  errorsContainer: {
    width: '100%',
    marginTop: androidUI.spacing.md,
  },
  errorsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: androidUI.colors.text.primary,
    marginBottom: androidUI.spacing.xs,
  },
  errorsList: {
    maxHeight: 100, // Limit height for scrollable errors
    overflow: 'hidden',
  },
  errorText: {
    fontSize: 13,
    color: '#F44336',
    marginBottom: 2,
  },
  closeButton: {
    backgroundColor: ACCENT,
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: androidUI.borderRadius.medium,
    marginTop: androidUI.spacing.md,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  // Low Stock Styles
  lowStockValue: {
    color: '#ff9800',
    fontWeight: '700',
  },
  lowStockIndicator: {
    color: '#ff9800',
    fontSize: 12,
  },
}); 