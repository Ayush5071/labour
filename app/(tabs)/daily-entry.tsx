import { View, Text, ScrollView, TouchableOpacity, Alert, TextInput, Modal, FlatList } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { workerApi, entryApi } from '../../services/api';
import { Worker } from '../../types';

export default function DailyEntryScreen() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [filteredWorkers, setFilteredWorkers] = useState<Worker[]>([]);
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [hoursWorked, setHoursWorked] = useState('');
  const [notes, setNotes] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showWorkerModal, setShowWorkerModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [calculatedPay, setCalculatedPay] = useState<{
    regularHours: number;
    overtimeHours: number;
    regularPay: number;
    overtimePay: number;
    totalPay: number;
  } | null>(null);

  useFocusEffect(
    useCallback(() => {
      fetchWorkers();
    }, [])
  );

  useEffect(() => {
    // Filter workers based on search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const filtered = workers.filter(
        (w) =>
          w.name.toLowerCase().includes(query) ||
          w.workerId.toLowerCase().includes(query)
      );
      setFilteredWorkers(filtered);
    } else {
      setFilteredWorkers(workers);
    }
  }, [searchQuery, workers]);

  const fetchWorkers = async () => {
    try {
      const response = await workerApi.getAll(true);
      setWorkers(response.data);
      setFilteredWorkers(response.data);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to fetch workers');
    }
  };

  useEffect(() => {
    calculatePay();
  }, [selectedWorker, hoursWorked]);

  const calculatePay = () => {
    if (!selectedWorker || !hoursWorked || isNaN(parseFloat(hoursWorked))) {
      setCalculatedPay(null);
      return;
    }

    const hours = parseFloat(hoursWorked);
    const regularHours = Math.min(hours, selectedWorker.dailyWorkingHours);
    const overtimeHours = Math.max(0, hours - selectedWorker.dailyWorkingHours);
    const hourlyRate = selectedWorker.dailyPay / selectedWorker.dailyWorkingHours;
    const regularPay = regularHours * hourlyRate;
    const overtimePay = overtimeHours * hourlyRate * selectedWorker.overtimeRate;
    const totalPay = regularPay + overtimePay;

    setCalculatedPay({
      regularHours,
      overtimeHours,
      regularPay,
      overtimePay,
      totalPay,
    });
  };

  const handleSubmit = async () => {
    if (!selectedWorker) {
      Alert.alert('Error', 'Please select a worker');
      return;
    }
    if (!hoursWorked || isNaN(parseFloat(hoursWorked)) || parseFloat(hoursWorked) <= 0) {
      Alert.alert('Error', 'Please enter valid hours worked');
      return;
    }

    try {
      setLoading(true);
      await entryApi.create({
        workerId: selectedWorker._id,
        date: selectedDate.toISOString(),
        hoursWorked: parseFloat(hoursWorked),
        notes: notes.trim() || undefined,
      });

      // Show success toast
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);

      // Reset form
      setSelectedWorker(null);
      setHoursWorked('');
      setNotes('');
      setCalculatedPay(null);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || error.message || 'Failed to create entry');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleDateChange = (event: any, date?: Date) => {
    setShowDatePicker(false);
    if (date) {
      setSelectedDate(date);
    }
  };

  const renderWorkerItem = ({ item }: { item: Worker }) => (
    <TouchableOpacity
      className={`p-4 border-b border-gray-100 ${
        selectedWorker?._id === item._id ? 'bg-blue-50' : ''
      }`}
      onPress={() => {
        setSelectedWorker(item);
        setShowWorkerModal(false);
        setSearchQuery('');
      }}
    >
      <View className="flex-row justify-between items-center">
        <View className="flex-1">
          <Text className="font-semibold text-gray-800 text-base">{item.name}</Text>
          <Text className="text-sm text-gray-500 mt-1">ID: {item.workerId}</Text>
        </View>
        <View className="items-end">
          <Text className="text-sm font-medium text-green-600">₹{item.dailyPay}/day</Text>
          <Text className="text-xs text-gray-400">{item.dailyWorkingHours}h/day</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-gray-50">
      {/* Success Toast */}
      {showSuccessToast && (
        <View className="absolute top-4 left-4 right-4 z-50 bg-green-500 p-4 rounded-xl flex-row items-center shadow-lg">
          <Ionicons name="checkmark-circle" size={24} color="#fff" />
          <Text className="text-white font-semibold ml-2 flex-1">Entry recorded successfully!</Text>
          <TouchableOpacity onPress={() => setShowSuccessToast(false)}>
            <Ionicons name="close" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
        <View className="p-4">
          {/* Worker Selection Card */}
          <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
            <Text className="text-sm font-semibold text-gray-600 mb-2">Select Worker</Text>
            <TouchableOpacity
              className="border border-gray-200 rounded-lg p-3 flex-row justify-between items-center bg-gray-50"
              onPress={() => setShowWorkerModal(true)}
            >
              {selectedWorker ? (
                <View className="flex-row items-center flex-1">
                  <View className="bg-blue-100 w-10 h-10 rounded-full items-center justify-center mr-3">
                    <Text className="text-blue-600 font-bold">{selectedWorker.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View>
                    <Text className="text-gray-800 font-medium">{selectedWorker.name}</Text>
                    <Text className="text-xs text-gray-500">{selectedWorker.workerId}</Text>
                  </View>
                </View>
              ) : (
                <Text className="text-gray-400">Tap to select a worker</Text>
              )}
              <Ionicons name="chevron-forward" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Date Selection */}
          <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
            <Text className="text-sm font-semibold text-gray-600 mb-2">Date</Text>
            <TouchableOpacity
              className="border border-gray-200 rounded-lg p-3 flex-row justify-between items-center bg-gray-50"
              onPress={() => setShowDatePicker(true)}
            >
              <View className="flex-row items-center">
                <View className="bg-blue-100 w-10 h-10 rounded-full items-center justify-center mr-3">
                  <Ionicons name="calendar" size={20} color="#3B82F6" />
                </View>
                <Text className="text-gray-800 font-medium">{formatDate(selectedDate)}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Native Date Picker */}
          {showDatePicker && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display="default"
              onChange={handleDateChange}
            />
          )}

          {/* Hours Worked */}
          <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
            <Text className="text-sm font-semibold text-gray-600 mb-2">Hours Worked</Text>
            <View className="flex-row items-center border border-gray-200 rounded-lg bg-gray-50">
              <View className="bg-blue-100 w-12 h-12 rounded-l-lg items-center justify-center">
                <Ionicons name="time" size={20} color="#3B82F6" />
              </View>
              <TextInput
                className="flex-1 px-3 py-3 text-gray-800"
                placeholder="Enter hours (e.g., 8.5)"
                keyboardType="decimal-pad"
                value={hoursWorked}
                onChangeText={setHoursWorked}
                placeholderTextColor="#9CA3AF"
              />
            </View>
            {selectedWorker && (
              <Text className="text-xs text-gray-500 mt-2">
                📋 Standard: {selectedWorker.dailyWorkingHours}h/day | OT Rate: {selectedWorker.overtimeRate}x
              </Text>
            )}
          </View>

          {/* Notes */}
          <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
            <Text className="text-sm font-semibold text-gray-600 mb-2">Notes (Optional)</Text>
            <TextInput
              className="border border-gray-200 rounded-lg p-3 text-gray-800 bg-gray-50 min-h-[60px]"
              placeholder="Add any notes about this entry..."
              multiline
              numberOfLines={2}
              value={notes}
              onChangeText={setNotes}
              textAlignVertical="top"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          {/* Pay Calculation Preview */}
          {calculatedPay && (
            <View className="bg-blue-50 rounded-xl p-4 mb-4 border border-blue-100">
              <View className="flex-row items-center mb-3">
                <Ionicons name="calculator" size={20} color="#3B82F6" />
                <Text className="text-sm font-bold text-blue-800 ml-2">Pay Calculation</Text>
              </View>

              <View className="bg-white rounded-lg p-3 mb-2">
                <View className="flex-row justify-between mb-2">
                  <Text className="text-sm text-gray-600">Regular Hours:</Text>
                  <Text className="text-sm font-medium">{calculatedPay.regularHours.toFixed(1)}h</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-sm text-gray-600">Regular Pay:</Text>
                  <Text className="text-sm font-medium text-green-600">₹{calculatedPay.regularPay.toFixed(2)}</Text>
                </View>
              </View>

              {calculatedPay.overtimeHours > 0 && (
                <View className="bg-orange-50 rounded-lg p-3 mb-2">
                  <View className="flex-row justify-between mb-2">
                    <Text className="text-sm text-gray-600">Overtime Hours:</Text>
                    <Text className="text-sm font-medium text-orange-600">{calculatedPay.overtimeHours.toFixed(1)}h</Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-sm text-gray-600">OT Pay ({selectedWorker?.overtimeRate}x):</Text>
                    <Text className="text-sm font-medium text-orange-600">₹{calculatedPay.overtimePay.toFixed(2)}</Text>
                  </View>
                </View>
              )}

              <View className="bg-blue-500 rounded-lg p-3 flex-row justify-between items-center">
                <Text className="font-bold text-white">Total Pay</Text>
                <Text className="font-bold text-white text-xl">₹{calculatedPay.totalPay.toFixed(2)}</Text>
              </View>
            </View>
          )}

          {/* Submit Button */}
          <TouchableOpacity
            className={`rounded-xl p-4 items-center flex-row justify-center ${loading ? 'bg-gray-400' : 'bg-blue-500'}`}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <Text className="text-white font-bold text-lg">Submitting...</Text>
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={24} color="#fff" />
                <Text className="text-white font-bold text-lg ml-2">Submit Entry</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Worker Selection Modal */}
      <Modal
        visible={showWorkerModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowWorkerModal(false)}
      >
        <View className="flex-1 bg-white">
          {/* Modal Header */}
          <View className="bg-blue-500 px-4 pt-12 pb-4">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-bold text-white">Select Worker</Text>
              <TouchableOpacity onPress={() => {
                setShowWorkerModal(false);
                setSearchQuery('');
              }}>
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View className="bg-white rounded-lg flex-row items-center px-3">
              <Ionicons name="search" size={20} color="#6B7280" />
              <TextInput
                className="flex-1 px-3 py-3 text-gray-800"
                placeholder="Search by name or ID..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor="#9CA3AF"
                autoCapitalize="none"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Worker List */}
          <FlatList
            data={filteredWorkers}
            renderItem={renderWorkerItem}
            keyExtractor={(item: Worker) => item._id}
            contentContainerStyle={{ paddingBottom: 20 }}
            ListEmptyComponent={
              <View className="items-center justify-center py-20">
                <Ionicons name="people-outline" size={64} color="#D1D5DB" />
                <Text className="text-gray-400 mt-4 text-center">
                  {workers.length === 0 ? 'No workers added yet' : 'No workers match your search'}
                </Text>
              </View>
            }
          />
        </View>
      </Modal>
    </View>
  );
}
