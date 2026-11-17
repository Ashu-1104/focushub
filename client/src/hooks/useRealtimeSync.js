import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import api from '../services/api';
import { openEventStream } from '../services/realtime';
import { addTask, deleteTask, updateTask } from '../store/slices/tasksSlice';
import { setRealtimeConnected } from '../store/slices/uiSlice';

export const TASKS_CHANGED_EVENT = 'focushub:tasks-changed';

// Keeps tasks in sync across the user's open tabs and devices (Server-Sent Events).
// The browser reconnects on its own after the server ends a stream; when the stream is
// refused (expired login) we refresh the access token and open a new one.
export function useRealtimeSync() {
  const dispatch = useDispatch();

  useEffect(() => {
    let source = null;
    let retryTimer = null;
    let stopped = false;
    const changed = () => window.dispatchEvent(new Event(TASKS_CHANGED_EVENT));
    const handlers = {
      'task:created': (task) => dispatch(addTask(task)),
      'task:updated': (task) => dispatch(updateTask(task)),
      'task:deleted': ({ _id }) => dispatch(deleteTask(_id)),
    };

    const connect = () => {
      source = openEventStream();
      source.onopen = () => dispatch(setRealtimeConnected(true));
      Object.entries(handlers).forEach(([type, apply]) => {
        source.addEventListener(type, (event) => {
          apply(JSON.parse(event.data));
          changed();
        });
      });
      source.onerror = async () => {
        dispatch(setRealtimeConnected(false));
        if (source.readyState !== EventSource.CLOSED || stopped) return; // still reconnecting by itself
        try {
          const { data } = await api.post('/auth/refresh');
          localStorage.setItem('accessToken', data.accessToken);
        } catch {
          // refresh failed: the API interceptor logs the user out
        }
        retryTimer = setTimeout(() => !stopped && connect(), 2000);
      };
    };

    connect();
    return () => {
      stopped = true;
      clearTimeout(retryTimer);
      source?.close();
      dispatch(setRealtimeConnected(false));
    };
  }, [dispatch]);
}
