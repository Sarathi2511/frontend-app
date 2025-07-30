import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSocket } from '../contexts/SocketContext';

const ConnectionStatus: React.FC = () => {
  const { isConnected } = useSocket();

  return (
    <View style={[styles.container, isConnected ? styles.connected : styles.disconnected]}>
      <Ionicons 
        name={isConnected ? "wifi" : "wifi-outline"} 
        size={16} 
        color={isConnected ? "#4CAF50" : "#F44336"} 
      />
      <Text style={[styles.text, isConnected ? styles.connectedText : styles.disconnectedText]}>
        {isConnected ? "Live" : "Offline"}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginHorizontal: 8,
  },
  connected: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  disconnected: {
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  connectedText: {
    color: '#4CAF50',
  },
  disconnectedText: {
    color: '#F44336',
  },
});

export default ConnectionStatus; 