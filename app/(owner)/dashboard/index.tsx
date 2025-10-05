import React, { useState, useEffect } from 'react';
import { ScrollView, View, Text, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { 
  Home, 
  Plus, 
  Eye, 
  Edit, 
  Trash2, 
  BarChart3, 
  Users, 
  DollarSign,
  ChevronRight,
  Calendar,
  TrendingUp,
  Star,
  MessageSquare,
  LogOut
} from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/utils/db';

interface DashboardCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
  onPress?: () => void;
}

const DashboardCard: React.FC<DashboardCardProps> = ({ 
  title, value, subtitle, icon, color, onPress 
}) => (
  <TouchableOpacity
    onPress={onPress}
    className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex-1"
  >
    <View className="flex-row items-center mb-2">
      <View style={{ backgroundColor: color + '20' }} className="p-2 rounded-lg">
        {icon}
      </View>
      <Text className="text-sm text-gray-600 ml-2 flex-1">{title}</Text>
    </View>
    <Text className="text-2xl font-bold text-gray-900">{value}</Text>
    <Text className="text-xs text-gray-500 mt-1">{subtitle}</Text>
  </TouchableOpacity>
);

export default function OwnerDashboard() {
  const router = useRouter();
  const { user, isAuthenticated, signOut } = useAuth();
  const [stats, setStats] = useState({
    totalListings: 0,
    publishedListings: 0,
    draftListings: 0,
    totalViews: 0,
    monthlyEarnings: 0,
    pendingInquiries: 0
  });
  const [recentListings, setRecentListings] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);

  const loadDashboardData = async () => {
    if (!user?.id) return;

    try {
      // Load all listings for this owner
      const allListings = await db.list('published_listings') as any[];
      const drafts = await db.list('listing_drafts') as any[];
      
      // Filter for current user's listings
      const userListings = allListings.filter(listing => listing.userId === user.id);
      const userDrafts = drafts.filter(draft => draft.userId === user.id);
      
      // Calculate stats
      const totalViews = userListings.reduce((sum, listing) => sum + (listing.views || 0), 0);
      const monthlyEarnings = userListings.reduce((sum, listing) => sum + (listing.monthlyRent || 0), 0);
      
      setStats({
        totalListings: userListings.length + userDrafts.length,
        publishedListings: userListings.length,
        draftListings: userDrafts.length,
        totalViews,
        monthlyEarnings,
        pendingInquiries: userListings.reduce((sum, listing) => sum + (listing.inquiries || 0), 0)
      });
      
      // Get recent listings (last 5) with enhanced data
      const recent = [...userListings.map(listing => ({
        ...listing,
        status: 'published' as const,
        title: `${listing.propertyType} in ${(listing.address || '').split(',')[0]}`,
        isNew: listing.publishedAt && new Date(listing.publishedAt).getTime() > Date.now() - 24 * 60 * 60 * 1000 // 24 hours
      })), ...userDrafts.map(draft => ({
        ...draft,
        status: 'draft' as const,
        title: `${draft.propertyType || 'Property'} in ${(draft.address || '').split(',')[0]}`,
        isNew: false
      }))].slice(0, 5);
      
      setRecentListings(recent);
      
      // Check if there are any very new listings (published in last hour) to show success banner
      const veryNewListings = userListings.filter(listing => 
        listing.publishedAt && new Date(listing.publishedAt).getTime() > Date.now() - 60 * 60 * 1000 // 1 hour
      );
      
      if (veryNewListings.length > 0) {
        setShowSuccessBanner(true);
        // Hide banner after 10 seconds
        setTimeout(() => setShowSuccessBanner(false), 10000);
      }
      
    } catch (error) {
      console.error('❌ Error loading dashboard data:', error);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      loadDashboardData();
    }
  }, [isAuthenticated, user?.id]);

  // Refresh data when screen comes into focus (after publishing)
  useEffect(() => {
    const handleFocus = () => {
      console.log('🔄 Dashboard focused - refreshing listing data...');
      if (user?.id) {
        loadDashboardData();
      }
    };
    
    // Set up focus listener for screen refresh
    const unsubscribe = router.addListener?.('focus', handleFocus) || 
                       (() => {});
    
    return unsubscribe;
  }, [user?.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    console.log('Logout button pressed');
    console.log('Current user before logout:', user);
    
    try {
      console.log('Starting logout process...');
      
      // Call signOut from AuthContext
      await signOut();
      
      console.log('Logout successful - user will be redirected automatically');
      
      // The tab layout will automatically redirect to login when user becomes null
      // No need for manual navigation as the TabLayout handles this
      
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert(
        'Logout Error', 
        'Failed to logout. Please try again or refresh the page.',
        [
          {
            text: 'OK',
            onPress: () => console.log('User acknowledged logout error')
          }
        ]
      );
    }
  };

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
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-2xl font-bold text-gray-900">Property Dashboard</Text>
            <Text className="text-gray-600">Welcome back!</Text>
          </View>
          <View className="flex-row items-center space-x-2">
            <TouchableOpacity
              onPress={() => router.push('/property-owner')}
              className="bg-indigo-600 px-3 py-2 rounded-lg flex-row items-center"
            >
              <Plus size={18} color="white" />
              <Text className="text-white font-medium ml-1">New</Text>
            </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            console.log('🔴 Logout button pressed!');
            handleLogout();
          }}
          className="px-3 py-2 rounded-lg flex-row items-center border bg-red-50 border-red-200"
        >
          <LogOut size={18} color="#DC2626" />
          <Text className="font-medium ml-1 text-red-600">Logout</Text>
        </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Success Banner */}
      {showSuccessBanner && (
        <View className="bg-green-50 border-b border-green-200 px-6 py-3">
          <View className="flex-row items-center">
            <View className="bg-green-100 rounded-full p-2 mr-3">
              <Plus size={16} color="#059669" />
            </View>
            <View className="flex-1">
              <Text className="text-green-800 font-semibold">Listing Published Successfully! 🎉</Text>
              <Text className="text-green-700 text-sm">
                Your property is now live and visible to potential tenants. Check the progress below!
              </Text>
            </View>
            <TouchableOpacity onPress={() => setShowSuccessBanner(false)}>
              <Text className="text-green-600 font-medium">✕</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <ScrollView 
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Stats Overview */}
        <View className="p-6">
          <Text className="text-xl font-bold text-gray-900 mb-4">Overview</Text>
          
          <View className="flex-row flex-wrap -mx-2 mb-6">
            <View className="w-1/2 px-2 mb-4">
              <DashboardCard
                title="Total Listings"
                value={stats.totalListings.toString()}
                subtitle={`${stats.publishedListings} published, ${stats.draftListings} drafts`}
                icon={<Home size={20} color="#3B82F6" />}
                color="#3B82F6"
                onPress={() => router.push('/(owner)/dashboard/listings')}
              />
            </View>
            
            <View className="w-1/2 px-2 mb-4">
              <DashboardCard
                title="Total Views"
                value={stats.totalViews.toString()}
                subtitle="This month"
                icon={<BarChart3 size={20} color="#22C55E" />}
                color="#22C55E"
                onPress={() => router.push('/(owner)/dashboard/analytics')}
              />
            </View>
            
            <View className="w-1/2 px-2 mb-4">
              <DashboardCard
                title="Monthly Revenue"
                value={`₱${stats.monthlyEarnings.toLocaleString()}`}
                subtitle="Potential income"
                icon={<DollarSign size={20} color="#F59E0B" />}
                color="#F59E0B"
                onPress={() => router.push('/(owner)/dashboard/analytics')}
              />
            </View>
            
            <View className="w-1/2 px-2 mb-4">
              <DashboardCard
                title="Inquiries"
                value={stats.pendingInquiries.toString()}
                subtitle="Need attention"
                icon={<MessageSquare size={20} color="#EF4444" />}
                color="#EF4444"
                onPress={() => router.push('/(owner)/dashboard/messages')}
              />
            </View>
          </View>

          {/* Quick Actions */}
          <View className="mb-6">
            <Text className="text-xl font-bold text-gray-900 mb-4">Quick Actions</Text>
            
            <View>
              <TouchableOpacity 
                onPress={() => router.push('/property-owner')}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex-row items-center"
              >
                <View className="bg-blue-100 p-3 rounded-lg">
                  <Plus size={24} color="#3B82F6" />
                </View>
                <View className="ml-4 flex-1">
                  <Text className="font-semibold text-gray-900">Create New Listing</Text>
                  <Text className="text-gray-600">Add a new property for rent</Text>
                </View>
                <ChevronRight size={20} color="#9CA3AF" />
              </TouchableOpacity>
              
              <TouchableOpacity 
                onPress={() => router.push('/(owner)/dashboard/listings')}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex-row items-center"
              >
                <View className="bg-green-100 p-3 rounded-lg">
                  <Home size={24} color="#22C55E" />
                </View>
                <View className="ml-4 flex-1">
                  <Text className="font-semibold text-gray-900">Manage Listings</Text>
                  <Text className="text-gray-600">View and edit your properties</Text>
                </View>
                <ChevronRight size={20} color="#9CA3AF" />
              </TouchableOpacity>
              
              <TouchableOpacity 
                onPress={() => router.push('/(owner)/dashboard/messages')}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex-row items-center"
              >
                <View className="bg-purple-100 p-3 rounded-lg">
                  <MessageSquare size={24} color="#8B5CF6" />
                </View>


                <View className="ml-4 flex-1">
                  <Text className="font-semibold text-gray-900">Messages</Text>
                  <Text className="text-gray-600">Respond to tenant inquiries</Text>
                </View>
                <ChevronRight size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Recent Listings */}
          <View>
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-xl font-bold text-gray-900">Recent Listings</Text>
              <TouchableOpacity
                onPress={() => router.push('/(owner)/dashboard/listings')}
                className="flex-row items-center"
              >
                <Text className="text-indigo-600 font-medium">View All</Text>
                <ChevronRight size={16} color="#3B82F6" />
              </TouchableOpacity>
            </View>

            {recentListings.length === 0 ? (
              <View className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 items-center">
                <Home size={48} color="#9CA3AF" />
                <Text className="text-lg font-medium text-gray-900 mt-4 mb-2">No listings yet</Text>
                <Text className="text-gray-600 text-center mb-6">Create your first property listing to get started</Text>
                <TouchableOpacity
                  onPress={() => router.push('/property-owner')}
                  className="bg-indigo-600 px-6 py-3 rounded-lg"
                >
                  <Text className="text-white font-medium">Create Listing</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                {recentListings.map((listing: any, index) => (
                  <TouchableOpacity
                    key={listing.id || index}
                    className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"
                  >
                    <View className="flex-row items-start justify-between">
                      <View className="flex-1">
                        <View className="flex-row items-center mb-1">
                          <Text className="font-medium text-gray-900 flex-1">
                            {listing.title || `${listing.propertyType || 'Property'} in ${(listing.address || '').split(',')[0] || 'Philippines'}`}
                          </Text>
                          <View className={`px-2 py-1 rounded-full ${
                            listing.status === 'published' 
                              ? listing.isNew ? 'bg-blue-100' : 'bg-green-100'
                              : 'bg-yellow-100'
                          }`}>
                            <Text className={`text-xs font-medium ${
                              listing.status === 'published' 
                                ? listing.isNew ? 'text-blue-700' : 'text-green-700'
                                : 'text-yellow-700'
                            }`}>
                              {listing.status === 'published' 
                                ? (listing.isNew ? 'Just Published!' : 'Published')
                                : 'Draft'
                              }
                            </Text>
                          </View>
                        </View>
                        
                        <Text className="text-gray-600 text-sm mb-2">{listing.address || 'No address'}</Text>
                        
                        {listing.status === 'published' && (
                          <View className="flex-row items-center mb-2">
                            <View className="flex-row items-center mr-4">
                              <Eye size={14} color="#6B7280" />
                              <Text className="text-gray-500 text-sm ml-1">{listing.views || 0} views</Text>
                            </View>
                            <View className="flex-row items-center mr-4">
                              <MessageSquare size={14} color="#6B7280" />
                              <Text className="text-gray-500 text-sm ml-1">{listing.inquiries || 0} inquiries</Text>
                            </View>
                            {listing.publishedAt && (
                              <Text className="text-gray-400 text-xs">
                                Published {new Date(listing.publishedAt).toLocaleDateString()}
                              </Text>
                            )}
                          </View>
                        )}
                        
                        <View className="flex-row items-center justify-between">
                          <Text className="text-lg font-bold text-green-600">
                            ₱{(listing.monthlyRent || listing.baseRent || 0).toLocaleString()}/month
                          </Text>
                          {listing.status === 'published' ? (
                            <View className="flex-row items-center space-x-2">
                              <Star size={14} color="#F59E0B" />
                              <Text className="text-gray-600 text-sm ml-1">Active</Text>
                            </View>
                          ) : (
                            <Text className="text-gray-500 text-sm">Draft</Text>
                          )}
                        </View>
                        
                        {/* Action Buttons */}
                        <View className="flex-row items-center space-x-2 mt-3">
                          {listing.status === 'published' && (
                            <TouchableOpacity
                              onPress={() => {
                                // Navigate to property preview
                                router.push({
                                  pathname: '/property-preview',
                                  params: {
                                    id: listing.id,
                                    title: listing.title || `${listing.propertyType || 'Property'} in ${(listing.address || '').split(',')[0] || 'Philippines'}`,
                                    location: listing.address || 'No address',
                                    price: (listing.monthlyRent || listing.baseRent || 0).toString(),
                                    rooms: '1',
                                    size: '50',
                                    rating: '4.8',
                                    reviews: '12',
                                    image: listing.photos?.[0] || 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=500',
                                    ownerUserId: user?.id || '',
                                    description: `Beautiful property located in ${listing.address || 'a great location'}. Perfect for your next home.`,
                                    amenities: JSON.stringify(['WiFi', 'Parking', 'Air Conditioning']),
                                    photos: JSON.stringify(listing.photos || []),
                                    propertyType: listing.propertyType || 'Property',
                                    rentalType: listing.rentalType || 'Not specified',
                                    availabilityStatus: listing.availabilityStatus || 'Available',
                                    leaseTerm: listing.leaseTerm || 'Not specified',
                                    monthlyRent: (listing.monthlyRent || listing.baseRent || 0).toString(),
                                    baseRent: '',
                                    securityDeposit: '',
                                    paymentMethods: '',
                                    ownerName: user?.name || 'Property Owner',
                                    businessName: listing.businessName || '',
                                    contactNumber: listing.contactNumber || 'Contact not provided',
                                    email: user?.email || 'Email not provided',
                                    emergencyContact: '',
                                    rules: '',
                                    videos: '',
                                    coverPhoto: listing.photos?.[0] || '',
                                    publishedAt: listing.publishedAt || '',
                                    isOwnerView: 'true'
                                  }
                                });
                              }}
                              className="bg-blue-100 px-3 py-1 rounded-lg"
                            >
                              <View className="flex-row items-center">
                                <Eye size={14} color="#3B82F6" />
                                <Text className="text-blue-600 text-sm font-medium ml-1">View</Text>
                              </View>
                            </TouchableOpacity>
                          )}
                          <TouchableOpacity
                            onPress={() => router.push({
                              pathname: '/property-owner',
                              params: { 
                                editListingId: listing.id,
                                editMode: 'true'
                              }
                            })}
                            className="bg-indigo-100 px-3 py-1 rounded-lg"
                          >
                            <Text className="text-indigo-600 text-sm font-medium">
                              {listing.status === 'draft' ? 'Continue Editing' : 'Edit'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
