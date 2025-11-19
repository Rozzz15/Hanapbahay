import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, RefreshControl, StyleSheet } from 'react-native';
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

interface PropertyRatingsGroup {
  propertyId: string;
  propertyTitle: string;
  propertyAddress: string;
  ownerName?: string;
  ratings: EnrichedRating[];
  averageRating: number;
  latestRatingDate: string;
}

export default function BrgyRatingsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [ratings, setRatings] = useState<EnrichedRating[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [barangayName, setBarangayName] = useState<string>('');

  const propertyRatingGroups = useMemo<PropertyRatingsGroup[]>(() => {
    if (!ratings.length) return [];

    const groupsMap: Record<string, PropertyRatingsGroup> = {};

    ratings.forEach((rating) => {
      if (!groupsMap[rating.propertyId]) {
        groupsMap[rating.propertyId] = {
          propertyId: rating.propertyId,
          propertyTitle: rating.propertyTitle || 'Untitled Listing',
          propertyAddress: rating.propertyAddress || 'Address not provided',
          ownerName: rating.ownerName,
          ratings: [],
          averageRating: 0,
          latestRatingDate: rating.createdAt,
        };
      }
      groupsMap[rating.propertyId].ratings.push(rating);
    });

    return Object.values(groupsMap)
      .map((group) => {
        const sortedRatings = [...group.ratings].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        const averageRating =
          sortedRatings.reduce((sum, current) => sum + current.rating, 0) /
          sortedRatings.length;
        return {
          ...group,
          ratings: sortedRatings,
          averageRating,
          latestRatingDate: sortedRatings[0]?.createdAt ?? group.latestRatingDate,
        };
      })
      .sort(
        (a, b) =>
          new Date(b.latestRatingDate).getTime() -
          new Date(a.latestRatingDate).getTime()
      );
  }, [ratings]);

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

  const formatFullDate = (value?: string) => {
    if (!value) return '';
    return new Date(value).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const renderPropertyGroup = (group: PropertyRatingsGroup) => (
    <View key={group.propertyId} style={[sharedStyles.card, styles.propertyCard]}>
      <View style={styles.propertyHeader}>
        <View style={styles.propertyMeta}>
          <Text style={styles.propertyTitle}>{group.propertyTitle}</Text>
          <View style={styles.propertyAddressRow}>
            <MapPin size={14} color={designTokens.colors.info} />
            <Text style={styles.propertyAddressText} numberOfLines={2}>
              {group.propertyAddress}
            </Text>
          </View>
          {group.ownerName && (
            <View style={styles.propertyOwnerRow}>
              <Building2 size={14} color={designTokens.colors.success} />
              <Text style={styles.propertyOwnerText}>Owner: {group.ownerName}</Text>
            </View>
          )}
        </View>
        <View style={styles.propertyStats}>
          <View style={styles.starRow}>
            {[...Array(5)].map((_, i) => {
              const isFilled = i < Math.round(group.averageRating);
              return (
                <Star
                  key={i}
                  size={16}
                  color={isFilled ? '#F59E0B' : '#E5E7EB'}
                  fill={isFilled ? '#F59E0B' : 'transparent'}
                  style={styles.starIcon}
                />
              );
            })}
            <Text style={styles.propertyRatingValue}>
              {group.averageRating.toFixed(1)}
            </Text>
          </View>
          <Text style={styles.propertyStatsLabel}>
            {group.ratings.length} rating{group.ratings.length > 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      <View style={styles.ratingList}>
        {group.ratings.map((rating, index) => {
          const isLast = index === group.ratings.length - 1;
          return (
            <View
              key={rating.id}
              style={[
                styles.ratingItem,
                isLast && styles.ratingItemLast,
              ]}
            >
              <View style={styles.ratingHeaderRow}>
                <View style={styles.ratingStarsRow}>
                  {[...Array(5)].map((_, i) => {
                    const filled = i < rating.rating;
                    return (
                      <Star
                        key={i}
                        size={14}
                        color={filled ? '#F59E0B' : '#E5E7EB'}
                        fill={filled ? '#F59E0B' : 'transparent'}
                        style={styles.starIcon}
                      />
                    );
                  })}
                  <Text style={styles.ratingValue}>{rating.rating.toFixed(1)}</Text>
                </View>
                <Text style={styles.ratingDate}>
                  {formatFullDate(rating.createdAt)}
                </Text>
              </View>

              <View style={styles.tenantRow}>
                <UserIcon size={14} color={designTokens.colors.info} />
                <Text style={styles.tenantLabel}>
                  Tenant:{' '}
                  {rating.tenantName ||
                    (rating.isAnonymous ? 'Anonymous' : 'Unavailable')}
                </Text>
              </View>

              {rating.review && (
                <View style={styles.reviewBubble}>
                  <Text style={styles.reviewText}>{rating.review}</Text>
                </View>
              )}

              {rating.ownerReply && (
                <View style={styles.replyBubble}>
                  <Text style={styles.replyLabel}>Owner's Reply</Text>
                  <Text style={styles.replyText}>{rating.ownerReply}</Text>
                  {rating.ownerReplyAt && (
                    <Text style={styles.replyDate}>
                      Replied on {formatFullDate(rating.ownerReplyAt)}
                    </Text>
                  )}
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );

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
        {propertyRatingGroups.length === 0 ? (
          <View style={sharedStyles.emptyState}>
            <Star size={48} color={designTokens.colors.textMuted} />
            <Text style={sharedStyles.emptyStateTitle}>No Ratings Yet</Text>
            <Text style={sharedStyles.emptyStateText}>
              There are no ratings for properties in your barangay yet.
            </Text>
          </View>
        ) : (
          propertyRatingGroups.map(renderPropertyGroup)
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  propertyCard: {
    marginBottom: designTokens.spacing.lg,
  },
  propertyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: designTokens.spacing.lg,
  },
  propertyMeta: {
    flex: 1,
    gap: designTokens.spacing.xs,
  },
  propertyTitle: {
    fontSize: designTokens.typography.lg,
    fontWeight: designTokens.typography.semibold,
    color: designTokens.colors.textPrimary,
  },
  propertyAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designTokens.spacing.xs,
    marginTop: designTokens.spacing.xs,
  },
  propertyAddressText: {
    flex: 1,
    fontSize: designTokens.typography.xs,
    color: designTokens.colors.textSecondary,
  },
  propertyOwnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designTokens.spacing.xs,
    marginTop: designTokens.spacing.xs,
  },
  propertyOwnerText: {
    fontSize: designTokens.typography.xs,
    color: designTokens.colors.textSecondary,
  },
  propertyStats: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  starRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starIcon: {
    marginRight: 2,
  },
  propertyRatingValue: {
    marginLeft: designTokens.spacing.xs,
    fontSize: designTokens.typography.lg,
    fontWeight: designTokens.typography.semibold,
    color: designTokens.colors.textPrimary,
  },
  propertyStatsLabel: {
    marginTop: designTokens.spacing.xs,
    fontSize: designTokens.typography.xs,
    color: designTokens.colors.textMuted,
  },
  ratingList: {
    marginTop: designTokens.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: designTokens.colors.borderLight,
  },
  ratingItem: {
    paddingVertical: designTokens.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.colors.borderLight,
  },
  ratingItemLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  ratingHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: designTokens.spacing.sm,
  },
  ratingStarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingValue: {
    marginLeft: designTokens.spacing.xs,
    fontSize: designTokens.typography.sm,
    fontWeight: designTokens.typography.semibold,
    color: designTokens.colors.textPrimary,
  },
  ratingDate: {
    fontSize: designTokens.typography.xs,
    color: designTokens.colors.textMuted,
  },
  tenantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designTokens.spacing.xs,
    marginBottom: designTokens.spacing.sm,
  },
  tenantLabel: {
    fontSize: designTokens.typography.sm,
    color: designTokens.colors.textSecondary,
  },
  reviewBubble: {
    backgroundColor: designTokens.colors.background,
    borderRadius: designTokens.borderRadius.md,
    padding: designTokens.spacing.md,
    marginBottom: designTokens.spacing.sm,
  },
  reviewText: {
    fontSize: designTokens.typography.sm,
    color: designTokens.colors.textPrimary,
    lineHeight: 20,
  },
  replyBubble: {
    borderRadius: designTokens.borderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: designTokens.colors.primary,
    backgroundColor: designTokens.colors.primary + '10',
    padding: designTokens.spacing.md,
  },
  replyLabel: {
    fontSize: designTokens.typography.xs,
    fontWeight: designTokens.typography.semibold,
    color: designTokens.colors.primary,
    marginBottom: designTokens.spacing.xs,
  },
  replyText: {
    fontSize: designTokens.typography.sm,
    color: designTokens.colors.textPrimary,
    lineHeight: 20,
  },
  replyDate: {
    marginTop: designTokens.spacing.xs,
    fontSize: designTokens.typography.xs,
    color: designTokens.colors.textMuted,
  },
});