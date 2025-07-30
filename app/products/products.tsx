import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, Modal, Platform, Pressable, StyleSheet, Text, View, ActivityIndicator, Alert, TextInput } from "react-native";
import { getProducts, deleteProduct } from "../api";
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from "expo-router";
import { useSocket } from "../contexts/SocketContext";
import ConnectionStatus from "../components/ConnectionStatus";



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
    backgroundColor: '#f5f7fa',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'ios' ? 48 : 24,
    paddingBottom: 18,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#e3e9f9',
    elevation: 4,
    zIndex: 10,
    minHeight: 68,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#22223b',
    letterSpacing: 0.2,
    fontFamily: Platform.OS === "ios" ? "System" : "sans-serif-medium",
  },
  loaderWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f7fa',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 5,
    marginHorizontal: 6,
    transitionDuration: '200ms',
  },
  cardPressed: {
    transform: [{ scale: 0.98 }],
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
    borderRadius: 16,
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
    color: '#3D5AFE',
    marginBottom: 4,
    marginTop: 2,
    flex: 1,
  },
  infoGroup: {
    marginRight: 24,
  },
  infoLabel: {
    fontSize: 13,
    color: '#6c6f7b',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#22223b',
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
  },
  menuItem: {
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 14,
    marginBottom: 6,
    backgroundColor: '#f6f9fc',
    shadowColor: 'transparent',
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#22223b',
    fontFamily: Platform.OS === "ios" ? "System" : "sans-serif-medium",
  },
  emptyWrap: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyText: {
    fontSize: 18,
    color: '#b0b3b8',
    marginBottom: 24,
    fontWeight: '600',
  },
  createProductBtn: {
    backgroundColor: ACCENT,
    paddingVertical: 14,
    paddingHorizontal: 38,
    borderRadius: 30,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 3,
    alignItems: 'center',
  },
  createProductBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.2,
    fontFamily: Platform.OS === "ios" ? "System" : "sans-serif-medium",
  },
  backBtn: {
    backgroundColor: '#e3e9f9',
    borderRadius: 18,
    padding: 8,
    marginRight: 12,
  },
  filterBar: {
    marginBottom: 16,
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  searchInput: {
    backgroundColor: '#f3f6fa',
    borderRadius: 8,
    padding: 10,
    marginBottom: 0,
    fontSize: 15,
    color: '#222',
  },
}); 