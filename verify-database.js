/**
 * Database Verification Script
 * 
 * This script verifies the structure and content of the signup implementation
 * by analyzing the code to ensure both tenant and owner signups are properly configured.
 */

const fs = require('fs');
const path = require('path');

console.log('\n╔═════════════════════════════════════════════════════╗');
console.log('║  📊 HANAPBAHAY DATABASE SIGNUP VERIFICATION        ║');
console.log('╚═════════════════════════════════════════════════════╝\n');

// Read the sign-up implementation
const signUpPath = path.join(__dirname, 'api', 'auth', 'sign-up.ts');
const signUpContent = fs.readFileSync(signUpPath, 'utf8');

console.log('┌─────────────────────────────────────────────────────┐');
console.log('│  🔍 ANALYZING SIGN-UP IMPLEMENTATION               │');
console.log('└─────────────────────────────────────────────────────┘\n');

let checks = {
  tenantSupported: false,
  ownerSupported: false,
  tenantProfileCreated: false,
  ownerProfileCreated: false,
  ownerVerificationSupported: false,
  rolesArraySupported: false,
  addressOptional: false
};

// Check for role support
if (signUpContent.includes("role: z.enum(['tenant', 'owner'])")) {
  checks.tenantSupported = true;
  checks.ownerSupported = true;
  console.log('✅ Both tenant and owner roles are supported in schema');
} else {
  console.log('❌ Role enum not found or incomplete');
}

// Check for address optional
if (signUpContent.includes('address: z.string().optional()') || 
    signUpContent.includes("z.literal('')")) {
  checks.addressOptional = true;
  console.log('✅ Address field is optional (supports owner signup)');
} else {
  console.log('❌ Address field may be required (could block owner signup)');
}

// Check for roles array
if (signUpContent.includes('roles: [data.role]') || signUpContent.includes('roles: [role]')) {
  checks.rolesArraySupported = true;
  console.log('✅ Roles array is included in user record');
} else {
  console.log('❌ Roles array not found in user record');
}

// Check tenant profile creation
if (signUpContent.includes("data.role === 'tenant'") || 
    signUpContent.includes('TenantProfileRecord') ||
    signUpContent.includes("db.upsert('tenants'")) {
  checks.tenantProfileCreated = true;
  console.log('✅ Tenant profile creation is implemented');
} else {
  console.log('❌ Tenant profile creation not found');
}

// Check owner profile creation
if (signUpContent.includes("data.role === 'owner'") || 
    signUpContent.includes('OwnerProfileRecord') ||
    signUpContent.includes("db.upsert('owners'") ||
    signUpContent.includes("db.upsert('owner_profiles'")) {
  checks.ownerProfileCreated = true;
  console.log('✅ Owner profile creation is implemented');
} else {
  console.log('❌ Owner profile creation not found');
}

// Check owner verification
if (signUpContent.includes('OwnerVerificationRecord') ||
    signUpContent.includes("db.upsert('owner_verifications'")) {
  checks.ownerVerificationSupported = true;
  console.log('✅ Owner verification (government ID) is supported');
} else {
  console.log('⚠️  Owner verification not found (may be optional)');
}

console.log('\n┌─────────────────────────────────────────────────────┐');
console.log('│  🔍 ANALYZING SIGN-UP FORM VALIDATION              │');
console.log('└─────────────────────────────────────────────────────┘\n');

// Read the sign-up form
const signUpFormPath = path.join(__dirname, 'app', 'sign-up.tsx');
const formContent = fs.readFileSync(signUpFormPath, 'utf8');

let formChecks = {
  roleSelection: false,
  tenantAddressField: false,
  ownerAddressOptional: false,
  ownerGovIdUpload: false,
  validationCorrect: false
};

// Check role selection
if (formContent.includes("selectedRole === 'tenant'") && 
    formContent.includes("selectedRole === 'owner'")) {
  formChecks.roleSelection = true;
  console.log('✅ Role selection (tenant/owner) is implemented');
} else {
  console.log('❌ Role selection not found');
}

// Check address field visibility for tenants
if (formContent.includes("selectedRole === 'tenant'") && 
    formContent.includes('Address')) {
  formChecks.tenantAddressField = true;
  console.log('✅ Address field is shown for tenants');
} else {
  console.log('❌ Tenant address field not properly configured');
}

// Check address validation is role-aware
if (formContent.includes("selectedRole === 'tenant' && !formData.address") ||
    formContent.includes("if (selectedRole === 'tenant' && !formData.address.trim())")) {
  formChecks.ownerAddressOptional = true;
  formChecks.validationCorrect = true;
  console.log('✅ Address validation is role-aware (only required for tenants)');
} else if (formContent.includes('!formData.address.trim()') && 
           !formContent.includes("selectedRole === 'tenant'")) {
  console.log('❌ Address validation may require address for ALL users (blocks owner signup!)');
} else {
  console.log('⚠️  Address validation logic unclear');
}

// Check owner government ID upload
if (formContent.includes("selectedRole === 'owner'") && 
    (formContent.includes('govIdUri') || formContent.includes('Government ID'))) {
  formChecks.ownerGovIdUpload = true;
  console.log('✅ Government ID upload is available for owners');
} else {
  console.log('⚠️  Owner government ID upload not found');
}

console.log('\n┌─────────────────────────────────────────────────────┐');
console.log('│  🔍 ANALYZING DATABASE TYPES                        │');
console.log('└─────────────────────────────────────────────────────┘\n');

// Read types file
const typesPath = path.join(__dirname, 'types', 'index.ts');
const typesContent = fs.readFileSync(typesPath, 'utf8');

let typeChecks = {
  dbUserRecord: false,
  rolesArray: false,
  tenantProfile: false,
  ownerProfile: false,
  ownerVerification: false
};

