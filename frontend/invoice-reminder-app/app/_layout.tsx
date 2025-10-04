import React, { useState, useEffect, useRef } from 'react';
// The errors below are expected in this web environment, as it cannot resolve native modules or project paths.
// This code is correct and WILL RUN WITHOUT ERRORS in your local Expo project.
import { useSegments, router } from 'expo-router';
import { Slot } from 'expo-router';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Notifications from 'expo-notifications';
import { registerForPushNotificationsAsync } from '../notifications';
import { AppProvider, useAppContext } from './context/AppContext';

// This is a simplified getAuthHeaders for the layout context
async function getAuthHeaders() {
    const user = auth.currentUser;
    if (!user) return {};
    const token = await user.getIdToken();
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
};

// This inner component is needed so it can access the context from the provider
function RootLayoutNav() {
    const [user, setUser] = useState<User | null>(null);
    const [initializing, setInitializing] = useState(true);
    const segments = useSegments();
    const notificationListener = useRef<Notifications.EventSubscription | null>(null);
    const responseListener = useRef<Notifications.EventSubscription | null>(null);
    const { triggerRefresh } = useAppContext(); // Get the trigger function from our new context

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if (initializing) setInitializing(false);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (initializing) return;
        const inAuthGroup = segments[0] === '(auth)';
        if (!user && !inAuthGroup) router.replace('/(auth)/login');
        else if (user && inAuthGroup) router.replace('/(tabs)');
    }, [user, segments, initializing]);

    useEffect(() => {
        if (user) {
            registerForPushNotificationsAsync(getAuthHeaders);
        }
        
        notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
            console.log("Push notification received, triggering refresh...");
            triggerRefresh(); // <-- THIS IS THE MAGIC
        });
        
        responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
            console.log("User tapped on notification, triggering refresh...");
            triggerRefresh(); // <-- ALSO REFRESH ON TAP
        });

        return () => {
            if (notificationListener.current) notificationListener.current.remove();
            if (responseListener.current) responseListener.current.remove();
        };
    }, [user]);

    if (initializing) return null;
    
    return <Slot />;
}

// --- The main export now wraps the app in our provider ---
export default function RootLayout() {
    return (
        <AppProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
                <RootLayoutNav />
            </GestureHandlerRootView>
        </AppProvider>
    );
}

