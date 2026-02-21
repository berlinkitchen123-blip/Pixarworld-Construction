import React, { useEffect, useState, useRef } from 'react';
import { FollowUp, FollowUpStatus } from '../types.ts';

interface NotificationManagerProps {
  followUps: FollowUp[];
}

const NotificationManager: React.FC<NotificationManagerProps> = ({ followUps }) => {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [isVisible, setIsVisible] = useState(true);
  const notifiedIds = useRef<Set<string>>(new Set());

  const requestPermission = async () => {
    if (typeof Notification === 'undefined') {
      alert('Notifications are not supported in this browser or environment.');
      return;
    }
    
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === 'denied') {
        alert('Notification permission was denied. Please enable notifications in your browser settings.');
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      alert('Could not request notification permission. This may be blocked by your browser or the preview environment.');
    }
  };

  useEffect(() => {
    if (permission !== 'granted') return;

    const checkFollowUps = () => {
      const now = new Date();
      
      followUps.forEach(followUp => {
        if (followUp.status !== FollowUpStatus.PENDING) return;
        if (notifiedIds.current.has(followUp.id)) return;

        const followUpTime = new Date(`${followUp.date} ${followUp.time}`);
        const diffInMinutes = (followUpTime.getTime() - now.getTime()) / (1000 * 60);

        // Notify if follow-up is due in the next 5 minutes or is already overdue (but within the last hour)
        if (diffInMinutes <= 5 && diffInMinutes > -60) {
          showNotification(followUp);
          notifiedIds.current.add(followUp.id);
        }
      });
    };

    const showNotification = (followUp: FollowUp) => {
      const n = new Notification(`Follow-up Reminder: ${followUp.customerName}`, {
        body: `Reason: ${followUp.reason}\nTime: ${followUp.time}`,
        icon: 'https://picsum.photos/seed/construction/128/128',
        tag: followUp.id,
        requireInteraction: true
      });

      n.onclick = () => {
        window.focus();
        n.close();
      };
    };

    const interval = setInterval(checkFollowUps, 60000); // Check every minute
    checkFollowUps(); // Initial check

    return () => clearInterval(interval);
  }, [followUps, permission]);

  if (permission === 'granted' || !isVisible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100] animate-in slide-in-from-bottom-10 duration-500">
      <div className="bg-slate-900 text-white p-6 rounded-[2rem] shadow-2xl border border-slate-800 max-w-sm relative">
        <button 
          onClick={() => setIsVisible(false)}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-800"
          title="Dismiss"
        >
          <i className="fa-solid fa-xmark"></i>
        </button>
        
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-blue-900/20">
            <i className="fa-solid fa-bell text-xl"></i>
          </div>
          <div>
            <h4 className="font-black text-lg leading-tight mb-1">Enable Notifications</h4>
            <p className="text-slate-400 text-xs font-medium leading-relaxed mb-4">
              Get real-time alerts for your scheduled customer follow-ups and site visits.
              {permission === 'denied' && (
                <span className="block mt-2 text-red-400 font-bold">
                  Notifications are blocked. Please update your browser settings to allow them.
                </span>
              )}
            </p>
            {permission !== 'denied' && (
              <button 
                onClick={requestPermission}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all"
              >
                Allow Notifications
              </button>
            )}
            {permission === 'denied' && (
              <button 
                onClick={() => setIsVisible(false)}
                className="w-full bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationManager;
