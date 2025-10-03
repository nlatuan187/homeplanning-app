'use client';

import { useEffect, useState } from 'react';
import { getToken } from 'firebase/messaging';
import { messaging } from '@/lib/firebase';

// Component này sẽ quản lý việc lấy token và gửi lên server.
export function NotificationManager() {
  const [status, setStatus] = useState<string>('Click to enable notifications');
  const [isTokenSent, setIsTokenSent] = useState(false);

  const handleRequestPermission = async () => {
    try {
      if (isTokenSent) {
        setStatus('Token has already been sent.');
        return;
      }

      setStatus('Requesting permission...');
      const permission = await Notification.requestPermission();

      if (permission === 'granted') {
        setStatus('Permission granted. Getting token...');
        const messagingInstance = await messaging();

        if (messagingInstance) {
          const currentToken = await getToken(messagingInstance, {
            // Đây là VAPID key, rất quan trọng cho web push
            vapidKey: 'BPGDn-xHlzguqG1xrfMs8h89FLkXXP5o1H1VYA_cKNmOuM8ubFTCwNuN_vr_CpM3t7WhpsFno8Ef8PUh1pXiQXg',
          });

          console.log('Current token:', currentToken);

          if (currentToken) {
            setStatus('Token received. Sending to server...');
            await sendTokenToServer(currentToken);
            setStatus('Notifications enabled successfully!');
            setIsTokenSent(true);
          } else {
            setStatus('Failed to get token. Please check console.');
            console.log('No registration token available. Request permission to generate one.');
          }
        } else {
          setStatus('Firebase Messaging is not supported in this browser.');
        }
      } else {
        setStatus('Permission denied. Cannot receive notifications.');
        console.log('Unable to get permission to notify.');
      }
    } catch (error) {
      console.error('An error occurred while getting token. ', error);
      setStatus('An error occurred. Check console for details.');
    }
  };

  // Hàm gửi token đến API của bạn
  const sendTokenToServer = async (token: string) => {
    try {
      const response = await fetch('/api/notifications/register-device', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: token,
          platform: 'web', // Ghi rõ đây là token từ web
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send token to server');
      }

      const data = await response.json();
      console.log('Token sent to server successfully:', data);
    } catch (error) {
      console.error('Error sending token to server:', error);
      // Có thể thêm logic để thử lại sau
    }
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px', marginTop: '20px' }}>
      <h4>Notification Settings</h4>
      <p>Status: {status}</p>
      <button onClick={handleRequestPermission} disabled={isTokenSent}>
        Enable Push Notifications
      </button>
    </div>
  );
}
