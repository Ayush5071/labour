import { View, Text, ScrollView, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { useState, useCallback } from 'react';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { workersApi, advanceApi } from '../../../services/api';
import { Worker, Advance } from '../../../types';

export default function WorkerDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [worker, setWorker] = useState<Worker | null>(null);
  const [advances, setAdvances] = useState<Advance[]>([]);
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
      const [workerRes, advancesRes] = await Promise.all([
        workersApi.getById(id),
        advanceApi.getWorkerHistory(id),
      ]);
      setWorker(workerRes.data);
      setAdvances(advancesRes.data || []);
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
              <Text className="text-xs text-blue-600">Hourly Rate</Text>
              <Text className="text-lg font-bold text-blue-800">₹{worker.hourlyRate}</Text>
            </View>
            <View className="bg-green-50 px-3 py-2 rounded-lg">
              <Text className="text-xs text-green-600">Daily Hours</Text>
              <Text className="text-lg font-bold text-green-800">{worker.dailyWorkingHours}h</Text>
            </View>
            <View className="bg-orange-50 px-3 py-2 rounded-lg">
              <Text className="text-xs text-orange-600">Daily Pay</Text>
              <Text className="text-lg font-bold text-orange-800">₹{(worker.hourlyRate * worker.dailyWorkingHours).toFixed(0)}</Text>
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
        <View className="bg-white mx-4 mt-4 p-4 rounded-xl shadow-sm">
          <Text className="text-lg font-bold text-gray-800 mb-3">Work Summary</Text>
          
          <View className="flex-row flex-wrap gap-3">
            <View className="flex-1 min-w-[45%] bg-green-50 p-3 rounded-lg">
              <Text className="text-xs text-green-600">Days Worked</Text>
              <Text className="text-xl font-bold text-green-800">{worker.totalDaysWorked || 0}</Text>
            </View>
            <View className="flex-1 min-w-[45%] bg-red-50 p-3 rounded-lg">
              <Text className="text-xs text-red-600">Days Absent</Text>
              <Text className="text-xl font-bold text-red-800">{worker.totalDaysAbsent || 0}</Text>
            </View>
          </View>
        </View>

        {/* Advance Details */}
        <View className="bg-white mx-4 mt-4 p-4 rounded-xl shadow-sm">
          <Text className="text-lg font-bold text-gray-800 mb-3">Advance Details</Text>
          
          <View className="flex-row flex-wrap gap-3">
            <View className="flex-1 min-w-[45%] bg-orange-50 p-3 rounded-lg">
              <Text className="text-xs text-orange-600">Total Advance Taken</Text>
              <Text className="text-xl font-bold text-orange-800">₹{worker.totalAdvanceTaken || 0}</Text>
            </View>
            <View className="flex-1 min-w-[45%] bg-blue-50 p-3 rounded-lg">
              <Text className="text-xs text-blue-600">Total Repaid</Text>
              <Text className="text-xl font-bold text-blue-800">₹{worker.totalAdvanceRepaid || 0}</Text>
            </View>
            <View className="flex-1 min-w-[45%] bg-red-50 p-3 rounded-lg">
              <Text className="text-xs text-red-600">Outstanding Balance</Text>
              <Text className="text-xl font-bold text-red-800">₹{worker.advanceBalance || 0}</Text>
            </View>
          </View>
        </View>

        {/* Recent Advance History */}
        <View className="mt-4 mb-4">
          <Text className="text-lg font-bold text-gray-800 mx-4 mb-2">Recent Advance History</Text>
          
          {advances && advances.length > 0 ? (
            advances.slice(0, 10).map((adv) => (
              <View key={adv._id} className="bg-white mx-4 my-1 p-3 rounded-lg border border-gray-100">
                <View className="flex-row justify-between items-center">
                  <View>
                    <Text className="text-sm text-gray-600">{formatDate(adv.date)}</Text>
                    <Text className="text-xs text-gray-400">{adv.notes || adv.type}</Text>
                  </View>
                  <Text className={`font-bold ${adv.type === 'advance' ? 'text-orange-600' : 'text-green-600'}`}>
                    {adv.type === 'advance' ? '+' : '-'}₹{adv.amount}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <View className="mx-4 p-4 bg-gray-100 rounded-lg items-center">
              <Text className="text-gray-500">No advance history</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
