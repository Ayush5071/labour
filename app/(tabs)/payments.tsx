import { View, Text, FlatList, TouchableOpacity, RefreshControl, Alert, ScrollView, TextInput } from 'react-native';
import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { workerApi, entryApi } from '../../services/api';
import { Worker, DailyEntry } from '../../types';

export default function PaymentsScreen() {
  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showWorkerPicker, setShowWorkerPicker] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchWorkers();
      fetchEntries();
    }, [])
  );

  const fetchWorkers = async () => {
    try {
      const response = await workerApi.getAll(true);
      setWorkers(response.data);
    } catch (error: any) {
      console.error('Failed to fetch workers:', error);
    }
  };

  const fetchEntries = async () => {
    try {
      setLoading(true);
      const params: any = {};
      
      if (selectedWorker) {
        params.workerId = selectedWorker._id;
      }
      if (startDate) {
        params.startDate = startDate.toISOString().split('T')[0];
      }
      if (endDate) {
        params.endDate = endDate.toISOString().split('T')[0];
      }

      const response = await entryApi.getAll(params);
      setEntries(response.data);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to fetch entries');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchEntries();
  };

  const applyFilters = () => {
    fetchEntries();
  };

  const clearFilters = () => {
    setSelectedWorker(null);
    setStartDate(null);
    setEndDate(null);
    setTimeout(() => fetchEntries(), 100);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatShortDate = (date: Date | null) => {
    if (!date) return 'Select';
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
    });
  };

  const getTotalPay = () => {
    return entries.reduce((sum, entry) => sum + entry.totalPay, 0);
  };

  const renderEntryItem = ({ item }: { item: DailyEntry }) => (
    <View className="bg-white mx-4 my-2 p-4 rounded-xl shadow-sm border border-gray-100">
      <View className="flex-row justify-between items-start mb-2">
        <View>
          <Text className="font-bold text-gray-800">{item.worker.name}</Text>
          <Text className="text-xs text-gray-500">ID: {item.worker.workerId}</Text>
        </View>
        <View className="bg-gray-100 px-2 py-1 rounded">
          <Text className="text-xs text-gray-600">{formatDate(item.date)}</Text>
        </View>
      </View>
      
      <View className="flex-row justify-between items-center mt-2 pt-2 border-t border-gray-100">
        <View className="flex-row items-center">
          <Ionicons name="time-outline" size={14} color="#6B7280" />
          <Text className="text-sm text-gray-600 ml-1">
            {item.hoursWorked}h ({item.regularHours}h + {item.overtimeHours}h OT)
          </Text>
        </View>
      </View>
      
      <View className="flex-row justify-between items-center mt-2">
        <View>
          <Text className="text-xs text-gray-500">
            Regular: ₹{item.regularPay.toFixed(2)}
            {item.overtimePay > 0 && ` + OT: ₹${item.overtimePay.toFixed(2)}`}
          </Text>
        </View>
        <Text className="font-bold text-green-600 text-lg">₹{item.totalPay.toFixed(2)}</Text>
      </View>
      
      {item.notes && (
        <Text className="text-xs text-gray-500 mt-2 italic">Note: {item.notes}</Text>
      )}
    </View>
  );

  return (
    <View className="flex-1 bg-gray-50">
      {/* Filters Section */}
      <View className="bg-white px-4 py-3 border-b border-gray-200">
        <Text className="text-sm font-semibold text-gray-600 mb-2">Filters</Text>
        
        {/* Worker Filter */}
        <TouchableOpacity
          className="border border-gray-200 rounded-lg p-2 mb-2 flex-row justify-between items-center"
          onPress={() => setShowWorkerPicker(!showWorkerPicker)}
        >
          <Text className={`text-sm ${selectedWorker ? 'text-gray-800' : 'text-gray-400'}`}>
            {selectedWorker ? selectedWorker.name : 'All Workers'}
          </Text>
          <Ionicons name={showWorkerPicker ? 'chevron-up' : 'chevron-down'} size={16} color="#6B7280" />
        </TouchableOpacity>

        {showWorkerPicker && (
          <View className="mb-2 border border-gray-200 rounded-lg max-h-32">
            <ScrollView nestedScrollEnabled>
              <TouchableOpacity
                className={`p-2 border-b border-gray-100 ${!selectedWorker ? 'bg-blue-50' : ''}`}
                onPress={() => {
                  setSelectedWorker(null);
                  setShowWorkerPicker(false);
                }}
              >
                <Text className="text-sm text-gray-800">All Workers</Text>
              </TouchableOpacity>
              {workers.map((worker) => (
                <TouchableOpacity
                  key={worker._id}
                  className={`p-2 border-b border-gray-100 ${
                    selectedWorker?._id === worker._id ? 'bg-blue-50' : ''
                  }`}
                  onPress={() => {
                    setSelectedWorker(worker);
                    setShowWorkerPicker(false);
                  }}
                >
                  <Text className="text-sm text-gray-800">{worker.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Date Filters */}
        <View className="flex-row gap-2 mb-2">
          <TouchableOpacity
            className="flex-1 border border-gray-200 rounded-lg p-2 flex-row justify-between items-center"
            onPress={() => setShowStartDatePicker(true)}
          >
            <Text className={`text-sm ${startDate ? 'text-gray-800' : 'text-gray-400'}`}>
              From: {formatShortDate(startDate)}
            </Text>
            <Ionicons name="calendar-outline" size={16} color="#6B7280" />
          </TouchableOpacity>
          
          <TouchableOpacity
            className="flex-1 border border-gray-200 rounded-lg p-2 flex-row justify-between items-center"
            onPress={() => setShowEndDatePicker(true)}
          >
            <Text className={`text-sm ${endDate ? 'text-gray-800' : 'text-gray-400'}`}>
              To: {formatShortDate(endDate)}
            </Text>
            <Ionicons name="calendar-outline" size={16} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {/* Filter Buttons */}
        <View className="flex-row gap-2">
          <TouchableOpacity
            className="flex-1 bg-blue-500 rounded-lg p-2 items-center"
            onPress={applyFilters}
          >
            <Text className="text-white font-medium text-sm">Apply</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 bg-gray-200 rounded-lg p-2 items-center"
            onPress={clearFilters}
          >
            <Text className="text-gray-700 font-medium text-sm">Clear</Text>
          </TouchableOpacity>
        </View>
      </View>

      <DateTimePickerModal
        isVisible={showStartDatePicker}
        mode="date"
        onConfirm={(date: Date) => {
          setStartDate(date);
          setShowStartDatePicker(false);
        }}
        onCancel={() => setShowStartDatePicker(false)}
      />

      <DateTimePickerModal
        isVisible={showEndDatePicker}
        mode="date"
        onConfirm={(date: Date) => {
          setEndDate(date);
          setShowEndDatePicker(false);
        }}
        onCancel={() => setShowEndDatePicker(false)}
      />

      {/* Total Summary */}
      {entries.length > 0 && (
        <View className="bg-green-50 mx-4 mt-3 p-3 rounded-lg border border-green-200">
          <View className="flex-row justify-between items-center">
            <Text className="text-green-800 font-medium">
              Total ({entries.length} entries)
            </Text>
            <Text className="text-green-800 font-bold text-xl">₹{getTotalPay().toFixed(2)}</Text>
          </View>
        </View>
      )}

      {/* Entries List */}
      <FlatList
        data={entries}
        renderItem={renderEntryItem}
        keyExtractor={(item: DailyEntry) => item._id}
        contentContainerStyle={{ paddingVertical: 8, paddingBottom: 20 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center py-20">
            <Ionicons name="receipt-outline" size={64} color="#D1D5DB" />
            <Text className="text-gray-400 mt-4 text-center">
              {loading ? 'Loading entries...' : 'No payment entries found.\nTry adjusting your filters.'}
            </Text>
          </View>
        }
      />
    </View>
  );
}
