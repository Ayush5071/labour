import { View, Text, ScrollView, TouchableOpacity, Alert, FlatList, RefreshControl } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { workerApi, reportApi } from '../../../services/api';
import { Worker, WorkerSummary, DailyEntry } from '../../../types';

export default function WorkerDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [worker, setWorker] = useState<Worker | null>(null);
  const [summary, setSummary] = useState<WorkerSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [id])
  );

  const fetchData = async () => {
    try {
      setLoading(true);
      const [workerRes, summaryRes] = await Promise.all([
        workerApi.getById(id),
        reportApi.getWorkerSummary(id),
      ]);
      setWorker(workerRes.data);
      setSummary(summaryRes.data);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to fetch worker details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading && !worker) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center">
        <Text className="text-gray-500">Loading worker details...</Text>
      </View>
    );
  }

  if (!worker) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center">
        <Text className="text-gray-500">Worker not found</Text>
      </View>
    );
  }

  const renderEntryItem = ({ item }: { item: DailyEntry }) => (
    <View className="bg-white mx-4 my-1 p-3 rounded-lg border border-gray-100">
      <View className="flex-row justify-between items-center">
        <View>
          <Text className="text-sm text-gray-600">{formatDate(item.date)}</Text>
          <Text className="text-xs text-gray-400">
            {item.hoursWorked}h ({item.regularHours}h + {item.overtimeHours}h OT)
          </Text>
        </View>
        <Text className="font-bold text-green-600">₹{item.totalPay.toFixed(2)}</Text>
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Worker Info Card */}
        <View className="bg-white mx-4 mt-4 p-4 rounded-xl shadow-sm">
          <View className="flex-row justify-between items-start">
            <View>
              <Text className="text-xl font-bold text-gray-800">{worker.name}</Text>
              <Text className="text-sm text-gray-500">ID: {worker.workerId}</Text>
            </View>
            <View className={`px-2 py-1 rounded ${worker.isActive ? 'bg-green-100' : 'bg-red-100'}`}>
              <Text className={`text-xs ${worker.isActive ? 'text-green-700' : 'text-red-700'}`}>
                {worker.isActive ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>

          {/* Pay Details */}
          <View className="flex-row flex-wrap mt-4 gap-2">
            <View className="bg-blue-50 px-3 py-2 rounded-lg">
              <Text className="text-xs text-blue-600">Daily Pay</Text>
              <Text className="text-lg font-bold text-blue-800">₹{worker.dailyPay}</Text>
            </View>
            <View className="bg-green-50 px-3 py-2 rounded-lg">
              <Text className="text-xs text-green-600">Daily Hours</Text>
              <Text className="text-lg font-bold text-green-800">{worker.dailyWorkingHours}h</Text>
            </View>
            <View className="bg-orange-50 px-3 py-2 rounded-lg">
              <Text className="text-xs text-orange-600">OT Rate</Text>
              <Text className="text-lg font-bold text-orange-800">{worker.overtimeRate}x</Text>
            </View>
          </View>

          {/* Bank Details */}
          {(worker.bankDetails?.bankName || worker.bankDetails?.accountNumber) && (
            <View className="mt-4 pt-4 border-t border-gray-100">
              <Text className="text-sm font-semibold text-gray-600 mb-2">Bank Details</Text>
              {worker.bankDetails.bankName && (
                <Text className="text-sm text-gray-700">Bank: {worker.bankDetails.bankName}</Text>
              )}
              {worker.bankDetails.accountNumber && (
                <Text className="text-sm text-gray-700">A/C: {worker.bankDetails.accountNumber}</Text>
              )}
              {worker.bankDetails.ifscCode && (
                <Text className="text-sm text-gray-700">IFSC: {worker.bankDetails.ifscCode}</Text>
              )}
            </View>
          )}

          {/* Edit Button */}
          <TouchableOpacity
            className="mt-4 bg-blue-500 rounded-lg p-3 flex-row items-center justify-center"
            onPress={() => router.push(`/worker/${worker._id}`)}
          >
            <Ionicons name="pencil" size={18} color="#fff" />
            <Text className="text-white font-medium ml-2">Edit Worker</Text>
          </TouchableOpacity>
        </View>

        {/* Summary Stats */}
        {summary && (
          <View className="bg-white mx-4 mt-4 p-4 rounded-xl shadow-sm">
            <Text className="text-lg font-bold text-gray-800 mb-3">Earnings Summary</Text>
            
            <View className="flex-row flex-wrap gap-3">
              <View className="flex-1 min-w-[45%] bg-green-50 p-3 rounded-lg">
                <Text className="text-xs text-green-600">Total Earnings</Text>
                <Text className="text-xl font-bold text-green-800">₹{summary.totalPay.toFixed(2)}</Text>
              </View>
              <View className="flex-1 min-w-[45%] bg-blue-50 p-3 rounded-lg">
                <Text className="text-xs text-blue-600">Regular Pay</Text>
                <Text className="text-xl font-bold text-blue-800">₹{summary.totalRegularPay.toFixed(2)}</Text>
              </View>
              <View className="flex-1 min-w-[45%] bg-orange-50 p-3 rounded-lg">
                <Text className="text-xs text-orange-600">Overtime Pay</Text>
                <Text className="text-xl font-bold text-orange-800">₹{summary.totalOvertimePay.toFixed(2)}</Text>
              </View>
              <View className="flex-1 min-w-[45%] bg-purple-50 p-3 rounded-lg">
                <Text className="text-xs text-purple-600">Total Hours</Text>
                <Text className="text-xl font-bold text-purple-800">{summary.totalHoursWorked.toFixed(1)}h</Text>
              </View>
            </View>

            <View className="mt-3 flex-row justify-between">
              <Text className="text-xs text-gray-500">
                Regular: {summary.totalRegularHours.toFixed(1)}h
              </Text>
              <Text className="text-xs text-gray-500">
                Overtime: {summary.totalOvertimeHours.toFixed(1)}h
              </Text>
              <Text className="text-xs text-gray-500">
                Entries: {summary.totalEntries}
              </Text>
            </View>
          </View>
        )}

        {/* Recent Entries */}
        <View className="mt-4 mb-4">
          <Text className="text-lg font-bold text-gray-800 mx-4 mb-2">Recent Entries</Text>
          
          {summary?.entries && summary.entries.length > 0 ? (
            summary.entries.slice(0, 10).map((entry) => (
              <View key={entry._id} className="bg-white mx-4 my-1 p-3 rounded-lg border border-gray-100">
                <View className="flex-row justify-between items-center">
                  <View>
                    <Text className="text-sm text-gray-600">{formatDate(entry.date)}</Text>
                    <Text className="text-xs text-gray-400">
                      {entry.hoursWorked}h ({entry.regularHours}h + {entry.overtimeHours}h OT)
                    </Text>
                  </View>
                  <Text className="font-bold text-green-600">₹{entry.totalPay.toFixed(2)}</Text>
                </View>
              </View>
            ))
          ) : (
            <View className="mx-4 p-4 bg-gray-100 rounded-lg items-center">
              <Text className="text-gray-500">No entries yet</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
