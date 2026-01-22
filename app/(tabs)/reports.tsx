import { View, Text, ScrollView, TouchableOpacity, Alert, TextInput, Modal, RefreshControl, Platform } from 'react-native';
import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { reportApi, advanceApi } from '../../services/api';
import { saveAndShareFile } from '../../utils/fileExport';

type WorkerSummary = {
  worker: {
    _id: string;
    workerId: string;
    name: string;
    hourlyRate: number;
    advanceBalance: number;
  };
  totalHoursWorked: number;
  totalPay: number;
  totalAdvanceTaken: number;
  totalDeposit: number;
  finalAmount: number;
};

export default function ReportsScreen() {
  const currentDate = new Date();
  const [startDate, setStartDate] = useState(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1));
  const [endDate, setEndDate] = useState(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0));
  const [showDateModal, setShowDateModal] = useState(false);
  
  // Date picker states
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [tempStartDate, setTempStartDate] = useState<Date | null>(startDate);
  const [tempEndDate, setTempEndDate] = useState<Date | null>(endDate);
  const [showZeros, setShowZeros] = useState(false);

  // Web date inputs
  const [startDay, setStartDay] = useState('1');
  const [startMonth, setStartMonth] = useState((currentDate.getMonth() + 1).toString());
  const [startYear, setStartYear] = useState(currentDate.getFullYear().toString());
  const [endDay, setEndDay] = useState(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate().toString());
  const [endMonth, setEndMonth] = useState((currentDate.getMonth() + 1).toString());
  const [endYear, setEndYear] = useState(currentDate.getFullYear().toString());
  
  const [report, setReport] = useState<WorkerSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  // Deposit modal
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<WorkerSummary | null>(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositNotes, setDepositNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  useFocusEffect(
    useCallback(() => {
      fetchReport();
    }, [startDate, endDate])
  );

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 3000);
  };

  const formatDateForApi = (date: Date) => date.toISOString().split('T')[0];
  const formatDate = (date: Date | null) => date ? date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '';

  const validateDate = (day: string, month: string, year: string): Date | null => {
    const d = parseInt(day);
    const m = parseInt(month);
    const y = parseInt(year);

    if (isNaN(d) || isNaN(m) || isNaN(y)) return null;
    if (m < 1 || m > 12) return null;
    if (y < 2000 || y > 2100) return null;
    
    const daysInMonth = new Date(y, m, 0).getDate();
    if (d < 1 || d > daysInMonth) return null;

    const date = new Date(y, m - 1, d);
    return isNaN(date.getTime()) ? null : date;
  };

  const fetchReport = async () => {
    try {
      setLoading(true);
      const reportRes = await reportApi.getAllWorkersSummary({ 
        startDate: formatDateForApi(startDate), 
        endDate: formatDateForApi(endDate) 
      });
      setReport(reportRes.data.report || []);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to fetch report');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleDeposit = async () => {
    if (!selectedWorker || !depositAmount) {
      Alert.alert('Error', 'Please enter amount');
      return;
    }

    try {
      setSaving(true);
      await advanceApi.recordDeposit({
        workerId: selectedWorker.worker._id,
        amount: parseFloat(depositAmount),
        notes: depositNotes.trim() || 'Deposit from reports',
      });
      showToast('Deposit recorded successfully');
      setShowDepositModal(false);
      setDepositAmount('');
      setDepositNotes('');
      setSelectedWorker(null);
      fetchReport();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to record deposit');
    } finally {
      setSaving(false);
    }
  };

  const exportToExcel = async () => {
    try {
      setExporting(true);
      const response = await reportApi.exportWorkSummaryExcel({ 
        startDate: formatDateForApi(startDate), 
        endDate: formatDateForApi(endDate) 
      });
      const { base64, filename } = response.data;

      await saveAndShareFile(
        base64,
        filename,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Export Work Summary Report'
      );
      showToast('Excel file exported!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to export report');
    } finally {
      setExporting(false);
    }
  };

  const getTotalHours = () => report.reduce((sum, item) => sum + item.totalHoursWorked, 0);
  const getTotalAmount = () => report.reduce((sum, item) => sum + item.totalPay, 0);
  const getTotalAdvance = () => report.reduce((sum, item) => sum + (item.totalAdvanceTaken || 0), 0);
  const getTotalDeposit = () => report.reduce((sum, item) => sum + item.totalDeposit, 0);
  const getTotalFinal = () => report.reduce((sum, item) => sum + item.finalAmount, 0);

  const getDateRangeLabel = () => `${formatDate(startDate)} - ${formatDate(endDate)}`;

  const onStartDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowStartPicker(false);
    if (selectedDate) setTempStartDate(selectedDate);
  };

  const onEndDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowEndPicker(false);
    if (selectedDate) setTempEndDate(selectedDate);
  };

  const applyDateRange = () => {
    if (Platform.OS === 'web') {
      const newStart = validateDate(startDay, startMonth, startYear);
      const newEnd = validateDate(endDay, endMonth, endYear);
      
      if (!newStart) {
        showToast('Invalid start date. Please check day, month and year.', 'error');
        return;
      }
      if (!newEnd) {
        showToast('Invalid end date. Please check day, month and year.', 'error');
        return;
      }
      if (newStart > newEnd) {
        showToast('Start date must be before end date', 'error');
        return;
      }
      
      setStartDate(newStart);
      setEndDate(newEnd);
      setShowDateModal(false);
    } else {
      if (!tempStartDate || !tempEndDate) {
        Alert.alert('Error', 'Please select both start and end dates');
        return;
      }
      if (tempStartDate > tempEndDate) {
        Alert.alert('Error', 'Start date must be before end date');
        return;
      }
      setStartDate(tempStartDate);
      setEndDate(tempEndDate);
      setShowDateModal(false);
    }
  }; 

  const openDateModal = () => {
    setTempStartDate(startDate);
    setTempEndDate(endDate);
    // Set web inputs
    setStartDay(startDate.getDate().toString());
    setStartMonth((startDate.getMonth() + 1).toString());
    setStartYear(startDate.getFullYear().toString());
    setEndDay(endDate.getDate().toString());
    setEndMonth((endDate.getMonth() + 1).toString());
    setEndYear(endDate.getFullYear().toString());
    setShowDateModal(true);
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* Success Toast */}
      {showSuccessToast && (
        <View className={`absolute top-4 left-4 right-4 z-50 p-3 rounded-lg flex-row items-center shadow-lg ${toastType === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
          <Ionicons name={toastType === 'success' ? 'checkmark-circle' : 'alert-circle'} size={20} color="#fff" />
          <Text className="text-white font-semibold ml-2 flex-1 text-sm">{toastMessage}</Text>
          <TouchableOpacity onPress={() => setShowSuccessToast(false)}>
            <Ionicons name="close" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      {/* Summary Card */}
      <View className="bg-blue-500 mx-3 mt-3 p-3 rounded-lg">
        <View className="flex-row justify-between mb-2">
          <View>
            <Text className="text-blue-100 text-xs">Hours</Text>
            <Text className="text-white font-bold">{getTotalHours().toFixed(0)}h</Text>
          </View>
          <View>
            <Text className="text-blue-100 text-xs">Amount</Text>
            <Text className="text-white font-bold">₹{getTotalAmount().toFixed(0)}</Text>
          </View>
          <View>
            <Text className="text-blue-100 text-xs">Advance</Text>
            <Text className="text-white font-bold">₹{getTotalAdvance().toFixed(0)}</Text>
          </View>
          <View className="items-end">
            <Text className="text-blue-100 text-xs">Final</Text>
            <Text className="text-white font-bold text-lg">₹{getTotalFinal().toFixed(0)}</Text>
          </View>
        </View>
      </View>

      {/* Date & Export Row */}
      <View className="flex-row mx-3 mt-2 space-x-2">
        <TouchableOpacity
          onPress={openDateModal}
          className="flex-1 bg-white p-2 rounded-lg border border-gray-200 flex-row items-center justify-center"
        >
          <Ionicons name="calendar-outline" size={16} color="#3B82F6" />
          <Text className="text-gray-700 text-xs font-medium ml-1" numberOfLines={1}>{getDateRangeLabel()}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={exportToExcel}
          disabled={exporting || !report.length}
          className={`flex-1 p-2 rounded-lg flex-row items-center justify-center ${exporting || !report.length ? 'bg-gray-300' : 'bg-green-500'}`}
        >
          <Ionicons name="download-outline" size={16} color="white" />
          <Text className="text-white text-xs font-medium ml-1">{exporting ? 'Exporting...' : 'Export Excel'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowZeros(!showZeros)} className={`ml-2 px-3 py-2 rounded-lg ${showZeros ? 'bg-gray-800' : 'bg-gray-200'}`}>
          <Text className={`${showZeros ? 'text-white' : 'text-gray-700'} text-xs`}>{showZeros ? 'Showing zeros' : 'Hide zeros'}</Text>
        </TouchableOpacity>
      </View> 

      {/* Excel-like Table - Full Screen */}
      <View className="flex-1 mt-2">
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchReport(); }} />}
        >
          <ScrollView horizontal showsHorizontalScrollIndicator={true}>
            <View>
            {/* Table Header */}
            <View className="bg-gray-200 px-2 py-2 flex-row border-b border-gray-300" style={{ minWidth: 900 }}>
              <Text className="w-36 text-xs font-bold text-gray-700 border-r border-gray-300">Name</Text>
              <Text className="w-16 text-xs font-bold text-gray-700 text-right border-r border-gray-300">Rate</Text>
              <Text className="w-16 text-xs font-bold text-gray-700 text-right border-r border-gray-300">Hours</Text>
              <Text className="w-24 text-xs font-bold text-gray-700 text-right border-r border-gray-300">Amount</Text>
              <Text className="w-24 text-xs font-bold text-gray-700 text-right border-r border-gray-300">Advance</Text>
              <Text className="w-24 text-xs font-bold text-gray-700 text-right border-r border-gray-300">Deposit</Text>
              <Text className="w-24 text-xs font-bold text-gray-700 text-right border-r border-gray-300">Final</Text>
              <Text className="w-28 text-xs font-bold text-gray-700 text-center">Action</Text>
            </View>

            {/* Table Rows */}
            {(() => {
              const visibleReport = report.filter(item => showZeros || item.finalAmount !== 0 || item.totalAdvanceTaken !== 0 || item.totalDeposit !== 0);
              if (visibleReport.length === 0) {
                return (
                  <View className="bg-white p-8 items-center" style={{ minWidth: 900 }}>
                    <Ionicons name="document-text-outline" size={40} color="#9CA3AF" />
                    <Text className="text-gray-500 mt-2 text-sm">{loading ? 'Loading...' : 'No data for this period'}</Text>
                  </View>
                );
              }
              return visibleReport.map((item, index) => (
                <View
                  key={item.worker._id}
                  className={`px-2 py-2 flex-row items-center border-b border-gray-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                  style={{ minWidth: 900 }}
                >
                  <View className="w-36 border-r border-gray-100">
                    <Text className="text-xs font-medium text-gray-800" numberOfLines={1}>{item.worker.name}</Text>
                    <Text className="text-xs text-gray-400">{item.worker.workerId}</Text>
                  </View>
                  <Text className="w-16 text-xs text-gray-600 text-right border-r border-gray-100">₹{item.worker.hourlyRate}</Text>
                  <Text className="w-16 text-xs text-gray-600 text-right border-r border-gray-100">{item.totalHoursWorked.toFixed(1)}</Text>
                  <Text className="w-24 text-xs text-gray-700 text-right font-medium border-r border-gray-100">₹{item.totalPay.toFixed(0)}</Text>
                  <Text className="w-24 text-xs text-orange-600 text-right border-r border-gray-100">{item.totalAdvanceTaken > 0 ? `₹${item.totalAdvanceTaken}` : '0'}</Text>
                  <Text className="w-24 text-xs text-green-600 text-right border-r border-gray-100">{item.totalDeposit > 0 ? `₹${item.totalDeposit}` : '0'}</Text>
                  <Text className="w-24 text-xs text-blue-600 text-right font-bold border-r border-gray-100">₹{item.finalAmount.toFixed(0)}</Text>
                  <View className="w-28 items-center ml-2">
                    <TouchableOpacity
                      onPress={() => { setSelectedWorker(item); setShowDepositModal(true); }}
                      className="bg-blue-100 px-3 py-1 rounded"
                    >
                      <Text className="text-blue-600 text-xs">Deposit</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            })() }

            {/* Table Footer */}
            {report.length > 0 && (
              <View className="bg-gray-200 px-2 py-2 flex-row border-t border-gray-400" style={{ width: '100%' }}>
                <Text className="w-28 text-xs font-bold text-gray-700">TOTAL</Text>
                <Text className="w-14 text-xs text-gray-400 text-right">-</Text>
                <Text className="w-14 text-xs font-bold text-gray-700 text-right">{getTotalHours().toFixed(0)}</Text>
                <Text className="w-20 text-xs font-bold text-gray-700 text-right">₹{getTotalAmount().toFixed(0)}</Text>
                <Text className="w-20 text-xs font-bold text-orange-600 text-right">₹{getTotalAdvance().toFixed(0)}</Text>
                <Text className="w-20 text-xs font-bold text-green-600 text-right">₹{getTotalDeposit().toFixed(0)}</Text>
                <Text className="w-20 text-xs font-bold text-blue-600 text-right">₹{getTotalFinal().toFixed(0)}</Text>
                <View className="w-16" />
              </View>
            )}
          </View>
        </ScrollView>
        </ScrollView>
      </View>

      {/* Date Range Modal with Calendar */}
      <Modal visible={showDateModal} transparent animationType="slide">
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-2xl p-5" style={{ maxHeight: '85%' }}>
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-lg font-bold">Select Report Period</Text>
              <TouchableOpacity onPress={() => setShowDateModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {Platform.OS === 'web' ? (
                <>
                  {/* Start Date - Web */}
                  <Text className="text-gray-700 font-semibold mb-2">Start Date</Text>
                  <View className="flex-row space-x-2 mb-3">
                    <View className="flex-1">
                      <Text className="text-gray-500 text-xs mb-1">Day</Text>
                      <TextInput
                        value={startDay}
                        onChangeText={setStartDay}
                        keyboardType="number-pad"
                        maxLength={2}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-center"
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="text-gray-500 text-xs mb-1">Month</Text>
                      <TextInput
                        value={startMonth}
                        onChangeText={setStartMonth}
                        keyboardType="number-pad"
                        maxLength={2}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-center"
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="text-gray-500 text-xs mb-1">Year</Text>
                      <TextInput
                        value={startYear}
                        onChangeText={setStartYear}
                        keyboardType="number-pad"
                        maxLength={4}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-center"
                      />
                    </View>
                  </View>
                  
                  {/* Month quick select for start */}
                  <View className="flex-row flex-wrap mb-4">
                    {months.map((m, i) => (
                      <TouchableOpacity
                        key={`start-${m}`}
                        onPress={() => setStartMonth((i + 1).toString())}
                        className={`px-2 py-1 m-0.5 rounded ${parseInt(startMonth) === i + 1 ? 'bg-blue-500' : 'bg-gray-100'}`}
                      >
                        <Text className={`text-xs ${parseInt(startMonth) === i + 1 ? 'text-white' : 'text-gray-700'}`}>{m}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* End Date - Web */}
                  <Text className="text-gray-700 font-semibold mb-2">End Date</Text>
                  <View className="flex-row space-x-2 mb-3">
                    <View className="flex-1">
                      <Text className="text-gray-500 text-xs mb-1">Day</Text>
                      <TextInput
                        value={endDay}
                        onChangeText={setEndDay}
                        keyboardType="number-pad"
                        maxLength={2}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-center"
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="text-gray-500 text-xs mb-1">Month</Text>
                      <TextInput
                        value={endMonth}
                        onChangeText={setEndMonth}
                        keyboardType="number-pad"
                        maxLength={2}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-center"
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="text-gray-500 text-xs mb-1">Year</Text>
                      <TextInput
                        value={endYear}
                        onChangeText={setEndYear}
                        keyboardType="number-pad"
                        maxLength={4}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-center"
                      />
                    </View>
                  </View>

                  {/* Month quick select for end */}
                  <View className="flex-row flex-wrap mb-4">
                    {months.map((m, i) => (
                      <TouchableOpacity
                        key={`end-${m}`}
                        onPress={() => setEndMonth((i + 1).toString())}
                        className={`px-2 py-1 m-0.5 rounded ${parseInt(endMonth) === i + 1 ? 'bg-blue-500' : 'bg-gray-100'}`}
                      >
                        <Text className={`text-xs ${parseInt(endMonth) === i + 1 ? 'text-white' : 'text-gray-700'}`}>{m}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Quick presets */}
                  <Text className="text-gray-500 text-xs mb-2">Quick Select:</Text>
                  <View className="flex-row flex-wrap mb-4">
                    <TouchableOpacity
                      onPress={() => {
                        const now = new Date();
                        setStartDay('1');
                        setStartMonth((now.getMonth() + 1).toString());
                        setStartYear(now.getFullYear().toString());
                        setEndDay(new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate().toString());
                        setEndMonth((now.getMonth() + 1).toString());
                        setEndYear(now.getFullYear().toString());
                      }}
                      className="bg-blue-100 px-3 py-2 rounded mr-2 mb-2"
                    >
                      <Text className="text-blue-700 text-xs">This Month</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        const now = new Date();
                        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                        setStartDay('1');
                        setStartMonth((lastMonth.getMonth() + 1).toString());
                        setStartYear(lastMonth.getFullYear().toString());
                        setEndDay(new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0).getDate().toString());
                        setEndMonth((lastMonth.getMonth() + 1).toString());
                        setEndYear(lastMonth.getFullYear().toString());
                      }}
                      className="bg-blue-100 px-3 py-2 rounded mr-2 mb-2"
                    >
                      <Text className="text-blue-700 text-xs">Last Month</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        const now = new Date();
                        setStartDay('1');
                        setStartMonth('1');
                        setStartYear(now.getFullYear().toString());
                        setEndDay('31');
                        setEndMonth('12');
                        setEndYear(now.getFullYear().toString());
                      }}
                      className="bg-blue-100 px-3 py-2 rounded mb-2"
                    >
                      <Text className="text-blue-700 text-xs">This Year</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <>
                  {/* Start Date - Native */}
                  <Text className="text-gray-600 text-sm mb-2">Start Date</Text>
                  <TouchableOpacity 
                    onPress={() => setShowStartPicker(true)}
                    className="bg-gray-100 p-3 rounded-lg mb-3 flex-row justify-between items-center"
                  >
                    <Text className="text-gray-800">{formatDate(tempStartDate)}</Text>
                    <Ionicons name="calendar" size={20} color="#3B82F6" />
                  </TouchableOpacity>
                  {showStartPicker && (
                    <DateTimePicker
                      value={tempStartDate ?? startDate}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={onStartDateChange}
                    />
                  )}

                  {/* End Date - Native */}
                  <Text className="text-gray-600 text-sm mb-2">End Date</Text>
                  <TouchableOpacity 
                    onPress={() => setShowEndPicker(true)}
                    className="bg-gray-100 p-3 rounded-lg mb-4 flex-row justify-between items-center"
                  >
                    <Text className="text-gray-800">{formatDate(tempEndDate)}</Text>
                    <Ionicons name="calendar" size={20} color="#3B82F6" />
                  </TouchableOpacity>
                  {showEndPicker && (
                    <DateTimePicker
                      value={tempEndDate ?? endDate}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={onEndDateChange}
                    />
                  )}
                </>
              )}
            </ScrollView>

            <TouchableOpacity
              onPress={applyDateRange}
              className="bg-blue-500 py-3 rounded-lg mt-2"
            >
              <Text className="text-white text-center font-semibold">Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Deposit Modal */}
      <Modal visible={showDepositModal} transparent animationType="fade">
        <View className="flex-1 bg-black/50 justify-center items-center px-4">
          <View className="bg-white rounded-lg p-5 w-full max-w-sm">
            <Text className="text-lg font-bold mb-4">Record Deposit</Text>
            <Text className="text-gray-600 mb-1 text-sm">Worker: {selectedWorker?.worker.name}</Text>
            <Text className="text-xs text-gray-500 mb-3">Due Amount: ₹{selectedWorker?.finalAmount.toFixed(0)}</Text>
            <TextInput
              value={depositAmount}
              onChangeText={setDepositAmount}
              placeholder="Deposit Amount"
              keyboardType="numeric"
              className="border border-gray-300 rounded-lg px-4 py-3 mb-3"
            />
            <TextInput
              value={depositNotes}
              onChangeText={setDepositNotes}
              placeholder="Notes (optional)"
              className="border border-gray-300 rounded-lg px-4 py-3 mb-4"
            />
            <View className="flex-row justify-end space-x-2">
              <TouchableOpacity 
                onPress={() => { setShowDepositModal(false); setDepositAmount(''); setDepositNotes(''); setSelectedWorker(null); }} 
                className="px-4 py-2"
              >
                <Text className="text-gray-600">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDeposit}
                disabled={saving}
                className="bg-blue-500 px-4 py-2 rounded-lg"
              >
                <Text className="text-white font-medium">{saving ? 'Saving...' : 'Record Deposit'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
