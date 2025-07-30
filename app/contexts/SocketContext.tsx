import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNotifications } from './NotificationContext';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  connect: () => Promise<boolean>;
  disconnect: () => void;
  lastProductEvent: any;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

interface SocketProviderProps {
  children: React.ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastProductEvent, setLastProductEvent] = useState<any>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { addNotification } = useNotifications();

  const connect = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        return false;
      }

      // Disconnect existing socket if any
      if (socket) {
        socket.disconnect();
      }

      // Create new socket connection
      const newSocket = io('http://192.168.29.111:5000', {
        auth: {
          token: token
        },
        transports: ['polling', 'websocket'],
        timeout: 20000,
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        forceNew: true,
      });

      // Connection event handlers
      newSocket.on('connect', () => {
        setIsConnected(true);
      });

      newSocket.on('disconnect', (reason) => {
        setIsConnected(false);
        
        // Auto-reconnect on unexpected disconnection
        if (reason === 'io server disconnect') {
          setTimeout(() => {
            connect();
          }, 2000);
        }
      });

      newSocket.on('connect_error', (error) => {
        setIsConnected(false);
      });

      // Additional event to confirm connection is working
      newSocket.on('user:connected', (data) => {
        setIsConnected(true);
      });

      // Product events
      newSocket.on('product:created', (data) => {
        setLastProductEvent({ type: 'created', data });
        addNotification({
          type: 'product_created',
          title: 'Product Created',
          message: `${data.product.name} was created by ${data.createdBy.name}`,
          timestamp: new Date()
        });
      });

      newSocket.on('product:updated', (data) => {
        setLastProductEvent({ type: 'updated', data });
        addNotification({
          type: 'product_updated',
          title: 'Product Updated',
          message: `${data.product.name} was updated by ${data.updatedBy.name}`,
          timestamp: new Date()
        });
      });

      newSocket.on('product:deleted', (data) => {
        setLastProductEvent({ type: 'deleted', data });
        addNotification({
          type: 'product_deleted',
          title: 'Product Deleted',
          message: `${data.productName} was deleted by ${data.deletedBy.name}`,
          timestamp: new Date()
        });
      });

      // User connection events (for admins)
      newSocket.on('user:connected', (data) => {
        addNotification({
          type: 'user_connected',
          title: 'User Connected',
          message: `${data.user.name} (${data.user.role}) is now online`,
          timestamp: new Date()
        });
      });

      newSocket.on('user:disconnected', (data) => {
        addNotification({
          type: 'user_disconnected',
          title: 'User Disconnected',
          message: `${data.user.name} (${data.user.role}) went offline`,
          timestamp: new Date()
        });
      });

      // Staff events (for admins only)
      newSocket.on('staff:created', (data) => {
        addNotification({
          type: 'staff_created',
          title: 'Staff Created',
          message: `${data.staff.name} (${data.staff.role}) was created by ${data.createdBy.name}`,
          timestamp: new Date()
        });
      });

      newSocket.on('staff:updated', (data) => {
        addNotification({
          type: 'staff_updated',
          title: 'Staff Updated',
          message: `${data.staff.name} (${data.staff.role}) was updated by ${data.updatedBy.name}`,
          timestamp: new Date()
        });
      });

      newSocket.on('staff:deleted', (data) => {
        addNotification({
          type: 'staff_deleted',
          title: 'Staff Deleted',
          message: `${data.staffName} was deleted by ${data.deletedBy.name}`,
          timestamp: new Date()
        });
      });

      setSocket(newSocket);
      return true;

    } catch (error) {
      return false;
    }
  };

  const disconnect = () => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
      setIsConnected(false);
    }
  };

  useEffect(() => {
    // Connect on mount
    connect();

    // Cleanup on unmount
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      disconnect();
    };
  }, []);

  const value: SocketContextType = {
    socket,
    isConnected,
    connect,
    disconnect,
    lastProductEvent,
  };



  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}; 