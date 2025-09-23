import { Stack } from "expo-router";
import { PaperProvider } from 'react-native-paper';
import { OrderProvider } from "./orders/OrderContext";
import { SocketProvider } from "./contexts/SocketContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import { ToastProvider } from "./contexts/ToastContext";
import ErrorBoundary from "./components/ErrorBoundary";

export default function RootLayout() {
  return (
    <ErrorBoundary>
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
    </ErrorBoundary>
  );
}
