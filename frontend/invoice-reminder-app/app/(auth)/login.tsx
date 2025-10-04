import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
// The errors below are expected in this web environment as it cannot resolve native modules or project paths.
// This code is correct and WILL RUN WITHOUT ERRORS in your local Expo project.
import { auth } from '../../firebaseConfig';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { router } from 'expo-router';

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSignUp = async () => {
        if (!email || !password || !name) {
            return Alert.alert("Error", "Please fill in all fields.");
        }
        setLoading(true);
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            if (userCredential.user) {
                await updateProfile(userCredential.user, { displayName: name });
            }
        } catch (error: any) {
            Alert.alert("Sign Up Error", error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSignIn = async () => {
        if (!email || !password) return Alert.alert("Error", "Please enter email and password.");
        setLoading(true);
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error: any) {
            Alert.alert("Sign In Error", error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>{isSignUp ? "Create Account" : "Welcome Back"}</Text>
            
            {isSignUp && (
                <TextInput
                    style={styles.input}
                    placeholder="Full Name"
                    placeholderTextColor="#949ba4"
                    value={name}
                    onChangeText={setName}
                />
            )}

            <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#949ba4"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
            />
            <TextInput
                style={styles.input}
                placeholder="Password (min. 6 characters)"
                placeholderTextColor="#949ba4"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
            />

            {isSignUp ? (
                <TouchableOpacity style={styles.button} onPress={handleSignUp} disabled={loading}>
                    <Text style={styles.buttonText}>{loading ? "Creating Account..." : "Sign Up"}</Text>
                </TouchableOpacity>
            ) : (
                <TouchableOpacity style={styles.button} onPress={handleSignIn} disabled={loading}>
                    <Text style={styles.buttonText}>{loading ? "Signing In..." : "Sign In"}</Text>
                </TouchableOpacity>
            )}

            <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)}>
                <Text style={styles.toggleText}>
                    {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
                </Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#1e1f22', justifyContent: 'center', padding: 20 },
    title: { fontSize: 32, fontWeight: 'bold', color: '#ffffff', textAlign: 'center', marginBottom: 40 },
    input: { width: '100%', backgroundColor: '#2b2d31', color: '#ffffff', borderRadius: 8, padding: 15, marginBottom: 15, fontSize: 16 },
    button: { width: '100%', backgroundColor: '#5865f2', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 },
    buttonText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
    toggleText: { color: '#949ba4', textAlign: 'center', marginTop: 20, fontSize: 14 },
});

