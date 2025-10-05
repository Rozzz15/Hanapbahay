import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, Alert } from 'react-native';
import { ThemedView } from '@/components/common';
import { ThemedText } from '@/components/common';
import { MediaData } from '@/types/property';
import { Camera, Image as ImageIcon, Video, Trash2, Star } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { 
  savePropertyPhoto, 
  getPropertyPhotos, 
  deletePropertyPhoto, 
  setPropertyCoverPhoto,
  PropertyPhotoRecord 
} from '@/utils/property-photos';
import { useAuth } from '@/context/AuthContext';

interface MediaUploadSectionProps {
  data: MediaData;
  onUpdate: (data: Partial<MediaData>) => void;
  listingId?: string; // Add listingId for persistent storage
}

export default function MediaUploadSection({ data, onUpdate, listingId }: MediaUploadSectionProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [savedPhotos, setSavedPhotos] = useState<PropertyPhotoRecord[]>([]);
  const { user } = useAuth();

  // Load existing photos when component mounts or listingId changes
  useEffect(() => {
    if (listingId) {
      loadExistingPhotos();
    }
  }, [listingId]);

  const loadExistingPhotos = async () => {
    if (!listingId) return;
    
    try {
      console.log('📂 Loading existing photos for listing:', listingId);
      const photos = await getPropertyPhotos(listingId);
      setSavedPhotos(photos);
      
      // Update the data with loaded photos
      const photoUris = photos.map(photo => photo.photoUri);
      const coverPhoto = photos.find(photo => photo.isCoverPhoto)?.photoUri || null;
      
      onUpdate({
        photos: photoUris,
        coverPhoto: coverPhoto
      });
      
      console.log(`✅ Loaded ${photos.length} existing photos`);
    } catch (error) {
      console.error('❌ Error loading existing photos:', error);
    }
  };

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera roll permissions to upload photos.');
      return false;
    }
    return true;
  };

  const pickImage = async () => {
    console.log('🖼️ Pick image button pressed');
    console.log('🔍 Debug info:', {
      listingId: listingId,
      userId: user?.id,
      isAuthenticated: !!user,
      hasPermission: await ImagePicker.getMediaLibraryPermissionsAsync()
    });

    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    setIsUploading(true);
    try {
      console.log('📱 Launching image picker...');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      console.log('📋 Image picker result:', {
        canceled: result.canceled,
        assetsCount: result.assets?.length || 0
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newPhotos = result.assets.map(asset => asset.uri);
        console.log('📸 New photos selected:', newPhotos.length);
        
        if (listingId && user?.id) {
          // Save photos persistently to database
          console.log('💾 Saving photos to database...');
          console.log('🔍 Database save details:', {
            listingId,
            userId: user.id,
            photoCount: newPhotos.length
          });
          
          let successCount = 0;
          for (let i = 0; i < newPhotos.length; i++) {
            const photoUri = newPhotos[i];
            const fileName = `property_${listingId}_${Date.now()}_${i}.jpg`;
            console.log(`💾 Saving photo ${i + 1}/${newPhotos.length}:`, fileName);
            
            try {
              await savePropertyPhoto(listingId, user.id, photoUri, fileName, false);
              console.log(`✅ Photo ${i + 1} saved successfully`);
              successCount++;
            } catch (photoError) {
              console.error(`❌ Error saving photo ${i + 1}:`, photoError);
              // Continue with other photos even if one fails
            }
          }
          
          if (successCount > 0) {
            // Reload photos from database
            console.log('🔄 Reloading photos from database...');
            await loadExistingPhotos();
          } else {
            // If all database saves failed, fall back to temporary storage
            console.log('⚠️ All database saves failed, using temporary storage');
            const updatedPhotos = [...data.photos, ...newPhotos];
            onUpdate({ photos: updatedPhotos });
          }
        } else {
          // Fallback to temporary storage (for new listings)
          console.log('📝 Using temporary storage (no listingId or userId)');
          const updatedPhotos = [...data.photos, ...newPhotos];
          onUpdate({ photos: updatedPhotos });
        }
      } else {
        console.log('❌ No photos selected or picker was canceled');
      }
    } catch (error) {
      console.error('❌ Error picking images:', error);
      Alert.alert('Error', `Failed to pick images: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
      console.log('🏁 Image picker process completed');
    }
  };

  const takePhoto = async () => {
    console.log('📷 Take photo button pressed');
    console.log('🔍 Debug info:', {
      listingId: listingId,
      userId: user?.id,
      isAuthenticated: !!user
    });

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera permissions to take photos.');
      return;
    }

    setIsUploading(true);
    try {
      console.log('📱 Launching camera...');
      const result = await ImagePicker.launchCameraAsync({
        quality: 0.8,
      });

      console.log('📋 Camera result:', {
        canceled: result.canceled,
        hasAsset: !!result.assets?.[0]
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newPhoto = result.assets[0].uri;
        console.log('📸 New photo taken:', newPhoto);
        
        if (listingId && user?.id) {
          // Save photo persistently to database
          console.log('💾 Saving photo to database...');
          const fileName = `property_${listingId}_${Date.now()}_camera.jpg`;
          
          try {
            await savePropertyPhoto(listingId, user.id, newPhoto, fileName, false);
            console.log('✅ Photo saved successfully');
            
            // Reload photos from database
            await loadExistingPhotos();
          } catch (photoError) {
            console.error('❌ Error saving photo:', photoError);
            Alert.alert('Error', `Failed to save photo: ${photoError instanceof Error ? photoError.message : 'Unknown error'}`);
          }
        } else {
          // Fallback to temporary storage (for new listings)
          console.log('📝 Using temporary storage (no listingId or userId)');
          const updatedPhotos = [...data.photos, newPhoto];
          onUpdate({ photos: updatedPhotos });
        }
      } else {
        console.log('❌ No photo taken or camera was canceled');
      }
    } catch (error) {
      console.error('❌ Error taking photo:', error);
      Alert.alert('Error', `Failed to take photo: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
      console.log('🏁 Camera process completed');
    }
  };

  const removePhoto = async (index: number) => {
    try {
      if (listingId && savedPhotos[index]) {
        // Delete from database
        console.log('🗑️ Deleting photo from database:', savedPhotos[index].id);
        await deletePropertyPhoto(savedPhotos[index].id);
        
        // Reload photos from database
        await loadExistingPhotos();
      } else {
        // Fallback to temporary storage (for new listings)
        const updatedPhotos = data.photos.filter((_, i) => i !== index);
        onUpdate({ photos: updatedPhotos });
      }
    } catch (error) {
      console.error('❌ Error removing photo:', error);
      Alert.alert('Error', 'Failed to remove photo. Please try again.');
    }
  };

  const handleCoverPhotoSelection = async (photoUri: string, index: number) => {
    try {
      if (listingId && savedPhotos[index]) {
        // Update cover photo in database
        console.log('⭐ Setting cover photo in database:', savedPhotos[index].id);
        await setPropertyCoverPhoto(listingId, savedPhotos[index].id);
        
        // Update local state
        onUpdate({ coverPhoto: photoUri });
      } else {
        // Fallback to temporary storage (for new listings)
        onUpdate({ coverPhoto: photoUri });
      }
    } catch (error) {
      console.error('❌ Error setting cover photo:', error);
      Alert.alert('Error', 'Failed to set cover photo. Please try again.');
    }
  };

  // Test function to add a sample photo (for debugging)
  const addTestPhoto = () => {
    if (listingId && user?.id) {
      const testPhotoUri = 'https://picsum.photos/400/300';
      const fileName = `test_photo_${Date.now()}.jpg`;
      
      savePropertyPhoto(listingId, user.id, testPhotoUri, fileName, false)
        .then(() => {
          console.log('✅ Test photo added successfully');
          loadExistingPhotos();
        })
        .catch(error => {
          console.error('❌ Error adding test photo:', error);
          Alert.alert('Error', 'Failed to add test photo');
        });
    } else {
      // Fallback to temporary storage
      const testPhotoUri = 'https://picsum.photos/400/300';
      const updatedPhotos = [...data.photos, testPhotoUri];
      onUpdate({ photos: updatedPhotos });
    }
  };


  const pickVideo = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      const newVideos = result.assets.map(asset => asset.uri);
      onUpdate({ videos: [...data.videos, ...newVideos] });
    }
  };

  const removeVideo = (index: number) => {
    const updatedVideos = data.videos.filter((_, i) => i !== index);
    onUpdate({ videos: updatedVideos });
  };

  return (
    <ScrollView className="flex-1">
      <ThemedView className="bg-white rounded-lg p-4 mb-4">
        <ThemedText type="subtitle" className="mb-4">Upload Property Photos</ThemedText>
        
        <Text className="text-gray-600 text-sm mb-4">
          Upload multiple photos of your property. You'll select a separate cover photo below.
        </Text>
        
        <View className="flex-row space-x-2 mb-4">
          <TouchableOpacity
            onPress={pickImage}
            disabled={isUploading}
            className={`flex-1 flex-row items-center justify-center py-3 rounded-lg ${
              isUploading ? 'bg-gray-400' : 'bg-blue-500'
            }`}
          >
            <ImageIcon size={20} color="white" />
            <Text className="ml-2 text-white font-medium">
              {isUploading ? 'Uploading...' : 'Choose Photos'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={takePhoto}
            disabled={isUploading}
            className={`flex-1 flex-row items-center justify-center py-3 rounded-lg ${
              isUploading ? 'bg-gray-400' : 'bg-green-500'
            }`}
          >
            <Camera size={20} color="white" />
            <Text className="ml-2 text-white font-medium">
              {isUploading ? 'Uploading...' : 'Take Photo'}
            </Text>
          </TouchableOpacity>
        </View>

        {data.photos.length > 0 && (
          <View className="space-y-3">
            <Text className="text-sm font-medium text-gray-700">
              Photos ({data.photos.length})
            </Text>
            <View className="flex-row flex-wrap">
              {data.photos.map((photo, index) => (
                <View key={index} className="relative w-20 h-20 mr-2 mb-2">
                  <Image
                    source={{ uri: photo }}
                    className="w-full h-full rounded-lg"
                    resizeMode="cover"
                  />
                  
                  <TouchableOpacity
                    onPress={() => removePhoto(index)}
                    className="absolute -top-1 -right-1 bg-red-500 rounded-full p-1"
                  >
                    <Trash2 size={12} color="white" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
            
          </View>
        )}
      </ThemedView>

      {/* Cover Photo Section */}
      <ThemedView className="bg-white rounded-lg p-4 mb-4">
        <View className="flex-row items-center justify-between mb-4">
          <ThemedText type="subtitle">Cover Photo</ThemedText>
          {data.photos.length > 0 && !data.coverPhoto && (
            <Text className="text-orange-600 text-sm font-medium">⚠ Required</Text>
          )}
        </View>
        
        <Text className="text-gray-600 text-sm mb-4">
          Select one photo from your uploaded photos to be the cover photo that represents your property listing.
        </Text>

        {data.photos.length === 0 ? (
          <View className="bg-gray-100 p-8 rounded-lg text-center mb-4">
            <Camera size={32} color="#9CA3AF" className="mx-auto mb-2" />
            <Text className="text-gray-600 text-center mb-2">No photos uploaded yet</Text>
            <Text className="text-gray-500 text-sm text-center">Upload photos above first, then select your cover photo here.</Text>
          </View>
        ) : (
          <View className="space-y-3">
            <Text className="text-sm font-medium text-gray-700">
              Select Cover Photo ({data.photos.length} available)
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row space-x-3">
                {data.photos.map((photo, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => handleCoverPhotoSelection(photo, index)}
                    className={`w-24 h-24 rounded-lg overflow-hidden ${
                      data.coverPhoto === photo ? 'ring-4 ring-blue-500 ring-offset-2' : 'border-2 border-gray-200'
                    }`}
                  >
                    <Image
                      source={{ uri: photo }}
                      className="w-full h-full"
                      resizeMode="cover"
                    />
                    {data.coverPhoto === photo && (
                      <View className="absolute inset-0 bg-blue-500 opacity-20 items-center justify-center">
                        <Star size={20} color="white" />
                      </View>
                    )}
                    <View className={`absolute top-1 right-1 ${
                      data.coverPhoto === photo ? 'bg-blue-500' : 'bg-white'
                    } rounded-full p-1`}>
                      <Star size={10} color={data.coverPhoto === photo ? "white" : "#6B7280"} />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            
            {data.coverPhoto && (
              <View className="mt-2 p-3 bg-green-50 rounded-lg">
                <Text className="text-sm text-green-800 font-medium">
                  ✓ Cover photo selected
                </Text>
              </View>
            )}
          </View>
        )}
      </ThemedView>

      <ThemedView className="bg-white rounded-lg p-4 mb-4">
        <ThemedText type="subtitle" className="mb-4">Upload Videos (Optional)</ThemedText>
        
        <TouchableOpacity
          onPress={pickVideo}
          className="flex-row items-center justify-center bg-purple-500 py-3 rounded-lg mb-4"
        >
          <Video size={20} color="white" />
          <Text className="ml-2 text-white font-medium">Choose Videos</Text>
        </TouchableOpacity>

        {data.videos.length > 0 && (
          <View className="space-y-3">
            <Text className="text-sm font-medium text-gray-700">
              Videos ({data.videos.length})
            </Text>
            <View className="space-y-2">
              {data.videos.map((video, index) => (
                <View key={index} className="flex-row items-center justify-between bg-gray-50 p-3 rounded-lg">
                  <View className="flex-row items-center flex-1">
                    <Video size={16} color="#6B7280" />
                    <Text className="ml-2 text-gray-700 flex-1">Video {index + 1}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => removeVideo(index)}
                    className="p-1"
                  >
                    <Trash2 size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}
      </ThemedView>

      <ThemedView className="bg-blue-50 rounded-lg p-4">
        <Text className="text-sm text-blue-800">
          💡 <Text className="font-medium">Tip:</Text> Upload high-quality photos to attract more tenants. 
          You can add multiple photos and select a separate cover photo.
        </Text>
      </ThemedView>
    </ScrollView>
  );
}
