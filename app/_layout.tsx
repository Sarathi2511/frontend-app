import { Stack } from "expo-router";
import { OrderProvider } from "./orders/OrderContext";
import { SocketProvider } from "./contexts/SocketContext";
import { NotificationProvider } from "./contexts/NotificationContext";

export default function RootLayout() {
  return (
    <NotificationProvider>
      <SocketProvider>
        <OrderProvider>
          <Stack screenOptions={{ headerShown: false }} />
        </OrderProvider>
      </SocketProvider>
    </NotificationProvider>
  );
}
