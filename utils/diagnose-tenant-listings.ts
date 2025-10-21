/**
 * TENANT LISTING DIAGNOSTIC TOOL
 * Run this in browser console to diagnose why listings aren't showing
 */

import { db } from './db';
import AsyncStorage from '@react-native-async-storage/async-storage';

export async function diagnoseTenantListings() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 TENANT LISTING DIAGNOSTIC');
  console.log('='.repeat(80) + '\n');
  
  try {
    // Step 1: Check if database has any listings
    console.log('📋 STEP 1: Checking database for listings...\n');
    
    const allListings = await db.list('published_listings');
    console.log(`Total listings in database: ${allListings.length}`);
    
    if (allListings.length === 0) {
      console.error('❌ PROBLEM: No listings found in database!');
      console.log('\n💡 SOLUTION:');
      console.log('   1. Login as an owner');
      console.log('   2. Go to "Create Listing"');
      console.log('   3. Fill in property details and add photos');
      console.log('   4. Submit the listing');
      console.log('   5. Then login as tenant to see it\n');
      return;
    }
    
    // Step 2: Check each listing's validity
    console.log('\n📋 STEP 2: Analyzing each listing...\n');
    
    const issues: any[] = [];
    let validCount = 0;
    let invalidCount = 0;
    
    allListings.forEach((listing: any, index) => {
      const num = index + 1;
      console.log(`--- Listing ${num} ---`);
      console.log(`ID: ${listing.id || '❌ MISSING'}`);
      console.log(`Property Type: ${listing.propertyType || '❌ MISSING'}`);
      console.log(`Status: ${listing.status || '❌ MISSING'}`);
      console.log(`Address: ${listing.address?.substring(0, 50) || '❌ MISSING'}`);
      console.log(`Owner: ${listing.ownerName || listing.businessName || '❌ MISSING'}`);
      console.log(`Price: ₱${listing.monthlyRent?.toLocaleString() || '❌ MISSING'}`);
      
      // Check validity
      const hasId = !!listing.id;
      const hasStatus = !!listing.status;
      const statusLower = listing.status?.toLowerCase();
      const isPublished = statusLower === 'published';
      
      console.log('\n✓ Validation:');
      console.log(`  Has ID: ${hasId ? '✅' : '❌'}`);
      console.log(`  Has Status: ${hasStatus ? '✅' : '❌'}`);
      console.log(`  Status value: "${listing.status}"`);
      console.log(`  Status (lowercase): "${statusLower}"`);
      console.log(`  Is Published: ${isPublished ? '✅' : '❌'}`);
      
      const isValid = hasId && isPublished;
      console.log(`  Will Show to Tenants: ${isValid ? '✅ YES' : '❌ NO'}`);
      console.log('');
      
      if (isValid) {
        validCount++;
      } else {
        invalidCount++;
        issues.push({
          listingNum: num,
          id: listing.id,
          propertyType: listing.propertyType,
          problems: [
            !hasId && 'Missing ID',
            !isPublished && `Status is "${listing.status}" not "published"`
          ].filter(Boolean)
        });
      }
    });
    
    // Step 3: Summary
    console.log('='.repeat(80));
    console.log('📊 SUMMARY');
    console.log('='.repeat(80) + '\n');
    
    console.log(`Total Listings: ${allListings.length}`);
    console.log(`Valid (Will Show): ${validCount} ✅`);
    console.log(`Invalid (Won't Show): ${invalidCount} ❌`);
    
    if (validCount === 0) {
      console.error('\n❌ CRITICAL PROBLEM: NO VALID LISTINGS!');
      console.log('\n🔍 Issues Found:');
      issues.forEach(issue => {
        console.log(`\nListing ${issue.listingNum} (${issue.propertyType}):`);
        issue.problems.forEach((problem: string) => {
          console.log(`  - ${problem}`);
        });
      });
      
      console.log('\n💡 SOLUTIONS:');
      console.log('   1. Check the "Status" field of your listings');
      console.log('   2. Status must be exactly "published" (lowercase)');
      console.log('   3. If status is "draft", change it to "published"');
      console.log('   4. Re-create listings if necessary\n');
    } else if (invalidCount > 0) {
      console.warn('\n⚠️ PARTIAL PROBLEM: Some listings are invalid');
      console.log(`\n${validCount} listings will show, but ${invalidCount} won't.`);
      console.log('\n🔍 Issues Found:');
      issues.forEach(issue => {
        console.log(`\nListing ${issue.listingNum} (${issue.propertyType}):`);
        issue.problems.forEach((problem: string) => {
          console.log(`  - ${problem}`);
        });
      });
    } else {
      console.log('\n✅ ALL LISTINGS ARE VALID!');
      console.log('\nAll listings should appear in tenant dashboard.');
      console.log('If they still don\'t show:');
      console.log('   1. Refresh the page (F5)');
      console.log('   2. Clear browser cache');
      console.log('   3. Check browser console for errors');
      console.log('   4. Try logging out and back in\n');
    }
    
    // Step 4: Check AsyncStorage
    console.log('='.repeat(80));
    console.log('📦 STEP 4: Checking AsyncStorage');
    console.log('='.repeat(80) + '\n');
    
    try {
      const keys = await AsyncStorage.getAllKeys();
      const dbKeys = keys.filter(k => k.startsWith('hb_db_'));
      console.log(`AsyncStorage keys found: ${dbKeys.length}`);
      
      const publishedListingsKey = 'hb_db_published_listings';
      const storedData = await AsyncStorage.getItem(publishedListingsKey);
      
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        const storedCount = Object.keys(parsedData).length;
        console.log(`✅ published_listings in AsyncStorage: ${storedCount} listings`);
        
        if (storedCount !== allListings.length) {
          console.warn(`⚠️ Mismatch: Database has ${allListings.length}, AsyncStorage has ${storedCount}`);
        }
      } else {
        console.warn('⚠️ No published_listings found in AsyncStorage');
      }
    } catch (storageError) {
      console.log('ℹ️ Could not check AsyncStorage:', storageError);
    }
    
    // Step 5: Test filter
    console.log('\n='.repeat(80));
    console.log('🔍 STEP 5: Testing Tenant Filter Logic');
    console.log('='.repeat(80) + '\n');
    
    const filterTest = allListings.map((p: any) => {
      const hasId = p && p.id;
      const isPublished = p && p.status && p.status.toLowerCase() === 'published';
      const passes = hasId && isPublished;
      
      return {
        id: p.id,
        propertyType: p.propertyType,
        status: p.status,
        hasId,
        isPublished,
        passes
      };
    });
    
    const passing = filterTest.filter(t => t.passes);
    const failing = filterTest.filter(t => !t.passes);
    
    console.log(`Listings passing filter: ${passing.length}`);
    console.log(`Listings failing filter: ${failing.length}`);
    
    if (failing.length > 0) {
      console.log('\n❌ Listings that will NOT show:');
      failing.forEach(f => {
        console.log(`  - ${f.propertyType} (${f.id})`);
        console.log(`    Reason: ${!f.hasId ? 'Missing ID' : !f.isPublished ? `Status is "${f.status}"` : 'Unknown'}`);
      });
    }
    
    if (passing.length > 0) {
      console.log('\n✅ Listings that WILL show:');
      passing.forEach(p => {
        console.log(`  - ${p.propertyType} (${p.id})`);
      });
    }
    
  } catch (error) {
    console.error('\n❌ Diagnostic failed:', error);
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('✅ DIAGNOSTIC COMPLETE');
  console.log('='.repeat(80) + '\n');
}

// Expose to window for console access
if (typeof window !== 'undefined') {
  (window as any).diagnoseTenantListings = diagnoseTenantListings;
}

