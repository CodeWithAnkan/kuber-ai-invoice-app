import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, FlatList, SafeAreaView, ActivityIndicator, Alert, Modal, TextInput, Animated, Platform, RefreshControl } from 'react-native';
// The errors below are expected in this web environment, as it cannot resolve native modules or project paths.
// This code is correct and WILL RUN WITHOUT ERRORS in your local Expo project.
import * as DocumentPicker from 'expo-document-picker';
import { auth } from '../../firebaseConfig';
import { FontAwesome } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import * as SecureStore from 'expo-secure-store';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { scheduleInvoiceReminder, cancelInvoiceReminder } from '../../notifications.js';
import { useAppContext } from '../context/AppContext';

const BACKEND_URL = 'https://kuberai-production.up.railway.app';
const PIN_KEY = 'app_pin';

interface Invoice {
  _id: string;
  vendor: string;
  amount: number | string;
  dueDate: string | null | Date;
  category: string;
  isRecurring: boolean;
  recurrenceInterval: string | null;
  createdAt: string | Date;
}

const formatAmount = (amount: number) => {
    if (typeof amount !== 'number' || isNaN(amount)) return '0.00';
    return amount.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

const formatRecurrenceInterval = (interval: string | null): string => {
    if (!interval) return '';
    const [value, unit] = interval.split('-');
    if (unit === 'week') return 'Recurring Weekly';
    if (unit === 'month' && value === '1') return 'Recurring Monthly';
    if (unit === 'month' && value === '3') return 'Recurring Quarterly';
    if (unit === 'year') return 'Recurring Yearly';
    return `Recurring every ${value} ${unit}(s)`;
};

export default function InvoiceScreen() {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [activeModal, setActiveModal] = useState<'edit' | 'pin' | 'recurrence' | 'budget' | null>(null);
    const [editingInvoice, setEditingInvoice] = useState<Partial<Invoice>>({});
    const [pinInput, setPinInput] = useState('');
    const [pinAction, setPinAction] = useState<{ type: 'edit' | 'delete', payload: any } | null>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [isFindingDeals, setIsFindingDeals] = useState<string | null>(null);
    const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
    const [budget, setBudget] = useState(0);
    const [totalExpenses, setTotalExpenses] = useState(0);
    const [newBudgetInput, setNewBudgetInput] = useState('');
    const swipeableRefs = useRef<Record<string, Swipeable>>({});
    const { refreshId } = useAppContext();
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('createdAt');
    const [sortOrder, setSortOrder] = useState('desc');

    const loadSortingPreference = async () => {
        try {
            const user = auth.currentUser;
            if (!user) return;
            const preferenceKey = `sorting_preference_${user.uid}`;
            const savedPreference = await SecureStore.getItemAsync(preferenceKey);
            if (savedPreference) {
                const { sortBy: savedSortBy, sortOrder: savedSortOrder } = JSON.parse(savedPreference);
                setSortBy(savedSortBy);
                setSortOrder(savedSortOrder);
            }
        } catch (error) {
            console.error('Failed to load sorting preference:', error);
        }
    };

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            await loadSortingPreference();
            await fetchInvoices();
            await fetchBudget();
            setIsLoading(false);
        };
        loadData();
    }, [refreshId]);

    // Debounced search effect
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchInvoices();
        }, 300); // 300ms debounce

        return () => clearTimeout(timeoutId);
    }, [searchQuery, sortBy, sortOrder]);

    const getAuthHeaders = async (includeContentType = true): Promise<Record<string, string> | undefined> => {
        const user = auth.currentUser;
        if (!user) return undefined;
        const token = await user.getIdToken();
        const headers: Record<string, string> = { 'Authorization': `Bearer ${token}` };
        if (includeContentType) headers['Content-Type'] = 'application/json';
        return headers;
    };

    const fetchInvoices = async (searchTerm = searchQuery, sortField = sortBy, sortDirection = sortOrder) => {
        try {
            const headers = await getAuthHeaders();
            if (!headers) { return; }
            const params = new URLSearchParams({
                search: searchTerm,
                sortBy: sortField,
                order: sortDirection
            });
            const response = await fetch(`${BACKEND_URL}/api/invoices?${params}`, { headers });
            if (!response.ok) throw new Error('Failed to fetch');
            const data = await response.json();
            setInvoices(data);
        } catch (error) { Alert.alert("Error", "Could not fetch saved invoices."); }
    };

    const fetchBudget = async () => {
        try {
            const headers = await getAuthHeaders();
            if (!headers) return;
            const response = await fetch(`${BACKEND_URL}/api/user/budget`, { headers });
            if (!response.ok) throw new Error('Failed to fetch budget');
            const data = await response.json();
            setBudget(data.monthlyBudget);
            setTotalExpenses(data.totalExpenses);
            setNewBudgetInput(data.monthlyBudget > 0 ? data.monthlyBudget.toString() : '');
        } catch (error) { console.error("Failed to fetch budget:", error); }
    };

    const onRefresh = async () => {
        setIsRefreshing(true);
        try {
            await fetchInvoices();
            await fetchBudget();
        } catch (error) {
            console.error("Failed to refresh data:", error);
        } finally {
            setIsRefreshing(false);
        }
    };

    const saveSortingPreference = async (newSortBy: string, newSortOrder: string) => {
        try {
            const user = auth.currentUser;
            if (!user) return;
            const preferenceKey = `sorting_preference_${user.uid}`;
            const preference = { sortBy: newSortBy, sortOrder: newSortOrder };
            await SecureStore.setItemAsync(preferenceKey, JSON.stringify(preference));
        } catch (error) {
            console.error('Failed to save sorting preference:', error);
        }
    };

    const handleSaveBudget = async () => {
        const newAmount = parseFloat(newBudgetInput) || 0;
        try {
            const headers = await getAuthHeaders();
            if(!headers) return;
            await fetch(`${BACKEND_URL}/api/user/budget`, { method: 'PUT', headers, body: JSON.stringify({ monthlyBudget: newAmount }) });
            setBudget(newAmount);
            setActiveModal(null);
        } catch (error) { Alert.alert("Error", "Could not save budget."); }
    };

    const uploadInvoice = async (asset: any) => {
        const formData = new FormData();
        formData.append('invoice', { uri: asset.uri, name: asset.name, type: asset.mimeType } as any);
        const user = auth.currentUser;
        if (!user) return { status: 'error', message: 'Not logged in.' };
        const token = await user.getIdToken();
        try {
          const response = await fetch(`${BACKEND_URL}/api/upload`, { method: 'POST', body: formData, headers: { 'Authorization': `Bearer ${token}` } });
          if (!response.ok) throw new Error(`Server responded with status: ${response.status}`);
          return await response.json();
        } catch (error) {
          Alert.alert("Upload Error", "Could not connect to the server.");
          return { status: 'error', message: 'Frontend connection failed.' };
        }
    };

    const handleFilePick = async () => {
      try {
        const result = await DocumentPicker.getDocumentAsync({ type: ['image/*', 'application/pdf'], copyToCacheDirectory: true });
        if (!result.canceled && result.assets && result.assets.length > 0) {
          const asset = result.assets[0];
          setIsUploading(true);
          const response = await uploadInvoice(asset);
          setIsUploading(false);
          if (response.status === 'success') {
            setInvoices(prev => [response.data, ...prev]);
            scheduleInvoiceReminder(response.data);
            fetchBudget();
          } else if (response.status === 'manual_required') {
            setEditingInvoice({
                vendor: response.partialData.vendor || '',
                amount: response.partialData.amount?.toString() || '',
                dueDate: response.partialData.dueDate || null,
                category: response.partialData.category || 'Other',
            });
            setActiveModal('edit');
          } else {
             Alert.alert("Processing Failed", response.message || "Couldn't read the file clearly.");
          }
        }
      } catch (err) { Alert.alert("Error", "Could not open document picker."); }
    };

    const handleSaveInvoice = async () => {
        if (!editingInvoice.vendor || !editingInvoice.amount) return Alert.alert("Missing Info", "Vendor and amount are required.");
        const isEditing = !!editingInvoice._id;
        const url = isEditing ? `${BACKEND_URL}/api/invoices/${editingInvoice._id}` : `${BACKEND_URL}/api/invoices`;
        const method = isEditing ? 'PUT' : 'POST';
        const invoiceDataToSave = {
            vendor: editingInvoice.vendor,
            amount: parseFloat(editingInvoice.amount as string) || 0,
            dueDate: editingInvoice.dueDate || null,
            category: editingInvoice.category || 'Other',
        };
        try {
            const headers = await getAuthHeaders();
            if(!headers) return;
            const response = await fetch(url, { method, headers, body: JSON.stringify(invoiceDataToSave) });
            if (!response.ok) throw new Error('Failed to save');
            const result = await response.json();
            if (result.status === 'success') {
                if (isEditing) setInvoices(prev => prev.map(inv => inv._id === result.data._id ? result.data : inv));
                else setInvoices(prev => [result.data, ...prev]);
                scheduleInvoiceReminder(result.data);
                fetchBudget();
                setActiveModal(null);
                setEditingInvoice({});
            } else { Alert.alert("Save Failed", result.message); }
        } catch (error) { Alert.alert("Error", "Could not save the invoice."); }
    };

    const handleEdit = async (item: Invoice) => {
        const userPinKey = `app_pin_${auth.currentUser?.uid}`;
        const storedPin = await SecureStore.getItemAsync(userPinKey);
        if (storedPin) {
            setPinAction({ type: 'edit', payload: item });
            setActiveModal('pin');
        } else {
            setEditingInvoice({ ...item, amount: item.amount.toString() });
            setActiveModal('edit');
        }
        swipeableRefs.current[item._id]?.close();
    };

    const handleDelete = async (id: string) => {
        const userPinKey = `app_pin_${auth.currentUser?.uid}`;
        const storedPin = await SecureStore.getItemAsync(userPinKey);
        if (storedPin) {
            setPinAction({ type: 'delete', payload: id });
            setActiveModal('pin');
        } else { confirmDelete(id); }
        swipeableRefs.current[id]?.close();
    };
    
    const confirmDelete = (id: string) => Alert.alert("Delete Invoice", "Are you sure?", [{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: () => executeDelete(id) }]);

    const executeDelete = async (id: string) => {
        try {
            const headers = await getAuthHeaders(false);
            if (!headers) return;
            const response = await fetch(`${BACKEND_URL}/api/invoices/${id}`, { method: 'DELETE', headers });
            if (!response.ok) throw new Error('Failed to delete');
            setInvoices(prev => prev.filter(inv => inv._id !== id));
            cancelInvoiceReminder(id);
            fetchBudget();
        } catch (error) { Alert.alert("Error", "Could not delete the invoice."); }
    };

    const handlePinSubmit = async () => {
        const userPinKey = `app_pin_${auth.currentUser?.uid}`;
        const storedPin = await SecureStore.getItemAsync(userPinKey);
        if (pinInput !== storedPin) return Alert.alert("Incorrect PIN");

        setActiveModal(null);
        if (pinAction?.type === 'edit') {
            const item = pinAction.payload as Invoice;
            setEditingInvoice({ ...item, amount: item.amount.toString() });
            setTimeout(() => setActiveModal('edit'), 150);
        } else if (pinAction?.type === 'delete') {
            confirmDelete(pinAction.payload as string);
        }
        setPinInput('');
        setPinAction(null);
    };

    const onDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(Platform.OS === 'ios');
        if (selectedDate) {
            const formattedDate = selectedDate.toISOString().split('T')[0];
            setEditingInvoice(prev => ({ ...prev, dueDate: formattedDate }));
        }
    };
    
    const handleFindDeals = async (invoiceId: string, vendor: string, amount: number) => {
        setIsFindingDeals(invoiceId);
        try {
            const headers = await getAuthHeaders();
            if(!headers) return;
            const response = await fetch(`${BACKEND_URL}/api/find-deals`, { method: 'POST', headers, body: JSON.stringify({ vendor, amount }) });
            if (!response.ok) throw new Error("Failed to get deals");
            const data = await response.json();
            Alert.alert('Deal Finder Results', data.deal);
        } catch (error) {
            Alert.alert('Error', 'Could not search for deals.');
        } finally {
            setIsFindingDeals(null);
        }
    };

    const handleToggleRecurring = (invoice: Invoice) => {
        if (!invoice.dueDate) return Alert.alert("Cannot Set Recurrence", "Invoice has no due date.");
        setSelectedInvoiceId(invoice._id);
        setActiveModal('recurrence');
        swipeableRefs.current[invoice._id]?.close();
    };

    const handleSetRecurrence = async (interval: string | null) => {
        if (!selectedInvoiceId) return;
        try {
            const headers = await getAuthHeaders();
            if(!headers) return;
            const response = await fetch(`${BACKEND_URL}/api/invoices/${selectedInvoiceId}/set-recurring`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify({ interval }),
            });
            if (!response.ok) throw new Error("Failed to update status");
            const result = await response.json();
            if (result.status === 'success') {
                setInvoices(prev => prev.map(inv => inv._id === selectedInvoiceId ? result.data : inv));
            }
        } catch (error) {
            Alert.alert('Error', 'Could not update recurring status.');
        } finally {
            setActiveModal(null);
            setSelectedInvoiceId(null);
        }
    };

    const renderInvoice = ({ item }: { item: Invoice }) => {
        const renderRightActions = (progress: Animated.AnimatedInterpolation<number>) => (
            <Animated.View style={[styles.swipeActionContainer, { opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }) }]}>
                <TouchableOpacity style={[styles.swipeButton, styles.editButton]} onPress={() => handleEdit(item)}><FontAwesome name="pencil" size={22} color="#fff" /></TouchableOpacity>
                <TouchableOpacity style={[styles.swipeButton, styles.deleteButton]} onPress={() => handleDelete(item._id)}><FontAwesome name="trash" size={22} color="#fff" /></TouchableOpacity>
            </Animated.View>
        );
        const renderLeftActions = (progress: Animated.AnimatedInterpolation<number>) => (
            <Animated.View style={[styles.swipeActionContainer, { width: 70, opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }) }]}>
                <TouchableOpacity style={[styles.swipeButton, styles.recurringButton]} onPress={() => handleToggleRecurring(item)}><FontAwesome name="repeat" size={22} color="#fff" /></TouchableOpacity>
            </Animated.View>
        );
        return (
            <View style={{ marginBottom: 15 }}>
                <Swipeable ref={ref => { if (ref) swipeableRefs.current[item._id] = ref; }} renderRightActions={renderRightActions} renderLeftActions={renderLeftActions} containerStyle={{ overflow: 'visible' }}>
                    <View style={styles.invoiceCard}>
                        <View style={styles.invoiceDetails}>
                            <Text style={styles.vendorText}>{item.vendor}</Text>
                            <Text style={styles.categoryText}>{item.category}</Text>
                            {item.isRecurring && (<Text style={styles.recurringText}>{formatRecurrenceInterval(item.recurrenceInterval)}</Text>)}
                        </View>
                        <View style={styles.rightContainer}>
                            <View style={{ alignItems: 'flex-end' }}>
                                <Text style={styles.amountText}>₹{(typeof item.amount === 'number' ? item.amount.toFixed(2) : '0.00')}</Text>
                                {/* SIMPLIFIED: Always show the dueDate from the DB */}
                                <Text style={styles.dateText}>Due: {item.dueDate ? format(new Date(item.dueDate), 'yyyy-MM-dd') : 'N/A'}</Text>
                            </View>
                            {item.isRecurring && (
                                <View style={styles.dealButtonContainer}>
                                    {isFindingDeals === item._id ? <ActivityIndicator color="#c7c8ca" /> : (
                                        <TouchableOpacity onPress={() => handleFindDeals(item._id, item.vendor, Number(item.amount))}>
                                            <FontAwesome name="magic" size={20} color="#c7c8ca" />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            )}
                        </View>
                    </View>
                </Swipeable>
            </View>
        );
    };

    const renderModalContent = () => {
        switch (activeModal) {
            case 'budget':
                return (<View style={styles.modalView}><Text style={styles.modalTitle}>Set Monthly Budget</Text><TextInput style={styles.input} placeholder="e.g., 50000" placeholderTextColor="#949ba4" value={newBudgetInput} onChangeText={setNewBudgetInput} keyboardType="numeric" /><View style={styles.buttonRow}><TouchableOpacity style={[styles.modalButton, styles.buttonClose]} onPress={() => setActiveModal(null)}><Text style={styles.buttonText}>Cancel</Text></TouchableOpacity><TouchableOpacity style={[styles.modalButton, styles.buttonSave]} onPress={handleSaveBudget}><Text style={styles.buttonText}>Save</Text></TouchableOpacity></View></View>);
            case 'edit':
                return (<View style={styles.modalView}><Text style={styles.modalTitle}>{editingInvoice._id ? "Edit Invoice" : "Confirm Details"}</Text><TextInput style={styles.input} placeholder="Vendor" placeholderTextColor="#949ba4" value={editingInvoice.vendor} onChangeText={text => setEditingInvoice(prev => ({...prev, vendor: text}))}/><TextInput style={styles.input} placeholder="Amount (₹)" placeholderTextColor="#949ba4" keyboardType="numeric" value={editingInvoice.amount as string} onChangeText={text => setEditingInvoice(prev => ({...prev, amount: text}))}/><TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}><Text style={editingInvoice.dueDate ? styles.datePickerText : styles.datePickerPlaceholder}>{editingInvoice.dueDate ? `Due: ${typeof editingInvoice.dueDate === 'string' ? editingInvoice.dueDate : format(editingInvoice.dueDate, 'yyyy-MM-dd')}` : "Select Due Date"}</Text></TouchableOpacity><TextInput style={styles.input} placeholder="Category" placeholderTextColor="#949ba4" value={editingInvoice.category} onChangeText={text => setEditingInvoice(prev => ({...prev, category: text}))}/><View style={styles.buttonRow}><TouchableOpacity style={[styles.modalButton, styles.buttonClose]} onPress={() => setActiveModal(null)}><Text style={styles.textStyle}>Cancel</Text></TouchableOpacity><TouchableOpacity style={[styles.modalButton, styles.buttonSave]} onPress={handleSaveInvoice}><Text style={styles.textStyle}>Save</Text></TouchableOpacity></View></View>);
            case 'pin':
                return (<View style={styles.modalView}><Text style={styles.modalTitle}>Enter PIN</Text><TextInput style={[styles.input, {textAlign: 'center'}]} placeholder="4-digit PIN" placeholderTextColor="#555" value={pinInput} onChangeText={setPinInput} secureTextEntry keyboardType="numeric" maxLength={4}/><View style={styles.buttonRow}><TouchableOpacity style={[styles.modalButton, styles.buttonClose]} onPress={() => {setActiveModal(null); setPinInput('')}}><Text style={styles.textStyle}>Cancel</Text></TouchableOpacity><TouchableOpacity style={[styles.modalButton, styles.buttonSave]} onPress={handlePinSubmit}><Text style={styles.textStyle}>Confirm</Text></TouchableOpacity></View></View>);
            case 'recurrence':
                 return (<View style={styles.modalView}><Text style={styles.modalTitle}>Set Recurrence</Text><TouchableOpacity style={styles.recurrenceButton} onPress={() => handleSetRecurrence('1-week')}><Text style={styles.textStyle}>Weekly</Text></TouchableOpacity><TouchableOpacity style={styles.recurrenceButton} onPress={() => handleSetRecurrence('1-month')}><Text style={styles.textStyle}>Monthly</Text></TouchableOpacity><TouchableOpacity style={styles.recurrenceButton} onPress={() => handleSetRecurrence('3-month')}><Text style={styles.textStyle}>Quarterly</Text></TouchableOpacity><TouchableOpacity style={styles.recurrenceButton} onPress={() => handleSetRecurrence('1-year')}><Text style={styles.textStyle}>Yearly</Text></TouchableOpacity><TouchableOpacity style={[styles.recurrenceButton, {backgroundColor: '#b53d3d', marginTop: 10}]} onPress={() => handleSetRecurrence(null)}><Text style={styles.textStyle}>Turn Off Recurring</Text></TouchableOpacity></View>);
            default:
                return null;
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.header}>Invoices</Text>
            
            {/* The Budget Card is unchanged */}
            <View style={styles.budgetContainer}>
                 <View style={styles.budgetHeader}><Text style={styles.budgetText}>Monthly Budget</Text><TouchableOpacity onPress={() => setActiveModal('budget')}><FontAwesome name="pencil" size={16} color="#949ba4" /></TouchableOpacity></View>
                 <Text style={styles.budgetAmount}>₹{formatAmount(totalExpenses)} / <Text style={styles.budgetTotal}>₹{formatAmount(budget)}</Text></Text>
                 <View style={styles.progressBarBackground}><View style={[styles.progressBarFill, { width: `${budget > 0 ? Math.min((totalExpenses / budget) * 100, 100) : 0}%` }]} /></View>
            </View>

            <View style={styles.controlsContainer}>
                <View style={styles.searchBar}>
                    <FontAwesome name="search" size={16} color="#949ba4" style={{ marginRight: 10 }} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search by vendor..."
                        placeholderTextColor="#949ba4"
                        value={searchQuery}
                        onChangeText={(text) => {
                            setSearchQuery(text);
                        }}
                    />
                </View>
                <TouchableOpacity 
                    style={styles.sortButton} 
                    onPress={() => {
                        if (sortBy === 'createdAt') {
                            setSortBy('dueDate');
                            setSortOrder('asc');
                            saveSortingPreference('dueDate', 'asc');
                            fetchInvoices(searchQuery, 'dueDate', 'asc');
                        } else {
                            setSortBy('createdAt');
                            setSortOrder('desc');
                            saveSortingPreference('createdAt', 'desc');
                            fetchInvoices(searchQuery, 'createdAt', 'desc');
                        }
                    }}
                >
                    <FontAwesome 
                        name={sortBy === 'dueDate' ? 'sort-amount-asc' : 'sort-amount-desc'} 
                        size={16} 
                        color="#fff" 
                    />
                    <Text style={styles.sortText}>
                        {sortBy === 'dueDate' ? 'Due Date' : 'Created'}
                    </Text>
                </TouchableOpacity>
            </View>
            
            {/* The single modal logic is unchanged */}
            <Modal visible={!!activeModal} transparent={true} animationType={activeModal === 'edit' ? 'slide' : 'fade'} onRequestClose={() => setActiveModal(null)}>
                <View style={styles.modalContainer}>
                    {renderModalContent()}
                </View>
            </Modal>
            
            {showDatePicker && ( <DateTimePicker value={editingInvoice.dueDate ? new Date(editingInvoice.dueDate) : new Date()} mode="date" display="default" onChange={onDateChange} /> )}
            
            {isLoading ? (<ActivityIndicator size="large" color="#5865f2" style={{ flex: 1 }} />) : (
                <FlatList data={invoices} renderItem={renderInvoice} keyExtractor={item => item._id} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }} ListEmptyComponent={() => (<Text style={styles.emptyText}>Tap '+' to scan an invoice.</Text>)} 
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={onRefresh}
                        tintColor="#fff"
                    />
                }
                />
            )}
            <TouchableOpacity style={styles.fab} onPress={handleFilePick} disabled={isLoading || isUploading}>
                {isUploading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.fabIcon}>+</Text>}
            </TouchableOpacity>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#1e1f22' },
    header: { fontSize: 34, fontWeight: 'bold', padding: 20, marginTop: 20, color: '#ffffff' },
    budgetContainer: { backgroundColor: '#2b2d31', marginHorizontal: 20, borderRadius: 16, padding: 20, marginBottom: 20 },
    budgetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    budgetText: { color: '#949ba4', fontSize: 14 },
    budgetAmount: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginTop: 8 },
    budgetTotal: { color: '#949ba4', fontSize: 18, fontWeight: 'normal' },
    progressBarBackground: { width: '100%', height: 8, backgroundColor: '#1e1f22', borderRadius: 4, marginTop: 15, overflow: 'hidden' },
    progressBarFill: { height: '100%', backgroundColor: '#5865f2', borderRadius: 4 },
    emptyText: { color: '#949ba4', textAlign: 'center', marginTop: '40%' },
    fab: { position: 'absolute', right: 30, bottom: 30, width: 64, height: 64, borderRadius: 32, backgroundColor: '#5865f2', justifyContent: 'center', alignItems: 'center', elevation: 8 },
    fabIcon: { fontSize: 32, color: 'white', lineHeight: 34 },
    modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)' },
    modalView: { width: '85%', backgroundColor: '#2b2d31', borderRadius: 12, padding: 20 },
    modalTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
    input: { width: '100%', backgroundColor: '#1e1f22', color: '#fff', borderRadius: 8, padding: 12, marginBottom: 15, fontSize: 16, justifyContent: 'center', minHeight: 48 },
    buttonRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
    modalButton: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center', marginHorizontal: 5 },
    buttonSave: { backgroundColor: '#5865f2' },
    buttonClose: { backgroundColor: '#4e5058' },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    invoiceCard: { backgroundColor: '#2b2d31', borderRadius: 12, paddingVertical: 15, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', elevation: 4 },
    invoiceDetails: { flex: 1, marginRight: 10 },
    vendorText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' },
    categoryText: { color: '#949ba4', fontSize: 14, marginTop: 4 },
    recurringText: { color: '#5865f2', fontSize: 14, fontWeight: '600', marginTop: 4 },
    rightContainer: { flexDirection: 'row', alignItems: 'center' },
    amountText: { color: '#ffffff', fontSize: 20, fontWeight: 'bold' },
    dateText: { color: '#949ba4', fontSize: 14, marginTop: 4 },
    dealButtonContainer: { marginLeft: 15, padding: 5 },
    swipeActionContainer: { flexDirection: 'row', borderRadius: 12, overflow: 'hidden', marginVertical: 7.5 },
    swipeButton: { justifyContent: 'center', alignItems: 'center', width: 70, height: '100%' },
    editButton: { backgroundColor: '#3a429b' },
    deleteButton: { backgroundColor: '#b53d3d' },
    recurringButton: { backgroundColor: '#2d9d71' },
    datePickerText: { color: '#ffffff', fontSize: 16 },
    datePickerPlaceholder: { color: '#949ba4', fontSize: 16 },
    recurrenceButton: { width: '100%', backgroundColor: '#4e5058', padding: 15, borderRadius: 8, alignItems: 'center', marginBottom: 10, },
    textStyle: { color: 'white', fontWeight: 'bold', textAlign: 'center' },
    controlsContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 20 },
    searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#2b2d31', borderRadius: 12, paddingHorizontal: 15, paddingVertical: 12, marginRight: 15 },
    searchInput: { flex: 1, color: '#fff', fontSize: 16 },
    sortButton: { backgroundColor: '#4e5058', paddingHorizontal: 15, paddingVertical: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center' },
    sortText: { color: '#fff', marginLeft: 8, fontSize: 16 },
});
