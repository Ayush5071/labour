import { View, Text, ScrollView, TouchableOpacity, Alert, TextInput, Modal, RefreshControl, Platform } from 'react-native';
import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { bonusApi, workersApi, advanceApi } from '../../services/api';
import { BonusSummary, Worker } from '../../types';
import { saveAndShareFile } from '../../utils/fileExport';

interface BonusRecord {
  _id: string;
  year: number;
  worker: string;
  hourlyRate?: number;
  workerDetails?: {
    _id: string;
    name: string;
    workerId: string;
    advanceBalance: number;
  };
  baseBonusAmount: number;
  totalDaysWorked: number;
  totalDaysAbsent: number;
  absentPenaltyPerDay?: number;
  totalPenalty: number;
  advanceDeduction: number;
  extraBonus: number;
  employeeDeposit: number;
  currentAdvanceBalance: number;
  finalBonusAmount: number;
  amountToGiveEmployee: number;
  amountPaid: number;
  isPaid: boolean;
  paidDate?: string;
  notes?: string;
}

export default function BonusScreen() {
  const currentDate = new Date();
  // Use actual Date objects for start and end
  const [startDate, setStartDate] = useState(new Date(currentDate.getFullYear() - 1, 3, 1)); // April 1 last year
  const [endDate, setEndDate] = useState(new Date(currentDate.getFullYear(), 2, 31)); // March 31 this year
  
  const [bonuses, setBonuses] = useState<BonusRecord[]>([]);
  const [summary, setSummary] = useState<BonusSummary | null>(null);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [showCalcModal, setShowCalcModal] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [penaltyPerAbsent, setPenaltyPerAbsent] = useState('');
  const [deductAdvance, setDeductAdvance] = useState(false);
  
  // Date picker states
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [tempStartDate, setTempStartDate] = useState<Date | null>(startDate);
  const [tempEndDate, setTempEndDate] = useState<Date | null>(endDate);
  const [showZeros, setShowZeros] = useState(false);

  // Web date inputs
  const [startDay, setStartDay] = useState('1');
  const [startMonth, setStartMonth] = useState('4');
  const [startYear, setStartYear] = useState((currentDate.getFullYear() - 1).toString());
  const [endDay, setEndDay] = useState('31');
  const [endMonth, setEndMonth] = useState('3');
  const [endYear, setEndYear] = useState(currentDate.getFullYear().toString());
  
  // Detail/Action Modal
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedBonus, setSelectedBonus] = useState<BonusRecord | null>(null);
  
  // Quick action modals
  const [showExtraBonusModal, setShowExtraBonusModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  
  const [extraBonusAmount, setExtraBonusAmount] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [depositNote, setDepositNote] = useState('');
  const [recordToAdvance, setRecordToAdvance] = useState(true);
  const [processingAction, setProcessingAction] = useState(false);
  
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
      fetchData();
    }, [startDate, endDate])
  );

  const fetchData = async () => {
    try {
      setLoading(true);
      const startMonth = startDate.getMonth() + 1;
      const startYear = startDate.getFullYear();
      const endMonth = endDate.getMonth() + 1;
      const endYear = endDate.getFullYear();
      
      const [bonusRes, summaryRes, workersRes] = await Promise.all([
        bonusApi.getByDateRange(startYear, startMonth, endYear, endMonth),
        bonusApi.getSummaryByDateRange(startYear, startMonth, endYear, endMonth),
        workersApi.getAll(),
      ]);
      setBonuses(bonusRes.data);
      setSummary(summaryRes.data);
      setWorkers(workersRes.data);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleCalculate = async () => {
    if (!penaltyPerAbsent) {
      Alert.alert('Error', 'Please enter deduction per absent day');
      return;
    }

    try {
      setCalculating(true);
      await bonusApi.calculateByDateRange({
        startYear: startDate.getFullYear(),
        startMonth: startDate.getMonth() + 1,
        endYear: endDate.getFullYear(),
        endMonth: endDate.getMonth() + 1,
        deductionPerAbsentDay: parseFloat(penaltyPerAbsent),
        deductAdvance,
      });
      Alert.alert('Success', 'Bonuses calculated for all workers');
      setShowCalcModal(false);
      fetchData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to calculate bonuses');
    } finally {
      setCalculating(false);
    }
  };

  const handlePay = async (bonus: BonusRecord) => {
    const finalAmount = bonus.amountToGiveEmployee || bonus.finalBonusAmount;
    
    Alert.alert(
      'Pay Bonus',
      `Pay ₹${finalAmount.toLocaleString()} to ${getWorkerName(bonus.worker)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Pay',
          onPress: async () => {
            try {
              await bonusApi.pay(bonus._id, finalAmount);
              showToast('Bonus paid successfully');
              setShowDetailModal(false);
              fetchData();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to pay bonus');
            }
          },
        },
      ]
    );
  };

  const handleAddExtraBonus = async () => {
    if (!extraBonusAmount || parseFloat(extraBonusAmount) <= 0 || !selectedBonus) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }
    try {
      setProcessingAction(true);
      await bonusApi.addExtraBonus(selectedBonus._id, parseFloat(extraBonusAmount));
      showToast('Extra bonus added');
      setExtraBonusAmount('');
      fetchData();
      const updated = await bonusApi.getByDateRange(startDate.getFullYear(), startDate.getMonth() + 1, endDate.getFullYear(), endDate.getMonth() + 1);
      setSelectedBonus(updated.data.find((b: BonusRecord) => b._id === selectedBonus._id) || null);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add extra bonus');
    } finally {
      setProcessingAction(false);
    }
  };

  const handleAddDeposit = async () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0 || !selectedBonus) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }
    try {
      setProcessingAction(true);
      const note = depositNote || (recordToAdvance ? 'Deposit towards advance repayment' : 'Employee deposit');
      await bonusApi.addEmployeeDeposit(selectedBonus._id, parseFloat(depositAmount), note);
      
      // If recording to advance, also call the advance API to record this deposit
      if (recordToAdvance && selectedBonus.worker) {
        const workerId = typeof selectedBonus.worker === 'object' 
          ? selectedBonus.worker 
          : selectedBonus.worker;
        try {
          await advanceApi.recordDeposit({
            workerId: typeof workerId === 'string' ? workerId : (selectedBonus.workerDetails?._id || ''),
            amount: parseFloat(depositAmount),
            notes: `From bonus deposit - ${note}`,
            date: new Date().toISOString()
          });
        } catch (advErr) {
          console.log('Deposit recorded to bonus but advance API call failed:', advErr);
        }
      }
      
      showToast('Deposit recorded');
      setDepositAmount('');
      setDepositNote('');
      fetchData();
      const updated = await bonusApi.getByDateRange(startDate.getFullYear(), startDate.getMonth() + 1, endDate.getFullYear(), endDate.getMonth() + 1);
      setSelectedBonus(updated.data.find((b: BonusRecord) => b._id === selectedBonus._id) || null);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to record deposit');
    } finally {
      setProcessingAction(false);
    }
  };

  const exportToExcel = async () => {
    try {
      setExporting(true);
      const response = await bonusApi.exportBonusExcel(startDate.getFullYear(), startDate.getMonth() + 1, endDate.getFullYear(), endDate.getMonth() + 1);
      const { base64, filename } = response.data;
      await saveAndShareFile(base64, filename, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Export Bonus');
      showToast('Excel exported!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to export');
    } finally {
      setExporting(false);
    }
  };

  const getWorkerName = (workerOrId: any) => {
    if (!workerOrId) return 'Unknown';
    if (typeof workerOrId === 'object') return workerOrId.name || 'Unknown';
    const worker = workers.find(w => w._id === workerOrId);
    return worker?.name || 'Unknown';
  };

  const getWorkerAdvance = (workerOrId: any) => {
    if (!workerOrId) return 0;
    if (typeof workerOrId === 'object') return workerOrId.advanceBalance || 0;
    const worker = workers.find(w => w._id === workerOrId);
    return worker?.advanceBalance || 0;
  };

  const formatDate = (date: Date | null) => date ? date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
  const getDateRangeLabel = () => `${formatDate(startDate)} - ${formatDate(endDate)}`;

  const getTotalBase = () => bonuses.reduce((sum, b) => sum + b.baseBonusAmount, 0);
  const getTotalPenalty = () => bonuses.reduce((sum, b) => sum + b.totalPenalty, 0);
  const getTotalFinal = () => bonuses.reduce((sum, b) => sum + (b.amountToGiveEmployee || b.finalBonusAmount), 0);

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
      <View className="bg-purple-500 mx-3 mt-3 p-3 rounded-lg">
        <View className="flex-row justify-between">
          <View>
            <Text className="text-purple-100 text-xs">Total Bonus</Text>
            <Text className="text-white font-bold text-lg">₹{getTotalFinal().toLocaleString()}</Text>
          </View>
          <View>
            <Text className="text-purple-100 text-xs">Paid</Text>
            <Text className="text-white font-bold">₹{(summary?.totalBonusPaid || 0).toLocaleString()}</Text>
          </View>
          <View className="items-end">
            <Text className="text-purple-100 text-xs">Pending</Text>
            <Text className="text-white font-bold">₹{(summary?.totalBonusPending || 0).toLocaleString()}</Text>
          </View>
        </View>
      </View>

      {/* Action Row */}
      <View className="flex-row mx-3 mt-2 space-x-2">
        <TouchableOpacity onPress={openDateModal} className="flex-1 bg-white p-2 rounded-lg border border-gray-200 flex-row items-center justify-center">
          <Ionicons name="calendar-outline" size={14} color="#3B82F6" />
          <Text className="text-gray-700 text-xs font-medium ml-1" numberOfLines={1}>{getDateRangeLabel()}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowHelpModal(true)} className="bg-yellow-500 p-2 rounded-lg flex-row items-center justify-center">
          <Ionicons name="help-circle-outline" size={14} color="white" />
          <Text className="text-white text-xs font-medium ml-1">How Calc</Text>
        </TouchableOpacity>
      </View>

      <View className="flex-row mx-3 mt-2 space-x-2">
        <TouchableOpacity onPress={() => setShowCalcModal(true)} className="flex-1 bg-blue-500 p-2 rounded-lg flex-row items-center justify-center">
          <Ionicons name="calculator-outline" size={14} color="white" />
          <Text className="text-white text-xs font-medium ml-1">Calculate</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={exportToExcel} disabled={exporting || !bonuses.length} className={`flex-1 p-2 rounded-lg flex-row items-center justify-center ${exporting || !bonuses.length ? 'bg-gray-300' : 'bg-green-500'}`}>
          <Ionicons name="download-outline" size={14} color="white" />
          <Text className="text-white text-xs font-medium ml-1">{exporting ? 'Exporting...' : 'Export'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowZeros(!showZeros)} className={`ml-2 px-3 py-2 rounded-lg ${showZeros ? 'bg-gray-800' : 'bg-gray-200'}`}>
          <Text className={`${showZeros ? 'text-white' : 'text-gray-700'} text-xs`}>{showZeros ? 'Showing zeros' : 'Hide zeros'}</Text>
        </TouchableOpacity>
      </View>

      {/* Excel Table */}
      <ScrollView className="flex-1 mt-2" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />}>
        <ScrollView horizontal showsHorizontalScrollIndicator={true}>
          <View>
            {/* Header (increased minWidth & clearer labels with dividers) */}
            <View className="bg-gray-200 px-2 py-2 flex-row border-b border-gray-300" style={{ minWidth: 1100 }}>
              <Text className="w-8 px-2 text-xs font-bold text-gray-700 border-r border-gray-300">#</Text>
              <Text className="w-36 px-2 text-xs font-bold text-gray-700 border-r border-gray-300">Name</Text>
              <Text className="w-24 px-2 text-xs font-bold text-gray-700 text-right border-r border-gray-300">Base</Text>
              <Text className="w-20 px-2 text-xs font-bold text-gray-700 text-right border-r border-gray-300">Absent</Text>
              <Text className="w-20 px-2 text-xs font-bold text-gray-700 text-right border-r border-gray-300">Penalty</Text>
              <Text className="w-28 px-2 text-xs font-bold text-gray-700 text-right border-r border-gray-300">Advance Deduction</Text>
              <Text className="w-20 px-2 text-xs font-bold text-gray-700 text-right border-r border-gray-300">Extra</Text>
              <Text className="w-20 px-2 text-xs font-bold text-gray-700 text-right border-r border-gray-300">Deposit</Text>
              <Text className="w-28 px-2 text-xs font-bold text-gray-700 text-right border-r border-gray-300">Final</Text>
              <Text className="w-48 px-2 text-xs font-bold text-gray-700 text-center">Actions</Text>
            </View>

            {/* Rows */}
            {loading ? (
              <View className="bg-white p-8 items-center" style={{ minWidth: 1100 }}>
                <Text className="text-gray-500">Loading...</Text>
              </View>
            ) : bonuses.length === 0 ? (
              <View className="bg-white p-8 items-center" style={{ minWidth: 1100 }}>
                <Ionicons name="gift-outline" size={40} color="#9CA3AF" />
                <Text className="text-gray-500 mt-2 text-sm">No bonuses calculated</Text>
                <Text className="text-gray-400 text-xs">Tap Calculate button</Text>
              </View>
            ) : (
              bonuses.map((bonus, index) => (
                <TouchableOpacity 
                  key={bonus._id} 
                  onPress={() => { setSelectedBonus(bonus); setShowDetailModal(true); }}
                  className={`px-2 py-3 flex-row items-center border-b border-gray-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`} 
                  style={{ minWidth: 1100 }}
                >
                  <Text className="w-8 px-2 text-xs text-gray-500 border-r border-gray-100">{index + 1}</Text>
                  <View className="w-36 px-2 border-r border-gray-100">
                    <Text className="text-sm font-semibold text-gray-800" numberOfLines={1}>{getWorkerName(bonus.worker)}</Text>
                    <Text className="text-xs text-gray-400">₹{bonus.hourlyRate || 0}/hr</Text>
                  </View>
                  <Text className="w-24 px-2 text-sm text-gray-600 text-right border-r border-gray-100">₹{bonus.baseBonusAmount.toLocaleString()}</Text>
                  <Text className="w-20 px-2 text-sm text-gray-600 text-right border-r border-gray-100">{bonus.totalDaysAbsent}d</Text>
                  <Text className="w-20 px-2 text-sm text-red-600 text-right border-r border-gray-100">-₹{bonus.totalPenalty.toLocaleString()}</Text>
                  <Text className="w-28 px-2 text-sm text-orange-600 text-right border-r border-gray-100">{bonus.advanceDeduction > 0 ? `-₹${bonus.advanceDeduction}` : '0'}</Text>
                  <Text className="w-20 px-2 text-sm text-green-600 text-right font-medium border-r border-gray-100">{bonus.extraBonus > 0 ? `+₹${bonus.extraBonus}` : '0'}</Text>
                  <Text className="w-20 px-2 text-sm text-purple-600 text-right font-medium border-r border-gray-100">{bonus.employeeDeposit > 0 ? `-₹${bonus.employeeDeposit}` : '0'}</Text>
                  <Text className="w-28 px-2 text-sm text-blue-700 text-right font-bold border-r border-gray-100">₹{(bonus.amountToGiveEmployee || bonus.finalBonusAmount).toLocaleString()}</Text>
                  <View className="w-48 px-2 flex-row justify-center space-x-3 ml-4" style={{ flexShrink: 0 }}>
                    <TouchableOpacity 
                      onPress={(e) => { e.stopPropagation(); setSelectedBonus(bonus); setShowExtraBonusModal(true); }} 
                      className="bg-green-100 px-3 py-1 rounded"
                    >
                      <Text className="text-green-600 text-xs">+Bonus</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={(e) => { e.stopPropagation(); setSelectedBonus(bonus); setShowDepositModal(true); }} 
                      className="bg-purple-100 px-3 py-1 rounded"
                    >
                      <Text className="text-purple-600 text-xs">+Dep</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={(e) => { e.stopPropagation(); setSelectedBonus(bonus); setShowDetailModal(true); }} 
                      className="bg-blue-100 px-3 py-1 rounded"
                    >
                      <Text className="text-blue-600 text-xs">View</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))
            )}

            {/* Footer */}
            {bonuses.length > 0 && (
              <View className="bg-gray-200 px-2 py-2 flex-row border-t border-gray-400" style={{ minWidth: 900 }}>
                <Text className="w-8 text-xs text-gray-400"></Text>
                <Text className="w-32 text-xs font-bold text-gray-700">TOTAL ({bonuses.length})</Text>
                <Text className="w-16 text-sm font-bold text-gray-700 text-right">₹{getTotalBase().toLocaleString()}</Text>
                <Text className="w-14 text-xs text-gray-400 text-right">-</Text>
                <Text className="w-18 text-sm font-bold text-red-600 text-right">-₹{getTotalPenalty().toLocaleString()}</Text>
                <Text className="w-18 text-xs text-gray-400 text-right">-</Text>
                <Text className="w-18 text-xs text-gray-400 text-right">-</Text>
                <Text className="w-24 text-xs text-gray-400 text-right">-</Text>
                <Text className="w-24 text-sm font-bold text-blue-700 text-right">₹{getTotalFinal().toLocaleString()}</Text>
                <View className="w-40" />
              </View>
            )}
          </View>
        </ScrollView>
        <View className="h-4" />
      </ScrollView>

      {/* Date Range Modal with Calendar */}
      <Modal visible={showDateModal} transparent animationType="slide">
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-2xl p-5" style={{ maxHeight: '85%' }}>
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-lg font-bold">Select Period</Text>
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
                        className={`px-2 py-1 m-0.5 rounded ${parseInt(startMonth) === i + 1 ? 'bg-purple-500' : 'bg-gray-100'}`}
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
                        className={`px-2 py-1 m-0.5 rounded ${parseInt(endMonth) === i + 1 ? 'bg-purple-500' : 'bg-gray-100'}`}
                      >
                        <Text className={`text-xs ${parseInt(endMonth) === i + 1 ? 'text-white' : 'text-gray-700'}`}>{m}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Quick presets */}
                  <Text className="text-gray-500 text-xs mb-2">Quick Select (Financial Year):</Text>
                  <View className="flex-row flex-wrap mb-4">
                    <TouchableOpacity
                      onPress={() => {
                        const now = new Date();
                        const fy = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
                        setStartDay('1');
                        setStartMonth('4');
                        setStartYear(fy.toString());
                        setEndDay('31');
                        setEndMonth('3');
                        setEndYear((fy + 1).toString());
                      }}
                      className="bg-purple-100 px-3 py-2 rounded mr-2 mb-2"
                    >
                      <Text className="text-purple-700 text-xs">Current FY</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        const now = new Date();
                        const fy = now.getMonth() >= 3 ? now.getFullYear() - 1 : now.getFullYear() - 2;
                        setStartDay('1');
                        setStartMonth('4');
                        setStartYear(fy.toString());
                        setEndDay('31');
                        setEndMonth('3');
                        setEndYear((fy + 1).toString());
                      }}
                      className="bg-purple-100 px-3 py-2 rounded mr-2 mb-2"
                    >
                      <Text className="text-purple-700 text-xs">Last FY</Text>
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
                      className="bg-purple-100 px-3 py-2 rounded mb-2"
                    >
                      <Text className="text-purple-700 text-xs">Calendar Year</Text>
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

            <TouchableOpacity onPress={applyDateRange} className="bg-purple-500 py-3 rounded-lg mt-2">
              <Text className="text-white text-center font-semibold">Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* How Calc Works Modal */}
      <Modal visible={showHelpModal} transparent animationType="fade">
        <View className="flex-1 bg-black/50 justify-center items-center px-4">
          <View className="bg-white rounded-lg p-5 w-full max-w-sm">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-lg font-bold text-purple-600">How Bonus Calc Works</Text>
              <TouchableOpacity onPress={() => setShowHelpModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View className="space-y-3">
              <View className="bg-blue-50 p-3 rounded-lg">
                <Text className="text-xs font-bold text-blue-700 mb-1">1. Base Bonus</Text>
                <Text className="text-xs text-blue-600">30 days × 8 hours × Hourly Rate</Text>
                <Text className="text-xs text-gray-500 mt-1">Example: 30 × 8 × ₹50 = ₹12,000</Text>
              </View>

              <View className="bg-red-50 p-3 rounded-lg">
                <Text className="text-xs font-bold text-red-700 mb-1">2. Absent Penalty</Text>
                <Text className="text-xs text-red-600">Days Absent × Penalty Rate</Text>
                <Text className="text-xs text-gray-500 mt-1">Example: 5 days × ₹100 = ₹500 deducted</Text>
              </View>

              <View className="bg-orange-50 p-3 rounded-lg">
                <Text className="text-xs font-bold text-orange-700 mb-1">3. Advance Deduction (Optional)</Text>
                <Text className="text-xs text-orange-600">Outstanding advance balance deducted</Text>
              </View>

              <View className="bg-green-50 p-3 rounded-lg">
                <Text className="text-xs font-bold text-green-700 mb-1">4. Extra Bonus</Text>
                <Text className="text-xs text-green-600">Additional bonus given to worker</Text>
              </View>

              <View className="bg-purple-50 p-3 rounded-lg">
                <Text className="text-xs font-bold text-purple-700 mb-1">5. Employee Deposit</Text>
                <Text className="text-xs text-purple-600">Worker deposits money to repay advance</Text>
              </View>

              <View className="bg-gray-100 p-3 rounded-lg border border-gray-300">
                <Text className="text-xs font-bold text-gray-700">Final Amount =</Text>
                <Text className="text-xs text-gray-600 mt-1">Base - Penalty - AdvDeduction + Extra - Deposit</Text>
              </View>
            </View>

            <TouchableOpacity onPress={() => setShowHelpModal(false)} className="bg-purple-500 py-3 rounded-lg mt-4">
              <Text className="text-white text-center font-semibold">Got It!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Calculate Modal */}
      <Modal visible={showCalcModal} transparent animationType="slide">
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-2xl p-5">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-lg font-bold">Calculate Bonuses</Text>
              <TouchableOpacity onPress={() => setShowCalcModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <Text className="text-gray-500 text-sm mb-3">Period: {getDateRangeLabel()}</Text>

            <Text className="text-gray-600 text-sm mb-1">Deduction Per Absent Day (₹)</Text>
            <TextInput value={penaltyPerAbsent} onChangeText={setPenaltyPerAbsent} placeholder="e.g., 100" keyboardType="numeric" className="border border-gray-300 rounded-lg px-4 py-3 mb-4" />

            <TouchableOpacity onPress={() => setDeductAdvance(!deductAdvance)} className="flex-row items-center mb-4">
              <View className={`w-5 h-5 rounded border-2 items-center justify-center mr-2 ${deductAdvance ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`}>
                {deductAdvance && <Ionicons name="checkmark" size={14} color="white" />}
              </View>
              <Text className="text-gray-700 text-sm">Deduct advance from bonus</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleCalculate} disabled={calculating} className={`py-3 rounded-lg ${calculating ? 'bg-gray-400' : 'bg-purple-500'}`}>
              <Text className="text-white text-center font-semibold">{calculating ? 'Calculating...' : 'Calculate All'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Detail Modal */}
      <Modal visible={showDetailModal} transparent animationType="slide">
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-2xl p-5" style={{ maxHeight: '80%' }}>
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-lg font-bold">{selectedBonus ? getWorkerName(selectedBonus.worker) : ''}</Text>
              <TouchableOpacity onPress={() => { setShowDetailModal(false); setSelectedBonus(null); setExtraBonusAmount(''); setDepositAmount(''); }}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {selectedBonus && (
              <ScrollView>
                <View className="bg-gray-50 p-3 rounded-lg mb-3">
                  <Text className="text-xs font-bold text-gray-700 mb-2">Bonus Breakdown</Text>
                  <View className="flex-row justify-between mb-1">
                    <Text className="text-xs text-gray-600">Base (30d × 8h × ₹{selectedBonus.hourlyRate || 0})</Text>
                    <Text className="text-xs text-gray-800">₹{selectedBonus.baseBonusAmount.toLocaleString()}</Text>
                  </View>
                  <View className="flex-row justify-between mb-1">
                    <Text className="text-xs text-gray-600">Absent Penalty ({selectedBonus.totalDaysAbsent}d)</Text>
                    <Text className="text-xs text-red-600">-₹{selectedBonus.totalPenalty.toLocaleString()}</Text>
                  </View>
                  {selectedBonus.advanceDeduction > 0 && (
                    <View className="flex-row justify-between mb-1">
                      <Text className="text-xs text-gray-600">Advance Deduction</Text>
                      <Text className="text-xs text-orange-600">-₹{selectedBonus.advanceDeduction.toLocaleString()}</Text>
                    </View>
                  )}
                  {selectedBonus.extraBonus > 0 && (
                    <View className="flex-row justify-between mb-1">
                      <Text className="text-xs text-gray-600">Extra Bonus</Text>
                      <Text className="text-xs text-green-600">+₹{selectedBonus.extraBonus.toLocaleString()}</Text>
                    </View>
                  )}
                  {selectedBonus.employeeDeposit > 0 && (
                    <View className="flex-row justify-between mb-1">
                      <Text className="text-xs text-gray-600">Employee Deposit</Text>
                      <Text className="text-xs text-purple-600">-₹{selectedBonus.employeeDeposit.toLocaleString()}</Text>
                    </View>
                  )}
                  <View className="border-t border-gray-300 pt-2 mt-2 flex-row justify-between">
                    <Text className="text-sm font-bold text-gray-700">Final Amount</Text>
                    <Text className="text-sm font-bold text-blue-600">₹{(selectedBonus.amountToGiveEmployee || selectedBonus.finalBonusAmount).toLocaleString()}</Text>
                  </View>
                </View>

                <View className="bg-orange-50 p-2 rounded mb-3">
                  <Text className="text-xs text-orange-700">Current Advance Balance: ₹{(selectedBonus.currentAdvanceBalance || getWorkerAdvance(selectedBonus.worker)).toLocaleString()}</Text>
                </View>

                {!selectedBonus.isPaid && (
                  <>
                    <View className="bg-green-50 p-3 rounded-lg mb-3">
                      <Text className="text-xs font-bold text-green-700 mb-2">Add Extra Bonus</Text>
                      <View className="flex-row space-x-2">
                        <TextInput value={extraBonusAmount} onChangeText={setExtraBonusAmount} placeholder="Amount" keyboardType="numeric" className="flex-1 border border-green-300 rounded px-3 py-2 text-sm" />
                        <TouchableOpacity onPress={handleAddExtraBonus} disabled={processingAction} className="bg-green-500 px-4 py-2 rounded">
                          <Text className="text-white text-sm font-medium">Add</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View className="bg-purple-50 p-3 rounded-lg mb-3">
                      <Text className="text-xs font-bold text-purple-700 mb-2">Employee Deposit (to repay advance)</Text>
                      <View className="flex-row space-x-2">
                        <TextInput value={depositAmount} onChangeText={setDepositAmount} placeholder="Amount" keyboardType="numeric" className="flex-1 border border-purple-300 rounded px-3 py-2 text-sm" />
                        <TouchableOpacity onPress={handleAddDeposit} disabled={processingAction} className="bg-purple-500 px-4 py-2 rounded">
                          <Text className="text-white text-sm font-medium">Add</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    <TouchableOpacity onPress={() => handlePay(selectedBonus)} className="bg-blue-500 py-3 rounded-lg">
                      <Text className="text-white text-center font-semibold">Pay ₹{(selectedBonus.amountToGiveEmployee || selectedBonus.finalBonusAmount).toLocaleString()}</Text>
                    </TouchableOpacity>
                  </>
                )}

                {selectedBonus.isPaid && (
                  <View className="bg-green-100 p-4 rounded-lg items-center">
                    <Ionicons name="checkmark-circle" size={32} color="#22C55E" />
                    <Text className="text-green-700 font-bold mt-2">Bonus Paid</Text>
                    {selectedBonus.paidDate && <Text className="text-green-600 text-xs mt-1">{new Date(selectedBonus.paidDate).toLocaleDateString()}</Text>}
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Quick Extra Bonus Modal */}
      <Modal visible={showExtraBonusModal} transparent animationType="fade">
        <View className="flex-1 bg-black/50 justify-center items-center px-4">
          <View className="bg-white rounded-lg p-5 w-full max-w-sm">
            <View className="flex-row justify-between items-center mb-4">
              <View>
                <Text className="text-lg font-bold text-green-600">Add Extra Bonus</Text>
                <Text className="text-sm text-gray-500">{selectedBonus ? getWorkerName(selectedBonus.worker) : ''}</Text>
              </View>
              <TouchableOpacity onPress={() => { setShowExtraBonusModal(false); setExtraBonusAmount(''); }}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {selectedBonus && (
              <View className="bg-gray-50 p-3 rounded-lg mb-3">
                <View className="flex-row justify-between">
                  <Text className="text-xs text-gray-500">Current Bonus</Text>
                  <Text className="text-sm font-bold text-blue-600">₹{(selectedBonus.amountToGiveEmployee || selectedBonus.finalBonusAmount).toLocaleString()}</Text>
                </View>
                {selectedBonus.extraBonus > 0 && (
                  <View className="flex-row justify-between mt-1">
                    <Text className="text-xs text-gray-500">Previous Extra</Text>
                    <Text className="text-xs text-green-600">+₹{selectedBonus.extraBonus.toLocaleString()}</Text>
                  </View>
                )}
              </View>
            )}

            <Text className="text-gray-600 text-sm mb-1">Extra Bonus Amount (₹)</Text>
            <TextInput 
              value={extraBonusAmount} 
              onChangeText={setExtraBonusAmount} 
              placeholder="e.g., 500" 
              keyboardType="numeric" 
              className="border border-gray-300 rounded-lg px-4 py-3 mb-4" 
            />

            <TouchableOpacity 
              onPress={async () => {
                await handleAddExtraBonus();
                setShowExtraBonusModal(false);
              }} 
              disabled={processingAction || !extraBonusAmount} 
              className={`py-3 rounded-lg ${processingAction || !extraBonusAmount ? 'bg-gray-400' : 'bg-green-500'}`}
            >
              <Text className="text-white text-center font-semibold">{processingAction ? 'Adding...' : 'Add Extra Bonus'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Quick Deposit Modal */}
      <Modal visible={showDepositModal} transparent animationType="fade">
        <View className="flex-1 bg-black/50 justify-center items-center px-4">
          <View className="bg-white rounded-lg p-5 w-full max-w-sm">
            <View className="flex-row justify-between items-center mb-4">
              <View>
                <Text className="text-lg font-bold text-purple-600">Add Deposit</Text>
                <Text className="text-sm text-gray-500">{selectedBonus ? getWorkerName(selectedBonus.worker) : ''}</Text>
              </View>
              <TouchableOpacity onPress={() => { setShowDepositModal(false); setDepositAmount(''); setDepositNote(''); setRecordToAdvance(true); }}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {selectedBonus && (
              <View className="bg-gray-50 p-3 rounded-lg mb-3">
                <View className="flex-row justify-between">
                  <Text className="text-xs text-gray-500">Current Bonus</Text>
                  <Text className="text-sm font-bold text-blue-600">₹{(selectedBonus.amountToGiveEmployee || selectedBonus.finalBonusAmount).toLocaleString()}</Text>
                </View>
                <View className="flex-row justify-between mt-1">
                  <Text className="text-xs text-gray-500">Advance Balance</Text>
                  <Text className="text-sm font-bold text-orange-600">₹{(selectedBonus.currentAdvanceBalance || getWorkerAdvance(selectedBonus.worker)).toLocaleString()}</Text>
                </View>
                {selectedBonus.employeeDeposit > 0 && (
                  <View className="flex-row justify-between mt-1">
                    <Text className="text-xs text-gray-500">Previous Deposits</Text>
                    <Text className="text-xs text-purple-600">-₹{selectedBonus.employeeDeposit.toLocaleString()}</Text>
                  </View>
                )}
              </View>
            )}

            <Text className="text-gray-600 text-sm mb-1">Deposit Amount (₹)</Text>
            <TextInput 
              value={depositAmount} 
              onChangeText={setDepositAmount} 
              placeholder="e.g., 500" 
              keyboardType="numeric" 
              className="border border-gray-300 rounded-lg px-4 py-3 mb-3" 
            />

            <Text className="text-gray-600 text-sm mb-1">Note (optional)</Text>
            <TextInput 
              value={depositNote} 
              onChangeText={setDepositNote} 
              placeholder="e.g., From bonus, repaying advance" 
              className="border border-gray-300 rounded-lg px-4 py-3 mb-3" 
            />

            <TouchableOpacity onPress={() => setRecordToAdvance(!recordToAdvance)} className="flex-row items-center mb-4">
              <View className={`w-5 h-5 rounded border-2 items-center justify-center mr-2 ${recordToAdvance ? 'bg-purple-500 border-purple-500' : 'border-gray-300'}`}>
                {recordToAdvance && <Ionicons name="checkmark" size={14} color="white" />}
              </View>
              <Text className="text-gray-700 text-sm">Record as advance repayment</Text>
            </TouchableOpacity>

            <Text className="text-gray-400 text-xs mb-3">
              Deposit will be subtracted from bonus. {recordToAdvance ? 'Will also reduce advance balance.' : 'Will NOT affect advance balance.'}
            </Text>

            <TouchableOpacity 
              onPress={async () => {
                await handleAddDeposit();
                setShowDepositModal(false);
              }} 
              disabled={processingAction || !depositAmount} 
              className={`py-3 rounded-lg ${processingAction || !depositAmount ? 'bg-gray-400' : 'bg-purple-500'}`}
            >
              <Text className="text-white text-center font-semibold">{processingAction ? 'Recording...' : 'Record Deposit'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
