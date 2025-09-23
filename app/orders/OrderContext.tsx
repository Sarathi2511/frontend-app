import React, { createContext, useContext, useState } from 'react';

const OrderContext = createContext<any>(null);

export function OrderProvider({ children }: { children: React.ReactNode }) {
  const [orderItems, setOrderItems] = useState<any[]>([]);

  const addOrderItem = (item: any) => setOrderItems(items => [...items, item]);
  const removeOrderItem = (idx: number) => setOrderItems(items => items.filter((_, i) => i !== idx));
  const setAllOrderItems = (items: any[]) => setOrderItems(items);
  const clearOrderItems = () => setOrderItems([]);

  return (
    <OrderContext.Provider value={{ orderItems, addOrderItem, removeOrderItem, setAllOrderItems, clearOrderItems }}>
      {children}
    </OrderContext.Provider>
  );
}

export function useOrder() {
  return useContext(OrderContext);
}

// Default export to prevent Expo Router warnings
export default OrderProvider; 