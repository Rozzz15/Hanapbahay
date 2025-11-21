/**
 * Import test data from .data directory into AsyncStorage
 * This script should be run in the React Native/Expo environment
 * 
 * Usage: Import this function and call it from the app
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as fs from 'fs';
import * as path from 'path';

const KEY_PREFIX = 'hb_db_';
const DATA_DIR = path.join(process.cwd(), '.data');

type CollectionName =
  | 'users'
  | 'tenants'
  | 'owners'
  | 'owner_profiles'
  | 'published_listings';

async function importCollection(collectionName: CollectionName): Promise<number> {
  const filePath = path.join(DATA_DIR, `${collectionName}.json`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return 0;
  }
  
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const data = raw ? JSON.parse(raw) : {};
    const key = KEY_PREFIX + collectionName;
    
    // Merge with existing data in AsyncStorage
    const existingRaw = await AsyncStorage.getItem(key);
    const existing = existingRaw ? JSON.parse(existingRaw) : {};
    const merged = { ...existing, ...data };
    
    await AsyncStorage.setItem(key, JSON.stringify(merged));
    const count = Object.keys(data).length;
    console.log(`✅ Imported ${count} records to ${collectionName}`);
    return count;
  } catch (error) {
    console.error(`❌ Failed to import ${collectionName}:`, error);
    return 0;
  }
}

export async function importTestData(): Promise<{
  success: boolean;
  imported: { [key: string]: number };
  total: number;
}> {
  console.log('📥 Starting test data import...\n');
  
  if (!fs.existsSync(DATA_DIR)) {
    console.error('❌ .data directory not found. Please run generate:test-data first.');
    return {
      success: false,
      imported: {},
      total: 0
    };
  }
  
  const collections: CollectionName[] = [
    'users',
    'owners',
    'owner_profiles',
    'published_listings'
  ];
  
  const imported: { [key: string]: number } = {};
  let total = 0;
  
  for (const collection of collections) {
    const count = await importCollection(collection);
    imported[collection] = count;
    total += count;
  }
  
  console.log(`\n✅ Import completed! Total records imported: ${total}`);
  console.log('📊 Breakdown:', imported);
  
  return {
    success: true,
    imported,
    total
  };
}

// For direct execution (if running in a compatible environment)
if (require.main === module) {
  importTestData()
    .then((result) => {
      if (result.success) {
        console.log('\n✨ Import successful!');
        process.exit(0);
      } else {
        console.log('\n❌ Import failed!');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('❌ Import error:', error);
      process.exit(1);
    });
}

