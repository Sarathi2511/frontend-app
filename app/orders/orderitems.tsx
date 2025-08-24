import { useRouter, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, Platform, Pressable, StyleSheet, Text, TextInput, View, ActivityIndicator, Alert, KeyboardAvoidingView, ScrollView, Keyboard } from "react-native";
import { getProducts } from "../api";
import { Ionicons } from '@expo/vector-icons';
import { useOrder } from "./OrderContext";
import { androidUI } from "../utils/androidUI";

const ACCENT = "#3D5AFE";

export default function OrderItemsScreen() {
  const router = useRouter();
  const { orderItems, setAllOrderItems, removeOrderItem } = useOrder();
  const [productSearch, setProductSearch] = useState("");
  const [productResults, setProductResults] = useState<any[]>([]);
  const [productLoading, setProductLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [qty, setQty] = useState("");
  const [price, setPrice] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchDisabled, setSearchDisabled] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const params = useLocalSearchParams();

  // Keyboard event listeners
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardVisible(true);
    });
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
    });

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, []);

  // If coming back from new-product, auto-search and select
  useEffect(() => {
    if (params.productName) {
      const fetchProduct = async () => {
        try {
          const response = await getProducts();
          const found = response.data.find((p: any) => p.name.toLowerCase() === String(params.productName).toLowerCase());
          if (found) {
            setSelectedProduct(found);
            setSearchDisabled(true);
            setProductSearch("");
            setProductResults([]);
          }
        } catch (err) {
          Alert.alert("Error", "Failed to fetch product");
        }
      };
      fetchProduct();
    }
  }, [params.productName]);

  // Fetch products for search
  const fetchAndSetProducts = async (search: string) => {
    setProductLoading(true);
    try {
      const response = await getProducts();
      let products = response.data;
      if (search.trim()) {
        products = products.filter((p: any) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          (p.dimension && p.dimension.toLowerCase().includes(search.toLowerCase()))
        );
      } else {
        products = [];
      }
      setProductResults(products);
    } catch (err) {
      Alert.alert("Error", "Failed to fetch products");
      setProductResults([]);
    }
    setProductLoading(false);
  };

  // Handle product search
  const handleProductSearch = (text: string) => {
    setProductSearch(text);
    fetchAndSetProducts(text);
    setSelectedProduct(null);
    setQty("");
    setPrice("");
  };

  // Add product to order items
  const handleAddProduct = () => {
    if (!selectedProduct || !qty || !price) {
      alert("Select a product, enter QTY and Price.");
      return;
    }
    setAllOrderItems([
      ...orderItems,
      {
        productId: selectedProduct._id,
        name: selectedProduct.name,
        dimension: selectedProduct.dimension,
        qty: Number(qty),
        price: Number(price),
        total: Number(qty) * Number(price),
      },
    ]);
    setSelectedProduct(null);
    setQty("");
    setPrice("");
    setSearchDisabled(false); // Re-enable search after adding
    setProductSearch("");
    setProductResults([]);
  };

  // Remove product from order items
  const handleRemoveOrderItem = (idx: number) => {
    removeOrderItem(idx);
  };

  // When a product is selected, clear the search bar, results, and disable search
  const handleSelectProduct = (item: any) => {
    setSelectedProduct(item);
    setProductSearch("");
    setProductResults([]);
    setSearchDisabled(true);
  };

  // Total order amount
  const orderTotal = orderItems.reduce((sum: number, item: any) => sum + item.total, 0);

  // Return items to previous screen
  const handleReturn = () => {
    router.back();
  };

     return (
     <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
       <View style={styles.screenWrap}>
         <View style={styles.headerBar}>
           <Pressable style={styles.backBtn} onPress={() => router.back()}>
             <Ionicons name="arrow-back" size={22} color={ACCENT} />
           </Pressable>
           <Text style={styles.headerTitle}>Add Order Items</Text>
         </View>
         <ScrollView 
           contentContainerStyle={styles.container}
           keyboardShouldPersistTaps="handled"
           showsVerticalScrollIndicator={false}
         >
           {/* Search/Add Product */}
           <Text style={styles.floatingLabel}>Search Product</Text>
           <TextInput
             style={[
               styles.input,
               styles.productSearchInput,
               searchFocused && styles.productSearchInputFocused
             ]}
             placeholder="Search products by name or dimension"
             value={productSearch}
             onChangeText={handleProductSearch}
             onFocus={() => setSearchFocused(true)}
             onBlur={() => setSearchFocused(false)}
             autoFocus
             editable={!searchDisabled}
           />
           {!selectedProduct && productSearch.trim().length > 0 && productResults.length === 0 && (
             <View style={{ alignItems: 'center', marginTop: 24 }}>
               <Text style={{ color: '#b0b3b8', marginBottom: 12 }}>No products found.</Text>
               <Pressable style={styles.createProductBtn} onPress={() => router.push({ pathname: '/products/new-product', params: { returnTo: 'orderitems', productName: productSearch } })}>
                 <Text style={styles.createProductBtnText}>Create Product</Text>
               </Pressable>
             </View>
           )}
           {!selectedProduct && productSearch.trim().length > 0 && productResults.length > 0 && (
             <View style={{ 
               marginBottom: 12, 
               backgroundColor: '#fff', 
               borderRadius: 10, 
               borderWidth: 1, 
               borderColor: '#e0e0e0', 
               overflow: 'hidden',
               zIndex: 1000,
               elevation: 5,
               maxHeight: keyboardVisible ? 200 : 250,
               position: 'relative'
             }}>
               <ScrollView
                 style={{ maxHeight: keyboardVisible ? 180 : 230 }}
                 showsVerticalScrollIndicator={true}
                 nestedScrollEnabled={true}
                 keyboardShouldPersistTaps="handled"
                 bounces={false}
                 contentContainerStyle={{ flexGrow: 1 }}
               >
                 {productResults.map((item: any) => (
                   <Pressable
                     key={item._id}
                     style={({ pressed }) => [styles.productResultRow, selectedProduct && selectedProduct._id === item._id && styles.productResultRowSelected, pressed && { opacity: 0.7 }]}
                     onPress={() => handleSelectProduct(item)}
                   >
                     <Text style={styles.productResultName}>{item.name}</Text>
                     <Text style={styles.productResultDim}>{item.dimension}</Text>
                   </Pressable>
                 ))}
               </ScrollView>
             </View>
           )}
           {selectedProduct && (
             <View style={styles.selectedProductFormWrap}>
               <Text style={styles.floatingLabel}>Product</Text>
               <View style={styles.selectedProductNameBox}>
                 <Text style={styles.selectedProductName}>{selectedProduct.name}</Text>
               </View>
               <View style={styles.formFieldSpacing} />
               <Text style={styles.floatingLabel}>QTY</Text>
               <TextInput
                 style={styles.input}
                 value={qty}
                 onChangeText={setQty}
                 keyboardType="numeric"
                 placeholder="Enter quantity"
                 placeholderTextColor="#b0b3b8"
               />
               <View style={styles.formFieldSpacing} />
               <Text style={styles.floatingLabel}>Price</Text>
               <TextInput
                 style={styles.input}
                 value={price}
                 onChangeText={setPrice}
                 keyboardType="numeric"
                 placeholder="Enter price"
                 placeholderTextColor="#b0b3b8"
               />
               <View style={styles.formFieldSpacing} />
               <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, marginBottom: 10 }}>
                 <Text style={{ fontWeight: '600', color: ACCENT, fontSize: 15 }}>Total: {qty && price ? Number(qty) * Number(price) : 0}</Text>
               </View>
               <Pressable style={styles.addProductBtn} onPress={handleAddProduct}>
                 <Ionicons name="add-circle-outline" size={20} color={ACCENT} style={{ marginRight: 6 }} />
                 <Text style={styles.addProductBtnText}>Add to Order</Text>
               </Pressable>
               <Pressable style={[styles.addProductBtn, { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e53935', marginTop: 8 }]} onPress={() => { setSelectedProduct(null); setQty(""); setPrice(""); setSearchDisabled(false); }}>
                 <Ionicons name="close-circle-outline" size={20} color="#e53935" style={{ marginRight: 6 }} />
                 <Text style={[styles.addProductBtnText, { color: '#e53935' }]}>Cancel</Text>
               </Pressable>
             </View>
           )}
           {/* List of Order Items */}
           {orderItems.length > 0 && (
             <View style={{ marginBottom: 18 }}>
               {orderItems.map((item: any, idx: number) => (
                 <View key={idx} style={styles.orderItemCard}>
                   <View style={styles.orderItemCardTopRow}>
                     <Text style={styles.orderItemName} numberOfLines={1}>{item.name}</Text>
                     <Pressable style={styles.removeOrderItemBtn} onPress={() => handleRemoveOrderItem(idx)}>
                       <Ionicons name="close-circle" size={20} color="#e53935" />
                     </Pressable>
                   </View>
                   <View style={styles.orderItemCardMidRow}>
                     <Text style={styles.orderItemMeta}>Qty: <Text style={styles.orderItemMetaValue}>{item.qty}</Text></Text>
                     <Text style={styles.orderItemMeta}>| Price: <Text style={styles.orderItemMetaValue}>₹{item.price}</Text></Text>
                   </View>
                   <View style={styles.orderItemCardBotRow}>
                     <Text style={styles.orderItemTotal}>Total: ₹{item.total}</Text>
                   </View>
                 </View>
               ))}
               <View style={styles.orderItemsFooterCard}>
                 <Text style={styles.orderItemsFooterTotalLabel}>Total</Text>
                 <Text style={styles.orderItemsFooterTotalValue}>₹{orderTotal}</Text>
               </View>
             </View>
           )}
           {orderItems.length > 0 && (
             <Pressable style={styles.addProductBtn} onPress={handleReturn}>
               <Ionicons name="checkmark-circle-outline" size={20} color={ACCENT} style={{ marginRight: 6 }} />
               <Text style={styles.addProductBtnText}>Done</Text>
             </Pressable>
           )}
         </ScrollView>
      </View>
    </KeyboardAvoidingView>
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
  productSearchInput: {
    borderBottomWidth: 2,
    borderBottomColor: '#e0e0e0',
    paddingBottom: 8,
  },
  productSearchInputFocused: {
    borderBottomColor: ACCENT,
  },
  productResultRow: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  productResultRowSelected: {
    backgroundColor: '#f3f6fa',
  },
  productResultName: {
    fontSize: 16,
    fontWeight: '500',
    color: androidUI.colors.text.primary,
  },
  productResultDim: {
    fontSize: 13,
    color: androidUI.colors.text.disabled,
    marginTop: 2,
  },
  createProductBtn: {
    backgroundColor: ACCENT,
    borderRadius: androidUI.borderRadius.small,
    paddingVertical: androidUI.spacing.md,
    paddingHorizontal: androidUI.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createProductBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  orderItemsTable: {
    backgroundColor: androidUI.colors.surface,
    borderRadius: androidUI.borderRadius.small,
    padding: androidUI.spacing.lg,
    marginBottom: androidUI.spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  orderItemsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  orderItemsCol: {
    fontSize: 14,
    fontWeight: '600',
    color: '#22223b',
    flex: 1,
  },
  orderItemsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  orderItemsFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  removeOrderItemBtn: {
    padding: 5,
  },
  addProductBtn: {
    backgroundColor: ACCENT,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 12,
  },
  addProductBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
    marginLeft: 8,
  },
  orderItemCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    marginBottom: 18,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  orderItemCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderItemName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#22223b',
    flex: 1,
    marginRight: 10,
  },
  orderItemCardMidRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  orderItemMeta: {
    fontSize: 14,
    color: '#b0b3b8',
  },
  orderItemMetaValue: {
    fontWeight: '600',
    color: '#22223b',
  },
  orderItemCardBotRow: {
    marginTop: 8,
  },
  orderItemTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: ACCENT,
  },
  orderItemsFooterCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  orderItemsFooterTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#22223b',
  },
  orderItemsFooterTotalValue: {
    fontSize: 16,
    fontWeight: '600',
    color: ACCENT,
  },
  selectedProductNameBox: {
    backgroundColor: '#e3e9f9',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  selectedProductName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#22223b',
  },
  selectedProductFormWrap: {
    marginTop: 10,
    marginBottom: 10,
  },
  formFieldSpacing: {
    height: 10,
  },
}); 