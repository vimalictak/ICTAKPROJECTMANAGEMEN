import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import { selectIsAuthenticated } from '../features/auth/authSlice';
import { addNotification, setUnreadCount } from '../features/notifications/notificationsSlice';

let socketInstance = null;

export const getSocket = () => socketInstance;

export const useSocket = () => {
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const initialized = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || initialized.current) return;
    initialized.current = true;

    const token = localStorage.getItem('accessToken');
    if (!token) return;

    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
    socketInstance = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socketInstance.on('connect', () => console.log('[Socket] Connected'));
    socketInstance.on('disconnect', () => console.log('[Socket] Disconnected'));

    socketInstance.on('notification:new', (notification) => {
      dispatch(addNotification(notification));
      toast(notification.message, { icon: '🔔' });
    });

    socketInstance.on('notification:unreadCount', (count) => {
      dispatch(setUnreadCount(count));
    });

    return () => {
      if (socketInstance) {
        socketInstance.disconnect();
        socketInstance = null;
        initialized.current = false;
      }
    };
  }, [isAuthenticated, dispatch]);

  return socketInstance;
};

export const joinRoom = (room) => socketInstance?.emit('join:room', room);
export const leaveRoom = (room) => socketInstance?.emit('leave:room', room);
