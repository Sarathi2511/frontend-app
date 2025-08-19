import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

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
      AsyncStorage.removeItem('token');
      AsyncStorage.removeItem('userRole');
      AsyncStorage.removeItem('userId');
      AsyncStorage.removeItem('userName');
      try {
        router.replace('/login');
      } catch {}
    }
    console.error('Response Error:', error);
    return Promise.reject(error);
  }
);

export const login = async (phone: string, password: string) => {
  const response = await api.post('/login', { phone, password });
  if (response.data.token) {
    await AsyncStorage.setItem('token', response.data.token);
    await AsyncStorage.setItem('userRole', response.data.role);
    if (response.data.userId) await AsyncStorage.setItem('userId', response.data.userId);
  }
  return response.data;
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

export const getOrdersAssignedTo = (userId: string) => api.get(`/orders/assigned/${userId}`);

export const getCurrentUserId = async () => {
  return await AsyncStorage.getItem('userId');
};

// Products API
export const getProducts = () => api.get('/products');
export const createProduct = (data: any) => api.post('/products', data);
export const updateProduct = (id: string, data: any) => api.put(`/products/${id}`, data);
export const deleteProduct = (id: string) => api.delete(`/products/${id}`);
export const getBrands = () => api.get('/products/brands');

// Staff API
export const getStaff = () => api.get('/staff');
export const createStaff = (data: any) => api.post('/staff', data);
export const updateStaff = (id: string, data: any) => api.put(`/staff/${id}`, data);
export const deleteStaff = (id: string) => api.delete(`/staff/${id}`);

export const getExecutives = () => api.get('/staff').then(res => res.data.filter((u: any) => u.role === 'Executive'));

export const getCustomerNames = () => api.get('/orders/customers');
export const getOrderRoutes = () => api.get('/orders/routes'); 
export const getCustomers = () => api.get('/customers');

// Token validation (lightweight check used on app start/resume)
export const validateToken = async () => {
  try {
    const res = await api.get('/login/validate');
    return res.data;
  } catch (e) {
    throw e;
  }
};