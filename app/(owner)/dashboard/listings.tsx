import React, { useState, useEffect } from 'react';
import { ScrollView, View, Text, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { 
  Home, 
  Plus, 
  Eye, 
  Edit, 
  Trash2, 
  MoreVertical,
  Calendar,
  DollarSign,
  BarChart3
} from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/utils/db';

interface ListingItem {
  id: string;
  title: string;
  address: string;
  monthlyRent: number;
  status: 'published' | 'draft';
  photos: string[];
  views?: number;
  inquiries?: number;
  publishedAt?: string;
}

export default function OwnerListings() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [listings, setListings] = useState<ListingItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadListings = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      
      // Load published listings
      const publishedListings = await db.list('published_listings') as any[];
      const drafts = await db.list('listing_drafts') as any[];
      
      // Filter for current user's listings
      const userPublished = publishedListings.filter(listing => listing.userId === user.id);
      const userDrafts = drafts.filter(draft => draft.userId === user.id);
      
      // Format listings
      const formattedListings: ListingItem[] = [
        ...userPublished.map(listing => ({
          id: listing.id,
          title: `${listing.propertyType || 'Property'} in ${(listing.address || '').split(',')[0] || 'Philippines'}`,
          address: listing.address || 'No address',
          monthlyRent: listing.monthlyRent || listing.baseRent || 0,
          status: 'published' as const,
          photos: listing.photos || [],
          views: listing.views || 0,
          inquiries: listing.inquiries || 0,
          publishedAt: listing.publishedAt
        })),
        ...userDrafts.map(draft => ({
          id: draft.id || `${user.id}_draft`,
          title: `${draft.propertyType || 'Property'} in ${(draft.address || '').split(',')[0] || 'Philippines'}`,
          address: draft.address || 'No address',
          monthlyRent: draft.monthlyRent || draft.baseRent || 0,
          status: 'draft' as const,
          photos: draft.photos || [],
          publishedAt: undefined
        }))
      ];
      
      setListings(formattedListings);
      
    } catch (error) {
      console.error('❌ Error loading listings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      loadListings();
    }
  }, [isAuthenticated, user?.id]);

  const handleListingAction = (listing: ListingItem, action: string) => {
    switch (action) {
      case 'view':
        // Navigate to listing preview/view
        Alert.alert('View Listing', 'This will show the listing preview');
        break;
      case 'edit':
        // Navigate to edit listing (if draft) or duplicate for editing
        Alert.alert('Edit Listing', 'Opening editor...');
        break;
      case 'delete':
        Alert.alert(
          'Delete Listing',
          'Are you sure you want to delete this listing? This action cannot be undone.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Delete', 
              style: 'destructive',
              onPress: async () => {
                try {
                  await db.delete('published_listings', listing.id);
                  await db.delete('listing_drafts', listing.id);
                  loadListings(); // Reload the list
                  Alert.alert('Success', 'Listing deleted successfully');
                } catch (error) {
                  Alert.alert('Error', 'Failed to delete listing');
                }
              }
            }
          ]
        );
        break;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not published';
    return new Date(dateString).toLocaleDateString();
  };

  const handleViewListing = async (listing: ListingItem) => {
    if (listing.status === 'draft') {
      Alert.alert(
        'Draft Listing',
        'This listing is still a draft and not visible to tenants. Please publish it first to view it.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      // Get the full published listing data for more accurate display
      const publishedListings = await db.list('published_listings') as any[];
      const fullListing = publishedListings.find(p => p.id === listing.id);
      
      if (fullListing) {
        // Navigate to property preview with the complete listing data
        router.push({
          pathname: '/property-preview',
          params: {
            id: fullListing.id,
            title: fullListing.businessName 
              ? `${fullListing.businessName}'s ${fullListing.propertyType} in ${(fullListing.address || '').split(',')[0] || 'Property'}`
              : `${fullListing.propertyType} in ${(fullListing.address || '').split(',')[0] || 'Property'}`,
            location: fullListing.address || 'No address',
            price: (fullListing.monthlyRent || fullListing.baseRent || 0).toString(),
            rooms: (fullListing.bedrooms || 1).toString(),
            size: (fullListing.size || 50).toString(),
            rating: '4.8',
            reviews: '12',
            image: fullListing.photos?.[0] || 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=500',
            ownerUserId: fullListing.userId || user?.id || '',
            description: fullListing.description || `Beautiful ${fullListing.propertyType} located in ${fullListing.address || 'a great location'}. Perfect for your next home.`,
            amenities: JSON.stringify(fullListing.amenities || ['WiFi', 'Parking', 'Air Conditioning']),
            photos: JSON.stringify(fullListing.photos || []),
            propertyType: fullListing.propertyType || 'Property',
            rentalType: fullListing.rentalType || 'Not specified',
            availabilityStatus: fullListing.availabilityStatus || 'Available',
            leaseTerm: fullListing.leaseTerm || 'Not specified',
            monthlyRent: (fullListing.monthlyRent || fullListing.baseRent || 0).toString(),
            baseRent: (fullListing.baseRent || 0).toString(),
            securityDeposit: (fullListing.securityDeposit || 0).toString(),
            paymentMethods: JSON.stringify(fullListing.paymentMethods || []),
            ownerName: fullListing.ownerName || user?.name || 'Property Owner',
            businessName: fullListing.businessName || '',
            contactNumber: fullListing.contactNumber || 'Contact not provided',
            email: fullListing.email || user?.email || 'Email not provided',
            emergencyContact: fullListing.emergencyContact || '',
            rules: JSON.stringify(fullListing.rules || []),
            videos: JSON.stringify(fullListing.videos || []),
            coverPhoto: fullListing.coverPhoto || fullListing.photos?.[0] || '',
            publishedAt: fullListing.publishedAt || '',
            isOwnerView: 'true'
          }
        });
      } else {
        // Fallback to basic data if full listing not found
        router.push({
          pathname: '/property-preview',
          params: {
            id: listing.id,
            title: listing.title,
            location: listing.address,
            price: listing.monthlyRent.toString(),
            rooms: '1',
            size: '50',
            rating: '4.8',
            reviews: '12',
            image: listing.photos[0] || 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=500',
            ownerUserId: user?.id || '',
            description: `Beautiful property located in ${listing.address}. Perfect for your next home.`,
            amenities: JSON.stringify(['WiFi', 'Parking', 'Air Conditioning']),
            photos: JSON.stringify(listing.photos),
            propertyType: 'Property',
            rentalType: 'Not specified',
            availabilityStatus: 'Available',
            leaseTerm: 'Not specified',
            monthlyRent: listing.monthlyRent.toString(),
            baseRent: '',
            securityDeposit: '',
            paymentMethods: '',
            ownerName: user?.name || 'Property Owner',
            businessName: '',
            contactNumber: 'Contact not provided',
            email: user?.email || 'Email not provided',
            emergencyContact: '',
            rules: '',
            videos: '',
            coverPhoto: listing.photos[0] || '',
            publishedAt: listing.publishedAt || '',
            isOwnerView: 'true'
          }
        });
      }
    } catch (error) {
      console.error('❌ Error loading full listing data:', error);
      Alert.alert('Error', 'Failed to load listing details. Please try again.');
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
            <Text className="text-2xl font-bold text-gray-900">My Listings</Text>
            <Text className="text-gray-600">{listings.length} properties</Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/property-owner')}
            className="bg-indigo-600 px-4 py-2 rounded-lg flex-row items-center"
          >
            <Plus size={18} color="white" />
            <Text className="text-white font-medium ml-1">New</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1">
        <View className="p-6">
          {loading ? (
            <View className="flex-1 justify-center items-center py-8">
              <Text className="text-gray-600">Loading listings...</Text>
            </View>
          ) : listings.length === 0 ? (
            <View className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 items-center">
              <Home size={48} color="#9CA3AF" />
              <Text className="text-lg font-medium text-gray-900 mt-4 mb-2">No listings yet</Text>
              <Text className="text-gray-600 text-center mb-6">
                Create your first property listing to start attracting tenants
              </Text>
              <TouchableOpacity
                onPress={() => router.push('/property-owner')}
                className="bg-indigo-600 px-6 py-3 rounded-lg"
              >
                <Text className="text-white font-medium">Create Listing</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              {listings.map((listing) => (
                <View key={listing.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                  <View className="flex-row items-start justify-between mb-3">
                    <View className="flex-1">
                      <Text className="font-semibold text-gray-900 text-lg mb-1">{listing.title}</Text>
                      <Text className="text-gray-600 text-sm mb-2">{listing.address}</Text>
                    </View>
                    
                    <View className="flex-row items-center">
                      <View className={`px-2 py-1 rounded-full mr-2 ${
                        listing.status === 'published' 
                          ? 'bg-green-100' 
                          : 'bg-yellow-100'
                      }`}>
                        <Text className={`text-xs font-medium ${
                          listing.status === 'published' 
                            ? 'text-green-700' 
                            : 'text-yellow-700'
                        }`}>
                          {listing.status === 'published' ? 'Published' : 'Draft'}
                        </Text>
                      </View>
                      
                      <TouchableOpacity
                        onPress={() => {
                          Alert.alert(
                            'Listing Options',
                            'Choose an action',
                            [
                              { text: 'View', onPress: () => handleListingAction(listing, 'view') },
                              { text: 'Edit', onPress: () => handleListingAction(listing, 'edit') },
                              { text: 'Cancel', style: 'cancel' },
                              { text: 'Delete', style: 'destructive', onPress: () => handleListingAction(listing, 'delete') }
                            ]
                          );
                        }}
                        className="p-1"
                      >
                        <MoreVertical size={18} color="#6B7280" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View className="flex-row items-center justify-between mb-3">
                    <Text className="text-xl font-bold text-green-600">
                      ₱{listing.monthlyRent.toLocaleString()}/month
                    </Text>
                    
                    {listing.status === 'published' && (
                      <View className="flex-row items-center space-x-4">
                        <View className="flex-row items-center">
                          <Eye size={16} color="#6B7280" />
                          <Text className="text-gray-600 text-sm ml-1">{listing.views}</Text>
                        </View>
                        {listing.inquiries > 0 && (
                          <View className="flex-row items-center">
                            <Text className="text-purple-600 text-sm">{listing.inquiries} inquiries</Text>
                          </View>
                        )}
                      </View>
                    )}
                  </View>

                  <View className="flex-row items-center justify-between pt-3 border-t border-gray-100">
                    <View className="flex-row items-center">
                      <Calendar size={14} color="#6B7280" />
                      <Text className="text-gray-600 text-sm ml-1">
                        {formatDate(listing.publishedAt)}
                      </Text>
                    </View>
                    
                    <View className="flex-row items-center space-x-2">
                      {listing.status === 'published' && (
                        <TouchableOpacity
                          onPress={() => handleViewListing(listing)}
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
                          {listing.status === 'draft' ? 'Continue Editing' : 'Edit Listing'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
