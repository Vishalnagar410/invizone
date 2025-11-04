import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { WebSocketMessage, ChemicalWithStock } from '@/types';

interface UseWebSocketReturn {
  isConnected: boolean;
  latestChemical: ChemicalWithStock | null;
  latestStockAdjustment: any | null;
  subscribeToUpdates: (types: string[]) => void;
}

export const useWebSocket = (): UseWebSocketReturn => {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [latestChemical, setLatestChemical] = useState<ChemicalWithStock | null>(null);
  const [latestStockAdjustment, setLatestStockAdjustment] = useState<any | null>(null);

  useEffect(() => {
    // Initialize Socket.IO connection
    const socket = io('http://localhost:8000', {
      transports: ['websocket', 'polling']
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('✅ WebSocket connected');
      setIsConnected(true);
      
      // Subscribe to chemical and stock updates
      socket.emit('subscribe_to_updates', { types: ['chemicals', 'stock'] });
    });

    socket.on('disconnect', () => {
      console.log('❌ WebSocket disconnected');
      setIsConnected(false);
    });

    socket.on('chemical_created', (data: WebSocketMessage) => {
      console.log('🆕 New chemical via WebSocket:', data.data.name);
      setLatestChemical(data.data);
    });

    socket.on('chemical_updated', (data: WebSocketMessage) => {
      console.log('📝 Chemical updated via WebSocket:', data.data.name);
      setLatestChemical(data.data);
    });

    socket.on('stock_adjustment', (data: WebSocketMessage) => {
      console.log('📊 Stock adjustment via WebSocket:', data.data);
      setLatestStockAdjustment(data.data);
    });

    socket.on('connected', (data) => {
      console.log('WebSocket server connected:', data);
    });

    socket.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const subscribeToUpdates = (types: string[]) => {
    if (socketRef.current) {
      socketRef.current.emit('subscribe_to_updates', { types });
    }
  };

  return {
    isConnected,
    latestChemical,
    latestStockAdjustment,
    subscribeToUpdates
  };
};