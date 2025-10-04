import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { subDays, format } from 'date-fns';

const BACKEND_URL = 'https://kuberai-production.up.railway.app';
const EXPO_PROJECT_ID = "f61c6afe-4ace-4ba6-92c9-73a5d11508d1";

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

export function useNotificationListener(onInvoiceReceived) {
    useEffect(() => {
      // Listener when a notification is received while the app is foregrounded
      const subscription = Notifications.addNotificationReceivedListener(notification => {
        console.log("📩 Notification received:", notification);
  
        // If backend sends data with invoiceId
        if (notification.request.content.data?.newInvoiceId && onInvoiceReceived) {
          onInvoiceReceived(notification.request.content.data);
        }
      });
  
      // Listener when user taps a notification
      const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
        console.log("👆 Notification tapped:", response);
  
        if (response.notification.request.content.data?.newInvoiceId && onInvoiceReceived) {
          onInvoiceReceived(response.notification.request.content.data);
        }
      });
  
      return () => {
        subscription.remove();
        responseSubscription.remove();
      };
    }, []);
  };

export async function registerForPushNotificationsAsync(getAuthHeaders) {
    if (!Device.isDevice) {
        console.log('Must use physical device for Push Notifications');
        return null;
    }
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }
    if (finalStatus !== 'granted') {
        alert('Failed to get push token for push notification!');
        return null;
    }
    const token = (await Notifications.getExpoPushTokenAsync({ projectId: EXPO_PROJECT_ID })).data;
    try {
        const headers = await getAuthHeaders();
        if(headers && headers.Authorization) {
            await fetch(`${BACKEND_URL}/api/save-token`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ fcmToken: token }),
            });
            console.log("✅ FCM Token saved to backend.");
        }
    } catch(e) {
        console.error("Could not save FCM token", e);
    }
    if (Platform.OS === 'android') {
        Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
        });
    }
    return token;
}

export async function scheduleInvoiceReminder(invoice) {
    if (!invoice.dueDate) return;

    const dueDate = new Date(invoice.dueDate);
    const now = new Date();
    const formattedDueDate = format(dueDate, 'MMM d, yyyy');

    // --- 1-week reminder ---
    const oneWeekTrigger = new Date(dueDate);
    oneWeekTrigger.setDate(oneWeekTrigger.getDate() - 7);
    const weekIdentifier = `${invoice._id}_week`;
    await Notifications.cancelScheduledNotificationAsync(weekIdentifier);

    if (oneWeekTrigger > now) {
        await Notifications.scheduleNotificationAsync({
            identifier: weekIdentifier,
            content: {
                title: `Upcoming Bill (${formattedDueDate})`,
                body: `Your invoice for ${invoice.vendor} (₹${invoice.amount}) is due on ${formattedDueDate}.`,
                data: { invoiceId: invoice._id }
            },
            trigger: oneWeekTrigger,
        });
        console.log(`✅ 1-week reminder scheduled for invoice ${invoice._id} at ${oneWeekTrigger}`);
    }

    // --- 1-day reminder ---
    const oneDayTrigger = new Date(dueDate);
    oneDayTrigger.setDate(oneDayTrigger.getDate() - 1);
    oneDayTrigger.setHours(9, 0, 0, 0);

    const dayIdentifier = `${invoice._id}_day`;
    await Notifications.cancelScheduledNotificationAsync(dayIdentifier);

    if (oneDayTrigger > now) {
        await Notifications.scheduleNotificationAsync({
            identifier: dayIdentifier,
            content: {
                title: `Bill Due tomorrow ${formattedDueDate}`,
                body: `Your invoice for ${invoice.vendor} (₹${invoice.amount}) is due on ${formattedDueDate}.`,
                data: { invoiceId: invoice._id }
            },
            trigger: oneDayTrigger,
        });
        console.log(`✅ 1-day reminder scheduled for invoice ${invoice._id} at ${oneDayTrigger}`);
    }
}

export async function cancelInvoiceReminder(invoiceId) {
    await Notifications.cancelScheduledNotificationAsync(`${invoiceId}_week`);
    await Notifications.cancelScheduledNotificationAsync(`${invoiceId}_day`);
    console.log(`❌ Canceled all reminders for invoice ${invoiceId}`);
}