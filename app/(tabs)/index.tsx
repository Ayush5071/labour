import { View, Text, FlatList, TouchableOpacity, RefreshControl, Alert, TextInput } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useCallback, useMemo, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { workersApi, vaultApi } from '../../services/api';
import { Worker } from '../../types';

type SortOption = 'name' | 'rate' | 'advance';

export default function WorkersScreen() {
  const router = useRouter();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [showInactive, setShowInactive] = useState(false);


  // Company name state
  const [companyName, setCompanyName] = useState('');
  const [companySaving, setCompanySaving] = useState(false);

  const fetchWorkers = async () => {
    try {
      setLoading(true);
      // When showInactive is true, fetch all workers (no filter); otherwise fetch only active workers
      const response = await workersApi.getAll(showInactive ? undefined : true);
      setWorkers(response.data);

      // load company name
      try {
        const res = await vaultApi.getCompanyName();
        if (res.data && res.data.companyName) setCompanyName(res.data.companyName);
      } catch (e) {
        // ignore
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to fetch workers');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchWorkers();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchWorkers();
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert(
      'Deactivate Worker',
      `Are you sure you want to deactivate ${name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: async () => {
            try {
              await workersApi.delete(id);
              fetchWorkers();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to deactivate worker');
            }
          },
        },
      ]
    );
  };

  const handleActivate = (id: string, name: string) => {
    Alert.alert(
      'Activate Worker',
      `Do you want to activate ${name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Activate',
          onPress: async () => {
            try {
              await workersApi.update(id, { isActive: true });
              fetchWorkers();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to activate worker');
            }
          }
        }
      ]
    );
  };

  const filteredWorkers = useMemo(() => {
    let result = [...workers];

    // Filter
    if (searchQuery) {
      result = result.filter(w => 
        w.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'rate') return b.hourlyRate - a.hourlyRate;
      if (sortBy === 'advance') return (b.advanceBalance || 0) - (a.advanceBalance || 0);
      return 0;
    });

    return result;
  }, [workers, searchQuery, sortBy]);

  const renderWorkerItem = ({ item }: { item: Worker }) => (
    <TouchableOpacity
      className={`mx-2 my-0.5 px-3 py-2 rounded-lg border flex-row items-center justify-between shadow-sm ${item.isActive === false ? 'bg-red-50 border-red-200' : 'bg-white border-gray-100'}`}
      style={{ minHeight: 44 }}
      onPress={() => router.push(`/worker/details/${item._id}`)}
    >
      <View className="flex-1 flex-row items-center">
        <View className="w-8 h-8 bg-blue-50 rounded-full items-center justify-center mr-3 border border-blue-100">
          <Text className="text-blue-600 font-bold text-xs">{item.name.charAt(0).toUpperCase()}</Text>
        </View>
        <View className="flex-1 justify-center">
          <Text className={`font-semibold ${item.isActive === false ? 'text-red-700' : 'text-gray-800'} text-sm leading-tight`} numberOfLines={1}>{item.name}</Text>
          <View className="flex-row items-center">
             <Text className="text-[10px] text-gray-500 mr-2">Rate: ₹{item.hourlyRate}</Text>
             {(item.advanceBalance || 0) > 0 && (
               <Text className="text-[10px] text-red-500 font-medium">Adv: ₹{item.advanceBalance}</Text>
             )}
          </View>
        </View>
      </View>
      
      <View className="flex-row items-center gap-2">
        {(item.totalDaysWorked || 0) > 0 && <View className="px-1.5 py-0.5 bg-green-50 rounded"><Text className="text-[10px] text-green-700 font-medium">{item.totalDaysWorked}d</Text></View>}
        {(item.totalDaysAbsent || 0) > 0 && <View className="px-1.5 py-0.5 bg-red-50 rounded"><Text className="text-[10px] text-red-700 font-medium">{item.totalDaysAbsent}a</Text></View>}
        
        <TouchableOpacity className="p-1" onPress={() => router.push(`/worker/${item._id}`)}>
          <Ionicons name="pencil-outline" size={16} color="#6B7280" />
        </TouchableOpacity>
        {item.isActive === false ? (
          <TouchableOpacity className="px-3 py-1 rounded bg-green-600" onPress={() => handleActivate(item._id, item.name)}>
            <Text className="text-white text-xs">Activate</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity className="p-1" onPress={() => handleDelete(item._id, item.name)}>
            <Ionicons name="trash-outline" size={16} color="#EF4444" />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-gray-50">
      {/* Summary Header & Search */}
      <View className="bg-white px-4 pt-3 pb-2 border-b border-gray-100 z-10">
        <View className="flex-row items-center bg-gray-100 rounded-lg px-3 py-2 mb-3">
          <Ionicons name="search" size={20} color="#9CA3AF" />
          <TextInput
            className="flex-1 ml-2 text-gray-800 text-base"
            placeholder="Search workers..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9CA3AF"
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}

          <View className="ml-3 flex-row items-center">
            <TextInput
              className="border border-gray-300 rounded px-2 py-1 text-sm w-40 bg-white mr-2"
              placeholder="Company name"
              value={companyName}
              onChangeText={setCompanyName}
            />
            <TouchableOpacity
              onPress={async () => {
                setCompanySaving(true);
                try {
                  await vaultApi.setCompanyName(companyName || '');
                  Alert.alert('Saved', 'Company name saved');
                } catch (e: any) {
                  Alert.alert('Error', e.response?.data?.error || e.message);
                } finally {
                  setCompanySaving(false);
                }
              }}
              className={`px-3 py-1 rounded ${companySaving ? 'bg-gray-300' : 'bg-white border border-gray-200'}`}
            >
              <Text className="text-sm">Save</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <View className="flex-row justify-between items-center">
          <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            {filteredWorkers.length} Workers
          </Text>
          <View className="flex-row gap-2">
             <TouchableOpacity 
               onPress={() => setSortBy('name')} 
               className={`px-2 py-1 rounded text-xs border ${sortBy === 'name' ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}
             >
               <Text className={`text-xs ${sortBy === 'name' ? 'text-blue-600' : 'text-gray-500'}`}>Name</Text>
             </TouchableOpacity>
             <TouchableOpacity 
               onPress={() => setSortBy('rate')} 
               className={`px-2 py-1 rounded text-xs border ${sortBy === 'rate' ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}
             >
               <Text className={`text-xs ${sortBy === 'rate' ? 'text-blue-600' : 'text-gray-500'}`}>Rate</Text>
             </TouchableOpacity>
             <TouchableOpacity 
               onPress={() => setSortBy('advance')} 
               className={`px-2 py-1 rounded text-xs border ${sortBy === 'advance' ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}
             >
               <Text className={`text-xs ${sortBy === 'advance' ? 'text-blue-600' : 'text-gray-500'}`}>Adv</Text>
             </TouchableOpacity>
          </View>
        </View>
      </View>

      <FlatList
        data={filteredWorkers}
        renderItem={renderWorkerItem}
        keyExtractor={(item: Worker) => item._id}
        contentContainerStyle={{ paddingVertical: 8, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center py-20">
            <Ionicons name="search-outline" size={48} color="#D1D5DB" />
            <Text className="text-gray-400 mt-4 text-center">
              {loading ? 'Loading...' : searchQuery ? 'No workers match your search' : 'No workers found.\nAdd your first worker!'}
            </Text>
          </View>
        }
      />
      
      {/* Support Button */}
      <TouchableOpacity
        className="absolute bottom-24 right-5 bg-white w-12 h-12 rounded-full items-center justify-center shadow-md border border-gray-200"
        onPress={() => router.push('/support')}
      >
        <Ionicons name="headset-outline" size={24} color="#3B82F6" />
      </TouchableOpacity>

      {/* Add Button */}
      <TouchableOpacity
        className="absolute bottom-6 right-5 bg-blue-600 w-14 h-14 rounded-full items-center justify-center shadow-lg elevation-5"
        onPress={() => router.push('/worker/add')}
      >
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}
