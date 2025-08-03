import React, { useState } from 'react';
import { View, Text, Pressable, FlatList, StyleSheet, Platform } from 'react-native';
import { Modal, Portal, Button, Card, Title, Paragraph, Divider } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useNotifications } from '../contexts/NotificationContext';

const ACCENT = "#3D5AFE";

const NotificationButton: React.FC = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotifications } = useNotifications();
  const [modalVisible, setModalVisible] = useState(false);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'product_created':
        return '📦';
      case 'product_updated':
        return '✏️';
      case 'product_deleted':
        return '🗑️';
      case 'staff_created':
        return '👤';
      case 'staff_updated':
        return '✏️';
      case 'staff_deleted':
        return '🗑️';
      case 'user_connected':
        return '🟢';
      case 'user_disconnected':
        return '🔴';
      default:
        return '📢';
    }
  };

  const formatTime = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const renderNotification = ({ item }: { item: any }) => (
    <View style={styles.notificationItem}>
      <View style={styles.notificationIcon}>
        <Text style={styles.iconText}>{getNotificationIcon(item.type)}</Text>
      </View>
      <View style={styles.notificationContent}>
        <Text style={styles.notificationTitle}>{item.title}</Text>
        <Text style={styles.notificationMessage}>{item.message}</Text>
        <Text style={styles.notificationTime}>{formatTime(item.timestamp)}</Text>
      </View>
      {!item.read && <View style={styles.unreadDot} />}
    </View>
  );

  const hideModal = () => setModalVisible(false);
  const showModal = () => setModalVisible(true);

  return (
    <>
      <Pressable
        style={styles.notificationButton}
        onPress={showModal}
      >
        <Ionicons name="notifications-outline" size={24} color={ACCENT} />
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </Text>
          </View>
        )}
      </Pressable>

      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={hideModal}
          contentContainerStyle={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            {/* Header Section */}
            <View style={styles.headerSection}>
              <View style={styles.headerRow}>
                <Title style={styles.modalTitle}>Notifications</Title>
                <View style={styles.headerActions}>
                  <Button
                    mode="contained"
                    onPress={markAllAsRead}
                    style={[styles.headerButton, { backgroundColor: ACCENT }]}
                    labelStyle={styles.headerButtonText}
                    compact
                    buttonColor={ACCENT}
                  >
                    Mark As Read
                  </Button>
                  <Button
                    mode="contained"
                    onPress={clearNotifications}
                    style={[styles.headerButton, { backgroundColor: ACCENT }]}
                    labelStyle={styles.headerButtonText}
                    compact
                    buttonColor={ACCENT}
                  >
                    Clear All
                  </Button>
                </View>
              </View>
            </View>
            
            {/* Horizontal Rule */}
            <View style={styles.horizontalRule} />
            
            {/* Notifications Content */}
            <View style={styles.notificationsSection}>
              <FlatList
                data={notifications}
                renderItem={renderNotification}
                keyExtractor={item => item.id}
                style={styles.notificationsList}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyIcon}>🔔</Text>
                    <Title style={styles.emptyTitle}>No notifications</Title>
                    <Paragraph style={styles.emptyMessage}>You're all caught up!</Paragraph>
                  </View>
                }
              />
            </View>
            
            {/* Horizontal Rule */}
            <View style={styles.horizontalRule} />
            
            {/* Footer Section */}
            <View style={styles.footerSection}>
              <Button
                mode="contained"
                onPress={hideModal}
                style={[styles.closeButton, { backgroundColor: ACCENT }]}
                labelStyle={styles.closeButtonText}
                buttonColor={ACCENT}
              >
                Close
              </Button>
            </View>
          </View>
        </Modal>
      </Portal>
    </>
  );
};

const styles = StyleSheet.create({
  notificationButton: {
    position: 'relative',
    padding: 8,
    marginRight: 8,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#ff5252',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  modalContainer: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 16,
    maxHeight: '100%',
    minHeight: '60%',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  modalContent: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 16,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  headerSection: {
    padding: 20,
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    marginHorizontal: 2,
    borderRadius: 8,
  },
  headerButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  horizontalRule: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 0,
  },
  notificationsSection: {
    flex: 1,
    paddingHorizontal: 20,
    minHeight: 200,
  },
  notificationsList: {
    flex: 1,
  },
  notificationItem: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: 'transparent',
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconText: {
    fontSize: 16,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    lineHeight: 20,
  },
  notificationTime: {
    fontSize: 12,
    color: '#999',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: ACCENT,
    marginLeft: 8,
    alignSelf: 'center',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    flex: 1,
    justifyContent: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  footerSection: {
    padding: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  closeButton: {
    borderRadius: 12,
    paddingVertical: 4,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default NotificationButton; 