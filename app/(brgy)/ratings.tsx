import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { getRatingsForBarangay } from '../../utils/rating-replies';
import { PropertyRatingRecord } from '../../types';
import { 
  Star, 
  MapPin,
  User as UserIcon,
  ArrowLeft,
  Building2
} from 'lucide-react-native';
import { sharedStyles, designTokens, iconBackgrounds } from '../../styles/owner-dashboard-styles';
import { showAlert } from '../../utils/alert';
import { db } from '../../utils/db';
import { DbUserRecord } from '../../types';
import { TouchableOpacity } from 'react-native';

interface EnrichedRating extends PropertyRatingRecord {
  propertyTitle: string;
  propertyAddress: string;
  tenantName?: string;
  ownerName?: string;
}

export default function BrgyRatingsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [ratings, setRatings] = useState<EnrichedRating[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [barangayName, setBarangayName] = useState<string>('');

  useEffect(() => {
    if (!user?.id) {
      router.replace('/login');
      return;
    }

    if (!user.roles?.includes('brgy_official')) {
      showAlert('Access Denied', 'This page is for Barangay Officials only.');
      router.replace('/(tabs)');
      return;
    }

    loadRatings();
  }, [user]);

  const loadRatings = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      
      // Get barangay name from user data
      const userRecord = await db.get<DbUserRecord>('users', user.id);
      const barangay = userRecord?.barangay || 'Unknown Barangay';
      setBarangayName(barangay);
      
      const barangayRatings = await getRatingsForBarangay(barangay);
      setRatings(barangayRatings);
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

  const renderRatingCard = (rating: EnrichedRating) => {
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

        {/* Owner Info */}
        {rating.ownerName && (
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: designTokens.spacing.sm,
          }}>
            <View style={[sharedStyles.statIcon, iconBackgrounds.green, { marginRight: designTokens.spacing.sm }]}>
              <Building2 size={16} color="#10B981" />
            </View>
            <Text style={{
              fontSize: designTokens.typography.sm,
              color: designTokens.colors.textSecondary,
            }}>
              Owner: {rating.ownerName}
            </Text>
          </View>
        )}

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
            Tenant: {rating.tenantName || 'Anonymous'}
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
        {rating.ownerReply && (
          <View style={{
            marginBottom: designTokens.spacing.md,
            padding: designTokens.spacing.md,
            backgroundColor: designTokens.colors.primary + '10',
            borderRadius: designTokens.borderRadius.md,
            borderLeftWidth: 3,
            borderLeftColor: designTokens.colors.primary,
          }}>
            <Text style={{
              fontSize: designTokens.typography.xs,
              fontWeight: '600',
              color: designTokens.colors.primary,
              marginBottom: designTokens.spacing.xs,
            }}>
              Owner's Reply
            </Text>
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
      {/* Header */}
      <View style={{
        backgroundColor: 'white',
        paddingHorizontal: designTokens.spacing.lg,
        paddingTop: designTokens.spacing.md,
        paddingBottom: designTokens.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: designTokens.colors.borderLight,
      }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: designTokens.spacing.sm,
        }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              marginRight: designTokens.spacing.md,
              padding: designTokens.spacing.xs,
            }}
            activeOpacity={0.7}
          >
            <ArrowLeft size={24} color={designTokens.colors.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[sharedStyles.pageTitle, { fontSize: designTokens.typography.xl }]}>
              Property Ratings
            </Text>
            <Text style={[sharedStyles.pageSubtitle, { fontSize: designTokens.typography.sm }]}>
              {barangayName && `BRGY ${barangayName}`}
            </Text>
          </View>
          <View style={[sharedStyles.statIcon, iconBackgrounds.orange]}>
            <Star size={20} color="#F59E0B" />
          </View>
        </View>
      </View>

      <ScrollView
        style={sharedStyles.scrollView}
        contentContainerStyle={[sharedStyles.pageContainer, { paddingTop: designTokens.spacing.lg }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Summary Stats */}
        {ratings.length > 0 && (
          <View style={[sharedStyles.card, { marginBottom: designTokens.spacing.lg }]}>
            <Text style={[sharedStyles.sectionTitle, { fontSize: designTokens.typography.md, marginBottom: designTokens.spacing.sm }]}>
              Summary
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
              <View style={{ alignItems: 'center' }}>
                <Text style={[sharedStyles.statValue, { fontSize: designTokens.typography['2xl'] }]}>
                  {ratings.length}
                </Text>
                <Text style={[sharedStyles.statLabel, { fontSize: designTokens.typography.xs }]}>
                  Total Ratings
                </Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={[sharedStyles.statValue, { fontSize: designTokens.typography['2xl'] }]}>
                  {ratings.length > 0 
                    ? (ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length).toFixed(1)
                    : '0.0'}
                </Text>
                <Text style={[sharedStyles.statLabel, { fontSize: designTokens.typography.xs }]}>
                  Average Rating
                </Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={[sharedStyles.statValue, { fontSize: designTokens.typography['2xl'] }]}>
                  {ratings.filter(r => r.review && r.review.trim().length > 0).length}
                </Text>
                <Text style={[sharedStyles.statLabel, { fontSize: designTokens.typography.xs }]}>
                  With Comments
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Ratings List */}
        {ratings.length === 0 ? (
          <View style={sharedStyles.emptyState}>
            <Star size={48} color={designTokens.colors.textMuted} />
            <Text style={sharedStyles.emptyStateTitle}>No Ratings Yet</Text>
            <Text style={sharedStyles.emptyStateText}>
              There are no ratings for properties in your barangay yet.
            </Text>
          </View>
        ) : (
          ratings.map(renderRatingCard)
        )}
      </ScrollView>
    </View>
  );
}

