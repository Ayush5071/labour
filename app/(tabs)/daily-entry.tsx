import { View, Text, ScrollView, TouchableOpacity, Alert, TextInput, Modal, RefreshControl, Platform } from 'react-native';
import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { entryApi } from '../../services/api';
import { DailyWorkersData } from '../../types';

interface WorkerEntry {
  workerId: string;
  name: string;
  hourlyRate: number;
  dailyWorkingHours: number;
  status: 'present' | 'absent' | 'holiday' | 'half-day';
  hoursWorked: string;
  totalPay: number;
  hasEntry: boolean;
}

export default function DailyEntryScreen() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [entries, setEntries] = useState<WorkerEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isHoliday, setIsHoliday] = useState(false);
  const [holidayName, setHolidayName] = useState('');
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Web date inputs
  const [webDay, setWebDay] = useState(selectedDate.getDate().toString());
  const [webMonth, setWebMonth] = useState((selectedDate.getMonth() + 1).toString());
  const [webYear, setWebYear] = useState(selectedDate.getFullYear().toString());

  // Toast
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  useFocusEffect(
    useCallback(() => {
      fetchDailyData();
    }, [selectedDate])
  );

  const fetchDailyData = async () => {
    try {
      setLoading(true);
      const dateStr = selectedDate.toISOString().split('T')[0];
      const response = await entryApi.getDaily(dateStr);
      const data: DailyWorkersData = response.data;

      setIsHoliday(data.isHoliday);
      if (data.holiday) {
        setHolidayName(data.holiday.name);
      }

      const workerEntries: WorkerEntry[] = data.workers.map((w) => {
        if (w.entry) {
          return {
            workerId: w.worker._id,
            name: w.worker.name,
            hourlyRate: w.worker.hourlyRate,
            dailyWorkingHours: w.worker.dailyWorkingHours,
            status: w.entry.status,
            hoursWorked: w.entry.hoursWorked.toString(),
            totalPay: w.entry.totalPay,
            hasEntry: true,
          };
        }
        return {
          workerId: w.worker._id,
          name: w.worker.name,
          hourlyRate: w.worker.hourlyRate,
          dailyWorkingHours: w.worker.dailyWorkingHours,
          status: 'present',
          hoursWorked: w.worker.dailyWorkingHours.toString(),
          totalPay: w.worker.hourlyRate * w.worker.dailyWorkingHours,
          hasEntry: false,
        };
      });

      setEntries(workerEntries);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const updateEntry = (index: number, field: string, value: any) => {
    const updated = [...entries];
    updated[index] = { ...updated[index], [field]: value };

    // Recalculate pay
    if (field === 'hoursWorked' || field === 'status') {
      const entry = updated[index];
      const hours = parseFloat(entry.hoursWorked) || 0;
      const hourlyRate = entry.hourlyRate;

      if (entry.status === 'present' || entry.status === 'holiday') {
        entry.totalPay = hours * hourlyRate;
      } else if (entry.status === 'half-day') {
        entry.totalPay = hourlyRate * (entry.dailyWorkingHours / 2);
        entry.hoursWorked = (entry.dailyWorkingHours / 2).toString();
      } else {
        entry.totalPay = 0;
        entry.hoursWorked = '0';
      }
    }

    setEntries(updated);
  };

  const markAllPresent = () => {
    const updated = entries.map((e) => ({
      ...e,
      status: 'present' as const,
      hoursWorked: e.dailyWorkingHours.toString(),
      totalPay: e.hourlyRate * e.dailyWorkingHours,
    }));
    setEntries(updated);
  };

  const markAllAbsent = () => {
    const updated = entries.map((e) => ({
      ...e,
      status: 'absent' as const,
      hoursWorked: '0',
      totalPay: 0,
    }));
    setEntries(updated);
  };

  const handleMarkHoliday = async () => {
    if (!holidayName.trim()) {
      Alert.alert('Error', 'Please enter holiday name');
      return;
    }

    try {
      setSaving(true);
      await entryApi.markHoliday({
        date: selectedDate.toISOString().split('T')[0],
        holidayName: holidayName.trim(),
      });
      setShowHolidayModal(false);
      fetchDailyData();
      showNotification('Holiday marked for all workers', 'success');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to mark holiday');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const entriesToSave = entries.map((e) => ({
        workerId: e.workerId,
        status: e.status,
        hoursWorked: parseFloat(e.hoursWorked) || 0,
      }));

      await entryApi.bulkCreate({
        date: selectedDate.toISOString().split('T')[0],
        entries: entriesToSave,
      });

      showNotification('Entries saved successfully', 'success');
      fetchDailyData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save entries');
    } finally {
      setSaving(false);
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

  const changeDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
    setWebDay(newDate.getDate().toString());
    setWebMonth((newDate.getMonth() + 1).toString());
    setWebYear(newDate.getFullYear().toString());
  };

  const onDateChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (date) {
      setSelectedDate(date);
      setWebDay(date.getDate().toString());
      setWebMonth((date.getMonth() + 1).toString());
      setWebYear(date.getFullYear().toString());
    }
  };

  const openDateModal = () => {
    setWebDay(selectedDate.getDate().toString());
    setWebMonth((selectedDate.getMonth() + 1).toString());
    setWebYear(selectedDate.getFullYear().toString());
    setShowDateModal(true);
  };

  const applyWebDate = () => {
    const day = parseInt(webDay);
    const month = parseInt(webMonth);
    const year = parseInt(webYear);

    if (isNaN(day) || isNaN(month) || isNaN(year)) {
      showNotification('Please enter valid numbers for date', 'error');
      return;
    }
    if (month < 1 || month > 12) {
      showNotification('Month must be between 1 and 12', 'error');
      return;
    }
    if (year < 2000 || year > 2100) {
      showNotification('Year must be between 2000 and 2100', 'error');
      return;
    }
    const daysInMonth = new Date(year, month, 0).getDate();
    if (day < 1 || day > daysInMonth) {
      showNotification(`Day must be between 1 and ${daysInMonth} for this month`, 'error');
      return;
    }

    const newDate = new Date(year, month - 1, day);
    if (isNaN(newDate.getTime())) {
      showNotification('Invalid date. Please check your input.', 'error');
      return;
    }

    setSelectedDate(newDate);
    setShowDateModal(false);
  };

  const totalPay = entries.reduce((sum, e) => sum + e.totalPay, 0);
  const presentCount = entries.filter((e) => e.status === 'present' || e.status === 'holiday').length;
  const absentCount = entries.filter((e) => e.status === 'absent').length;

  return (
    <View className="flex-1 bg-gray-50">
      {/* Toast */}
      {showToast && (
        <View className={`absolute top-4 left-4 right-4 z-50 p-3 rounded-lg flex-row items-center shadow-lg ${toastType === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
          <Ionicons name={toastType === 'success' ? 'checkmark-circle' : 'alert-circle'} size={20} color="#fff" />
          <Text className="text-white font-semibold ml-2 flex-1 text-sm">{toastMessage}</Text>
          <TouchableOpacity onPress={() => setShowToast(false)}>
            <Ionicons name="close" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      {/* Date Selector */}
      <View className="bg-white px-4 py-3 flex-row items-center justify-between border-b border-gray-200">
        <TouchableOpacity onPress={() => changeDate(-1)} className="p-2">
          <Ionicons name="chevron-back" size={24} color="#3B82F6" />
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={() => Platform.OS === 'web' ? openDateModal() : setShowDatePicker(true)}
          className="flex-row items-center bg-blue-50 px-4 py-2 rounded-lg"
        >
          <Ionicons name="calendar" size={18} color="#3B82F6" />
          <Text className="ml-2 text-blue-600 font-semibold">{formatDate(selectedDate)}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => changeDate(1)} className="p-2">
          <Ionicons name="chevron-forward" size={24} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      {showDatePicker && Platform.OS !== 'web' && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display={Platform.OS === 'android' ? 'calendar' : 'default'}
          onChange={onDateChange}
        />
      )}

      {/* Summary Bar */}
      <View className="bg-white px-4 py-2 flex-row justify-between border-b border-gray-200">
        <View className="flex-row items-center">
          <View className="bg-green-100 px-2 py-1 rounded mr-2">
            <Text className="text-green-700 text-xs font-medium">P: {presentCount}</Text>
          </View>
          <View className="bg-red-100 px-2 py-1 rounded">
            <Text className="text-red-700 text-xs font-medium">A: {absentCount}</Text>
          </View>
        </View>
        <Text className="text-gray-700 font-semibold">Total: ₹{totalPay.toLocaleString()}</Text>
      </View>

      {/* Quick Actions */}
      <View className="bg-white px-4 py-2 flex-row justify-between border-b border-gray-200">
        <TouchableOpacity onPress={markAllPresent} className="bg-green-500 px-3 py-1.5 rounded">
          <Text className="text-white text-xs font-medium">All Present</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={markAllAbsent} className="bg-red-500 px-3 py-1.5 rounded">
          <Text className="text-white text-xs font-medium">All Absent</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowHolidayModal(true)} className="bg-purple-500 px-3 py-1.5 rounded">
          <Text className="text-white text-xs font-medium">Mark Holiday</Text>
        </TouchableOpacity>
      </View>

      {isHoliday && (
        <View className="bg-purple-100 px-4 py-2">
          <Text className="text-purple-700 text-center font-medium">🎉 {holidayName || 'Holiday'}</Text>
        </View>
      )}

      {/* Worker List */}
      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchDailyData(); }} />}
      >
        {loading ? (
          <View className="p-8 items-center">
            <Text className="text-gray-500">Loading...</Text>
          </View>
        ) : (
          entries.map((entry, index) => (
            <View
              key={entry.workerId}
              className={`mx-3 my-1 p-3 rounded-lg border ${
                entry.hasEntry ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'
              }`}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="font-semibold text-gray-800" numberOfLines={1}>
                    {entry.name}
                  </Text>
                  <Text className="text-xs text-gray-500">₹{entry.hourlyRate}/hr · ₹{(entry.hourlyRate * entry.dailyWorkingHours).toFixed(0)}/day</Text>
                </View>

                {/* Status Buttons */}
                <View className="flex-row items-center space-x-1">
                  <TouchableOpacity
                    onPress={() => updateEntry(index, 'status', 'present')}
                    className={`px-2 py-1 rounded ${
                      entry.status === 'present' ? 'bg-green-500' : 'bg-gray-200'
                    }`}
                  >
                    <Text className={`text-xs ${entry.status === 'present' ? 'text-white' : 'text-gray-600'}`}>P</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => updateEntry(index, 'status', 'absent')}
                    className={`px-2 py-1 rounded ${
                      entry.status === 'absent' ? 'bg-red-500' : 'bg-gray-200'
                    }`}
                  >
                    <Text className={`text-xs ${entry.status === 'absent' ? 'text-white' : 'text-gray-600'}`}>A</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => updateEntry(index, 'status', 'half-day')}
                    className={`px-2 py-1 rounded ${
                      entry.status === 'half-day' ? 'bg-yellow-500' : 'bg-gray-200'
                    }`}
                  >
                    <Text className={`text-xs ${entry.status === 'half-day' ? 'text-white' : 'text-gray-600'}`}>½</Text>
                  </TouchableOpacity>
                </View>

                {/* Hours Input */}
                <TextInput
                  value={entry.hoursWorked}
                  onChangeText={(val) => updateEntry(index, 'hoursWorked', val)}
                  keyboardType="decimal-pad"
                  className="w-12 border border-gray-300 rounded px-2 py-1 text-center mx-2"
                  editable={entry.status === 'present'}
                />

                {/* Pay Display */}
                <Text className="w-16 text-right font-semibold text-gray-700">
                  ₹{entry.totalPay.toLocaleString()}
                </Text>
              </View>
            </View>
          ))
        )}
        <View className="h-20" />
      </ScrollView>

      {/* Save Button */}
      <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          className={`py-3 rounded-lg ${saving ? 'bg-gray-400' : 'bg-blue-500'}`}
        >
          <Text className="text-white text-center font-semibold">
            {saving ? 'Saving...' : 'Save All Entries'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Web Date Modal */}
      <Modal visible={showDateModal} transparent animationType="fade">
        <View className="flex-1 bg-black/50 justify-center items-center px-4">
          <View className="bg-white rounded-xl p-5 w-full max-w-sm">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-lg font-bold text-blue-600">Select Date</Text>
              <TouchableOpacity onPress={() => setShowDateModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <Text className="text-gray-600 text-sm mb-2">Day (1-31)</Text>
            <TextInput
              value={webDay}
              onChangeText={setWebDay}
              keyboardType="number-pad"
              placeholder="Day"
              maxLength={2}
              className="border border-gray-300 rounded-lg px-4 py-3 mb-3 text-center text-lg"
            />

            <Text className="text-gray-600 text-sm mb-2">Month</Text>
            <View className="flex-row flex-wrap mb-3">
              {months.map((m, i) => (
                <TouchableOpacity
                  key={m}
                  onPress={() => setWebMonth((i + 1).toString())}
                  className={`px-3 py-2 m-1 rounded-lg ${parseInt(webMonth) === i + 1 ? 'bg-blue-500' : 'bg-gray-100'}`}
                >
                  <Text className={`text-sm ${parseInt(webMonth) === i + 1 ? 'text-white font-bold' : 'text-gray-700'}`}>{m}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text className="text-gray-600 text-sm mb-2">Year</Text>
            <TextInput
              value={webYear}
              onChangeText={setWebYear}
              keyboardType="number-pad"
              placeholder="Year"
              maxLength={4}
              className="border border-gray-300 rounded-lg px-4 py-3 mb-4 text-center text-lg"
            />

            <View className="flex-row justify-center mb-4 space-x-2">
              <TouchableOpacity
                onPress={() => {
                  const today = new Date();
                  setWebDay(today.getDate().toString());
                  setWebMonth((today.getMonth() + 1).toString());
                  setWebYear(today.getFullYear().toString());
                }}
                className="bg-gray-100 px-4 py-2 rounded-lg"
              >
                <Text className="text-gray-700 text-sm">Today</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  const yesterday = new Date();
                  yesterday.setDate(yesterday.getDate() - 1);
                  setWebDay(yesterday.getDate().toString());
                  setWebMonth((yesterday.getMonth() + 1).toString());
                  setWebYear(yesterday.getFullYear().toString());
                }}
                className="bg-gray-100 px-4 py-2 rounded-lg"
              >
                <Text className="text-gray-700 text-sm">Yesterday</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={applyWebDate} className="bg-blue-500 py-3 rounded-lg">
              <Text className="text-white text-center font-semibold">Apply Date</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Holiday Modal */}
      <Modal visible={showHolidayModal} transparent animationType="fade">
        <View className="flex-1 bg-black/50 justify-center items-center px-4">
          <View className="bg-white rounded-lg p-6 w-full max-w-sm">
            <Text className="text-lg font-bold mb-4">Mark as Holiday</Text>
            <TextInput
              value={holidayName}
              onChangeText={setHolidayName}
              placeholder="Holiday name (e.g., Diwali)"
              className="border border-gray-300 rounded-lg px-4 py-3 mb-4"
            />
            <Text className="text-xs text-gray-500 mb-4">
              All workers will get full day pay for 8 hours.
            </Text>
            <View className="flex-row justify-end space-x-2">
              <TouchableOpacity onPress={() => setShowHolidayModal(false)} className="px-4 py-2">
                <Text className="text-gray-600">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleMarkHoliday}
                disabled={saving}
                className="bg-purple-500 px-4 py-2 rounded-lg"
              >
                <Text className="text-white font-medium">{saving ? 'Saving...' : 'Mark Holiday'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
