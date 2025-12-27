import { useRouter, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View, Pressable, ScrollView, ActivityIndicator, Alert } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { androidUI } from "../utils/androidUI";
import { Platform } from "react-native";
import { getOrderByOrderId, getProducts, updateOrder } from "../utils/api";
import { useToast } from "../contexts/ToastContext";

const ACCENT = "#3D5AFE";
const SUCCESS = "#00C853";
const WARNING = "#FF9800";
const DANGER = "#F44336";

interface ProductInventoryInfo {
  productId: string;
  productName: string;
  requiredQuantity: number;
  availableStock: number;
}

export default function InventoryProductScreen() {
  const router = useRouter();
  const { orderId } = useLocalSearchParams();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [products, setProducts] = useState<ProductInventoryInfo[]>([]);
  const [orderStatus, setOrderStatus] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');

  useEffect(() => {
    if (orderId) {
      fetchOrderProducts();
    }
  }, [orderId]);

  const fetchOrderProducts = async () => {
    setLoading(true);
    try {
      const orderResponse = await getOrderByOrderId(orderId as string);
      const order = orderResponse.data;

      if (!order || !order.orderItems || order.orderItems.length === 0) {
        setProducts([]);
        setOrderStatus(order?.orderStatus || '');
        setCustomerName(order?.customerName || '');
        setLoading(false);
        return;
      }

      setOrderStatus(order.orderStatus || '');
      setCustomerName(order.customerName || '');

      const productsResponse = await getProducts();
      const allProducts = productsResponse.data;

      const productMap = new Map();
      allProducts.forEach((product: any) => {
        productMap.set(String(product._id), product);
      });

      const productsWithStock: ProductInventoryInfo[] = order.orderItems.map((item: any) => {
        const product = productMap.get(String(item.productId));
        return {
          productId: item.productId,
          productName: item.name || product?.name || 'Unknown Product',
          requiredQuantity: item.qty || 0,
          availableStock: product?.stockQuantity || 0,
        };
      });

      setProducts(productsWithStock);
    } catch (err: any) {
      Alert.alert("Error", err.response?.data?.message || "Failed to fetch order products");
      setProducts([]);
    }
    setLoading(false);
  };

  const handleInventoryChecked = async () => {
    if (!orderId) return;

    Alert.alert(
      "Confirm Inventory Check",
      "Are you sure you want to mark this order as Inventory Checked? Stock will be deducted and the order will proceed to Dispatch.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          style: "default",
          onPress: async () => {
            setUpdating(true);
            try {
              await updateOrder(orderId as string, { orderStatus: 'Inv Checked' });
              showToast('Order marked as Inventory Checked!', 'success');
              router.back();
            } catch (err: any) {
              const errorMessage = err.response?.data?.message || "Failed to update order status";
              showToast(errorMessage, 'error');
            } finally {
              setUpdating(false);
            }
          }
        }
      ]
    );
  };

  // Calculate summary stats
  const totalItems = products.length;
  const sufficientItems = products.filter(p => p.availableStock >= p.requiredQuantity).length;
  const insufficientItems = totalItems - sufficientItems;
  const allSufficient = insufficientItems === 0;

  const getStockStatus = (available: number, required: number) => {
    if (available >= required) return 'sufficient';
    if (available > 0) return 'partial';
    return 'empty';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sufficient': return SUCCESS;
      case 'partial': return WARNING;
      case 'empty': return DANGER;
      default: return '#666';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sufficient': return 'checkmark-circle';
      case 'partial': return 'alert-circle';
      case 'empty': return 'close-circle';
      default: return 'ellipse';
    }
  };

  return (
    <View style={styles.screenWrap}>
      {/* Header */}
      <View style={styles.headerBar}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={ACCENT} />
        </Pressable>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Stock Check</Text>
          <Text style={styles.headerSubtitle}>{orderId}</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={ACCENT} />
        </View>
      ) : products.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="cube-outline" size={64} color="#b0b3b8" style={{ marginBottom: 16 }} />
          <Text style={styles.emptyText}>No Products Found</Text>
          <Text style={styles.emptySubtext}>This order doesn't have any products</Text>
        </View>
      ) : (
        <>
          {/* Order Info Banner */}
          <View style={styles.orderBanner}>
            <View style={styles.orderBannerLeft}>
              <Ionicons name="person" size={18} color="#666" />
              <Text style={styles.orderBannerText}>{customerName}</Text>
            </View>
            <View style={[
              styles.statusBadge,
              { backgroundColor: allSufficient ? SUCCESS + '20' : DANGER + '20' }
            ]}>
              <Ionicons 
                name={allSufficient ? "checkmark-circle" : "warning"} 
                size={14} 
                color={allSufficient ? SUCCESS : DANGER} 
              />
              <Text style={[
                styles.statusBadgeText,
                { color: allSufficient ? SUCCESS : DANGER }
              ]}>
                {allSufficient ? 'All In Stock' : `${insufficientItems} Low`}
              </Text>
            </View>
          </View>

          {/* Summary Row */}
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryNumber}>{totalItems}</Text>
              <Text style={styles.summaryLabel}>Items</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryNumber, { color: SUCCESS }]}>{sufficientItems}</Text>
              <Text style={styles.summaryLabel}>Ready</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryNumber, { color: insufficientItems > 0 ? DANGER : '#999' }]}>
                {insufficientItems}
              </Text>
              <Text style={styles.summaryLabel}>Low Stock</Text>
            </View>
          </View>

          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, { flex: 2 }]}>Product</Text>
            <Text style={[styles.tableHeaderText, styles.tableHeaderCenter]}>Need</Text>
            <Text style={[styles.tableHeaderText, styles.tableHeaderCenter]}>Have</Text>
            <Text style={[styles.tableHeaderText, { width: 40, textAlign: 'center' }]}>✓</Text>
          </View>

          {/* Product List */}
          <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
            {products.map((item, index) => {
              const status = getStockStatus(item.availableStock, item.requiredQuantity);
              const statusColor = getStatusColor(status);
              const deficit = item.requiredQuantity - item.availableStock;
              
              return (
                <View 
                  key={`${item.productId}-${index}`} 
                  style={[
                    styles.tableRow,
                    index % 2 === 0 && styles.tableRowAlt,
                    status !== 'sufficient' && styles.tableRowWarning
                  ]}
                >
                  <View style={{ flex: 2, paddingRight: 8 }}>
                    <Text style={styles.productName} numberOfLines={2}>{item.productName}</Text>
                    {status !== 'sufficient' && (
                      <Text style={styles.deficitText}>
                        Short by {deficit}
                      </Text>
                    )}
                  </View>
                  <View style={styles.qtyCell}>
                    <Text style={styles.qtyText}>{item.requiredQuantity}</Text>
                  </View>
                  <View style={styles.qtyCell}>
                    <Text style={[
                      styles.qtyText,
                      { color: statusColor, fontWeight: '700' }
                    ]}>
                      {item.availableStock}
                    </Text>
                  </View>
                  <View style={styles.statusCell}>
                    <Ionicons 
                      name={getStatusIcon(status)} 
                      size={22} 
                      color={statusColor} 
                    />
                  </View>
                </View>
              );
            })}
            <View style={{ height: 100 }} />
          </ScrollView>

          {/* Bottom Action */}
          {orderStatus === 'Inv Check' && (
            <View style={styles.bottomAction}>
              {!allSufficient && (
                <View style={styles.warningBanner}>
                  <Ionicons name="warning" size={18} color={WARNING} />
                  <Text style={styles.warningText}>
                    Some items have insufficient stock. Proceeding will still deduct available quantities.
                  </Text>
                </View>
              )}
              <Pressable
                style={[
                  styles.confirmBtn,
                  allSufficient ? styles.confirmBtnSuccess : styles.confirmBtnWarning,
                  updating && styles.confirmBtnDisabled
                ]}
                onPress={handleInventoryChecked}
                disabled={updating}
              >
                {updating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons 
                      name={allSufficient ? "checkmark-done-circle" : "alert-circle"} 
                      size={24} 
                      color="#fff" 
                      style={{ marginRight: 10 }} 
                    />
                    <Text style={styles.confirmBtnText}>
                      {allSufficient ? 'Confirm & Deduct Stock' : 'Proceed Anyway'}
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screenWrap: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'ios' ? 48 : androidUI.statusBarHeight + 12,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    elevation: 2,
  },
  backBtn: {
    backgroundColor: '#f1f3f4',
    borderRadius: 12,
    padding: 10,
    marginRight: 14,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#212529',
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#6c757d',
    marginTop: 2,
  },
  loaderWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 18,
    color: '#6c757d',
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#adb5bd',
    textAlign: 'center',
  },
  orderBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  orderBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderBannerText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#495057',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
    gap: 4,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  summaryRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: '#212529',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: '#e9ecef',
    marginVertical: 4,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e9ecef',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  tableHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6c757d',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableHeaderCenter: {
    width: 60,
    textAlign: 'center',
  },
  listContainer: {
    flex: 1,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
    minHeight: 60,
  },
  tableRowAlt: {
    backgroundColor: '#fafbfc',
  },
  tableRowWarning: {
    backgroundColor: '#fff8e1',
    borderLeftWidth: 3,
    borderLeftColor: WARNING,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212529',
    lineHeight: 18,
  },
  deficitText: {
    fontSize: 11,
    color: DANGER,
    fontWeight: '600',
    marginTop: 3,
  },
  qtyCell: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057',
  },
  statusCell: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomAction: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: WARNING + '15',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    gap: 10,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    color: '#856404',
    lineHeight: 18,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
  },
  confirmBtnSuccess: {
    backgroundColor: SUCCESS,
  },
  confirmBtnWarning: {
    backgroundColor: WARNING,
  },
  confirmBtnDisabled: {
    backgroundColor: '#adb5bd',
  },
  confirmBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.3,
  },
});
