import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

interface OrderItem {
  _id?: string;
  name: string;
  qty: number;
  price: number;
  total: number;
  productId?: string;
  index?: number;
}

interface OrderContextType {
  orderItems: OrderItem[];
  addOrderItem: (item: OrderItem) => void;
  removeOrderItem: (idx: number) => void;
  setAllOrderItems: (items: OrderItem[]) => void;
  clearOrderItems: () => void;
}

const OrderContext = createContext<OrderContextType | null>(null);

export function OrderProvider({ children }: { children: React.ReactNode }) {
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);

  const addOrderItem = useCallback((item: OrderItem) => {
    // Add unique temporary ID if not present
    const itemWithId = { 
      ...item, 
      _tempId: item._tempId || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}` 
    };
    setOrderItems(items => [...items, itemWithId]);
  }, []);

  const removeOrderItem = useCallback((idx: number) => {
    setOrderItems(items => items.filter((_, i) => i !== idx));
  }, []);

  const setAllOrderItems = useCallback((items: OrderItem[]) => {
    // Add unique temporary IDs to items that don't have them
    const itemsWithIds = items.map(item => ({
      ...item,
      _tempId: item._tempId || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }));
    setOrderItems(itemsWithIds);
  }, []);

  const clearOrderItems = useCallback(() => {
    setOrderItems([]);
  }, []);

  const value = useMemo(() => ({
    orderItems,
    addOrderItem,
    removeOrderItem,
    setAllOrderItems,
    clearOrderItems,
  }), [orderItems, addOrderItem, removeOrderItem, setAllOrderItems, clearOrderItems]);

  return (
    <OrderContext.Provider value={value}>
      {children}
    </OrderContext.Provider>
  );
}

export function useOrder() {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error('useOrder must be used within an OrderProvider');
  }
  return context;
}

// Default export to prevent Expo Router warnings
export default OrderProvider; 