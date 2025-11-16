import React, { useState, useEffect } from 'react';
import validationService from '../services/validationService';
import api from '../config/api';

interface Notification {
  id: string;
  type: string;
  severity: string;
  title: string;
  message: string;
  timestamp: string;
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadNotifications();
    
    // Poll for new notifications every 30 seconds
    const interval = setInterval(loadNotifications, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const loadNotifications = async () => {
    try {
      const response = await api.get('/validate/notifications');
      const data = response.data?.data || [];
      setNotifications(data);
      setUnreadCount(data.filter((n: Notification) => n.severity === 'critical' || n.severity === 'urgent').length);
    } catch (error) {
      console.error('Failed to load notifications:', error);
      // Silently fail - notifications are non-critical
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'urgent': return 'bg-orange-500';
      case 'high': return 'bg-yellow-500';
      default: return 'bg-blue-500';
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 text-gray-600 hover:text-gray-800"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 block h-4 w-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-800">Notifications</h3>
            <p className="text-xs text-gray-500">{notifications.length} total</p>
          </div>
          
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">
              No new notifications
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="p-4 hover:bg-gray-50 cursor-pointer"
                  onClick={() => {
                    if (notification.type === 'address_cluster') {
                      window.location.href = `/admin/address-flags`;
                    } else if (notification.type === 'review_task') {
                      window.location.href = `/admin/review-tasks`;
                    }
                    setShowDropdown(false);
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-2 ${getSeverityColor(notification.severity)}`}></div>
                    <div className="flex-1">
                      <p className="font-medium text-sm text-gray-800">{notification.title}</p>
                      <p className="text-xs text-gray-600 mt-1">{notification.message}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(notification.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <div className="p-2 border-t border-gray-200">
            <button
              onClick={() => {
                setShowDropdown(false);
                window.location.href = '/admin/review-tasks';
              }}
              className="w-full text-center text-sm text-blue-600 hover:text-blue-800"
            >
              View All Notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

