import { Stack } from "expo-router";
import { OrderProvider } from "./orders/OrderContext";

export default function RootLayout() {
  return (
    <OrderProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </OrderProvider>
  );
}
