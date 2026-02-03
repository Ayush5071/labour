import { View, Text, Linking, TouchableOpacity, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function SupportScreen() {
  const handleEmail = () => {
    Linking.openURL('mailto:css.softwares.2017@gmail.com');
  };

  const handleCall = (number: string) => {
    Linking.openURL(`tel:${number.replace(/\s/g, '')}`);
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Support', headerStyle: { backgroundColor: '#3B82F6' }, headerTintColor: '#fff' }} />
      <ScrollView className="flex-1 bg-white p-6">
        <View className="items-center mb-8">
          <View className="w-24 h-24 bg-blue-100 rounded-full items-center justify-center mb-4">
            <Ionicons name="headset" size={48} color="#3B82F6" />
          </View>
          <Text className="text-2xl font-bold text-gray-800 text-center">Contact Details</Text>
          <Text className="text-lg font-semibold text-blue-600 mt-2 text-center">Computer Software Solutions</Text>
        </View>

        <View className="space-y-6">
          <View className="bg-gray-50 p-4 rounded-xl border border-gray-100">
            <View className="flex-row items-center mb-3">
              <Ionicons name="mail" size={24} color="#3B82F6" />
              <Text className="font-semibold text-gray-700 ml-3 text-lg">Email Address</Text>
            </View>
            <TouchableOpacity onPress={handleEmail}>
              <Text className="text-blue-600 text-base">css.softwares.2017@gmail.com</Text>
            </TouchableOpacity>
          </View>

          <View className="bg-gray-50 p-4 rounded-xl border border-gray-100">
            <View className="flex-row items-center mb-3">
              <Ionicons name="call" size={24} color="#3B82F6" />
              <Text className="font-semibold text-gray-700 ml-3 text-lg">Contact Numbers</Text>
            </View>
            <TouchableOpacity onPress={() => handleCall('+91 86979 74525')} className="mb-2">
              <Text className="text-blue-600 text-base">+91 86979 74525</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleCall('+91 98302 31409')}>
              <Text className="text-blue-600 text-base">+91 98302 31409</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View className="mt-8 p-4">
            <Text className="text-gray-400 text-center text-sm">
                We are here to help you manage your workforce efficiently.
            </Text>
        </View>
      </ScrollView>
    </>
  );
}
