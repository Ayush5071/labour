import { View, Text, ScrollView, TouchableOpacity, Alert, TextInput, Modal, RefreshControl, Platform } from 'react-native';
import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { reportApi } from '../../services/api';
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
};

type SalaryHistoryRecord = {
  _id: string;
  periodStart: string;
  periodEnd: string;
  savedDate: string;
  records: Array<{
    workerName: string;
    workerId: string;
    totalPay: number;
    deposit: number;
    finalAmount: number;
  }>;
  totalAmount: number;
  totalDeposit: number;
  totalFinal: number;
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
  const [deposits, setDeposits] = useState<{[workerId: string]: string}>({});
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  // History modal
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [history, setHistory] = useState<SalaryHistoryRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

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
      const reportData = reportRes.data.report || [];
      setReport(reportData);
      // Initialize deposits as empty - user will add them manually
      const initialDeposits: {[workerId: string]: string} = {};
      reportData.forEach((item: WorkerSummary) => {
        initialDeposits[item.worker._id] = '';
      });
      setDeposits(initialDeposits);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to fetch report');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleDepositChange = (workerId: string, value: string) => {
    setDeposits(prev => ({
      ...prev,
      [workerId]: value
    }));
  };

  const getDepositAmount = (workerId: string): number => {
    const val = deposits[workerId];
    return val ? parseFloat(val) || 0 : 0;
  };

  const getFinalAmount = (item: WorkerSummary): number => {
    const deposit = getDepositAmount(item.worker._id);
    return Math.max(0, item.totalPay - deposit);
  };



  const fetchHistory = async () => {
    try {
      setLoadingHistory(true);
      const res = await reportApi.getSalaryHistory();
      console.log('fetchHistory response', res.data?.length);
      setHistory(res.data || []);
    } catch (error: any) {
      console.error('fetchHistory error', error);
      showToast('Failed to fetch history', 'error');
    } finally {
      setLoadingHistory(false);
    }
  };

  const exportToExcel = async () => {
    // Validate deposits first
    const invalids = report
      .map(item => ({ name: item.worker.name, balance: item.worker.advanceBalance || 0, deposit: getDepositAmount(item.worker._id) }))
      .filter(r => r.deposit > 0 && r.deposit > r.balance);

    if (invalids.length > 0) {
      const names = invalids.map(i => `${i.name} (deposit: ₹${i.deposit}, balance: ₹${i.balance})`).join('\n');
      Alert.alert('Invalid deposit', `The following deposit(s) exceed the worker advance balance:\n${names}`);
      return;
    }

    try {
      setExporting(true);
      const hasDeposits = Object.values(deposits).some(d => d && parseFloat(d) > 0);
      let response;

      if (hasDeposits) {
        // Send current UI records including deposits
        const records = report.map(item => ({
          workerId: item.worker._id,
          workerName: item.worker.name,
          hourlyRate: item.worker.hourlyRate,
          totalHoursWorked: item.totalHoursWorked,
          totalPay: item.totalPay,
          deposit: getDepositAmount(item.worker._id),
          finalAmount: getFinalAmount(item)
        }));

        response = await reportApi.exportWorkSummaryWithRecords({
          startDate: formatDateForApi(startDate),
          endDate: formatDateForApi(endDate),
          records
        });
      } else {
        response = await reportApi.exportWorkSummaryExcel({ 
          startDate: formatDateForApi(startDate), 
          endDate: formatDateForApi(endDate) 
        });
      }

      const { base64, filename } = response.data;

      await saveAndShareFile(
        base64,
        filename,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Export Work Summary Report'
      );
      showToast('Excel file exported!');
    } catch (error: any) {
      const msg = error?.response?.data?.error || error.message || 'Failed to export report';
      Alert.alert('Error', msg);
    } finally {
      setExporting(false);
    }
  };

  // Improve save error handling and validate deposits before saving
  const handleSaveReport = async () => {
    console.log('handleSaveReport called', { reportLength: report.length, saving });

    const invalids = report
      .map(item => ({ name: item.worker.name, balance: item.worker.advanceBalance || 0, deposit: getDepositAmount(item.worker._id) }))
      .filter(r => r.deposit > 0 && r.deposit > r.balance);

    if (invalids.length > 0) {
      const names = invalids.map(i => `${i.name} (deposit: ₹${i.deposit}, balance: ₹${i.balance})`).join('\n');
      const msg = `The following deposit(s) exceed the worker advance balance:\n${names}`;
      if (Platform.OS === 'web') {
        alert(msg);
      } else {
        Alert.alert('Invalid deposit', msg);
      }
      return;
    }

    const hasDeposits = Object.values(deposits).some(d => d && parseFloat(d) > 0);
    
    const confirmSave = async () => {
      console.log('Save Report confirmed');
      try {
        setSaving(true);
              
              const records = report.map(item => ({
                workerId: item.worker._id,
                totalHoursWorked: item.totalHoursWorked,
                totalPay: item.totalPay,
                deposit: getDepositAmount(item.worker._id),
                finalAmount: getFinalAmount(item)
              }));

              console.log('Saving report records', { recordsCount: records.length });

              await reportApi.saveSalaryHistory({
                periodStart: formatDateForApi(startDate),
                periodEnd: formatDateForApi(endDate),
                records,
                notes: `Saved on ${new Date().toLocaleDateString('en-IN')}`
              });

        console.log('saveSalaryHistory API returned');
        showToast('Report saved successfully! Deposits recorded to advance.');
        await fetchReport(); // Refresh to clear deposits
        // Also refresh history so user can view the saved report immediately
        await fetchHistory();
        setShowHistoryModal(true);
      } catch (error: any) {
        console.error('save report error', error);
        const msg = error?.response?.data?.error || error.message || 'Failed to save report';
        showToast(msg, 'error');
      } finally {
        setSaving(false);
      }
    };

    const confirmMsg = `This will save the current report${hasDeposits ? ' and record all deposits to the advance system' : ''}. After saving, this report will be locked and cannot be edited. Continue?`;
    
    if (Platform.OS === 'web') {
      if (confirm(confirmMsg)) {
        await confirmSave();
      }
    } else {
      Alert.alert(
        'Save Report',
        confirmMsg,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Save', onPress: confirmSave }
        ]
      );
    }
  };

  const getTotalHours = () => report.reduce((sum, item) => sum + item.totalHoursWorked, 0);
  const getTotalAmount = () => report.reduce((sum, item) => sum + item.totalPay, 0);
  const getTotalDeposit = () => report.reduce((sum, item) => sum + getDepositAmount(item.worker._id), 0);
  const getTotalFinal = () => report.reduce((sum, item) => sum + getFinalAmount(item), 0);

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
            <Text className="text-blue-100 text-xs">Deposit</Text>
            <Text className="text-white font-bold">₹{getTotalDeposit().toFixed(0)}</Text>
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
          onPress={() => { fetchHistory(); setShowHistoryModal(true); }}
          className="bg-purple-500 p-2 rounded-lg flex-row items-center justify-center"
        >
          <Ionicons name="time-outline" size={16} color="white" />
          <Text className="text-white text-xs font-medium ml-1">History</Text>
        </TouchableOpacity>
      </View>

      <View className="flex-row mx-3 mt-2 space-x-2">
        <TouchableOpacity
          onPress={handleSaveReport}
          disabled={saving || !report.length}
          className={`flex-1 p-2 rounded-lg flex-row items-center justify-center ${saving || !report.length ? 'bg-gray-300' : 'bg-green-500'}`}
        >
          <Ionicons name="save-outline" size={16} color="white" />
          <Text className="text-white text-xs font-medium ml-1">{saving ? 'Saving...' : 'Save Report'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={exportToExcel}
          disabled={exporting || !report.length}
          className={`flex-1 p-2 rounded-lg flex-row items-center justify-center ${exporting || !report.length ? 'bg-gray-300' : 'bg-blue-500'}`}
        >
          <Ionicons name="download-outline" size={16} color="white" />
          <Text className="text-white text-xs font-medium ml-1">{exporting ? 'Exporting...' : 'Export Excel'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowZeros(!showZeros)} className={`px-3 py-2 rounded-lg ${showZeros ? 'bg-gray-800' : 'bg-gray-200'}`}>
          <Text className={`${showZeros ? 'text-white' : 'text-gray-700'} text-xs`}>{showZeros ? '0s' : 'Hide 0s'}</Text>
        </TouchableOpacity>
      </View>

      {/* Info Text */}
      <View className="mx-3 mt-2 bg-yellow-50 p-2 rounded-lg">
        <Text className="text-yellow-700 text-xs">
          💡 Add deposit amounts for workers who want to repay advance from salary. Click "Save Report" to record deposits and lock this report.
        </Text>
      </View> 

      {/* Excel-like Table - Full Screen */}
      <View className="flex-1 mt-2">
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchReport(); }} />}
        >
          <ScrollView horizontal showsHorizontalScrollIndicator={true}>
            <View>
            {/* Table Header */}
            <View className="bg-gray-200 px-2 py-2 flex-row border-b border-gray-300" style={{ minWidth: 750 }}>
              <Text className="w-36 text-xs font-bold text-gray-700 border-r border-gray-300">Name</Text>
              <Text className="w-16 text-xs font-bold text-gray-700 text-right border-r border-gray-300">Rate</Text>
              <Text className="w-16 text-xs font-bold text-gray-700 text-right border-r border-gray-300">Hours</Text>
              <Text className="w-24 text-xs font-bold text-gray-700 text-right border-r border-gray-300">Amount</Text>
              <Text className="w-20 text-xs font-bold text-gray-700 text-right border-r border-gray-300">Adv. Bal</Text>
              <Text className="w-24 text-xs font-bold text-green-700 text-center border-r border-gray-300">Deposit</Text>
              <Text className="w-24 text-xs font-bold text-gray-700 text-right">Final</Text>
            </View>

            {/* Table Rows */}
            {(() => {
              const visibleReport = report.filter(item => showZeros || getFinalAmount(item) !== 0 || getDepositAmount(item.worker._id) !== 0);
              if (visibleReport.length === 0) {
                return (
                  <View className="bg-white p-8 items-center" style={{ minWidth: 750 }}>
                    <Ionicons name="document-text-outline" size={40} color="#9CA3AF" />
                    <Text className="text-gray-500 mt-2 text-sm">{loading ? 'Loading...' : 'No data for this period'}</Text>
                  </View>
                );
              }
              return visibleReport.map((item, index) => (
                <View
                  key={item.worker._id}
                  className={`px-2 py-2 flex-row items-center border-b border-gray-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                  style={{ minWidth: 750 }}
                >
                  <View className="w-36 border-r border-gray-100">
                    <Text className="text-xs font-medium text-gray-800" numberOfLines={1}>{item.worker.name}</Text>
                    <Text className="text-xs text-gray-400">{item.worker.workerId}</Text>
                  </View>
                  <Text className="w-16 text-xs text-gray-600 text-right border-r border-gray-100">₹{item.worker.hourlyRate}</Text>
                  <Text className="w-16 text-xs text-gray-600 text-right border-r border-gray-100">{item.totalHoursWorked.toFixed(1)}</Text>
                  <Text className="w-24 text-xs text-gray-700 text-right font-medium border-r border-gray-100">₹{item.totalPay.toFixed(0)}</Text>
                  <Text className="w-20 text-xs text-orange-600 text-right border-r border-gray-100">₹{item.worker.advanceBalance || 0}</Text>
                  <View className="w-24 px-1 border-r border-gray-100">
                    <TextInput
                      value={deposits[item.worker._id] || ''}
                      onChangeText={(val) => handleDepositChange(item.worker._id, val)}
                      placeholder="0"
                      keyboardType="numeric"
                      className="bg-green-50 border border-green-200 rounded px-2 py-1 text-center text-xs"
                    />
                  </View>
                  <Text className="w-24 text-xs text-blue-600 text-right font-bold">₹{getFinalAmount(item).toFixed(0)}</Text>
                </View>
              ))
            })() }

            {/* Table Footer */}
            {report.length > 0 && (
              <View className="bg-gray-200 px-2 py-2 flex-row border-t border-gray-400" style={{ minWidth: 750 }}>
                <Text className="w-36 text-xs font-bold text-gray-700">TOTAL</Text>
                <Text className="w-16 text-xs text-gray-400 text-right">-</Text>
                <Text className="w-16 text-xs font-bold text-gray-700 text-right">{getTotalHours().toFixed(0)}</Text>
                <Text className="w-24 text-xs font-bold text-gray-700 text-right">₹{getTotalAmount().toFixed(0)}</Text>
                <Text className="w-20 text-xs text-gray-400 text-right">-</Text>
                <Text className="w-24 text-xs font-bold text-green-600 text-center">₹{getTotalDeposit().toFixed(0)}</Text>
                <Text className="w-24 text-xs font-bold text-blue-600 text-right">₹{getTotalFinal().toFixed(0)}</Text>
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

      {/* History Modal */}
      <Modal visible={showHistoryModal} transparent animationType="slide">
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-2xl p-5" style={{ maxHeight: '80%' }}>
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-lg font-bold">Saved Reports</Text>
              <TouchableOpacity onPress={() => setShowHistoryModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView>
              {loadingHistory ? (
                <View className="py-8 items-center">
                  <Text className="text-gray-500">Loading...</Text>
                </View>
              ) : history.length === 0 ? (
                <View className="py-8 items-center">
                  <Ionicons name="document-text-outline" size={40} color="#9CA3AF" />
                  <Text className="text-gray-500 mt-2">No saved reports</Text>
                </View>
              ) : (
                history.map((h, idx) => (
                  <View key={h._id} className={`p-3 rounded-lg mb-2 ${idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'} border border-gray-200`}>
                    <View className="flex-row justify-between items-center">
                      <View>
                        <Text className="text-sm font-bold text-gray-800">
                          {new Date(h.periodStart).toLocaleDateString('en-IN')} - {new Date(h.periodEnd).toLocaleDateString('en-IN')}
                        </Text>
                        <Text className="text-xs text-gray-500">
                          Saved: {new Date(h.savedDate).toLocaleDateString('en-IN')}
                        </Text>
                      </View>
                      <View className="items-end">
                        <Text className="text-sm font-bold text-blue-600">₹{h.totalFinal?.toLocaleString()}</Text>
                        <Text className="text-xs text-green-600">Deposit: ₹{h.totalDeposit?.toLocaleString()}</Text>
                      </View>
                    </View>
                    <View className="flex-row mt-2 justify-between">
                      <Text className="text-xs text-gray-500">{h.records?.length || 0} workers</Text>
                      <View className="flex-row space-x-2">
                        <TouchableOpacity
                          onPress={async () => {
                            try {
                              const res = await reportApi.exportSalaryHistoryExcel(h._id);
                              await saveAndShareFile(
                                res.data.base64,
                                res.data.filename,
                                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                                'Export Saved Report'
                              );
                              showToast('Exported!');
                            } catch (err) {
                              showToast('Export failed', 'error');
                            }
                          }}
                          className="bg-blue-100 px-3 py-1 rounded"
                        >
                          <Text className="text-blue-600 text-xs">Export</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
