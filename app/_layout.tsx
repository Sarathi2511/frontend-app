import { Stack } from "expo-router";
import { PaperProvider } from 'react-native-paper';
import { OrderProvider } from "./orders/OrderContext";
import { SocketProvider } from "./contexts/SocketContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import { ToastProvider } from "./contexts/ToastContext";

export default function RootLayout() {
  return (
    <PaperProvider>
      <ToastProvider>
        <NotificationProvider>
          <SocketProvider>
            <OrderProvider>
              <Stack screenOptions={{ headerShown: false }} />
            </OrderProvider>
          </SocketProvider>
        </NotificationProvider>
      </ToastProvider>
    </PaperProvider>
  );
}
