# Media Persistence System Documentation

## Overview

The Media Persistence System ensures that all photos and media in the HanapBahay app are properly saved and stored in the database, providing reliable persistence across app restarts, port changes, and device reboots.

## Architecture

### Storage Layers (Priority Order)

1. **Database Tables** (Primary Storage)
   - `property_photos` - Stores individual photo records
   - `property_videos` - Stores individual video records
   - `published_listings` - Stores listing objects with media references

2. **AsyncStorage** (Secondary Storage)
   - Provides immediate persistence like profile photos
   - Survives app restarts and port changes
   - Key format: `property_media_${listingId}`

3. **Memory Cache** (Tertiary Storage)
   - Provides fast access during app session
   - Automatically cleared on app restart
   - Managed by `property-media-cache.ts`

4. **Listing Objects** (Fallback Storage)
   - Direct media storage in listing records
   - Used as fallback when other systems fail
   - Automatically synced with other storage layers

## Core Components

### 1. Media Storage (`utils/media-storage.ts`)

**Primary Functions:**
- `savePropertyMedia()` - Saves media to all storage systems
- `loadPropertyMedia()` - Loads media with priority-based fallback
- `syncAllPropertyMedia()` - Synchronizes media across all systems
- `verifyMediaPersistence()` - Verifies media integrity

**Key Features:**
- Automatic backup creation before changes
- Multi-layer storage redundancy
- Comprehensive error handling
- Automatic synchronization

### 2. Media Persistence (`utils/media-persistence.ts`)

**Primary Functions:**
- `ensureMediaPersistence()` - Ensures media is saved when creating/updating listings
- `validateMediaIntegrity()` - Validates media across all storage systems
- `repairMediaIntegrity()` - Repairs media inconsistencies
- `initializeMediaPersistence()` - Initializes system on app startup

**Key Features:**
- Automatic media validation
- Integrity repair mechanisms
- App initialization integration
- React hook for components

### 3. Media Backup (`utils/media-backup.ts`)

**Primary Functions:**
- `createMediaBackup()` - Creates backup before changes
- `restoreFromLatestBackup()` - Restores from most recent backup
- `cleanupOldBackups()` - Manages backup storage
- `validateBackupIntegrity()` - Validates backup data

**Key Features:**
- Automatic backup creation
- Backup rotation and cleanup
- Integrity validation
- Recovery mechanisms

### 4. Media Validation (`utils/media-validation.ts`)

**Primary Functions:**
- `validatePropertyMedia()` - Validates media objects
- `checkMediaIntegrity()` - Checks listing media integrity
- `validateAllMedia()` - System-wide validation
- `repairMediaIssues()` - Repairs detected issues

**Key Features:**
- Comprehensive validation rules
- URI format validation
- Size and performance checks
- Automatic issue repair

## Data Flow

### Saving Media

```
1. User uploads/selects media
2. ensureMediaPersistence() called
3. createAutomaticBackup() - Create backup
4. savePropertyMedia() - Save to all systems:
   - AsyncStorage (immediate persistence)
   - Database tables (property_photos, property_videos)
   - Listing object (fallback)
5. Validation and integrity checks
```

### Loading Media

```
1. loadPropertyMedia() called
2. Priority-based loading:
   - Database tables (most reliable)
   - AsyncStorage (persistent cache)
   - Memory cache (performance)
   - Listing object (fallback)
3. Automatic synchronization to other systems
4. Return media data
```

### App Initialization

```
1. App starts
2. initializeMediaPersistence() called
3. syncAllPropertyMedia() - Sync all listings
4. validateAllMedia() - Check system integrity
5. cleanupOldBackups() - Manage storage
6. System ready for use
```

## Integration Points

### 1. Listing Creation (`app/(owner)/create-listing.tsx`)

```typescript
// Media is automatically saved with comprehensive persistence
const mediaData = {
  coverPhoto: formData.coverPhoto,
  photos: formData.photos || [],
  videos: formData.videos || []
};

await savePropertyMedia(listingId, user.id, mediaData);
await ensureMediaPersistence(listingId, user.id, mediaData);
```

### 2. Listing Updates (`app/(owner)/edit-listing/[id].tsx`)

```typescript
// Media updates include automatic backup and validation
const mediaData = {
  coverPhoto: formData.coverPhoto,
  photos: formData.photos || [],
  videos: formData.videos || []
};

await savePropertyMedia(listingId, user.id, mediaData);
await ensureMediaPersistence(listingId, user.id, mediaData);
```

### 3. App Initialization (`context/AuthContext.tsx`)

