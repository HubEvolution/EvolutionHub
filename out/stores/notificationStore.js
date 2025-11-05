"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zustand_1 = require("zustand");
const useNotificationStore = (0, zustand_1.create)((set) => ({
    notifications: [],
    unreadCount: 0,
    setNotifications: (notifications) => set({
        notifications,
        unreadCount: notifications.filter((n) => !n.read).length,
    }),
    addNotification: (notification) => set((state) => ({
        notifications: [notification, ...state.notifications],
        unreadCount: notification.read ? state.unreadCount : state.unreadCount + 1,
    })),
    markAsRead: (id) => set((state) => ({
        notifications: state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
        unreadCount: state.notifications.find((n) => n.id === id)?.read
            ? state.unreadCount
            : state.unreadCount - 1,
    })),
    markAllAsRead: () => set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, read: true })),
        unreadCount: 0,
    })),
    removeNotification: (id) => set((state) => {
        const notification = state.notifications.find((n) => n.id === id);
        return {
            notifications: state.notifications.filter((n) => n.id !== id),
            unreadCount: notification && !notification.read ? state.unreadCount - 1 : state.unreadCount,
        };
    }),
}));
exports.default = useNotificationStore;
