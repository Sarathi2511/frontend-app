import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, Modal, Platform, Pressable, StyleSheet, Text, View, ActivityIndicator, Alert, TextInput } from "react-native";
import { getProducts, deleteProduct } from "../api";
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from "expo-router";
import { useSocket } from "../contexts/SocketContext";
import ConnectionStatus from "../components/ConnectionStatus";
import { androidUI } from "../utils/androidUI";



const ACCENT = "#3D5AFE";

export default function ProductsScreen() {
  const router = useRouter();
  const { role } = useLocalSearchParams();
  const userRole = role ? String(role) : "User";
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuProduct, setMenuProduct] = useState<any>(null);
  const [search, setSearch] = useState("");
  const { isConnected, lastProductEvent } = useSocket();

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
      // Refresh products list when real-time events occur
      if (lastProductEvent.type === 'created' || lastProductEvent.type === 'updated' || lastProductEvent.type === 'deleted') {
        fetchAndSetProducts();
      }
    }
  }, [lastProductEvent]);

  const handleMenu = (product: any) => setMenuProduct(product);
  const closeMenu = () => setMenuProduct(null);

  const handleEditProduct = () => {
    closeMenu();
    if (menuProduct && menuProduct._id) {
      router.push({ pathname: '/products/EditProduct', params: { id: menuProduct._id, role } });
    }
  };

  const handleDeleteProduct = async () => {
    closeMenu();
    if (!menuProduct || userRole !== 'Admin') return;
    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete "${menuProduct.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive', onPress: async () => {
            try {
              await deleteProduct(menuProduct._id);
              fetchAndSetProducts();
            } catch (err) {
              Alert.alert('Error', 'Failed to delete product');
            }
          }
        }
      ]
    );
  };

  // Filter products by search
  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
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
          </View>
          <FlatList
            data={filteredProducts}
            keyExtractor={item => item._id}
            contentContainerStyle={{ paddingBottom: 32 }}
            renderItem={({ item }) => (
              <View style={styles.card}>
                {/* Top Row: Product Name and Menu Icon */}
                <View style={styles.cardRowTop}>
                  <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
                  <Pressable style={styles.menuIconBtn} onPress={() => handleMenu(item)}>
                    <Ionicons name="ellipsis-vertical" size={20} color="#b0b3b8" />
                  </Pressable>
                </View>
                {/* Middle Row: Stock and Dimension */}
                <View style={styles.cardRowMid}>
                  <View style={styles.infoGroup}>
                    <Text style={styles.infoLabel}>Stock</Text>
                    <Text style={styles.infoValue}>{item.stockQuantity}</Text>
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
      {/* Menu Modal */}
      <Modal
        visible={!!menuProduct}
        transparent
        animationType="fade"
        onRequestClose={closeMenu}
      >
        <Pressable style={styles.menuOverlay} onPress={closeMenu} />
        <View style={styles.menuSheetBottom}>
          <Pressable style={styles.menuItem} onPress={handleEditProduct}>
            <Text style={styles.menuItemText}>Edit Product</Text>
          </Pressable>
          {userRole === 'Admin' && (
            <Pressable style={[styles.menuItem, { borderTopWidth: 1, borderTopColor: '#eee', marginTop: 6 }]} onPress={handleDeleteProduct}>
              <Text style={[styles.menuItemText, { color: '#e53935', fontWeight: '700' }]}>Delete Product</Text>
            </Pressable>
          )}
        </View>
      </Modal>
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
  cardPressed: {
    ...androidUI.buttonPress,
    shadowOpacity: 0.18,
    elevation: 8,
  },
  cardRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  menuIconBtn: {
    padding: 6,
    borderRadius: androidUI.borderRadius.large,
    backgroundColor: '#f3f6fa',
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
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  menuSheetBottom: {
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
  },
  menuItem: {
    paddingVertical: androidUI.spacing.lg,
    paddingHorizontal: androidUI.spacing.sm,
    borderRadius: androidUI.borderRadius.medium,
    marginBottom: 6,
    backgroundColor: '#f6f9fc',
    shadowColor: 'transparent',
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: androidUI.colors.text.primary,
    fontFamily: androidUI.fontFamily.medium,
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
}); 