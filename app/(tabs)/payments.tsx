import { View, Text, ScrollView, TouchableOpacity, Alert, TextInput, Modal, RefreshControl, Platform } from 'react-native';
import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { advanceApi, workersApi, reportApi, bonusApi } from '../../services/api';
import { Worker, Advance } from '../../types';
import { saveAndShareFile } from '../../utils/fileExport';

interface FullTransactionHistory {
  type: 'advance' | 'deposit' | 'bonus_deposit' | 'report_deposit';
  amount: number;
  date: string;
  notes?: string;
  source: string;
  balanceAfter?: number;
}

export default function PaymentsScreen() {
  const currentDate = new Date();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [fullHistory, setFullHistory] = useState<FullTransactionHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Date range for export - use actual Date objects
  const [startDate, setStartDate] = useState(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1));
  const [endDate, setEndDate] = useState(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0));

  // Date picker states
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [tempStartDate, setTempStartDate] = useState<Date | null>(startDate);
  const [tempEndDate, setTempEndDate] = useState<Date | null>(endDate);
  const [showZeros, setShowZeros] = useState(false);
  const [showFindWorkerModal, setShowFindWorkerModal] = useState(false);
  const [allWorkers, setAllWorkers] = useState<Worker[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWorkerTotals, setSelectedWorkerTotals] = useState({ totalAdvance: 0, totalDeposit: 0, netBalance: 0 });

  // Web date inputs
  const [startDay, setStartDay] = useState('1');
  const [startMonth, setStartMonth] = useState((currentDate.getMonth() + 1).toString());
  const [startYear, setStartYear] = useState(currentDate.getFullYear().toString());
  const [endDay, setEndDay] = useState(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate().toString());
  const [endMonth, setEndMonth] = useState((currentDate.getMonth() + 1).toString());
  const [endYear, setEndYear] = useState(currentDate.getFullYear().toString());

  // Modal states
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 3000);
  };

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

  useFocusEffect(
    useCallback(() => {
      fetchWorkers();
    }, [])
  );

  const fetchWorkers = async () => {
    try {
      setLoading(true);
      const response = await advanceApi.getSummary();
      setWorkers(response.data);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to fetch workers');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchWorkerAdvances = async (workerId: string) => {
    try {
      const response = await advanceApi.getWorkerHistory(workerId);
      setAdvances(response.data.history);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to fetch advances');
    }
  };

  const openFindWorkerModal = async () => {
    try {
      const res = await workersApi.getAll();
      setAllWorkers(res.data);
      setShowFindWorkerModal(true);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to fetch workers');
    }
  };

  const getSelectedWorkerTotals = () => ({
    totalAdvance: selectedWorkerTotals.totalAdvance,
    totalDeposit: selectedWorkerTotals.totalDeposit,
    netBalance: selectedWorkerTotals.netBalance,
  });

  const loadWorkerDetails = async (worker: Worker) => {
    try {
      setSelectedWorker(worker);
      setLoading(true);
      
      // Get advance history
      const res = await advanceApi.getWorkerHistory(worker._id);
      const history = res.data.history || [];
      setAdvances(history);
      
      // Build full transaction history from all sources
      const allTransactions: FullTransactionHistory[] = [];
      
      // Add advance/deposit transactions
      history.forEach((h: any) => {
        allTransactions.push({
          type: h.type,
          amount: h.amount || 0,
          date: h.date,
          notes: h.notes,
          source: 'Advance Section',
          balanceAfter: h.balanceAfter,
        });
      });
      
      // Sort by date descending
      allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setFullHistory(allTransactions);
      
      // Calculate totals
      const advancesTotal = history.filter((a: any) => a.type === 'advance').reduce((s: number, a: any) => s + (a.amount || 0), 0);
      const depositsTotal = history.filter((a: any) => a.type === 'deposit').reduce((s: number, a: any) => s + (a.amount || 0), 0);
      const netBalance = advancesTotal - depositsTotal;
      
      setSelectedWorkerTotals({ totalAdvance: advancesTotal, totalDeposit: depositsTotal, netBalance });
      setShowDetailModal(true);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load worker details');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectWorker = (worker: Worker) => {
    loadWorkerDetails(worker);
  };

  const handleGiveAdvance = async () => {
    if (!selectedWorker || !advanceAmount) {
      Alert.alert('Error', 'Please enter amount');
      return;
    }

    try {
      setSaving(true);
      await advanceApi.giveAdvance({
        workerId: selectedWorker._id,
        amount: parseFloat(advanceAmount),
        notes: notes.trim() || undefined,
      });
      showToast('Advance given successfully');
      setShowAdvanceModal(false);
      setAdvanceAmount('');
      setNotes('');
      fetchWorkers();
      fetchWorkerAdvances(selectedWorker._id);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to give advance');
    } finally {
      setSaving(false);
    }
  };

  const handleDeposit = async () => {
    if (!selectedWorker || !depositAmount) {
      Alert.alert('Error', 'Please enter amount');
      return;
    }

    const amount = parseFloat(depositAmount);
    if (amount > selectedWorker.advanceBalance) {
      Alert.alert('Error', 'Amount exceeds advance balance');
      return;
    }

    try {
      setSaving(true);
      await advanceApi.recordDeposit({
        workerId: selectedWorker._id,
        amount,
        notes: notes.trim() || 'Deposit',
      });
      showToast('Deposit recorded successfully');
      setShowDepositModal(false);
      setDepositAmount('');
      setNotes('');
      fetchWorkers();
      fetchWorkerAdvances(selectedWorker._id);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to record deposit');
    } finally {
      setSaving(false);
    }
  };

  const formatDateForApi = (date: Date) => date.toISOString().split('T')[0];
  const formatDate = (date: Date | null) => date ? date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '';

  const exportDuesToExcel = async () => {
    try {
      setExporting(true);
      // Export total summary (no date range)
      const response = await advanceApi.exportDuesExcel();
      const { base64, filename } = response.data;

      await saveAndShareFile(
        base64,
        filename,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Export Dues Report (Total)'
      );
      showToast('Excel file exported!');
      setShowDateModal(false);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to export report');
    } finally {
      setExporting(false);
    }
  };

  const getTotalAdvance = () => workers.reduce((sum, w) => sum + (w.totalAdvance || w.totalAdvanceTaken || 0), 0);
  const getTotalDeposit = () => workers.reduce((sum, w) => sum + (w.totalDeposit || w.totalAdvanceRepaid || 0), 0);
  const getTotalBalance = () => workers.reduce((sum, w) => sum + (w.advanceBalance || 0), 0);

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
      <View className="bg-orange-500 mx-3 mt-3 p-3 rounded-lg">
        <View className="flex-row justify-between">
          <View>
            <Text className="text-orange-100 text-xs">Total Advance</Text>
            <Text className="text-white font-bold">₹{getTotalAdvance().toLocaleString()}</Text>
          </View>
          <View>
            <Text className="text-orange-100 text-xs">Total Deposit</Text>
            <Text className="text-white font-bold">₹{getTotalDeposit().toLocaleString()}</Text>
          </View>
          <View className="items-end">
            <Text className="text-orange-100 text-xs">Outstanding</Text>
            <Text className="text-white font-bold text-lg">₹{getTotalBalance().toLocaleString()}</Text>
          </View>
        </View>
      </View>

      {/* Action Row */}
      <View className="flex-row mx-3 mt-2 space-x-2">
        <TouchableOpacity onPress={exportDuesToExcel} className="flex-1 bg-white p-2 rounded-lg border border-gray-200 flex-row items-center justify-center">
          <Ionicons name="download-outline" size={14} color="#3B82F6" />
          <Text className="text-gray-700 text-xs font-medium ml-1">Export Total</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowHelpModal(true)} className="bg-yellow-500 p-2 rounded-lg flex-row items-center justify-center">
          <Ionicons name="help-circle-outline" size={14} color="white" />
          <Text className="text-white text-xs font-medium ml-1">How Calc</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowZeros(!showZeros)} className={`ml-2 px-3 py-2 rounded-lg ${showZeros ? 'bg-gray-800' : 'bg-gray-200'}`}>
          <Text className={`${showZeros ? 'text-white' : 'text-gray-700'} text-xs`}>{showZeros ? 'Showing zeros' : 'Hide zeros'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={openFindWorkerModal} className="ml-2 px-3 py-2 rounded-lg bg-blue-100">
          <Text className="text-blue-700 text-xs">Find Worker</Text>
        </TouchableOpacity>
      </View> 

      {/* Excel-like Table */}
      <ScrollView className="flex-1 mt-2" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchWorkers(); }} />}>
        <ScrollView horizontal showsHorizontalScrollIndicator={true}>
          <View>
            {/* Header with dividers */}
            <View className="bg-gray-200 px-2 py-2 flex-row border-b border-gray-300" style={{ minWidth: 700 }}>
              <Text className="w-8 text-xs font-bold text-gray-700 border-r border-gray-300">#</Text>
              <Text className="w-36 text-xs font-bold text-gray-700 border-r border-gray-300">Name</Text>
              <Text className="w-28 text-xs font-bold text-gray-700 text-right border-r border-gray-300">Advance</Text>
              <Text className="w-28 text-xs font-bold text-gray-700 text-right border-r border-gray-300">Deposit</Text>
              <Text className="w-28 text-xs font-bold text-gray-700 text-right border-r border-gray-300">Balance</Text>
              <Text className="w-28 text-xs font-bold text-gray-700 text-center">Actions</Text>
            </View>

            {/* Rows */}
            {loading ? (
              <View className="bg-white p-8 items-center" style={{ minWidth: 700 }}>
                <Text className="text-gray-500">Loading...</Text>
              </View>
            ) : (() => {
              const visibleWorkers = workers.filter(w => showZeros || (w.advanceBalance || 0) !== 0 || (w.totalAdvance || 0) !== 0 || (w.totalDeposit || 0) !== 0);
              if (visibleWorkers.length === 0) {
                return (
                  <View className="bg-white p-8 items-center" style={{ minWidth: 700 }}>
                    <Ionicons name="people-outline" size={40} color="#9CA3AF" />
                    <Text className="text-gray-500 mt-2 text-sm">No workers with advance/deposit</Text>
                    <Text className="text-gray-400 text-xs">Use "Find Worker" to add new advance</Text>
                  </View>
                );
              }
              return visibleWorkers.map((worker, index) => (
                <TouchableOpacity 
                  key={worker._id} 
                  onPress={() => loadWorkerDetails(worker)}
                  className={`px-2 py-3 flex-row items-center border-b border-gray-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`} 
                  style={{ minWidth: 700 }}
                >
                  <Text className="w-8 text-xs text-gray-500 border-r border-gray-100">{index + 1}</Text>
                  <View className="w-36 border-r border-gray-100">
                    <Text className="text-sm font-semibold text-gray-800" numberOfLines={1}>{worker.name}</Text>
                    <Text className="text-xs text-gray-400">{worker.workerId} · ₹{worker.hourlyRate}/hr</Text>
                  </View>
                  <Text className="w-28 text-sm text-orange-600 text-right font-medium border-r border-gray-100">₹{(worker.totalAdvance || worker.totalAdvanceTaken || 0).toLocaleString()}</Text>
                  <Text className="w-28 text-sm text-green-600 text-right font-medium border-r border-gray-100">₹{(worker.totalDeposit || worker.totalAdvanceRepaid || 0).toLocaleString()}</Text>
                  <Text className={`w-28 text-sm text-right font-bold ${(worker.advanceBalance || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    ₹{(worker.advanceBalance || 0).toLocaleString()}
                  </Text>
                  <View className="w-28 flex-row justify-center space-x-2 ml-2" style={{ flexShrink: 0 }}>
                    <TouchableOpacity 
                      onPress={(e) => { e.stopPropagation(); setSelectedWorker(worker); setShowAdvanceModal(true); }} 
                      className="bg-orange-100 px-3 py-1 rounded"
                    >
                      <Text className="text-orange-600 text-xs">+Adv</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={(e) => { e.stopPropagation(); setSelectedWorker(worker); setShowDepositModal(true); }} 
                      className="bg-green-100 px-3 py-1 rounded"
                    >
                      <Text className="text-green-600 text-xs">+Dep</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))
            })()}

            {/* Footer */}
            {workers.length > 0 && (
              <View className="bg-gray-200 px-2 py-2 flex-row border-t border-gray-400" style={{ minWidth: 700 }}>
                <Text className="w-8 text-xs text-gray-400"></Text>
                <Text className="w-36 text-xs font-bold text-gray-700 border-r border-gray-300">TOTAL ({workers.length})</Text>
                <Text className="w-28 text-sm font-bold text-orange-600 text-right border-r border-gray-300">₹{getTotalAdvance().toLocaleString()}</Text>
                <Text className="w-28 text-sm font-bold text-green-600 text-right border-r border-gray-300">₹{getTotalDeposit().toLocaleString()}</Text>
                <Text className="w-28 text-sm font-bold text-red-600 text-right">₹{getTotalBalance().toLocaleString()}</Text>
                <View className="w-28" />
              </View>
            )}
          </View>
        </ScrollView>
        <View className="h-4" />
      </ScrollView>

      {/* How It Works Modal */}
      <Modal visible={showHelpModal} transparent animationType="fade">
        <View className="flex-1 bg-black/50 justify-center items-center px-4">
          <View className="bg-white rounded-lg p-5 w-full max-w-sm">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-lg font-bold text-orange-600">How Advances Work</Text>
              <TouchableOpacity onPress={() => setShowHelpModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <View className="space-y-3">
              <View className="bg-orange-50 p-3 rounded-lg">
                <Text className="font-bold text-orange-700 mb-1">Advance Given</Text>
                <Text className="text-xs text-gray-600">Money given to worker in advance. This increases their outstanding balance.</Text>
              </View>
              
              <View className="bg-green-50 p-3 rounded-lg">
                <Text className="font-bold text-green-700 mb-1">Deposit/Repayment</Text>
                <Text className="text-xs text-gray-600">Money paid back by worker. This decreases their outstanding balance.</Text>
              </View>
              
              <View className="bg-red-50 p-3 rounded-lg">
                <Text className="font-bold text-red-700 mb-1">Balance Calculation</Text>
                <Text className="text-xs text-gray-600">Balance = Total Advance - Total Deposits</Text>
                <Text className="text-xs text-gray-500 mt-1">If balance {'>'} 0, worker owes money.</Text>
              </View>
              
              <View className="bg-blue-50 p-3 rounded-lg">
                <Text className="font-bold text-blue-700 mb-1">Bonus Deduction</Text>
                <Text className="text-xs text-gray-600">Outstanding advance can be deducted from yearly bonus during bonus calculation.</Text>
              </View>
            </View>

            <TouchableOpacity onPress={() => setShowHelpModal(false)} className="mt-4 bg-blue-500 py-3 rounded-lg">
              <Text className="text-white text-center font-semibold">Got it!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Worker Detail Modal - Enhanced Professional UI */}
      <Modal visible={showDetailModal} transparent animationType="slide">
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-2xl max-h-[90%]">
            {/* Header */}
            <View className="flex-row justify-between items-center p-4 border-b border-gray-200">
              <View className="flex-1">
                <Text className="text-lg font-bold text-gray-800">{selectedWorker?.name}</Text>
                <Text className="text-xs text-gray-500">ID: {selectedWorker?.workerId} · ₹{selectedWorker?.hourlyRate}/hr</Text>
              </View>
              <TouchableOpacity onPress={() => setShowDetailModal(false)} className="p-2">
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Summary Cards */}
            <View className="flex-row p-3 space-x-2">
              <View className="flex-1 bg-orange-50 p-3 rounded-lg border border-orange-200">
                <Text className="text-orange-600 text-xs font-medium">Total Advance</Text>
                <Text className="text-orange-700 text-lg font-bold">₹{getSelectedWorkerTotals().totalAdvance.toLocaleString()}</Text>
              </View>
              <View className="flex-1 bg-green-50 p-3 rounded-lg border border-green-200">
                <Text className="text-green-600 text-xs font-medium">Total Deposit</Text>
                <Text className="text-green-700 text-lg font-bold">₹{getSelectedWorkerTotals().totalDeposit.toLocaleString()}</Text>
              </View>
              <View className="flex-1 bg-red-50 p-3 rounded-lg border border-red-200">
                <Text className="text-red-600 text-xs font-medium">Net Balance</Text>
                <Text className="text-red-700 text-lg font-bold">₹{getSelectedWorkerTotals().netBalance.toLocaleString()}</Text>
              </View>
            </View>
            
            {/* Action Buttons */}
            <View className="flex-row p-3 space-x-2 border-b border-gray-100">
              <TouchableOpacity
                onPress={() => setShowAdvanceModal(true)}
                className="flex-1 bg-orange-500 py-3 rounded-lg flex-row justify-center items-center"
              >
                <Ionicons name="add-circle" size={18} color="white" />
                <Text className="text-white font-semibold ml-2">Give Advance</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowDepositModal(true)}
                className="flex-1 bg-green-500 py-3 rounded-lg flex-row justify-center items-center"
                disabled={!selectedWorker || (selectedWorker.advanceBalance || 0) === 0}
              >
                <Ionicons name="wallet" size={18} color="white" />
                <Text className="text-white font-semibold ml-2">Record Deposit</Text>
              </TouchableOpacity>
            </View>

            {/* Transaction History */}
            <ScrollView className="flex-1 p-3">
              <Text className="text-gray-700 font-semibold text-sm mb-3">Transaction History</Text>
              {advances.length === 0 ? (
                <View className="p-8 items-center bg-gray-50 rounded-lg">
                  <Ionicons name="document-text-outline" size={48} color="#9CA3AF" />
                  <Text className="text-gray-500 mt-3 font-medium">No transactions yet</Text>
                  <Text className="text-gray-400 text-xs mt-1">Give advance or record deposit to see history</Text>
                </View>
              ) : (
                <View>
                  {advances.map((adv, index) => (
                    <View key={adv._id} className="bg-white mb-2 p-3 rounded-lg border border-gray-200 flex-row items-center">
                      <View className={`w-10 h-10 rounded-full items-center justify-center ${
                        adv.type === 'advance' ? 'bg-orange-100' : 'bg-green-100'
                      }`}>
                        <Ionicons
                          name={adv.type === 'advance' ? 'arrow-up' : 'arrow-down'}
                          size={18}
                          color={adv.type === 'advance' ? '#F97316' : '#22C55E'}
                        />
                      </View>
                      <View className="ml-3 flex-1">
                        <View className="flex-row items-center">
                          <Text className="font-semibold text-gray-800">
                            {adv.type === 'advance' ? 'Advance Given' : 'Deposit Received'}
                          </Text>
                          <View className={`ml-2 px-2 py-0.5 rounded ${adv.type === 'advance' ? 'bg-orange-100' : 'bg-green-100'}`}>
                            <Text className={`text-xs ${adv.type === 'advance' ? 'text-orange-600' : 'text-green-600'}`}>
                              {adv.type === 'advance' ? 'OUT' : 'IN'}
                            </Text>
                          </View>
                        </View>
                        <Text className="text-xs text-gray-500 mt-0.5">
                          {new Date(adv.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </Text>
                        {adv.notes && <Text className="text-xs text-gray-400 mt-0.5">{adv.notes}</Text>}
                      </View>
                      <View className="items-end">
                        <Text className={`font-bold text-base ${adv.type === 'advance' ? 'text-orange-500' : 'text-green-500'}`}>
                          {adv.type === 'advance' ? '+' : '-'}₹{adv.amount.toLocaleString()}
                        </Text>
                        <Text className="text-xs text-gray-400">Bal: ₹{(adv.balanceAfter || 0).toLocaleString()}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
              <View className="h-8" />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Give Advance Modal */}
      <Modal visible={showAdvanceModal} transparent animationType="fade">
        <View className="flex-1 bg-black/50 justify-center items-center px-4">
          <View className="bg-white rounded-lg p-5 w-full max-w-sm">
            <Text className="text-lg font-bold mb-4">Give Advance</Text>
            <Text className="text-gray-600 mb-2 text-sm">To: {selectedWorker?.name}</Text>
            <TextInput
              value={advanceAmount}
              onChangeText={setAdvanceAmount}
              placeholder="Amount"
              keyboardType="numeric"
              className="border border-gray-300 rounded-lg px-4 py-3 mb-3"
            />
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Notes (optional)"
              className="border border-gray-300 rounded-lg px-4 py-3 mb-4"
            />
            <View className="flex-row justify-end space-x-2">
              <TouchableOpacity onPress={() => { setShowAdvanceModal(false); setAdvanceAmount(''); setNotes(''); }} className="px-4 py-2">
                <Text className="text-gray-600">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleGiveAdvance}
                disabled={saving}
                className="bg-orange-500 px-4 py-2 rounded-lg"
              >
                <Text className="text-white font-medium">{saving ? 'Saving...' : 'Give Advance'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Deposit Modal */}
      <Modal visible={showDepositModal} transparent animationType="fade">
        <View className="flex-1 bg-black/50 justify-center items-center px-4">
          <View className="bg-white rounded-lg p-5 w-full max-w-sm">
            <Text className="text-lg font-bold mb-4">Record Deposit</Text>
            <Text className="text-gray-600 mb-1 text-sm">From: {selectedWorker?.name}</Text>
            <Text className="text-red-500 text-xs mb-3">Balance: ₹{selectedWorker?.advanceBalance}</Text>
            <TextInput
              value={depositAmount}
              onChangeText={setDepositAmount}
              placeholder="Deposit Amount"
              keyboardType="numeric"
              className="border border-gray-300 rounded-lg px-4 py-3 mb-3"
            />
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Notes (optional)"
              className="border border-gray-300 rounded-lg px-4 py-3 mb-4"
            />
            <View className="flex-row justify-end space-x-2">
              <TouchableOpacity onPress={() => { setShowDepositModal(false); setDepositAmount(''); setNotes(''); }} className="px-4 py-2">
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

      {/* Find Worker Modal */}
      <Modal visible={showFindWorkerModal} transparent animationType="slide">
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-2xl p-5" style={{ maxHeight: '70%' }}>
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-lg font-bold">Find Worker</Text>
              <TouchableOpacity onPress={() => setShowFindWorkerModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <TextInput 
              value={searchQuery} 
              onChangeText={setSearchQuery} 
              placeholder="Search by name or ID..." 
              className="border border-gray-300 px-4 py-3 rounded-lg mb-3" 
            />
            <ScrollView style={{ maxHeight: 400 }}>
              {allWorkers
                .filter(w => w.name.toLowerCase().includes(searchQuery.toLowerCase()) || w.workerId?.toLowerCase().includes(searchQuery.toLowerCase()))
                .map(w => (
                  <View key={w._id} className="py-3 border-b border-gray-100 flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text className="text-sm font-semibold text-gray-800">{w.name}</Text>
                      <Text className="text-xs text-gray-500">{w.workerId} · ₹{w.hourlyRate}/hr</Text>
                      <Text className="text-xs text-gray-400">Balance: ₹{(w.advanceBalance || 0).toLocaleString()}</Text>
                    </View>
                    <View className="flex-row space-x-2">
                      <TouchableOpacity 
                        onPress={() => { setShowFindWorkerModal(false); loadWorkerDetails(w); }} 
                        className="bg-blue-100 px-3 py-2 rounded-lg"
                      >
                        <Text className="text-blue-600 text-xs font-medium">Details</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        onPress={() => { setShowFindWorkerModal(false); setSelectedWorker(w); setShowAdvanceModal(true); }} 
                        className="bg-orange-100 px-3 py-2 rounded-lg"
                      >
                        <Text className="text-orange-600 text-xs font-medium">+Advance</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              {allWorkers.filter(w => w.name.toLowerCase().includes(searchQuery.toLowerCase()) || w.workerId?.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                <View className="py-8 items-center">
                  <Ionicons name="search-outline" size={40} color="#9CA3AF" />
                  <Text className="text-gray-500 mt-2">No workers found</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Export Date Range Modal with Calendar */}
      <Modal visible={showDateModal} transparent animationType="slide">
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-2xl p-5" style={{ maxHeight: '85%' }}>
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-lg font-bold">Select Export Period</Text>
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
                        className={`px-2 py-1 m-0.5 rounded ${parseInt(startMonth) === i + 1 ? 'bg-orange-500' : 'bg-gray-100'}`}
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
                        className={`px-2 py-1 m-0.5 rounded ${parseInt(endMonth) === i + 1 ? 'bg-orange-500' : 'bg-gray-100'}`}
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
                      className="bg-orange-100 px-3 py-2 rounded mr-2 mb-2"
                    >
                      <Text className="text-orange-700 text-xs">This Month</Text>
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
                      className="bg-orange-100 px-3 py-2 rounded mr-2 mb-2"
                    >
                      <Text className="text-orange-700 text-xs">Last Month</Text>
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
                      value={tempStartDate || new Date()}
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
                      value={tempEndDate || new Date()}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={onEndDateChange}
                    />
                  )}
                </>
              )}
            </ScrollView>

            <TouchableOpacity
              onPress={() => { 
                // Export total summary regardless of date inputs
                exportDuesToExcel();
              }}
              disabled={exporting}
              className={`py-3 rounded-lg mt-2 ${exporting ? 'bg-gray-400' : 'bg-green-500'}`}
            >
              <Text className="text-white text-center font-semibold">{exporting ? 'Exporting...' : 'Export Total'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
