import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { Alert } from 'react-native';

// Two URLS for development and production
// const BASE_URL = 'http://192.168.29.111:5000/api';
const BASE_URL = 'https://backend-app-1qf1.onrender.com/api';

const api = axios.create({
  baseURL: BASE_URL,
});

// Add a request interceptor to include the token
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('Request Error:', error);
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle unauthorized responses
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // If token expired or unauthorized, clear auth and bubble up
    if (error?.response?.status === 401) {
      console.log('Token expired or unauthorized - clearing auth data and redirecting to login');
      
      // Show user-friendly alert before redirecting
      Alert.alert(
        'Session Expired',
        'Your session has expired. Please login again to continue.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Clear auth data
              AsyncStorage.removeItem('token');
              AsyncStorage.removeItem('userRole');
              AsyncStorage.removeItem('userId');
              AsyncStorage.removeItem('userName');
              
              // Force redirect to login with a small delay to ensure cleanup
              setTimeout(() => {
                try {
                  router.replace('/login');
                } catch (redirectError) {
                  console.error('Failed to redirect to login:', redirectError);
                }
              }, 100);
            }
          }
        ],
        { cancelable: false }
      );
    }
    console.error('Response Error:', error);
    return Promise.reject(error);
  }
);

export const login = async (phone: string, password: string) => {
  try {
    const response = await api.post('/login', { phone, password });
    if (response.data.token) {
      await AsyncStorage.setItem('token', response.data.token);
      await AsyncStorage.setItem('userRole', response.data.role);
      if (response.data.userId) await AsyncStorage.setItem('userId', response.data.userId);
    }
    return response.data;
  } catch (error: any) {
    // Enhanced error handling with specific messages
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const message = error.response.data?.message || 'Login failed';
      
      if (status === 401) {
        throw new Error('Invalid phone number or password');
      } else if (status === 400) {
        throw new Error('Please check your input and try again');
      } else if (status === 500) {
        throw new Error('Server error. Please try again later');
      } else {
        throw new Error(message);
      }
    } else if (error.request) {
      // Network error - no response received
      throw new Error('No internet connection. Please check your network and try again');
    } else {
      // Other errors
      throw new Error('Login failed. Please try again');
    }
  }
};

export const logout = async () => {
  await AsyncStorage.removeItem('token');
  await AsyncStorage.removeItem('userRole');
  await AsyncStorage.removeItem('userId');
  await AsyncStorage.removeItem('userName');
};

// Helper function to get current user role
export const getCurrentUserRole = async () => {
  return await AsyncStorage.getItem('userRole');
};

// Orders API
export const getOrders = () => api.get('/orders');

export const getOrderByOrderId = (orderId: string) => {
  console.log('Getting order by orderId:', orderId);
  return api.get(`/orders/by-order-id/${orderId}`);
};

export const createOrder = (data: any) => {
  console.log('Creating order with data:', data);
  return api.post('/orders', data);
};

export const updateOrder = async (orderId: string, data: any) => {
  console.log('Updating order with data:', { orderId, data });
  try {
    const response = await api.put(`/orders/by-order-id/${orderId}`, data);
    return response;
  } catch (error: any) {
    console.error('Update Order Error:', {
      orderId,
      data,
      error: error.response?.data || error.message
    });
    throw error;
  }
};

export const deleteOrder = (orderId: string) => api.delete(`/orders/by-order-id/${orderId}`);

export const completePartialOrder = (orderId: string) => api.post(`/orders/complete-partial/${orderId}`);

export const getOrdersAssignedTo = (userId: string) => api.get(`/orders/assigned/${userId}`);

// Stock management API functions
export const cancelOrder = (orderId: string, reason?: string) => 
  api.post(`/orders/cancel/${orderId}`, { reason });

export const getOrderStockStatus = (orderId: string) => 
  api.get(`/orders/stock-status/${orderId}`);

export const getCurrentUserId = async () => {
  return await AsyncStorage.getItem('userId');
};

// Products API
export const getProducts = () => api.get('/products');
export const createProduct = (data: any) => api.post('/products', data);
export const updateProduct = (id: string, data: any) => api.put(`/products/${id}`, data);
export const updateProductStock = (id: string, stockToAdd: number) => api.patch(`/products/${id}/stock`, { stockToAdd });
export const deleteProduct = (id: string) => api.delete(`/products/${id}`);
export const getBrands = () => api.get('/products/brands');

export const importProductsCSV = async (file: { uri: string; name?: string; mimeType?: string }) => {
  const form = new FormData();
  // React Native FormData requires fields as { uri, name, type }
  form.append('file', {
    // @ts-ignore: React Native's FormData file type
    uri: file.uri,
    name: file.name || 'products.csv',
    type: file.mimeType || 'text/csv',
  } as any);
  return api.post('/products/import', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

// Staff API
export const getStaff = () => api.get('/staff');
export const createStaff = (data: any) => api.post('/staff', data);
export const updateStaff = (id: string, data: any) => api.put(`/staff/${id}`, data);
export const deleteStaff = (id: string) => api.delete(`/staff/${id}`);

export const getExecutives = () => api.get('/staff').then(res => res.data.filter((u: any) => u.role === 'Executive'));

export const getCustomerNames = () => api.get('/orders/customers');
export const getOrderRoutes = () => api.get('/orders/routes'); 
export const getCustomers = () => api.get('/customers');
export const getCustomerByName = (name: string) => api.get(`/customers/by-name/${encodeURIComponent(name)}`);

// Dispatch confirmation API functions
export const getDispatchConfirmation = (orderId: string) => 
  api.get(`/orders/dispatch-confirmation/${orderId}`);

export const dispatchOrder = (orderId: string, data: any) => 
  api.put(`/orders/by-order-id/${orderId}`, data);

// Token validation (lightweight check used on app start/resume)
export const validateToken = async () => {
  try {
    const res = await api.get('/login/validate');
    return res.data;
  } catch (error: any) {
    // Enhanced error handling for token validation
    if (error.response) {
      const status = error.response.status;
      if (status === 401) {
        throw new Error('Session expired. Please login again');
      } else if (status === 404) {
        throw new Error('User not found. Please login again');
      } else if (status === 500) {
        throw new Error('Server error during validation');
      }
    } else if (error.request) {
      throw new Error('Network error during validation');
    }
    throw error;
  }
};