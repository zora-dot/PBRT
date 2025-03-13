import React from 'react';

interface ShareNotificationProps {
  show: boolean;
}

export default function ShareNotification({ show }: ShareNotificationProps) {
  if (!show) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-gray-800 text-white px-4 py-2 rounded-md shadow-lg animate-fade-in z-50">
      Link copied to clipboard!
    </div>
  );
}