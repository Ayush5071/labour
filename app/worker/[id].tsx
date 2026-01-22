import { View, Text, TextInput, ScrollView, TouchableOpacity, Alert, Switch } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { workersApi } from '../../services/api';
import { Worker } from '../../types';

export default function EditWorkerScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(false);
  const [fetchingWorker, setFetchingWorker] = useState(true);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [formData, setFormData] = useState({
    workerId: '',
    name: '',
    dailyWorkingHours: '8',
    hourlyRate: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    isActive: true,
  });

  useEffect(() => {
    fetchWorker();
  }, [id]);

  const fetchWorker = async () => {
    try {
      setFetchingWorker(true);
      const response = await workersApi.getById(id);
      const worker: Worker = response.data;
      
      setFormData({
        workerId: worker.workerId,
        name: worker.name,
        dailyWorkingHours: worker.dailyWorkingHours.toString(),
        hourlyRate: worker.hourlyRate?.toString() || '',
        bankName: worker.bankDetails?.bankName || '',
        accountNumber: worker.bankDetails?.accountNumber || '',
        ifscCode: worker.bankDetails?.ifscCode || '',
        isActive: worker.isActive,
      });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to fetch worker details');
      router.back();
    } finally {
      setFetchingWorker(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.workerId.trim()) {
      Alert.alert('Error', 'Worker ID is required');
      return;
    }
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }
    if (!formData.hourlyRate || isNaN(parseFloat(formData.hourlyRate))) {
      Alert.alert('Error', 'Valid hourly rate is required');
      return;
    }

    try {
      setLoading(true);
      await workersApi.update(id, {
        workerId: formData.workerId.trim(),
        name: formData.name.trim(),
        dailyWorkingHours: parseFloat(formData.dailyWorkingHours) || 8,
        hourlyRate: parseFloat(formData.hourlyRate),
        bankDetails: {
          bankName: formData.bankName.trim() || undefined,
          accountNumber: formData.accountNumber.trim() || undefined,
          ifscCode: formData.ifscCode.trim() || undefined,
        },
        isActive: formData.isActive,
      });

      // Show success toast
      setShowSuccessToast(true);
      setTimeout(() => {
        setShowSuccessToast(false);
        router.back();
      }, 2000);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || error.message || 'Failed to update worker');
    } finally {
      setLoading(false);
    }
  };

  if (fetchingWorker) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center">
        <Text className="text-gray-500">Loading worker details...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Success Toast */}
      {showSuccessToast && (
        <View className="absolute top-4 left-4 right-4 z-50 bg-green-500 p-4 rounded-xl flex-row items-center shadow-lg">
          <Ionicons name="checkmark-circle" size={24} color="#fff" />
          <Text className="text-white font-semibold ml-2 flex-1">Worker updated successfully!</Text>
        </View>
      )}

      <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
      <View className="p-4">
        {/* Basic Info Section */}
        <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
          <Text className="text-lg font-bold text-gray-800 mb-4">Basic Information</Text>
          
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-1">
              Worker ID <Text className="text-red-500">*</Text>
            </Text>
            <TextInput
              className="border border-gray-300 rounded-lg px-3 py-3 text-gray-800 bg-white"
              value={formData.workerId}
              onChangeText={(text: any) => setFormData(prev => ({ ...prev, workerId: text }))}
              placeholder="e.g., EMP001"
              placeholderTextColor="#9CA3AF"
            />
          </View>
          
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-1">
              Full Name <Text className="text-red-500">*</Text>
            </Text>
            <TextInput
              className="border border-gray-300 rounded-lg px-3 py-3 text-gray-800 bg-white"
              value={formData.name}
              onChangeText={(text: any) => setFormData(prev => ({ ...prev, name: text }))}
              placeholder="Enter worker name"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          {/* Active Status Toggle */}
          <View className="flex-row justify-between items-center mt-2">
            <Text className="text-sm font-medium text-gray-700">Active Status</Text>
            <Switch
              value={formData.isActive}
              onValueChange={(value: any) => setFormData(prev => ({ ...prev, isActive: value }))}
              trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
              thumbColor={formData.isActive ? '#3B82F6' : '#9CA3AF'}
            />
          </View>
        </View>

        {/* Pay Info Section */}
        <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
          <Text className="text-lg font-bold text-gray-800 mb-4">Pay Information</Text>
          
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-1">Daily Working Hours</Text>
            <TextInput
              className="border border-gray-300 rounded-lg px-3 py-3 text-gray-800 bg-white"
              value={formData.dailyWorkingHours}
              onChangeText={(text: any) => setFormData(prev => ({ ...prev, dailyWorkingHours: text }))}
              placeholder="8"
              keyboardType="decimal-pad"
              placeholderTextColor="#9CA3AF"
            />
          </View>
          
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-1">
              Hourly Rate (₹/hr) <Text className="text-red-500">*</Text>
            </Text>
            <TextInput
              className="border border-gray-300 rounded-lg px-3 py-3 text-gray-800 bg-white"
              value={formData.hourlyRate}
              onChangeText={(text: any) => setFormData(prev => ({ ...prev, hourlyRate: text }))}
              placeholder="Enter hourly rate"
              keyboardType="decimal-pad"
              placeholderTextColor="#9CA3AF"
            />
          </View>
          <Text className="text-xs text-gray-500 -mt-2">
            Daily pay = Hourly Rate × Daily Hours
          </Text>
        </View>

        {/* Bank Details Section */}
        <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
          <Text className="text-lg font-bold text-gray-800 mb-4">Bank Details (Optional)</Text>
          
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-1">Bank Name</Text>
            <TextInput
              className="border border-gray-300 rounded-lg px-3 py-3 text-gray-800 bg-white"
              value={formData.bankName}
              onChangeText={(text: any) => setFormData(prev => ({ ...prev, bankName: text }))}
              placeholder="e.g., State Bank of India"
              placeholderTextColor="#9CA3AF"
            />
          </View>
          
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-1">Account Number</Text>
            <TextInput
              className="border border-gray-300 rounded-lg px-3 py-3 text-gray-800 bg-white"
              value={formData.accountNumber}
              onChangeText={(text: any) => setFormData(prev => ({ ...prev, accountNumber: text }))}
              placeholder="Enter account number"
              keyboardType="number-pad"
              placeholderTextColor="#9CA3AF"
            />
          </View>
          
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-1">IFSC Code</Text>
            <TextInput
              className="border border-gray-300 rounded-lg px-3 py-3 text-gray-800 bg-white"
              value={formData.ifscCode}
              onChangeText={(text: string) => setFormData(prev => ({ ...prev, ifscCode: text.toUpperCase() }))}
              placeholder="e.g., SBIN0001234"
              placeholderTextColor="#9CA3AF"
            />
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          className={`rounded-xl p-4 items-center flex-row justify-center ${loading ? 'bg-gray-400' : 'bg-blue-500'}`}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <Text className="text-white font-bold text-lg">Updating Worker...</Text>
          ) : (
            <>
              <Ionicons name="save" size={24} color="#fff" />
              <Text className="text-white font-bold text-lg ml-2">Update Worker</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
    </View>
  );
}
