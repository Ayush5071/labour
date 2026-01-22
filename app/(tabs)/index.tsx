import { View, Text, FlatList, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { workersApi } from '../../services/api';
import { Worker } from '../../types';

export default function WorkersScreen() {
  const router = useRouter();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchWorkers = async () => {
    try {
      setLoading(true);
      const response = await workersApi.getAll(true);
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
              await workersApi.delete(id);
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
      className="bg-white mx-3 my-1 px-3 py-2 rounded-lg border border-gray-100 flex-row items-center justify-between"
      onPress={() => router.push(`/worker/details/${item._id}`)}
    >
      <View className="flex-1 flex-row items-center">
        <View className="w-9 h-9 bg-blue-100 rounded-full items-center justify-center mr-2">
          <Text className="text-blue-600 font-bold text-sm">{item.name.charAt(0).toUpperCase()}</Text>
        </View>
        <View className="flex-1">
          <Text className="font-semibold text-gray-800 text-sm" numberOfLines={1}>{item.name}</Text>
          <View className="flex-row items-center mt-0.5">
            <Text className="text-xs text-gray-500">₹{item.hourlyRate}/hr</Text>
            {(item.advanceBalance || 0) > 0 && (
              <Text className="text-xs text-red-500 ml-2">Adv: ₹{item.advanceBalance}</Text>
            )}
          </View>
        </View>
      </View>
      <View className="flex-row items-center">
        <View className="items-end mr-2">
          <Text className="text-xs text-green-600">{item.totalDaysWorked || 0}d</Text>
          <Text className="text-xs text-red-500">{item.totalDaysAbsent || 0}a</Text>
        </View>
        <TouchableOpacity
          className="p-1.5"
          onPress={() => router.push(`/worker/${item._id}`)}
        >
          <Ionicons name="pencil" size={16} color="#3B82F6" />
        </TouchableOpacity>
        <TouchableOpacity
          className="p-1.5"
          onPress={() => handleDelete(item._id, item.name)}
        >
          <Ionicons name="trash" size={16} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-gray-50">
      {/* Summary Header */}
      <View className="bg-blue-500 mx-3 mt-3 p-3 rounded-lg flex-row justify-between">
        <View>
          <Text className="text-blue-100 text-xs">Total Workers</Text>
          <Text className="text-white text-xl font-bold">{workers.length}</Text>
        </View>
        <View className="items-end">
          <Text className="text-blue-100 text-xs">With Advances</Text>
          <Text className="text-white text-xl font-bold">{workers.filter(w => (w.advanceBalance || 0) > 0).length}</Text>
        </View>
      </View>

      <FlatList
        data={workers}
        renderItem={renderWorkerItem}
        keyExtractor={(item: Worker) => item._id}
        contentContainerStyle={{ paddingVertical: 4 }}
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
