import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Alert, TextInput, Modal, ActivityIndicator } from 'react-native';
import { auth } from '../../firebaseConfig';
import { signOut, updateProfile, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import * as SecureStore from 'expo-secure-store';
import { FontAwesome } from '@expo/vector-icons';

const PIN_KEY = 'app_pin';

export default function ProfileScreen() {
  const [pin, setPin] = useState('');
  const [hasPin, setHasPin] = useState(false);
  const [removeModalVisible, setRemoveModalVisible] = useState(false);
  const [currentPinInput, setCurrentPinInput] = useState('');
  
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [displayName, setDisplayName] = useState(auth.currentUser?.displayName || '');
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isCurrentPasswordVerified, setIsCurrentPasswordVerified] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'verifying' | 'verified' | 'error'>('idle');

  const [isUpdating, setIsUpdating] = useState(false);
  const [profileVersion, setProfileVersion] = useState(0);
  const debounceTimeout = useRef<number | null>(null);

  const user = auth.currentUser;
  const userPinKey = `app_pin_${user?.uid}`;
  const userInitial = user?.displayName?.[0].toUpperCase() || user?.email?.[0].toUpperCase() || 'A';

  useEffect(() => {
    const checkPin = async () => {
      if (!user) return;
      const storedPin = await SecureStore.getItemAsync(userPinKey);
      setHasPin(!!storedPin);
    };
    checkPin();
  }, [user, hasPin]);
  
  useEffect(() => {
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    if (currentPassword.length > 0) {
        setVerificationStatus('verifying');
        debounceTimeout.current = setTimeout(() => {
            verifyCurrentPassword();
        }, 800);
    } else {
        setVerificationStatus('idle');
        setIsCurrentPasswordVerified(false);
    }
    return () => {
        if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    };
  }, [currentPassword]);

  const verifyCurrentPassword = async () => {
    if (!user || !user.email) return;
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      setVerificationStatus('verified');
      setIsCurrentPasswordVerified(true);
    } catch (error) {
      setVerificationStatus('error');
      setIsCurrentPasswordVerified(false);
    }
  };

  const handleSignOut = () => {
    signOut(auth).catch(error => Alert.alert("Error", error.message));
  };

  const handleSetPin = async () => {
    if (pin.length < 4) return Alert.alert("Weak PIN", "Please use at least 4 digits.");
    await SecureStore.setItemAsync(userPinKey, pin);
    setPin('');
    setHasPin(true);
    Alert.alert("Success", "Protection PIN has been set.");
  };

  const handleRemovePin = () => {
    setRemoveModalVisible(true);
  };

  const executeRemovePin = async () => {
    const storedPin = await SecureStore.getItemAsync(userPinKey);
    if (currentPinInput !== storedPin) {
      return Alert.alert("Incorrect PIN", "Please try again.");
    }
    await SecureStore.deleteItemAsync(userPinKey);
    setHasPin(false);
    setRemoveModalVisible(false);
    setCurrentPinInput('');
    Alert.alert("Success", "PIN protection has been removed.");
  };

  const handleOpenEditProfile = () => {
    setDisplayName(auth.currentUser?.displayName || '');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setIsCurrentPasswordVerified(false);
    setVerificationStatus('idle');
    setEditModalVisible(true);
  };

  const handleProfileUpdate = async () => {
    if (!user) return;
    setIsUpdating(true);
    try {
        const promises = [];
        if (displayName !== user.displayName) {
            promises.push(updateProfile(user, { displayName }));
        }
        if (newPassword && isCurrentPasswordVerified) {
            if (newPassword.length < 6) throw new Error("Password must be at least 6 characters.");
            if (newPassword !== confirmPassword) throw new Error("Passwords do not match.");
            promises.push(updatePassword(user, newPassword));
        }
        if (promises.length > 0) {
            await Promise.all(promises);
            Alert.alert("Success", "Profile updated successfully.");
            setProfileVersion(v => v + 1);
        }
        setEditModalVisible(false);
    } catch (error: any) {
        Alert.alert("Update Error", error.message);
    } finally {
        setIsUpdating(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.profileHeader} key={profileVersion}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{userInitial}</Text>
        </View>
        <View>
          <Text style={styles.usernameText}>{user?.displayName || "Account Settings"}</Text>
          <Text style={styles.emailText}>{user?.email}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security & Privacy</Text>
          <Text style={styles.sectionSubtitle}>Protect your account with a PIN</Text>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Protection PIN</Text>
            <Text style={styles.cardSubtitle}>Secure your data from unauthorized modifications</Text>
            {hasPin ? (
              <>
                <View style={styles.pinStatusContainer}>
                    <FontAwesome name="check-circle" size={20} color="#2d9d71" />
                    <Text style={styles.pinStatusText}>PIN Protection is Active</Text>
                </View>
                <TouchableOpacity onPress={handleRemovePin}>
                   <Text style={styles.removeText}>Remove PIN Protection</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TextInput style={styles.input} placeholder="Enter 4-digit PIN" placeholderTextColor="#555" value={pin} onChangeText={setPin} secureTextEntry keyboardType="numeric" maxLength={4} />
                <TouchableOpacity style={styles.button} onPress={handleSetPin}>
                  <Text style={styles.buttonText}>Set PIN</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        <View style={styles.section}>
            <Text style={[styles.sectionTitle, {paddingBottom: 12}]}>Account Actions</Text>
            <TouchableOpacity style={styles.actionItem} onPress={handleOpenEditProfile}>
                <FontAwesome name="user-o" size={20} color="#949ba4" />
                <View style={styles.actionTextContainer}>
                    <Text style={styles.actionTitle}>Edit Profile</Text>
                    <Text style={styles.actionSubtitle}>Update your personal information</Text>
                </View>
                <FontAwesome name="chevron-right" size={16} color="#949ba4" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionItem} onPress={handleSignOut}>
                <FontAwesome name="sign-out" size={22} color="#f25858" />
                <View style={styles.actionTextContainer}>
                    <Text style={[styles.actionTitle, {color: '#f25858'}]}>Sign Out</Text>
                </View>
                 <FontAwesome name="chevron-right" size={16} color="#f25858" />
            </TouchableOpacity>
        </View>
      </View>
      
      <Modal visible={removeModalVisible} transparent={true} animationType="fade" onRequestClose={() => setRemoveModalVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>Enter Current PIN</Text>
            <TextInput style={[styles.input, {textAlign: 'center'}]} placeholder="4-digit PIN" placeholderTextColor="#555" value={currentPinInput} onChangeText={setCurrentPinInput} secureTextEntry keyboardType="numeric" maxLength={4} />
            <View style={styles.buttonRow}>
              <TouchableOpacity style={[styles.modalButton, styles.buttonClose]} onPress={() => setRemoveModalVisible(false)}>
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.buttonSave]} onPress={executeRemovePin}>
                <Text style={styles.buttonText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      <Modal visible={editModalVisible} transparent={true} animationType="fade" onRequestClose={() => setEditModalVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            <TextInput style={styles.input} placeholder="Full Name" placeholderTextColor="#949ba4" value={displayName} onChangeText={setDisplayName} />
            <View style={styles.passwordInputContainer}>
                <TextInput
                  style={[styles.input, {flex: 1, marginBottom: 0}]}
                  placeholder="Current Password"
                  placeholderTextColor="#949ba4"
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  secureTextEntry
                />
                <View style={styles.verificationIcon}>
                    {/* {verificationStatus === 'verifying' && <ActivityIndicator size="small" color="#949ba4" />} */}
                    {verificationStatus === 'verified' && <FontAwesome name="check-circle" size={24} color="#2d9d71" />}
                    {verificationStatus === 'error' && <FontAwesome name="times-circle" size={24} color="#f25858" />}
                </View>
            </View>
            <TextInput
              style={[styles.input, !isCurrentPasswordVerified && styles.disabledInput]}
              placeholder="New Password (optional)"
              placeholderTextColor="#555"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              editable={isCurrentPasswordVerified}
            />
            <TextInput
              style={[styles.input, !isCurrentPasswordVerified && styles.disabledInput]}
              placeholder="Confirm New Password"
              placeholderTextColor="#555"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              editable={isCurrentPasswordVerified}
            />
            <View style={styles.buttonRow}>
              <TouchableOpacity style={[styles.modalButton, styles.buttonClose]} onPress={() => setEditModalVisible(false)} disabled={isUpdating}>
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.buttonSave]} onPress={handleProfileUpdate} disabled={isUpdating}>
                {isUpdating ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Update</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1e1f22', paddingTop: 16 },
  profileHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingTop: 40,
    paddingBottom: 20,
  },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#5865f2', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  avatarText: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  usernameText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  emailText: { color: '#949ba4', fontSize: 14, marginTop: 2 },
  divider: { height: 1, backgroundColor: '#2b2d31', marginHorizontal: 20 },
  content: { flex: 1, padding: 20 },
  section: { 
    marginBottom: 30,
    marginTop: 20,
  },
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 5 },
  sectionSubtitle: { color: '#949ba4', fontSize: 14, marginBottom: 15 },
  card: { backgroundColor: '#2b2d31', borderRadius: 8, padding: 20 },
  cardTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cardSubtitle: { color: '#949ba4', fontSize: 13, marginTop: 4, marginBottom: 20 },
  pinStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e1f22',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  pinStatusText: {
    color: '#2d9d71',
    fontSize: 16,
    marginLeft: 10,
    fontWeight: '600'
  },
  input: { 
    width: '100%', 
    backgroundColor: '#1e1f22', 
    color: '#fff', 
    borderRadius: 8, 
    padding: 12, 
    marginBottom: 15, 
    fontSize: 16,
  },
  button: { width: '100%', backgroundColor: '#5865f2', padding: 14, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  removeText: { color: '#f25858', textAlign: 'center', marginTop: 15, fontSize: 14, fontWeight: '600' },
  actionItem: { flexDirection: 'row', backgroundColor: '#2b2d31', padding: 15, borderRadius: 8, alignItems: 'center', marginBottom: 10 },
  actionTextContainer: { flex: 1, marginLeft: 15 },
  actionTitle: { color: '#fff', fontSize: 16 },
  actionSubtitle: { color: '#949ba4', fontSize: 12, marginTop: 2 },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)' },
  modalView: { width: '85%', backgroundColor: '#2b2d31', borderRadius: 12, padding: 20 },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  modalButton: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center', marginHorizontal: 5 },
  buttonSave: { backgroundColor: '#5865f2' },
  buttonClose: { backgroundColor: '#4e5058' },
  textStyle: { color: 'white', fontWeight: 'bold', textAlign: 'center', fontSize: 16, },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    backgroundColor: '#1e1f22',
    borderRadius: 8,
    marginBottom: 15,
  },
  verificationIcon: {
    paddingHorizontal: 10,
  },
  disabledInput: {
    backgroundColor: '#2b2d31',
    color: '#555'
  },
});

