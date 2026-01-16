import { View, Text, ScrollView, TouchableOpacity, Alert, FlatList, Platform, Linking } from 'react-native';
import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { reportApi } from '../../services/api';
import { OvertimeReport } from '../../types';

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function ReportsScreen() {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [report, setReport] = useState<OvertimeReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useFocusEffect(
    useCallback(() => {
      fetchReport();
    }, [selectedMonth, selectedYear])
  );

  const showToast = (message: string) => {
    setToastMessage(message);
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 3000);
  };

  const fetchReport = async () => {
    try {
      setLoading(true);
      const response = await reportApi.getMonthlyOvertime(selectedYear, selectedMonth);
      setReport(response.data);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to fetch report');
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = async () => {
    try {
      setExporting(true);

      const response = await reportApi.exportOvertimeExcel(selectedYear, selectedMonth);

      // Convert array buffer to base64
      const uint8Array = new Uint8Array(response.data);
      let binary = '';
      const chunkSize = 8192;
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
        binary += String.fromCharCode.apply(null, Array.from(chunk));
      }
      const base64 = btoa(binary);

      // For web, create a download link
      if (Platform.OS === 'web') {
        const filename = `overtime_${selectedYear}_${String(selectedMonth).padStart(2, '0')}.xlsx`;
        const link = document.createElement('a');
        link.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${base64}`;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('Excel file downloaded!');
      } else {
        // For mobile, use dynamic import to avoid type issues
        const FileSystem = await import('expo-file-system');
        const Sharing = await import('expo-sharing');
        
        const filename = `overtime_${selectedYear}_${String(selectedMonth).padStart(2, '0')}.xlsx`;
        const fileUri = (FileSystem as any).cacheDirectory + filename;

        await (FileSystem as any).writeAsStringAsync(fileUri, base64, {
          encoding: (FileSystem as any).EncodingType?.Base64 || 'base64',
        });

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            dialogTitle: 'Export Overtime Report',
          });
          showToast('Excel file exported successfully!');
        } else {
          Alert.alert('Success', `Excel file saved: ${filename}`);
        }
      }
    } catch (error: any) {
      console.error('Export error:', error);
      Alert.alert('Error', error.message || 'Failed to export report. Make sure the server is running.');
    } finally {
      setExporting(false);
    }
  };

  const getTotalOvertimeHours = () => {
    if (!report) return 0;
    return report.report.reduce((sum, item) => sum + item.totalOvertimeHours, 0);
  };

  const getTotalOvertimePay = () => {
    if (!report) return 0;
    return report.report.reduce((sum, item) => sum + item.totalOvertimePay, 0);
  };

  const years = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - i);

  const renderReportItem = ({ item }: { item: OvertimeReport['report'][0] }) => (
    <View className="bg-white mx-4 my-2 p-4 rounded-xl shadow-sm border border-gray-100">
      <View className="flex-row justify-between items-start mb-2">
        <View>
          <Text className="font-bold text-gray-800">{item.worker.name}</Text>
          <Text className="text-xs text-gray-500">ID: {item.worker.workerId}</Text>
        </View>
        <View className="bg-orange-100 px-2 py-1 rounded">
          <Text className="text-xs text-orange-700 font-medium">{item.totalOvertimeHours.toFixed(1)}h OT</Text>
        </View>
      </View>
      
      <View className="border-t border-gray-100 pt-2 mt-2">
        <View className="flex-row justify-between items-center">
          <View>
            <Text className="text-xs text-gray-500">Bank: {item.worker.bankDetails?.bankName || 'N/A'}</Text>
            <Text className="text-xs text-gray-500">A/C: {item.worker.bankDetails?.accountNumber || 'N/A'}</Text>
          </View>
          <View className="items-end">
            <Text className="text-xs text-gray-500">OT Pay</Text>
            <Text className="font-bold text-orange-600 text-lg">₹{item.totalOvertimePay.toFixed(2)}</Text>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-gray-50">
      {/* Success Toast */}
      {showSuccessToast && (
        <View className="absolute top-4 left-4 right-4 z-50 bg-green-500 p-4 rounded-xl flex-row items-center shadow-lg">
          <Ionicons name="checkmark-circle" size={24} color="#fff" />
          <Text className="text-white font-semibold ml-2 flex-1">{toastMessage}</Text>
          <TouchableOpacity onPress={() => setShowSuccessToast(false)}>
            <Ionicons name="close" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      {/* Month/Year Selector */}
      <View className="bg-white px-4 py-3 border-b border-gray-200">
        <Text className="text-sm font-semibold text-gray-600 mb-2">Monthly Overtime Report</Text>
        
        <View className="flex-row gap-2">
          {/* Month Picker */}
          <TouchableOpacity
            className="flex-1 border border-gray-200 rounded-lg p-3 flex-row justify-between items-center"
            onPress={() => {
              setShowMonthPicker(!showMonthPicker);
              setShowYearPicker(false);
            }}
          >
            <Text className="text-gray-800">{months[selectedMonth - 1]}</Text>
            <Ionicons name={showMonthPicker ? 'chevron-up' : 'chevron-down'} size={16} color="#6B7280" />
          </TouchableOpacity>

          {/* Year Picker */}
          <TouchableOpacity
            className="w-24 border border-gray-200 rounded-lg p-3 flex-row justify-between items-center"
            onPress={() => {
              setShowYearPicker(!showYearPicker);
              setShowMonthPicker(false);
            }}
          >
            <Text className="text-gray-800">{selectedYear}</Text>
            <Ionicons name={showYearPicker ? 'chevron-up' : 'chevron-down'} size={16} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {/* Month Dropdown */}
        {showMonthPicker && (
          <View className="mt-2 border border-gray-200 rounded-lg max-h-48">
            <ScrollView nestedScrollEnabled>
              {months.map((month, index) => (
                <TouchableOpacity
                  key={index}
                  className={`p-3 border-b border-gray-100 ${
                    selectedMonth === index + 1 ? 'bg-blue-50' : ''
                  }`}
                  onPress={() => {
                    setSelectedMonth(index + 1);
                    setShowMonthPicker(false);
                  }}
                >
                  <Text className={`text-sm ${selectedMonth === index + 1 ? 'text-blue-600 font-medium' : 'text-gray-800'}`}>
                    {month}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Year Dropdown */}
        {showYearPicker && (
          <View className="mt-2 border border-gray-200 rounded-lg">
            {years.map((year) => (
              <TouchableOpacity
                key={year}
                className={`p-3 border-b border-gray-100 ${
                  selectedYear === year ? 'bg-blue-50' : ''
                }`}
                onPress={() => {
                  setSelectedYear(year);
                  setShowYearPicker(false);
                }}
              >
                <Text className={`text-sm ${selectedYear === year ? 'text-blue-600 font-medium' : 'text-gray-800'}`}>
                  {year}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Summary Card */}
      {report && report.report.length > 0 && (
        <View className="bg-orange-50 mx-4 mt-3 p-4 rounded-xl border border-orange-200">
          <Text className="text-orange-800 font-bold mb-2">
            {months[selectedMonth - 1]} {selectedYear} Summary
          </Text>
          <View className="flex-row justify-between">
            <View>
              <Text className="text-xs text-orange-600">Total OT Hours</Text>
              <Text className="text-xl font-bold text-orange-800">{getTotalOvertimeHours().toFixed(1)}h</Text>
            </View>
            <View className="items-end">
              <Text className="text-xs text-orange-600">Total OT Pay</Text>
              <Text className="text-xl font-bold text-orange-800">₹{getTotalOvertimePay().toFixed(2)}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Export Button */}
      <TouchableOpacity
        className={`mx-4 mt-3 p-3 rounded-xl flex-row items-center justify-center ${
          exporting || !report?.report.length ? 'bg-gray-300' : 'bg-green-500'
        }`}
        onPress={exportToExcel}
        disabled={exporting || !report?.report.length}
      >
        <Ionicons name="download-outline" size={20} color="#fff" />
        <Text className="text-white font-bold ml-2">
          {exporting ? 'Exporting...' : 'Export to Excel'}
        </Text>
      </TouchableOpacity>

      {/* Report List */}
      <FlatList
        data={report?.report || []}
        renderItem={renderReportItem}
        keyExtractor={(item: OvertimeReport['report'][0]) => item.worker._id}
        contentContainerStyle={{ paddingVertical: 8, paddingBottom: 20 }}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center py-20">
            <Ionicons name="document-text-outline" size={64} color="#D1D5DB" />
            <Text className="text-gray-400 mt-4 text-center">
              {loading ? 'Loading report...' : 'No overtime records\nfor this month.'}
            </Text>
          </View>
        }
      />
    </View>
  );
}
