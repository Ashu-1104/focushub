import { AnimatePresence } from 'framer-motion';
import { Bell, X } from 'lucide-react';
import { useTaskReminders } from '../../hooks';
import { Toast } from '../ui/Toast';

// Rendered once at the app root so reminder toasts survive page changes.
export const ReminderCenter = () => {
  const { toasts, dismiss } = useTaskReminders();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2" aria-live="polite">
      <AnimatePresence>
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            type="info"
            message={
              <span className="flex items-center gap-3">
                <Bell size={16} />
                {toast.message}
                <button type="button" aria-label="Dismiss reminder" onClick={() => dismiss(toast.id)}>
                  <X size={16} />
                </button>
              </span>
            }
          />
        ))}
      </AnimatePresence>
    </div>
  );
};
