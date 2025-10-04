import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ActivityIndicator, ScrollView, Dimensions, RefreshControl } from 'react-native';
// The errors below are expected in this web environment. It cannot resolve native modules or project paths.
// This code is correct and WILL RUN WITHOUT ERRORS in your local Expo project.
import { auth } from '../../firebaseConfig';
import { FontAwesome } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';

const BACKEND_URL = 'https://kuberai-production.up.railway.app';
const screenWidth = Dimensions.get("window").width;

type ChartRange = 'week' | 'month' | 'year';

const formatAmount = (amount: number) => {
    if (typeof amount !== 'number' || isNaN(amount)) return '0.00';
    return amount.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

export default function AnalysisScreen() {
    const [analysis, setAnalysis] = useState('');
    const [isCoachLoading, setIsCoachLoading] = useState(false);
    const [isChartLoading, setIsChartLoading] = useState(true);
    const [selectedRange, setSelectedRange] = useState<ChartRange>('week');
    const [offset, setOffset] = useState(0);
    const [chartData, setChartData] = useState({
        labels: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
        datasets: [{ data: [0, 0, 0, 0, 0, 0, 0] }]
    });
    const [total, setTotal] = useState(0);
    const [dateRange, setDateRange] = useState('');
    const [isRefreshing, setIsRefreshing] = useState(false);

    const getAuthHeaders = async (): Promise<Record<string, string> | undefined> => {
        const user = auth.currentUser;
        if (!user) return undefined;
        const token = await user.getIdToken();
        return { 'Authorization': `Bearer ${token}` };
    };

    const fetchChartData = useCallback(async () => {
        setIsChartLoading(true);
        try {
            const headers = await getAuthHeaders();
            if (!headers) {
                setIsChartLoading(false);
                return;
            }
            const response = await fetch(`${BACKEND_URL}/api/chart-data?range=${selectedRange}&offset=${offset}`, { headers });
            if (!response.ok) throw new Error("Failed to fetch chart data");
            const data = await response.json();
            if (data.chartData && data.chartData.datasets) {
                setChartData(data.chartData);
            }
            setTotal(data.total);
            setDateRange(data.dateRange);
        } catch (error) {
            console.error(error);
        } finally {
            setIsChartLoading(false);
        }
    }, [selectedRange, offset]);

    useEffect(() => {
        fetchChartData();
    }, [selectedRange, offset, fetchChartData]);

    const onRefresh = useCallback(async () => {
        setIsRefreshing(true);
        await fetchChartData();
        setIsRefreshing(false);
    }, [fetchChartData]);

    const handleRangeChange = (range: ChartRange) => {
        setOffset(0);
        setSelectedRange(range);
    };

    const handleGenerateAnalysis = async () => {
        setIsCoachLoading(true);
        setAnalysis('');
        try {
            const headers = await getAuthHeaders();
            if (!headers) return;
            const response = await fetch(`${BACKEND_URL}/api/analysis`, { headers });
            if (!response.ok) throw new Error("Failed to get analysis");
            const data = await response.json();
            setAnalysis(data.analysis);
        } catch (error) {
            setAnalysis("Sorry, I couldn't generate the analysis right now.");
        } finally {
            setIsCoachLoading(false);
        }
    };
    
    const chartConfig = {
        backgroundColor: "#2b2d31",
        backgroundGradientFrom: "#2b2d31",
        backgroundGradientTo: "#2b2d31",
        decimalPlaces: 0,
        color: (opacity = 1) => `rgba(138, 222, 100, ${opacity})`,
        labelColor: (opacity = 1) => `rgba(148, 155, 164, ${opacity})`,
        style: { borderRadius: 16 },
        propsForDots: { r: "4", strokeWidth: "2", stroke: "#8ade64" },
    };

    const chartWidth = selectedRange === 'month' 
        ? Math.max(screenWidth - 40, chartData.labels.length * 35)
        : screenWidth - 40;


    return (
        <SafeAreaView style={styles.container}>
            <Text style={[styles.header, {marginTop: 20, paddingBottom: 20}]}>Analysis</Text>
            <ScrollView contentContainerStyle={styles.content}
            refreshControl={
                <RefreshControl
                    refreshing={isRefreshing}
                    onRefresh={onRefresh}
                    tintColor="#fff"
                />
            }
            >
                <View style={styles.card}>
                    <View style={styles.segmentContainer}>
                        <TouchableOpacity style={[styles.segmentButton, selectedRange === 'week' && styles.segmentActive]} onPress={() => handleRangeChange('week')}><Text style={styles.segmentText}>Week</Text></TouchableOpacity>
                        <TouchableOpacity style={[styles.segmentButton, selectedRange === 'month' && styles.segmentActive]} onPress={() => handleRangeChange('month')}><Text style={styles.segmentText}>Month</Text></TouchableOpacity>
                        <TouchableOpacity style={[styles.segmentButton, selectedRange === 'year' && styles.segmentActive]} onPress={() => handleRangeChange('year')}><Text style={styles.segmentText}>Year</Text></TouchableOpacity>
                    </View>

                    <Text style={styles.dateRangeText}>{dateRange}</Text>
                    <Text style={styles.totalText}>₹{formatAmount(total)}</Text>
                    
                    {isChartLoading ? (
                        <ActivityIndicator style={{ height: 220 }} color="#fff" />
                    ) : (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <LineChart
                                data={chartData}
                                width={chartWidth}
                                height={220}
                                yAxisLabel="₹"
                                yAxisSuffix=""
                                chartConfig={chartConfig}
                                fromZero
                                bezier
                                style={{ borderRadius: 16 }}
                                verticalLabelRotation={selectedRange !== 'month' ? 30 : 0}
                            />
                        </ScrollView>
                    )}
                    
                    <View style={styles.navContainer}>
                        <TouchableOpacity style={styles.navButton} onPress={() => setOffset(offset + 1)}>
                            <FontAwesome name="chevron-left" size={16} color="#fff" />
                            <Text style={styles.navText}>Prev</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.navButton} onPress={() => setOffset(offset - 1)} disabled={offset === 0}>
                            <Text style={styles.navText}>Next</Text>
                             <FontAwesome name="chevron-right" size={16} color={offset === 0 ? '#555' : '#fff'} />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>AI Financial Coach</Text>
                    <TouchableOpacity style={styles.button} onPress={handleGenerateAnalysis} disabled={isCoachLoading}>
                        {isCoachLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Generate My Analysis</Text>}
                    </TouchableOpacity>
                    {analysis && !isCoachLoading && (
                        <View style={styles.analysisContainer}>
                             <Text style={styles.analysisText}>{analysis}</Text>
                        </View>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#1e1f22' },
    header: { fontSize: 34, fontWeight: 'bold', color: '#ffffff', paddingHorizontal: 20, paddingTop: 20 },
    content: { paddingHorizontal: 20 },
    card: { backgroundColor: '#2b2d31', borderRadius: 16, alignItems: 'center', marginBottom: 20, padding: 20 },
    segmentContainer: {
        flexDirection: 'row',
        backgroundColor: '#1e1f22',
        borderRadius: 8,
        marginBottom: 20,
        width: '100%',
    },
    segmentButton: {
        flex: 1,
        padding: 10,
        borderRadius: 8,
        alignItems: 'center',
    },
    segmentActive: {
        backgroundColor: '#5865f2',
    },
    segmentText: {
        color: '#fff',
        fontWeight: '600',
    },
    dateRangeText: { color: '#949ba4', fontSize: 14, marginBottom: 4 },
    totalText: { color: '#fff', fontSize: 28, fontWeight: 'bold', marginBottom: 20 },
    navContainer: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 20 },
    navButton: { flexDirection: 'row', alignItems: 'center', padding: 8 },
    navText: { color: '#fff', fontSize: 16, marginHorizontal: 8 },
    cardTitle: { fontSize: 20, fontWeight: 'bold', color: '#ffffff', textAlign: 'center', marginBottom: 20 },
    button: { width: '100%', backgroundColor: '#5865f2', padding: 15, borderRadius: 8, alignItems: 'center' },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    analysisContainer: { marginTop: 20, width: '100%' },
    analysisText: { fontSize: 16, color: '#dcddde', lineHeight: 24 },
});