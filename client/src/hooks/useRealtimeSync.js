import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import api from '../services/api';
import { socket } from '../services/socket';
import { addTask, deleteTask, updateTask } from '../store/slices/tasksSlice';
import { setRealtimeConnected } from '../store/slices/uiSlice';

export const TASKS_CHANGED_EVENT = 'focushub:tasks-changed';

// Keeps tasks in sync across the user's open tabs and devices.
export function useRealtimeSync() {
  const dispatch = useDispatch();

  useEffect(() => {
    const changed = () => window.dispatchEvent(new Event(TASKS_CHANGED_EVENT));
    const handlers = {
      connect: () => dispatch(setRealtimeConnected(true)),
      disconnect: () => dispatch(setRealtimeConnected(false)),
      // An expired access token is rejected by the server and socket.io does not
      // retry auth errors by itself: refresh the token, then reconnect.
      connect_error: async (err) => {
        if (err.message !== 'UNAUTHORIZED') return;
        try {
          const { data } = await api.post('/auth/refresh');
          localStorage.setItem('accessToken', data.accessToken);
          socket.connect();
        } catch {
          // refresh failed: the API interceptor logs the user out
        }
      },
      'task:created': (task) => {
        dispatch(addTask(task));
        changed();
      },
      'task:updated': (task) => {
        dispatch(updateTask(task));
        changed();
      },
      'task:deleted': ({ _id }) => {
        dispatch(deleteTask(_id));
        changed();
      },
    };

    Object.entries(handlers).forEach(([event, handler]) => socket.on(event, handler));
    socket.connect();

    return () => {
      Object.entries(handlers).forEach(([event, handler]) => socket.off(event, handler));
      socket.disconnect();
      dispatch(setRealtimeConnected(false));
    };
  }, [dispatch]);
}
