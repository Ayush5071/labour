import { View, Text, FlatList, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { workerApi } from '../../services/api';
import { Worker } from '../../types';

export default function WorkersScreen() {
  const router = useRouter();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchWorkers = async () => {
    try {
      setLoading(true);
      const response = await workerApi.getAll(true);
      setWorkers(response.data);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to fetch workers');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchWorkers();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchWorkers();
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert(
      'Deactivate Worker',
      `Are you sure you want to deactivate ${name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: async () => {
            try {
              await workerApi.delete(id);
              fetchWorkers();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to deactivate worker');
            }
          },
        },
      ]
    );
  };

  const renderWorkerItem = ({ item }: { item: Worker }) => (
    <TouchableOpacity
      className="bg-white mx-4 my-2 p-4 rounded-xl shadow-sm border border-gray-100"
      onPress={() => router.push(`/worker/details/${item._id}`)}
    >
      <View className="flex-row justify-between items-start">
        <View className="flex-1">
          <Text className="text-lg font-bold text-gray-800">{item.name}</Text>
          <Text className="text-sm text-gray-500">ID: {item.workerId}</Text>
          <View className="flex-row mt-2 flex-wrap">
            <View className="bg-blue-100 px-2 py-1 rounded mr-2 mb-1">
              <Text className="text-xs text-blue-700">₹{item.dailyPay}/day</Text>
            </View>
            <View className="bg-green-100 px-2 py-1 rounded mr-2 mb-1">
              <Text className="text-xs text-green-700">{item.dailyWorkingHours}h/day</Text>
            </View>
            <View className="bg-orange-100 px-2 py-1 rounded mb-1">
              <Text className="text-xs text-orange-700">OT: {item.overtimeRate}x</Text>
            </View>
          </View>
        </View>
        <View className="flex-row">
          <TouchableOpacity
            className="p-2"
            onPress={() => router.push(`/worker/${item._id}`)}
          >
            <Ionicons name="pencil" size={20} color="#3B82F6" />
          </TouchableOpacity>
          <TouchableOpacity
            className="p-2"
            onPress={() => handleDelete(item._id, item.name)}
          >
            <Ionicons name="trash" size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>
      <View className="flex-row justify-between mt-3 pt-3 border-t border-gray-100">
        <Text className="text-xs text-gray-500">
          Total Earnings: <Text className="font-bold text-green-600">₹{item.totalEarnings.toFixed(2)}</Text>
        </Text>
        <Text className="text-xs text-gray-500">
          OT Hours: <Text className="font-bold text-orange-600">{item.totalOvertimeHours.toFixed(1)}h</Text>
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-gray-50">
      <FlatList
        data={workers}
        renderItem={renderWorkerItem}
        keyExtractor={(item: Worker) => item._id}
        contentContainerStyle={{ paddingVertical: 8 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center py-20">
            <Ionicons name="people-outline" size={64} color="#D1D5DB" />
            <Text className="text-gray-400 mt-4 text-center">
              {loading ? 'Loading workers...' : 'No workers found.\nAdd your first worker!'}
            </Text>
          </View>
        }
      />
      <TouchableOpacity
        className="absolute bottom-6 right-6 bg-blue-500 w-14 h-14 rounded-full items-center justify-center shadow-lg"
        onPress={() => router.push('/worker/add')}
      >
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}
