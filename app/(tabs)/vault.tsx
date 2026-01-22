import { View, Text, ScrollView, TouchableOpacity, Alert, TextInput, Modal, RefreshControl } from 'react-native';
import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { vaultApi } from '../../services/api';
import { Transaction, VaultSummary } from '../../types';

const VAULT_PASSWORD = '123456';

export default function VaultScreen() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');

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

  useFocusEffect(
    useCallback(() => {
      if (isUnlocked) {
        fetchData();
      }
    }, [isUnlocked])
  );

  const handleUnlock = () => {
    if (passwordInput === VAULT_PASSWORD) {
      setIsUnlocked(true);
      setPasswordError('');
      setPasswordInput('');
      fetchData();
    } else {
      setPasswordError('Incorrect password');
      setPasswordInput('');
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

  // Password Screen
  if (!isUnlocked) {
    return (
      <View className="flex-1 bg-gray-50 justify-center items-center px-6">
        <View className="bg-white p-6 rounded-2xl shadow-lg w-full max-w-sm">
          <View className="items-center mb-6">
            <View className="w-16 h-16 bg-blue-100 rounded-full items-center justify-center mb-3">
              <Ionicons name="lock-closed" size={32} color="#3B82F6" />
            </View>
            <Text className="text-xl font-bold text-gray-800">Vault Locked</Text>
            <Text className="text-sm text-gray-500 text-center mt-1">Enter password to access vault</Text>
          </View>

          <TextInput
            value={passwordInput}
            onChangeText={setPasswordInput}
            placeholder="Enter Password"
            secureTextEntry
            keyboardType="numeric"
            className="border border-gray-300 rounded-lg px-4 py-3 text-center text-lg tracking-widest"
            onSubmitEditing={handleUnlock}
          />

          {passwordError ? (
            <Text className="text-red-500 text-sm text-center mt-2">{passwordError}</Text>
          ) : null}

          <TouchableOpacity
            onPress={handleUnlock}
            className="bg-blue-500 py-3 rounded-lg mt-4"
          >
            <Text className="text-white text-center font-semibold text-lg">Unlock</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Lock Button */}
      <TouchableOpacity
        onPress={handleLock}
        className="absolute top-3 right-3 z-10 bg-gray-200 p-2 rounded-full"
      >
        <Ionicons name="lock-closed" size={18} color="#6B7280" />
      </TouchableOpacity>

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
