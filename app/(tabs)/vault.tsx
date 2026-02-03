import { View, Text, ScrollView, TouchableOpacity, Alert, TextInput, Modal, RefreshControl } from 'react-native';
import { useState, useCallback, useEffect } from 'react';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { vaultApi } from '../../services/api';
import { Transaction, VaultSummary } from '../../types';

export default function VaultScreen() {
  const [hasPassword, setHasPassword] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [initLoading, setInitLoading] = useState(true);

  // Auth Inputs
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // Password Management
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [masterPasskey, setMasterPasskey] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  // Data
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<VaultSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [type, setType] = useState<'income' | 'expense'>('income');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    checkStatus();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (isUnlocked) {
        fetchData();
      }
    }, [isUnlocked])
  );

  const checkStatus = async () => {
    try {
      const res = await vaultApi.getStatus();
      setHasPassword(res.data.hasPassword);
    } catch (error) {
      console.log('Error checking vault status', error);
    } finally {
      setInitLoading(false);
    }
  };

  const handleUnlock = async () => {
    try {
      setLoading(true);
      const res = await vaultApi.verifyPassword(authPassword);
      if (res.data.success) {
        setIsUnlocked(true);
        setAuthError('');
        setAuthPassword('');
        fetchData();
      } else {
        setAuthError('Incorrect password');
        setAuthPassword('');
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSetPassword = async () => {
    if (!masterPasskey || !newPassword) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }
    try {
      await vaultApi.setPassword(masterPasskey, newPassword);
      Alert.alert('Success', 'Password updated successfully');
      setHasPassword(true);
      setShowPasswordModal(false);
      setMasterPasskey('');
      setNewPassword('');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || error.message);
    }
  };

  const handleLock = () => {
    setIsUnlocked(false);
    setTransactions([]);
    setSummary(null);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [transRes, summaryRes] = await Promise.all([
        vaultApi.getAll(),
        vaultApi.getSummary(),
      ]);
      setTransactions(transRes.data);
      setSummary(summaryRes.data);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSubmit = async () => {
    if (!amount || !note.trim()) {
      Alert.alert('Error', 'Please enter amount and note');
      return;
    }

    try {
      setSaving(true);
      await vaultApi.create({
        type,
        amount: parseFloat(amount),
        note: note.trim(),
      });
      Alert.alert('Success', 'Transaction added');
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add transaction');
    } finally {
      setSaving(false);
    }
  };
   
  const handleDelete = async (id: string) => {
    Alert.alert('Delete', 'Are you sure you want to delete this transaction?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await vaultApi.delete(id);
            fetchData();
          } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to delete');
          }
        },
      },
    ]);
  };

  const resetForm = () => {
    setType('income');
    setAmount('');
    setNote('');
  };

  if (initLoading) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <Text>Loading Vault...</Text>
      </View>
    );
  }

  // Handle Initial Setup (No Password)
  if (!hasPassword) {
    return (
      <View className="flex-1 bg-gray-50 flex items-center justify-center p-6">
        <View className="bg-white p-6 rounded-2xl shadow-sm w-full max-w-sm">
          <Text className="text-xl font-bold text-gray-900 mb-2">Setup Vault Protection</Text>
          <Text className="text-gray-500 mb-6">Set a password to secure your company vault.</Text>
          
          <Text className="text-xs font-medium text-gray-500 mb-1 ml-1">Master Passkey</Text>
          <TextInput
            value={masterPasskey}
            onChangeText={setMasterPasskey}
            placeholder="Enter master passkey"
            secureTextEntry
            className="border border-gray-300 rounded-lg px-4 py-3 mb-4"
          />

          <Text className="text-xs font-medium text-gray-500 mb-1 ml-1">New Vault Password</Text>
          <TextInput
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="Create password"
            keyboardType="numeric"
            secureTextEntry
            className="border border-gray-300 rounded-lg px-4 py-3 mb-6"
          />

          <TouchableOpacity onPress={handleSetPassword} className="bg-blue-600 py-3 rounded-lg">
             <Text className="text-white text-center font-bold">Set Password</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Locked Screen
  if (!isUnlocked) {
    return (
      <View className="flex-1 bg-gray-50 flex items-center justify-center p-6">
        <View className="bg-white p-6 rounded-2xl shadow-lg w-full max-w-sm">
          <View className="items-center mb-6">
            <View className="w-16 h-16 bg-blue-100 rounded-full items-center justify-center mb-3">
              <Ionicons name="lock-closed" size={32} color="#3B82F6" />
            </View>
            <Text className="text-xl font-bold text-gray-800">Vault Locked</Text>
          </View>

          <TextInput
            value={authPassword}
            onChangeText={setAuthPassword}
            placeholder="Enter Password"
            secureTextEntry
            keyboardType="numeric"
            className="border border-gray-300 rounded-lg px-4 py-3 text-center text-lg tracking-widest mb-2"
            onSubmitEditing={handleUnlock}
          />

          {authError ? (
            <Text className="text-red-500 text-sm text-center mb-2">{authError}</Text>
          ) : null}

          <TouchableOpacity
            onPress={handleUnlock}
            className="bg-blue-500 py-3 rounded-lg mt-2"
          >
            <Text className="text-white text-center font-semibold text-lg">{loading ? 'Checking...' : 'Unlock'}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setShowPasswordModal(true)} className="mt-6 pt-4 border-t border-gray-100">
             <Text className="text-center text-gray-400 text-sm">Forgot Password?</Text>
          </TouchableOpacity>

          {/* Change Password Modal (Reused for Forgot Password) */}
          <Modal visible={showPasswordModal} transparent animationType="slide">
             <View className="flex-1 bg-black/50 justify-center p-6">
               <View className="bg-white rounded-xl p-6">
                 <Text className="text-lg font-bold mb-4">Reset Vault Password</Text>
                 
                 <Text className="text-xs text-gray-500 mb-1">Master Passkey</Text>
                 <TextInput
                    value={masterPasskey}
                    onChangeText={setMasterPasskey}
                    placeholder="Enter master passkey"
                    secureTextEntry
                    className="border border-gray-300 rounded-lg px-3 py-2 mb-3"
                 />

                 <Text className="text-xs text-gray-500 mb-1">New Password</Text>
                 <TextInput
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="Enter new password"
                    secureTextEntry
                    keyboardType="numeric"
                    className="border border-gray-300 rounded-lg px-3 py-2 mb-4"
                 />
                 
                 <View className="flex-row gap-3">
                   <TouchableOpacity onPress={() => setShowPasswordModal(false)} className="flex-1 py-3 bg-gray-100 rounded-lg">
                      <Text className="text-center text-gray-600 font-medium">Cancel</Text>
                   </TouchableOpacity>
                   <TouchableOpacity onPress={handleSetPassword} className="flex-1 py-3 bg-blue-600 rounded-lg">
                      <Text className="text-center text-white font-medium">Update</Text>
                   </TouchableOpacity>
                 </View>
               </View>
             </View>
          </Modal>
        </View>
      </View>
    );
  }

  // Unlocked Content
  return (
    <View className="flex-1 bg-gray-50">
      {/* Header Actions */}
      <View className="flex-row justify-end px-3 pt-2">
         <TouchableOpacity onPress={() => setShowPasswordModal(true)} className="mr-3 p-2 bg-gray-200 rounded-full">
            <Ionicons name="key-outline" size={18} color="#4B5563" />
         </TouchableOpacity>
         <TouchableOpacity onPress={handleLock} className="p-2 bg-gray-200 rounded-full">
            <Ionicons name="lock-closed" size={18} color="#4B5563" />
         </TouchableOpacity>
      </View>

      {/* Change Password Modal (For Unlocked State too) */}
      <Modal visible={showPasswordModal} transparent animationType="slide">
          <View className="flex-1 bg-black/50 justify-center p-6">
            <View className="bg-white rounded-xl p-6">
              <Text className="text-lg font-bold mb-4">Change Vault Password</Text>
              
              <Text className="text-xs text-gray-500 mb-1">Master Passkey</Text>
              <TextInput
                value={masterPasskey}
                onChangeText={setMasterPasskey}
                placeholder="Enter master passkey"
                secureTextEntry
                className="border border-gray-300 rounded-lg px-3 py-2 mb-3"
              />

              <Text className="text-xs text-gray-500 mb-1">New Password</Text>
              <TextInput
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Enter new password"
                secureTextEntry
                keyboardType="numeric"
                className="border border-gray-300 rounded-lg px-3 py-2 mb-4"
              />
              
              <View className="flex-row gap-3">
                <TouchableOpacity onPress={() => setShowPasswordModal(false)} className="flex-1 py-3 bg-gray-100 rounded-lg">
                  <Text className="text-center text-gray-600 font-medium">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSetPassword} className="flex-1 py-3 bg-blue-600 rounded-lg">
                  <Text className="text-center text-white font-medium">Update</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
      </Modal>

      {/* Summary Cards */}
      <View className="flex-row px-3 pt-3 space-x-2">
        <View className="flex-1 bg-green-500 p-3 rounded-lg">
          <Text className="text-green-100 text-xs">Income</Text>
          <Text className="text-white text-lg font-bold">₹{(summary?.totalIncome || 0).toLocaleString()}</Text>
        </View>
        <View className="flex-1 bg-red-500 p-3 rounded-lg">
          <Text className="text-red-100 text-xs">Expense</Text>
          <Text className="text-white text-lg font-bold">₹{(summary?.totalExpense || 0).toLocaleString()}</Text>
        </View>
      </View>

      {/* Balance Card */}
      <View className={`mx-3 mt-2 p-3 rounded-lg ${(summary?.balance || 0) >= 0 ? 'bg-blue-500' : 'bg-orange-500'}`}>
        <Text className="text-white/80 text-xs">Net Balance</Text>
        <Text className="text-white text-2xl font-bold">₹{(summary?.balance || 0).toLocaleString()}</Text>
      </View>

      {/* Transaction List */}
      <Text className="px-3 mt-3 mb-2 text-gray-500 text-sm">Recent Transactions</Text>
      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />}
      >
        {loading ? (
          <View className="p-8 items-center">
            <Text className="text-gray-500">Loading...</Text>
          </View>
        ) : transactions.length === 0 ? (
          <View className="p-8 items-center">
            <Ionicons name="wallet-outline" size={48} color="#9CA3AF" />
            <Text className="text-gray-500 mt-2">No transactions yet</Text>
          </View>
        ) : (
          transactions.map((tx) => (
            <TouchableOpacity
              key={tx._id}
              onLongPress={() => handleDelete(tx._id)}
              className="bg-white mx-3 mb-2 p-3 rounded-lg border border-gray-100"
            >
              <View className="flex-row justify-between items-start">
                <View className="flex-row items-center flex-1">
                  <View className={`w-9 h-9 rounded-full items-center justify-center ${
                    tx.type === 'income' ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    <Ionicons
                      name={tx.type === 'income' ? 'arrow-down' : 'arrow-up'}
                      size={18}
                      color={tx.type === 'income' ? '#22C55E' : '#EF4444'}
                    />
                  </View>
                  <View className="ml-2 flex-1">
                    <Text className="font-medium text-gray-800 text-sm" numberOfLines={1}>{tx.note}</Text>
                    <Text className="text-xs text-gray-400">
                      {new Date(tx.date).toLocaleDateString('en-IN')}
                    </Text>
                  </View>
                </View>
                <Text className={`font-bold ${tx.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
                  {tx.type === 'income' ? '+' : '-'}₹{tx.amount.toLocaleString()}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
        <View className="h-20" />
      </ScrollView>

      {/* Add Button */}
      <TouchableOpacity
        onPress={() => setShowModal(true)}
        className="absolute bottom-6 right-6 w-14 h-14 bg-blue-500 rounded-full items-center justify-center shadow-lg"
      >
        <Ionicons name="add" size={28} color="white" />
      </TouchableOpacity>

      {/* Add Transaction Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-2xl p-5">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-lg font-bold">Add Transaction</Text>
              <TouchableOpacity onPress={() => { setShowModal(false); resetForm(); }}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Type Selection */}
            <View className="flex-row mb-4">
              <TouchableOpacity
                onPress={() => setType('income')}
                className={`flex-1 py-3 rounded-l-lg border ${
                  type === 'income' ? 'bg-green-500 border-green-500' : 'bg-white border-gray-300'
                }`}
              >
                <Text className={`text-center font-medium ${type === 'income' ? 'text-white' : 'text-gray-600'}`}>
                  Income
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setType('expense')}
                className={`flex-1 py-3 rounded-r-lg border ${
                  type === 'expense' ? 'bg-red-500 border-red-500' : 'bg-white border-gray-300'
                }`}
              >
                <Text className={`text-center font-medium ${type === 'expense' ? 'text-white' : 'text-gray-600'}`}>
                  Expense
                </Text>
              </TouchableOpacity>
            </View>

            {/* Amount */}
            <TextInput
              value={amount}
              onChangeText={setAmount}
              placeholder="Amount"
              keyboardType="numeric"
              className="border border-gray-300 rounded-lg px-4 py-3 mb-3 text-lg"
            />

            {/* Note */}
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="Note (required) - What is this for?"
              className="border border-gray-300 rounded-lg px-4 py-3 mb-4"
              multiline
            />

            {/* Submit Button */}
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={saving}
              className={`py-3 rounded-lg ${saving ? 'bg-gray-400' : type === 'income' ? 'bg-green-500' : 'bg-red-500'}`}
            >
              <Text className="text-white text-center font-semibold text-lg">
                {saving ? 'Adding...' : `Add ${type === 'income' ? 'Income' : 'Expense'}`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
