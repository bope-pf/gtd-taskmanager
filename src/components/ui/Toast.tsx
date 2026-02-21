import { useEffect } from 'react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
  duration?: number;
}

export function Toast({ message, type = 'info', onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const bgClass = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
  }[type];

  return (
    <div className={`fixed bottom-4 right-4 z-50 ${bgClass} text-white px-4 py-3 rounded-lg shadow-lg max-w-sm`}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm">{message}</span>
        <button onClick={onClose} className="text-white/80 hover:text-white text-lg leading-none">&times;</button>
      </div>
    </div>
  );
}
