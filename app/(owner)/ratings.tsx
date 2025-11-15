import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal, Alert, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { getRatingsForOwner, replyToRating, updateRatingReply, deleteRatingReply } from '../../utils/rating-replies';
import { PropertyRatingRecord } from '../../types';
import { 
  Star, 
  MessageSquare, 
  Reply, 
  Edit, 
  Trash2, 
  X,
  MapPin,
  User as UserIcon
} from 'lucide-react-native';
import { sharedStyles, designTokens, iconBackgrounds } from '../../styles/owner-dashboard-styles';
import { showAlert } from '../../utils/alert';
import { Image } from '../../components/ui/image';

interface EnrichedRating extends PropertyRatingRecord {
  propertyTitle: string;
  propertyAddress: string;
  tenantName?: string;
}

export default function RatingsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [ratings, setRatings] = useState<EnrichedRating[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [editingReply, setEditingReply] = useState<string | null>(null);
  const [savingReply, setSavingReply] = useState(false);

  useEffect(() => {
    if (!user?.id) {
      router.replace('/login');
      return;
    }

    if (!user.roles?.includes('owner')) {
      showAlert('Access Denied', 'This page is for property owners only.');
      router.replace('/(tabs)');
      return;
    }

    loadRatings();
  }, [user]);

  const loadRatings = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const ownerRatings = await getRatingsForOwner(user.id);
      setRatings(ownerRatings);
    } catch (error) {
      console.error('Error loading ratings:', error);
      showAlert('Error', 'Failed to load ratings');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadRatings();
  }, [loadRatings]);

  const handleReply = async (ratingId: string, existingReply?: string) => {
    if (!replyText.trim()) {
      showAlert('Error', 'Please enter a reply');
      return;
    }

    try {
      setSavingReply(true);
      let result;
      
      if (existingReply) {
        result = await updateRatingReply(ratingId, user!.id, replyText);
      } else {
        result = await replyToRating(ratingId, user!.id, replyText);
      }

      if (result.success) {
        setReplyingTo(null);
        setEditingReply(null);
        setReplyText('');
        await loadRatings();
        showAlert('Success', result.message);
      } else {
        showAlert('Error', result.message);
      }
    } catch (error) {
      console.error('Error replying to rating:', error);
      showAlert('Error', 'Failed to save reply');
    } finally {
      setSavingReply(false);
    }
  };

  const handleDeleteReply = async (ratingId: string) => {
    Alert.alert(
      'Delete Reply',
      'Are you sure you want to delete your reply?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await deleteRatingReply(ratingId, user!.id);
              if (result.success) {
                await loadRatings();
                showAlert('Success', result.message);
              } else {
                showAlert('Error', result.message);
              }
            } catch (error) {
              console.error('Error deleting reply:', error);
              showAlert('Error', 'Failed to delete reply');
            }
          }
        }
      ]
    );
  };

  const renderRatingCard = (rating: EnrichedRating) => {
    const isReplying = replyingTo === rating.id;
    const isEditing = editingReply === rating.id;
    const hasReply = rating.ownerReply && rating.ownerReply.trim().length > 0;

    return (
      <View key={rating.id} style={[sharedStyles.card, { marginBottom: designTokens.spacing.lg }]}>
        {/* Rating Header */}
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: designTokens.spacing.md,
        }}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: designTokens.spacing.xs }}>
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  size={16}
                  color={i < rating.rating ? '#F59E0B' : '#D1D5DB'}
                  fill={i < rating.rating ? '#F59E0B' : 'transparent'}
                />
              ))}
              <Text style={{
                marginLeft: designTokens.spacing.xs,
                fontSize: designTokens.typography.sm,
                fontWeight: '600',
                color: designTokens.colors.textPrimary,
              }}>
                {rating.rating}.0
              </Text>
            </View>
            <Text style={{
              fontSize: designTokens.typography.xs,
              color: designTokens.colors.textMuted,
            }}>
              {new Date(rating.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </Text>
          </View>
        </View>

        {/* Property Info */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: designTokens.spacing.sm,
          padding: designTokens.spacing.sm,
          backgroundColor: designTokens.colors.infoLight,
          borderRadius: designTokens.borderRadius.md,
        }}>
          <MapPin size={16} color={designTokens.colors.info} />
          <View style={{ flex: 1, marginLeft: designTokens.spacing.xs }}>
            <Text style={{
              fontSize: designTokens.typography.sm,
              fontWeight: '600',
              color: designTokens.colors.textPrimary,
            }} numberOfLines={1}>
              {rating.propertyTitle}
            </Text>
            <Text style={{
              fontSize: designTokens.typography.xs,
              color: designTokens.colors.textMuted,
            }} numberOfLines={1}>
              {rating.propertyAddress}
            </Text>
          </View>
        </View>

        {/* Tenant Info */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: designTokens.spacing.md,
        }}>
          <View style={[sharedStyles.statIcon, iconBackgrounds.blue, { marginRight: designTokens.spacing.sm }]}>
            <UserIcon size={16} color="#3B82F6" />
          </View>
          <Text style={{
            fontSize: designTokens.typography.sm,
            color: designTokens.colors.textSecondary,
          }}>
            {rating.tenantName || 'Anonymous'}
          </Text>
        </View>

        {/* Review Text */}
        {rating.review && (
          <View style={{
            marginBottom: designTokens.spacing.md,
            padding: designTokens.spacing.md,
            backgroundColor: designTokens.colors.background,
            borderRadius: designTokens.borderRadius.md,
          }}>
            <Text style={{
              fontSize: designTokens.typography.sm,
              color: designTokens.colors.textPrimary,
              lineHeight: 20,
            }}>
              {rating.review}
            </Text>
          </View>
        )}

        {/* Owner Reply */}
        {hasReply && !isEditing && (
          <View style={{
            marginBottom: designTokens.spacing.md,
            padding: designTokens.spacing.md,
            backgroundColor: designTokens.colors.primary + '10',
            borderRadius: designTokens.borderRadius.md,
            borderLeftWidth: 3,
            borderLeftColor: designTokens.colors.primary,
          }}>
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: designTokens.spacing.xs,
            }}>
              <Text style={{
                fontSize: designTokens.typography.xs,
                fontWeight: '600',
                color: designTokens.colors.primary,
              }}>
                Your Reply
              </Text>
              <View style={{ flexDirection: 'row', gap: designTokens.spacing.sm }}>
                <TouchableOpacity
                  onPress={() => {
                    setEditingReply(rating.id);
                    setReplyText(rating.ownerReply || '');
                  }}
                  style={{ padding: designTokens.spacing.xs }}
                  activeOpacity={0.7}
                >
                  <Edit size={14} color={designTokens.colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDeleteReply(rating.id)}
                  style={{ padding: designTokens.spacing.xs }}
                  activeOpacity={0.7}
                >
                  <Trash2 size={14} color={designTokens.colors.error} />
                </TouchableOpacity>
              </View>
            </View>
            <Text style={{
              fontSize: designTokens.typography.sm,
              color: designTokens.colors.textPrimary,
              lineHeight: 20,
            }}>
              {rating.ownerReply}
            </Text>
            {rating.ownerReplyAt && (
              <Text style={{
                fontSize: designTokens.typography.xs,
                color: designTokens.colors.textMuted,
                marginTop: designTokens.spacing.xs,
              }}>
                Replied on {new Date(rating.ownerReplyAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })}
              </Text>
            )}
          </View>
        )}

        {/* Reply Input */}
        {(isReplying || isEditing) && (
          <View style={{
            marginBottom: designTokens.spacing.md,
            padding: designTokens.spacing.md,
            backgroundColor: designTokens.colors.background,
            borderRadius: designTokens.borderRadius.md,
            borderWidth: 1,
            borderColor: designTokens.colors.borderLight,
          }}>
            <TextInput
              value={replyText}
              onChangeText={setReplyText}
              placeholder={isEditing ? 'Edit your reply...' : 'Write a reply to this rating...'}
              multiline
              numberOfLines={4}
              style={{
                fontSize: designTokens.typography.sm,
                color: designTokens.colors.textPrimary,
                minHeight: 80,
                textAlignVertical: 'top',
                marginBottom: designTokens.spacing.sm,
              }}
              placeholderTextColor={designTokens.colors.textMuted}
            />
            <View style={{ flexDirection: 'row', gap: designTokens.spacing.sm, justifyContent: 'flex-end' }}>
              <TouchableOpacity
                onPress={() => {
                  setReplyingTo(null);
                  setEditingReply(null);
                  setReplyText('');
                }}
                style={{
                  paddingHorizontal: designTokens.spacing.md,
                  paddingVertical: designTokens.spacing.sm,
                  borderRadius: designTokens.borderRadius.md,
                  borderWidth: 1,
                  borderColor: designTokens.colors.border,
                }}
                activeOpacity={0.7}
              >
                <Text style={{
                  fontSize: designTokens.typography.sm,
                  color: designTokens.colors.textSecondary,
                }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleReply(rating.id, isEditing ? rating.ownerReply : undefined)}
                disabled={savingReply || !replyText.trim()}
                style={{
                  paddingHorizontal: designTokens.spacing.md,
                  paddingVertical: designTokens.spacing.sm,
                  borderRadius: designTokens.borderRadius.md,
                  backgroundColor: designTokens.colors.primary,
                  opacity: savingReply || !replyText.trim() ? 0.5 : 1,
                }}
                activeOpacity={0.7}
              >
                <Text style={{
                  fontSize: designTokens.typography.sm,
                  color: '#FFFFFF',
                  fontWeight: '600',
                }}>
                  {savingReply ? 'Saving...' : isEditing ? 'Update' : 'Post Reply'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Reply Button */}
        {!hasReply && !isReplying && (
          <TouchableOpacity
            onPress={() => {
              setReplyingTo(rating.id);
              setReplyText('');
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              padding: designTokens.spacing.sm,
              borderRadius: designTokens.borderRadius.md,
              borderWidth: 1,
              borderColor: designTokens.colors.primary,
              backgroundColor: 'transparent',
            }}
            activeOpacity={0.7}
          >
            <Reply size={16} color={designTokens.colors.primary} />
            <Text style={{
              marginLeft: designTokens.spacing.xs,
              fontSize: designTokens.typography.sm,
              color: designTokens.colors.primary,
              fontWeight: '600',
            }}>
              Reply
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[sharedStyles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={sharedStyles.loadingText}>Loading ratings...</Text>
      </View>
    );
  }

  return (
    <View style={sharedStyles.container}>
      <ScrollView
        style={sharedStyles.scrollView}
        contentContainerStyle={sharedStyles.pageContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: designTokens.spacing.xl,
        }}>
          <View style={{ flex: 1 }}>
            <Text style={sharedStyles.pageTitle}>Property Ratings</Text>
            <Text style={sharedStyles.pageSubtitle}>
              {ratings.length} {ratings.length === 1 ? 'rating' : 'ratings'} received
            </Text>
          </View>
          <View style={[sharedStyles.statIcon, iconBackgrounds.orange]}>
            <Star size={20} color="#F59E0B" />
          </View>
        </View>

        {/* Ratings List */}
        {ratings.length === 0 ? (
          <View style={sharedStyles.emptyState}>
            <Star size={48} color={designTokens.colors.textMuted} />
            <Text style={sharedStyles.emptyStateTitle}>No Ratings Yet</Text>
            <Text style={sharedStyles.emptyStateText}>
              You haven't received any ratings for your properties yet.
            </Text>
          </View>
        ) : (
          ratings.map(renderRatingCard)
        )}
      </ScrollView>
    </View>
  );
}

