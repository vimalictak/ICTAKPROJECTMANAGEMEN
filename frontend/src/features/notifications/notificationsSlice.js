import { createSlice } from '@reduxjs/toolkit';

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState: {
    items: [],
    unreadCount: 0,
  },
  reducers: {
    setNotifications: (state, { payload }) => { state.items = payload; },
    addNotification: (state, { payload }) => {
      state.items.unshift(payload);
      state.unreadCount += 1;
    },
    setUnreadCount: (state, { payload }) => { state.unreadCount = payload; },
    markRead: (state, { payload }) => {
      const n = state.items.find((i) => i._id === payload);
      if (n && !n.isRead) { n.isRead = true; state.unreadCount = Math.max(0, state.unreadCount - 1); }
    },
    markAllRead: (state) => {
      state.items.forEach((n) => { n.isRead = true; });
      state.unreadCount = 0;
    },
  },
});

export const { setNotifications, addNotification, setUnreadCount, markRead, markAllRead } = notificationsSlice.actions;
export const selectNotifications = (s) => s.notifications.items;
export const selectUnreadCount = (s) => s.notifications.unreadCount;
export default notificationsSlice.reducer;
