import { Stack } from "expo-router";
import { PaperProvider } from 'react-native-paper';
import { OrderProvider } from "./orders/OrderContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import { PushNotificationProvider } from "./contexts/PushNotificationContext";
import { ToastProvider } from "./contexts/ToastContext";
import ErrorBoundary from "./components/ErrorBoundary";

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <PaperProvider>
        <ToastProvider>
          <PushNotificationProvider>
            <NotificationProvider>
              <OrderProvider>
                <Stack screenOptions={{ headerShown: false }} />
              </OrderProvider>
            </NotificationProvider>
          </PushNotificationProvider>
        </ToastProvider>
      </PaperProvider>
    </ErrorBoundary>
  );
}
