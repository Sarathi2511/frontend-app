import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable, Platform, Dimensions } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { getOrders, getProducts, getExecutives, getCustomers, getBrands } from "./utils/api";
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from "react-native-chart-kit";
import { androidUI } from "./utils/androidUI";

const ACCENT = "#3D5AFE";
const screenWidth = Dimensions.get("window").width;

interface Analytics {
  totalOrders: number;
  totalInventory: number;
  totalSales: number;
  avgOrderValue: number;
}

interface TopProduct {
  name: string;
  totalSold: number;
  totalRevenue: number;
}

interface ExecutiveAnalytics {
  executiveSales: number;
  executiveOrders: number;
  salesShare: number;
  topExecProducts: TopProduct[];
}

export default function AnalyticsScreen() {
  const router = useRouter();
  const { role } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<Analytics>({
    totalOrders: 0,
    totalInventory: 0,
    totalSales: 0,
    avgOrderValue: 0
  });
  const [salesOverTime, setSalesOverTime] = useState<{ labels: string[]; data: number[] }>({ labels: [], data: [] });
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [execAnalytics, setExecAnalytics] = useState<ExecutiveAnalytics>({
    executiveSales: 0,
    executiveOrders: 0,
    salesShare: 0,
    topExecProducts: []
  });
  const [selectedTab, setSelectedTab] = useState<'general' | 'executive' | 'customers'>('general');
  const [customers, setCustomers] = useState<any[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      // Fetch orders, products, and executives in parallel
      const [ordersResponse, productsResponse, executives, customersRes, brandsRes] = await Promise.all([
        getOrders(),
        getProducts(),
        getExecutives(),
        getCustomers(),
        getBrands()
      ]);

      const ordersData = ordersResponse.data;
      const products = productsResponse.data;
      const customersList = customersRes.data || [];
      const brandsList = brandsRes.data || [];
      // executives is already filtered to role === 'Executive'

      // Calculate metrics
      const totalOrders = ordersData.length;
      const totalInventory = products.length;
      // Calculate total sales and average order value
      const totalSales = ordersData.reduce((sum: number, order: any) => {
        const orderTotal = order.orderItems.reduce((itemSum: number, item: any) => itemSum + (item.total || 0), 0);
        return sum + orderTotal;
      }, 0);
      const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

      // --- Sales Over Time (by month) ---
      const salesByMonth: { [key: string]: number } = {};
      ordersData.forEach((order: any) => {
        const date = new Date(order.date);
        const label = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; // e.g. 2024-06
        const orderTotal = order.orderItems.reduce((itemSum: number, item: any) => itemSum + (item.total || 0), 0);
        salesByMonth[label] = (salesByMonth[label] || 0) + orderTotal;
      });
      const sortedMonths = Object.keys(salesByMonth).sort();
      const salesOverTimeData = {
        labels: sortedMonths,
        data: sortedMonths.map(month => salesByMonth[month])
      };

      // --- Top Selling Products ---
      const productSales: { [name: string]: { totalSold: number; totalRevenue: number } } = {};
      ordersData.forEach((order: any) => {
        order.orderItems.forEach((item: any) => {
          if (!productSales[item.name]) {
            productSales[item.name] = { totalSold: 0, totalRevenue: 0 };
          }
          productSales[item.name].totalSold += item.qty;
          productSales[item.name].totalRevenue += item.total;
        });
      });
      const topProductsArr: TopProduct[] = Object.entries(productSales)
        .map(([name, stats]) => ({ name, ...stats }))
        .sort((a, b) => b.totalSold - a.totalSold)
        .slice(0, 5); // Top 5

      // Executive Analytics
      const executiveNames = executives.map((e: any) => e.name);
      const execOrders = ordersData.filter((order: any) => executiveNames.includes(order.createdBy));
      const executiveOrders = execOrders.length;
      const executiveSales = execOrders.reduce((sum: number, order: any) => {
        const orderTotal = order.orderItems.reduce((itemSum: number, item: any) => itemSum + (item.total || 0), 0);
        return sum + orderTotal;
      }, 0);
      const salesShare = totalSales > 0 ? (executiveSales / totalSales) * 100 : 0;
      // Top products by executive
      const execProductSales: { [name: string]: { totalSold: number; totalRevenue: number } } = {};
      execOrders.forEach((order: any) => {
        order.orderItems.forEach((item: any) => {
          if (!execProductSales[item.name]) {
            execProductSales[item.name] = { totalSold: 0, totalRevenue: 0 };
          }
          execProductSales[item.name].totalSold += item.qty;
          execProductSales[item.name].totalRevenue += item.total;
        });
      });
      const topExecProducts: TopProduct[] = Object.entries(execProductSales)
        .map(([name, stats]) => ({ name, ...stats }))
        .sort((a, b) => b.totalSold - a.totalSold)
        .slice(0, 5);

      setAnalytics({
        totalOrders,
        totalInventory,
        totalSales,
        avgOrderValue
      });
      setSalesOverTime(salesOverTimeData);
      setTopProducts(topProductsArr);
      setExecAnalytics({
        executiveSales,
        executiveOrders,
        salesShare,
        topExecProducts
      });
      setCustomers(customersList);
      setBrands(brandsList);
      setOrders(ordersData);
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerBar}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={ACCENT} />
        </Pressable>
        <Text style={styles.headerTitle}>Analytics</Text>
        <Pressable style={styles.refreshBtn} onPress={fetchAnalytics}>
          <Ionicons name="refresh" size={22} color={ACCENT} />
        </Pressable>
      </View>

      {/* Tab Switcher */}
      <View style={styles.tabBar}>
        <Pressable
          style={[styles.tabBtn, selectedTab === 'general' && styles.tabBtnActive]}
          onPress={() => setSelectedTab('general')}
        >
          <Text style={[styles.tabText, selectedTab === 'general' && styles.tabTextActive]}>General</Text>
        </Pressable>
        <Pressable
          style={[styles.tabBtn, selectedTab === 'executive' && styles.tabBtnActive]}
          onPress={() => setSelectedTab('executive')}
        >
          <Text style={[styles.tabText, selectedTab === 'executive' && styles.tabTextActive]}>Executive</Text>
        </Pressable>
        <Pressable
          style={[styles.tabBtn, selectedTab === 'customers' && styles.tabBtnActive]}
          onPress={() => setSelectedTab('customers')}
        >
          <Text style={[styles.tabText, selectedTab === 'customers' && styles.tabTextActive]}>Customer</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={ACCENT} />
        </View>
      ) : (
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {selectedTab === 'general' ? (
            <>
              {/* Metrics Grid */}
              <View style={styles.metricsGrid}>
                {/* Total Orders */}
                <View style={styles.metricCard}>
                  <View style={[styles.iconCircle, { backgroundColor: '#e3f2fd' }]}>
                    <Ionicons name="cube" size={24} color="#1976d2" />
                  </View>
                  <Text style={styles.metricValue}>{analytics.totalOrders}</Text>
                  <Text style={styles.metricLabel}>Total Orders</Text>
                </View>

                {/* Total Inventory */}
                <View style={styles.metricCard}>
                  <View style={[styles.iconCircle, { backgroundColor: '#e8f5e9' }]}>
                    <Ionicons name="file-tray-stacked" size={24} color="#2e7d32" />
                  </View>
                  <Text style={styles.metricValue}>{analytics.totalInventory}</Text>
                  <Text style={styles.metricLabel}>Total Inventory</Text>
                </View>

                {/* Total Sales */}
                <View style={styles.metricCard}>
                  <View style={[styles.iconCircle, { backgroundColor: '#f3e5f5' }]}>
                    <Ionicons name="cash" size={24} color="#7b1fa2" />
                  </View>
                  <Text style={styles.metricValue}>{formatCurrency(analytics.totalSales)}</Text>
                  <Text style={styles.metricLabel}>Total Sales</Text>
                </View>

                {/* Average Order Value */}
                <View style={styles.metricCard}>
                  <View style={[styles.iconCircle, { backgroundColor: '#fff3e0' }]}>
                    <Ionicons name="trending-up" size={24} color="#f57c00" />
                  </View>
                  <Text style={styles.metricValue}>{formatCurrency(analytics.avgOrderValue)}</Text>
                  <Text style={styles.metricLabel}>Avg. Order Value</Text>
                </View>
              </View>

              {/* Sales Over Time Chart */}
              <Text style={styles.sectionTitle}>Sales Over Time</Text>
              {salesOverTime.labels.length > 0 ? (
                <LineChart
                  data={{
                    labels: salesOverTime.labels,
                    datasets: [
                      { data: salesOverTime.data }
                    ]
                  }}
                  width={screenWidth - 32}
                  height={220}
                  yAxisLabel="₹"
                  chartConfig={{
                    backgroundColor: '#fff',
                    backgroundGradientFrom: '#fff',
                    backgroundGradientTo: '#fff',
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(61, 90, 254, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(34, 34, 59, ${opacity})`,
                    style: { borderRadius: 16 },
                    propsForDots: {
                      r: "5",
                      strokeWidth: "2",
                      stroke: ACCENT
                    }
                  }}
                  bezier
                  style={{ marginVertical: 12, borderRadius: 16 }}
                />
              ) : (
                <Text style={styles.noDataText}>No sales data available.</Text>
              )}

              {/* Top Selling Products */}
              <Text style={styles.sectionTitle}>Top Selling Products</Text>
              {topProducts.length > 0 ? (
                <View style={styles.topProductsList}>
                  {topProducts.map((prod, idx) => (
                    <View key={prod.name} style={styles.topProductRow}>
                      <Text style={styles.topProductRank}>{idx + 1}.</Text>
                      <Text style={styles.topProductName}>{prod.name}</Text>
                      <Text style={styles.topProductQty}>Qty: {prod.totalSold}</Text>
                      <Text style={styles.topProductRevenue}>{formatCurrency(prod.totalRevenue)}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.noDataText}>No product sales data available.</Text>
              )}
            </>
          ) : selectedTab === 'executive' ? (
            <>
              {/* Executive Analytics Section */}
              <View style={styles.metricsGrid}>
                <View style={styles.metricCard}>
                  <View style={[styles.iconCircle, { backgroundColor: '#e3f2fd' }]}> 
                    <Ionicons name="person" size={24} color="#1976d2" />
                  </View>
                  <Text style={styles.metricValue}>{formatCurrency(execAnalytics.executiveSales)}</Text>
                  <Text style={styles.metricLabel}>Executive Sales</Text>
                </View>
                <View style={styles.metricCard}>
                  <View style={[styles.iconCircle, { backgroundColor: '#fff3e0' }]}> 
                    <Ionicons name="document-text" size={24} color="#f57c00" />
                  </View>
                  <Text style={styles.metricValue}>{execAnalytics.executiveOrders}</Text>
                  <Text style={styles.metricLabel}>Executive Orders</Text>
                </View>
                <View style={styles.metricCard}>
                  <View style={[styles.iconCircle, { backgroundColor: '#f3e5f5' }]}> 
                    <Ionicons name="pie-chart" size={24} color="#7b1fa2" />
                  </View>
                  <Text style={styles.metricValue}>{execAnalytics.salesShare.toFixed(1)}%</Text>
                  <Text style={styles.metricLabel}>Sales Share</Text>
                </View>
              </View>
              <Text style={styles.sectionTitle}>Most Sold Products By Executive</Text>
              {execAnalytics.topExecProducts.length > 0 ? (
                <View style={styles.topProductsList}>
                  {execAnalytics.topExecProducts.map((prod, idx) => (
                    <View key={prod.name} style={styles.topProductRow}>
                      <Text style={styles.topProductRank}>{idx + 1}.</Text>
                      <Text style={styles.topProductName}>{prod.name}</Text>
                      <Text style={styles.topProductQty}>Qty: {prod.totalSold}</Text>
                      <Text style={styles.topProductRevenue}>{formatCurrency(prod.totalRevenue)}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.noDataText}>No executive product sales data available.</Text>
              )}
            </>
          ) : (
            // Customer Analytics (Simple only)
            <>
              <Text style={styles.sectionTitle}>Brand Affinity by Customer</Text>
              {customers.length === 0 ? (
                <Text style={styles.noDataText}>No customers found.</Text>
              ) : (
                <>
                  {/* Popular brands summary */}
                  {(() => {
                    const brandCounts: Record<string, number> = {};
                    brands.forEach((b) => (brandCounts[b] = 0));
                    customers.forEach((cust) => {
                      const purchased = new Set<string>();
                      orders.forEach((order: any) => {
                        if (order.customerName && cust.name && order.customerName.toLowerCase() === String(cust.name).toLowerCase()) {
                          (order.orderItems || []).forEach((item: any) => {
                            if (item.brandName) purchased.add(item.brandName);
                          });
                        }
                      });
                      purchased.forEach((b) => { if (brandCounts[b] !== undefined) brandCounts[b] += 1; });
                    });
                    const sorted = brands
                      .map((b) => ({ brand: b, count: brandCounts[b] || 0 }))
                      .sort((a, b) => b.count - a.count);
                    return (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                        <View style={{ flexDirection: 'row' }}>
                          {sorted.map(({ brand, count }) => (
                            <View key={brand} style={styles.brandChip}>
                              <Text style={styles.brandChipText}>{brand}</Text>
                              <Text style={styles.brandChipCount}>{count}</Text>
                            </View>
                          ))}
                        </View>
                      </ScrollView>
                    );
                  })()}

                  {/* Customer rows with purchased brand chips */}
                  <View style={{ gap: 8 }}>
                    {customers.map((cust) => {
                      const purchasedBrands: string[] = [];
                      const seen = new Set<string>();
                      orders.forEach((order: any) => {
                        if (order.customerName && cust.name && order.customerName.toLowerCase() === String(cust.name).toLowerCase()) {
                          (order.orderItems || []).forEach((item: any) => {
                            if (item.brandName && !seen.has(item.brandName)) {
                              seen.add(item.brandName);
                              purchasedBrands.push(item.brandName);
                            }
                          });
                        }
                      });
                      return (
                        <View key={cust._id || cust.name} style={styles.caRowSimple}>
                          <Text style={styles.caCellCustomer} numberOfLines={1}>{cust.name}</Text>
                          {purchasedBrands.length === 0 ? (
                            <Text style={styles.caNoBrandsText}>— No brand purchases yet</Text>
                          ) : (
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                              <View style={{ flexDirection: 'row' }}>
                                {purchasedBrands.map((b) => (
                                  <View key={b} style={styles.purchasedChip}>
                                    <Text style={styles.purchasedChipText}>{b}</Text>
                                  </View>
                                ))}
                              </View>
                            </ScrollView>
                          )}
                        </View>
                      );
                    })}
                  </View>
                </>
              )}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: androidUI.colors.background,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: androidUI.colors.text.primary,
    letterSpacing: 0.2,
    fontFamily: androidUI.fontFamily.medium,
  },
  refreshBtn: {
    backgroundColor: androidUI.colors.border,
    borderRadius: androidUI.borderRadius.large,
    padding: androidUI.spacing.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: androidUI.spacing.lg,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: androidUI.spacing.lg,
  },
  metricCard: {
    backgroundColor: androidUI.colors.surface,
    borderRadius: androidUI.borderRadius.large,
    padding: androidUI.spacing.xl,
    width: '47%', // Slightly less than half to account for gap
    alignItems: 'center',
    ...androidUI.cardShadow,
    marginBottom: 4,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: androidUI.spacing.md,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '700',
    color: androidUI.colors.text.primary,
    marginBottom: 4,
    fontFamily: androidUI.fontFamily.medium,
  },
  metricLabel: {
    fontSize: 14,
    color: androidUI.colors.text.secondary,
    fontWeight: '500',
    textAlign: 'center',
    fontFamily: androidUI.fontFamily.regular,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: ACCENT,
    marginTop: androidUI.spacing.xxl,
    marginBottom: 10,
    letterSpacing: 0.2,
    fontFamily: androidUI.fontFamily.medium,
  },
  noDataText: {
    color: androidUI.colors.text.disabled,
    fontSize: 14,
    fontStyle: 'italic',
    marginBottom: androidUI.spacing.md,
    textAlign: 'center',
  },
  topProductsList: {
    marginBottom: androidUI.spacing.xxl,
  },
  topProductRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: androidUI.colors.surface,
    borderRadius: androidUI.borderRadius.small,
    paddingVertical: 10,
    paddingHorizontal: androidUI.spacing.md,
    marginBottom: androidUI.spacing.sm,
    ...androidUI.shadow,
  },
  topProductRank: {
    fontWeight: '700',
    color: ACCENT,
    fontSize: 16,
    marginRight: 10,
  },
  topProductName: {
    flex: 1,
    fontSize: 15,
    color: androidUI.colors.text.primary,
    fontWeight: '600',
  },
  topProductQty: {
    fontSize: 14,
    color: androidUI.colors.text.secondary,
    marginRight: androidUI.spacing.md,
  },
  topProductRevenue: {
    fontSize: 14,
    color: '#388e3c',
    fontWeight: '700',
  },
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f6fa',
    borderBottomWidth: 1,
    borderBottomColor: androidUI.colors.border,
    marginBottom: androidUI.spacing.sm,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: androidUI.spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: {
    borderBottomColor: ACCENT,
    backgroundColor: androidUI.colors.surface,
  },
  tabText: {
    fontSize: 16,
    color: androidUI.colors.text.secondary,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  tabTextActive: {
    color: ACCENT,
  },
  // Customer Analytics table styles
  caRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eef2ff',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  caRowSimple: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: androidUI.colors.surface,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    ...androidUI.shadow,
  },
  caRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: androidUI.colors.surface,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    ...androidUI.shadow,
  },
  caCellHeader: {
    fontWeight: '700',
    color: ACCENT,
  },
  caCellCustomer: {
    width: 140,
    marginRight: 8,
    fontWeight: '600',
    color: androidUI.colors.text.primary,
  },
  brandChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f7ff',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e3eaff',
  },
  brandChipText: {
    color: ACCENT,
    fontWeight: '700',
    marginRight: 8,
  },
  brandChipCount: {
    backgroundColor: ACCENT,
    color: '#fff',
    fontWeight: '700',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    textAlign: 'center',
  },
  purchasedChip: {
    backgroundColor: '#e8f5e9',
    borderColor: '#c8e6c9',
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  purchasedChipText: {
    color: '#2e7d32',
    fontWeight: '700',
  },
  caCellBrand: {
    width: 90,
    textAlign: 'center',
    marginRight: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#f3f6fa',
    color: androidUI.colors.text.primary,
  },
  caYes: {
    backgroundColor: '#e8f5e9',
    color: '#2e7d32',
    fontWeight: '700',
  },
  caNo: {
    backgroundColor: '#ffebee',
    color: '#c62828',
    fontWeight: '700',
  },
  caNoBrandsText: {
    color: androidUI.colors.text.disabled,
    fontSize: 14,
    fontStyle: 'italic',
    marginBottom: androidUI.spacing.md,
    textAlign: 'center',
  },
}); 