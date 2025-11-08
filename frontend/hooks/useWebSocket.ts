import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { WebSocketMessage, ChemicalWithStock, StockAdjustment } from '@/types';

interface UseWebSocketReturn {
  isConnected: boolean;
  latestChemical: ChemicalWithStock | null;
  latestStockAdjustment: StockAdjustment | null;
  subscribeToUpdates: (types: string[]) => void;
  connectionStatus: 'connected' | 'disconnected' | 'connecting' | 'error';
  reconnect: () => void;
  chemicalUpdates: ChemicalWithStock[];
  stockAdjustments: StockAdjustment[];
}

export const useWebSocket = (): UseWebSocketReturn => {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting' | 'error'>('disconnected');
  const [latestChemical, setLatestChemical] = useState<ChemicalWithStock | null>(null);
  const [latestStockAdjustment, setLatestStockAdjustment] = useState<StockAdjustment | null>(null);
  const [chemicalUpdates, setChemicalUpdates] = useState<ChemicalWithStock[]>([]);
  const [stockAdjustments, setStockAdjustments] = useState<StockAdjustment[]>([]);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    setConnectionStatus('connecting');
    
    const socket = io('http://localhost:8000', {
      transports: ['websocket', 'polling'],
      timeout: 10000,
      reconnectionAttempts: maxReconnectAttempts,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('✅ WebSocket connected');
      setIsConnected(true);
      setConnectionStatus('connected');
      reconnectAttempts.current = 0;
      
      // Subscribe to chemical and stock updates
      socket.emit('subscribe_to_updates', { types: ['chemicals', 'stock', 'alerts'] });
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ WebSocket disconnected:', reason);
      setIsConnected(false);
      setConnectionStatus('disconnected');
    });

    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      setConnectionStatus('error');
      reconnectAttempts.current += 1;
      
      if (reconnectAttempts.current >= maxReconnectAttempts) {
        console.warn('Max reconnection attempts reached');
      }
    });

    socket.on('reconnect_attempt', (attempt) => {
      console.log(`🔄 WebSocket reconnection attempt ${attempt}`);
      setConnectionStatus('connecting');
    });

    socket.on('reconnect_failed', () => {
      console.error('WebSocket reconnection failed');
      setConnectionStatus('error');
    });

    // Chemical Events
    socket.on('chemical_created', (data: WebSocketMessage) => {
      console.log('🆕 New chemical via WebSocket:', data.data);
      setLatestChemical(data.data);
      setChemicalUpdates(prev => [data.data, ...prev.slice(0, 9)]); // Keep last 10 updates
    });

    socket.on('chemical_updated', (data: WebSocketMessage) => {
      console.log('📝 Chemical updated via WebSocket:', data.data);
      setLatestChemical(data.data);
      setChemicalUpdates(prev => [data.data, ...prev.slice(0, 9)]);
    });

    socket.on('chemical_update', (data: WebSocketMessage) => {
      console.log('🔄 Chemical general update:', data.data);
      setLatestChemical(data.data);
      setChemicalUpdates(prev => [data.data, ...prev.slice(0, 9)]);
    });

    // Stock Events
    socket.on('stock_adjustment', (data: WebSocketMessage) => {
      console.log('📊 Stock adjustment via WebSocket:', data.data);
      setLatestStockAdjustment(data.data);
      setStockAdjustments(prev => [data.data, ...prev.slice(0, 9)]);
    });

    socket.on('stock_adjusted', (data: WebSocketMessage) => {
      console.log('📦 Stock adjusted:', data.data);
      setLatestStockAdjustment(data.data);
      setStockAdjustments(prev => [data.data, ...prev.slice(0, 9)]);
    });

    // Alert Events
    socket.on('low_stock_alert', (data: WebSocketMessage) => {
      console.log('🚨 Low stock alert:', data.data);
      // Show browser notification if supported
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Low Stock Alert', {
          body: `${data.data.chemical_name} is running low (${data.data.current_quantity} ${data.data.unit} remaining)`,
          icon: '/logo_reychemiq.png'
        });
      }
    });

    // Connection Events
    socket.on('connected', (data) => {
      console.log('WebSocket server connected:', data);
    });

    socket.on('subscribed', (data) => {
      console.log('Subscribed to updates:', data.types);
    });

    socket.on('room_joined', (data) => {
      console.log('Joined room:', data.room);
    });

    socket.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    return socket;
  }, []);

  useEffect(() => {
    const socket = connect();

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [connect]);

  const subscribeToUpdates = useCallback((types: string[]) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('subscribe_to_updates', { types });
    }
  }, []);

  const reconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current.connect();
    } else {
      connect();
    }
  }, [connect]);

  return {
    isConnected,
    latestChemical,
    latestStockAdjustment,
    subscribeToUpdates,
    connectionStatus,
    reconnect,
    chemicalUpdates,
    stockAdjustments
  };
};