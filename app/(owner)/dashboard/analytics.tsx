import React, { useState, useEffect } from 'react';
import { ScrollView, View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { 
  BarChart3, 
  Eye, 
  TrendingUp, 
  DollarSign,
  Calendar,
  Star,
  MessageSquare
} from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/utils/db';

interface AnalyticsStats {
  totalViews: number;
  monthlyEarnings: number;
  totalInquiries: number;
  averageViews: number;
  topPerformingListing: string;
  conversionRate: number;
}

export default function OwnerAnalytics() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [stats, setStats] = useState<AnalyticsStats>({
    totalViews: 0,
    monthlyEarnings: 0,
    totalInquiries: 0,
    averageViews: 0,
    topPerformingListing: 'Not available',
    conversionRate: 0
  });

  const loadAnalytics = async () => {
    if (!user?.id) return;

    try {
      // Load published listings for current user
      const publishedListings = await db.list('published_listings') as any[];
      const userListings = publishedListings.filter(listing => listing.userId === user.id);
      
      // Calculate analytics
      const totalViews = userListings.reduce((sum, listing) => sum + (listing.views || 0), 0);
      const totalInquiries = userListings.reduce((sum, listing) => sum + (listing.inquiries || 0), 0);
      const monthlyEarnings = userListings.reduce((sum, listing) => sum + (listing.monthlyRent || 0), 0);
      const averageViews = userListings.length > 0 ? Math.round(totalViews / userListings.length) : 0;
      
      // Find top performing listing
      const topListing = userListings.reduce((top, current) => {
        if (!top || (current.views || 0) > (top.views || 0)) {
          return current;
        }
        return top;
      }, null);
      
      const topPerformingListing = topListing 
        ? `${topListing.propertyType || 'Property'} (${topListing.views || 0} views)`
        : 'Not available';
      
      // Simple conversion rate calculation
      const conversionRate = totalViews > 0 ? Math.round((totalInquiries / totalViews) * 100) : 0;
      
      setStats({
        totalViews,
        monthlyEarnings,
        totalInquiries,
        averageViews,
        topPerformingListing,
        conversionRate
      });
      
    } catch (error) {
      console.error('❌ Error loading analytics:', error);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      loadAnalytics();
    }
  }, [isAuthenticated, user?.id]);

  if (!isAuthenticated) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 justify-center items-center">
          <Text className="text-lg font-semibold text-gray-600 mb-2">Authentication Required</Text>
          <TouchableOpacity 
            onPress={() => router.push('/login')}
            className="bg-indigo-600 px-6 py-3 rounded-lg"
          >
            <Text className="text-white font-medium">Go to Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-6 py-4 border-b border-gray-200">
        <View>
          <Text className="text-2xl font-bold text-gray-900">Analytics</Text>
          <Text className="text-gray-600">Performance insights</Text>
        </View>
      </View>

      <ScrollView className="flex-1">
        <View>
          
          {/* Key Metrics */}
          <View>
            <Text className="text-xl font-bold text-gray-900 mb-4">Key Metrics</Text>
            
            <View className="flex-row flex-wrap -mx-2 mb-4">
              <View className="w-1/2 px-2 mb-4">
                <View className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                  <View className="flex-row items-center mb-2">
                    <View className="bg-blue-100 p-2 rounded-lg">
                      <Eye size={20} color="#3B82F6" />
                    </View>
                    <Text className="text-sm text-gray-600 ml-2">Total Views</Text>
                  </View>
                  <Text className="text-2xl font-bold text-gray-900">{stats.totalViews}</Text>
                  <Text className="text-xs text-gray-500 mt-1">All listings</Text>
                </View>
              </View>
              
              <View className="w-1/2 px-2 mb-4">
                <View className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                  <View className="flex-row items-center mb-2">
                    <View className="bg-green-100 p-2 rounded-lg">
                      <MessageSquare size={20} color="#22C55E" />
                    </View>
                    <Text className="text-sm text-gray-600 ml-2">Inquiries</Text>
                  </View>
                  <Text className="text-2xl font-bold text-gray-900">{stats.totalInquiries}</Text>
                  <Text className="text-xs text-gray-500 mt-1">Messages received</Text>
                </View>
              </View>
              
              <View className="w-1/2 px-2 mb-4">
                <View className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                  <View className="flex-row items-center mb-2">
                    <View className="bg-yellow-100 p-2 rounded-lg">
                      <DollarSign size={20} color="#F59E0B" />
                    </View>
                    <Text className="text-sm text-gray-600 ml-2">Revenue</Text>
                  </View>
                  <Text className="text-2xl font-bold text-gray-900">₱{stats.monthlyEarnings.toLocaleString()}</Text>
                  <Text className="text-xs text-gray-500 mt-1">Monthly potential</Text>
                </View>
              </View>
              
              <View className="w-1/2 px-2 mb-4">
                <View className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                  <View className="flex-row items-center mb-2">
                    <View className="bg-purple-100 p-2 rounded-lg">
                      <BarChart3 size={20} color="#8B5CF6" />
                    </View>
                    <Text className="text-sm text-gray-600 ml-2">Conversion</Text>
                  </View>
                  <Text className="text-2xl font-bold text-gray-900">{stats.conversionRate}%</Text>
                  <Text className="text-xs text-gray-500 mt-1">Views to inquiries</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Performance Insights */}
          <View>
            <Text className="text-xl font-bold text-gray-900 mb-4">Performance Insights</Text>
            
            <View className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <View>
                <View className="flex-row items-center justify-between">
                  <Text className="text-gray-700">Average views per listing</Text>
                  <Text className="font-semibold text-gray-900">{stats.averageViews}</Text>
                </View>
                
                <View className="h-px bg-gray-200"></View>
                
                <View className="flex-row items-center justify-between">
                  <Text className="text-gray-700">Top performing listing</Text>
                  <Text className="font-semibold text-gray-900 text-right flex-1 ml-4">{stats.topPerformingListing}</Text>
                </View>
                
                <View className="h-px bg-gray-200"></View>
                
                <View className="flex-row items-center justify-between">
                  <Text className="text-gray-700">Inquiry response rate</Text>
                  <Text className="font-semibold text-gray-900">{stats.conversionRate > 0 ? 'Good' : 'Needs attention'}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Quick Actions */}
          <View>
            <Text className="text-xl font-bold text-gray-900 mb-4">Quick Actions</Text>
            
            <View>
              <TouchableOpacity 
                onPress={() => router.push('/property-owner')}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex-row items-center"
              >
                <View className="bg-indigo-100 p-3 rounded-lg">
                  <Star size={20} color="#3B82F6" />
                </View>
                <View className="ml-4 flex-1">
                  <Text className="font-semibold text-gray-900">Enhance Your Listings</Text>
                  <Text className="text-gray-600">Add more photos or update descriptions</Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity 
                onPress={() => router.push('/(owner)/dashboard/listings')}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex-row items-center"
              >
                <View className="bg-green-100 p-3 rounded-lg">
                  <BarChart3 size={20} color="#22C55E" />
                </View>
                <View className="ml-4 flex-1">
                  <Text className="font-semibold text-gray-900">Manage Listings</Text>
                  <Text className="text-gray-600">View and optimize your properties</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