// Check DbUserRecord
if (typesContent.includes('interface DbUserRecord')) {
  typeChecks.dbUserRecord = true;
  console.log('✅ DbUserRecord interface is defined');
  
  // Check for roles array
  if (typesContent.includes('roles?: string[]')) {
    typeChecks.rolesArray = true;
    console.log('✅ DbUserRecord includes optional roles array');
  } else {
    console.log('❌ DbUserRecord missing roles array field');
  }
} else {
  console.log('❌ DbUserRecord interface not found');
}

// Check TenantProfileRecord
if (typesContent.includes('interface TenantProfileRecord')) {
  typeChecks.tenantProfile = true;
  console.log('✅ TenantProfileRecord interface is defined');
} else {
  console.log('❌ TenantProfileRecord interface not found');
}

// Check OwnerProfileRecord
if (typesContent.includes('interface OwnerProfileRecord')) {
  typeChecks.ownerProfile = true;
  console.log('✅ OwnerProfileRecord interface is defined');
} else {
  console.log('❌ OwnerProfileRecord interface not found');
}

// Check OwnerVerificationRecord
if (typesContent.includes('interface OwnerVerificationRecord')) {
  typeChecks.ownerVerification = true;
  console.log('✅ OwnerVerificationRecord interface is defined');
} else {
  console.log('❌ OwnerVerificationRecord interface not found');
}

// Final summary
console.log('\n╔═════════════════════════════════════════════════════╗');
console.log('║  📊 VERIFICATION SUMMARY                           ║');
console.log('╚═════════════════════════════════════════════════════╝\n');

const allChecks = { ...checks, ...formChecks, ...typeChecks };
const totalChecks = Object.keys(allChecks).length;
const passedChecks = Object.values(allChecks).filter(v => v === true).length;

console.log('┌─────────────────────────────────────────────────────┐');
console.log('│  TENANT SIGNUP READINESS                           │');
console.log('└─────────────────────────────────────────────────────┘');
console.log(`   Schema Support:         ${checks.tenantSupported ? '✅' : '❌'}`);
console.log(`   Profile Creation:       ${checks.tenantProfileCreated ? '✅' : '❌'}`);
console.log(`   Form Fields:            ${formChecks.tenantAddressField ? '✅' : '❌'}`);
console.log(`   Type Definitions:       ${typeChecks.tenantProfile ? '✅' : '❌'}`);

const tenantReady = checks.tenantSupported && checks.tenantProfileCreated && 
                     formChecks.tenantAddressField && typeChecks.tenantProfile;

console.log(`\n   Status: ${tenantReady ? '✅ READY' : '❌ NOT READY'}\n`);

console.log('┌─────────────────────────────────────────────────────┐');
console.log('│  OWNER SIGNUP READINESS                            │');
console.log('└─────────────────────────────────────────────────────┘');
console.log(`   Schema Support:         ${checks.ownerSupported ? '✅' : '❌'}`);
console.log(`   Profile Creation:       ${checks.ownerProfileCreated ? '✅' : '❌'}`);
console.log(`   Address Optional:       ${checks.addressOptional ? '✅' : '❌'}`);
console.log(`   Validation Correct:     ${formChecks.validationCorrect ? '✅' : '❌'}`);
console.log(`   Gov ID Upload:          ${formChecks.ownerGovIdUpload ? '✅' : '❌'}`);
console.log(`   Type Definitions:       ${typeChecks.ownerProfile ? '✅' : '❌'}`);

const ownerReady = checks.ownerSupported && checks.ownerProfileCreated && 
                   checks.addressOptional && formChecks.validationCorrect && 
                   typeChecks.ownerProfile;

console.log(`\n   Status: ${ownerReady ? '✅ READY' : '❌ NOT READY'}\n`);

console.log('┌─────────────────────────────────────────────────────┐');
console.log('│  AUTHCONTEXT COMPATIBILITY                         │');
console.log('└─────────────────────────────────────────────────────┘');
console.log(`   Roles Array Support:    ${checks.rolesArraySupported ? '✅' : '❌'}`);
console.log(`   Type Definition:        ${typeChecks.rolesArray ? '✅' : '❌'}`);

const authCompatible = checks.rolesArraySupported && typeChecks.rolesArray;
console.log(`\n   Status: ${authCompatible ? '✅ COMPATIBLE' : '❌ NOT COMPATIBLE'}\n`);

console.log('╔═════════════════════════════════════════════════════╗');

if (tenantReady && ownerReady && authCompatible) {
  console.log('║  ✅ ALL SYSTEMS READY!                             ║');
  console.log('║                                                     ║');
  console.log('║  Both tenant and owner signups are properly        ║');
  console.log('║  configured and ready to use.                      ║');
  console.log('║                                                     ║');
  console.log('║  Next Steps:                                       ║');
  console.log('║  1. Test tenant signup in the app                  ║');
  console.log('║  2. Test owner signup in the app                   ║');
  console.log('║  3. Verify data persistence after app restart      ║');
} else {
  console.log('║  ⚠️  ISSUES DETECTED                               ║');
  console.log('║                                                     ║');
  if (!tenantReady) {
    console.log('║  - Tenant signup has configuration issues          ║');
  }
  if (!ownerReady) {
    console.log('║  - Owner signup has configuration issues           ║');
  }
  if (!authCompatible) {
    console.log('║  - AuthContext compatibility issues detected       ║');
  }
  console.log('║                                                     ║');
  console.log('║  Review the details above for specific issues.     ║');
}

console.log('╚═════════════════════════════════════════════════════╝\n');

console.log(`✅ Passed: ${passedChecks}/${totalChecks} checks\n`);

// Exit with appropriate code
process.exit(tenantReady && ownerReady && authCompatible ? 0 : 1);