```typescript
useEffect(() => {
  const initializeApp = async () => {
    await refreshUser();
    
    // Initialize media persistence system
    const mediaResult = await initializeMediaPersistence();
    console.log('Media persistence initialized:', mediaResult);
  };
  
  initializeApp();
}, []);
```

## Error Handling

### Automatic Recovery

1. **Storage Failures**: System automatically falls back to next available storage layer
2. **Data Corruption**: Automatic validation and repair mechanisms
3. **Sync Issues**: Automatic re-synchronization across all systems
4. **Backup Recovery**: Automatic restoration from most recent backup

### Error Types

- **Storage Errors**: AsyncStorage or database unavailable
- **Validation Errors**: Invalid media format or corrupted data
- **Sync Errors**: Inconsistencies between storage systems
- **Backup Errors**: Backup creation or restoration failures

## Performance Optimizations

### 1. Lazy Loading
- Media loaded only when needed
- Progressive loading for large media sets
- Memory-efficient caching

### 2. Background Operations
- Media synchronization in background
- Backup creation during idle time
- Cleanup operations during app startup

### 3. Storage Management
- Automatic cleanup of old backups
- Size-based media validation
- Efficient data compression

## Testing

### Test Script (`scripts/test-media-persistence.js`)

Comprehensive test suite covering:
- Media saving and loading
- Persistence verification
- Backup and restore functionality
- Cross-session persistence
- Validation and integrity checks
- Error handling and recovery

### Running Tests

```bash
node scripts/test-media-persistence.js
```

## Monitoring and Debugging

### Console Logging

All operations include detailed logging:
- `💾` - Save operations
- `📸` - Load operations
- `🔄` - Sync operations
- `✅` - Success operations
- `❌` - Error operations
- `⚠️` - Warning operations

### Debug Functions

- `verifyMediaPersistence()` - Check specific listing
- `validateAllMedia()` - System-wide validation
- `getMediaStatistics()` - Performance metrics
- `getBackupSummary()` - Backup status

## Best Practices

### 1. Always Use Centralized Functions
```typescript
// ✅ Good
await savePropertyMedia(listingId, userId, media);

// ❌ Bad
await db.upsert('property_photos', id, photoData);
```

### 2. Handle Errors Gracefully
```typescript
try {
  await ensureMediaPersistence(listingId, userId, media);
} catch (error) {
  console.error('Media persistence failed:', error);
  // Continue with operation, don't fail completely
}
```

### 3. Validate Before Saving
```typescript
const validation = await validatePropertyMedia(media);
if (!validation.isValid) {
  console.error('Invalid media:', validation.issues);
  return;
}
```

### 4. Monitor Storage Usage
```typescript
const stats = await getMediaStatistics();
if (stats.totalSize > MAX_STORAGE_SIZE) {
  await cleanupOldBackups();
}
```

## Troubleshooting

### Common Issues

1. **Media Not Loading**
   - Check AsyncStorage availability
   - Verify database connectivity
   - Run integrity validation

2. **Storage Full**
   - Run backup cleanup
   - Check for duplicate media
   - Optimize media sizes

3. **Sync Issues**
   - Run full media synchronization
   - Check for corrupted data
   - Validate all media

### Debug Commands

```typescript
// Check specific listing
const persistence = await verifyMediaPersistence(listingId);

// Validate all media
const validation = await validateAllMedia();

// Get statistics
const stats = await getMediaStatistics();

// Sync all media
const syncResult = await syncAllPropertyMedia();
```

## Future Enhancements

### Planned Features

1. **Cloud Storage Integration**
   - Automatic cloud backup
   - Cross-device synchronization
   - Offline-first architecture

2. **Advanced Compression**
   - Image optimization
   - Video compression
   - Smart quality adjustment

3. **Analytics and Monitoring**
   - Usage statistics
   - Performance metrics
   - Error tracking

4. **Recovery Tools**
   - Media recovery wizard
   - Bulk repair operations
   - Data export/import

## Conclusion

The Media Persistence System provides a robust, multi-layered approach to ensuring all photos and media are properly saved and stored in the database. With automatic backup, validation, and recovery mechanisms, the system guarantees data integrity and persistence across all app usage scenarios.

The system is designed to be:
- **Reliable**: Multiple storage layers with automatic fallback
- **Performant**: Optimized loading and caching strategies
- **Maintainable**: Comprehensive logging and debugging tools
- **Scalable**: Efficient storage management and cleanup
- **User-Friendly**: Transparent operation with automatic error recovery
