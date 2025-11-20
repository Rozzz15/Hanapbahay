/**
 * QR Code Generator Utilities
 * Generates dynamic QR codes for rental invoice payments
 */

import QRCode from 'react-native-qrcode-svg';
import * as FileSystem from 'expo-file-system';
import { RentPayment } from './tenant-payments';
import { PaymentAccount } from './owner-dashboard';
import { Platform } from 'react-native';

export interface InvoiceQRCodeData {
  invoiceId: string;
  amount: number;
  reference: string;
  accountNumber: string;
  accountName: string;
  paymentMonth: string;
  dueDate: string;
}

/**
 * Generate QR code data string for a rental invoice
 * This creates a structured data string that can be encoded in a QR code
 */
export function generateInvoiceQRCodeData(payment: RentPayment, account: PaymentAccount): string {
  const qrData: InvoiceQRCodeData = {
    invoiceId: payment.id,
    amount: payment.totalAmount,
    reference: payment.receiptNumber,
    accountNumber: account.accountNumber,
    accountName: account.accountName,
    paymentMonth: payment.paymentMonth,
    dueDate: payment.dueDate,
  };

  // Format as JSON string for QR code
  return JSON.stringify(qrData);
}

/**
 * Generate a human-readable payment string for QR code
 * This format is more readable when scanned and compatible with GCash
 */
export function generatePaymentQRCodeString(
  payment: RentPayment,
  account: PaymentAccount
): string {
  // Create a structured format that GCash can parse
  // Format: Key-value pairs separated by newlines for better parsing
  const cleanPhone = account.accountNumber.replace(/[^0-9]/g, '');
  const amount = payment.totalAmount.toFixed(2);
  
  // Primary format: Structured data that can be parsed
  return `GCASH_PAYMENT
TYPE:RENTAL_INVOICE
AMOUNT:${amount}
CURRENCY:PHP
ACCOUNT:${cleanPhone}
ACCOUNT_NAME:${account.accountName}
REFERENCE:${payment.receiptNumber}
INVOICE_ID:${payment.id}
MONTH:${payment.paymentMonth}
DUE_DATE:${payment.dueDate}
NOTE:Rental payment for ${payment.paymentMonth}`;
}

/**
 * Generate GCash-compatible payment URL format
 * This creates a URL-like string that GCash might recognize
 */
export function generateGCashQRCodeURL(
  payment: RentPayment,
  account: PaymentAccount
): string {
  const cleanPhone = account.accountNumber.replace(/[^0-9]/g, '');
  const amount = payment.totalAmount.toFixed(2);
  
  // Create a URL-like format that might be recognized by GCash
  return `gcash://payment?number=${cleanPhone}&amount=${amount}&reference=${payment.receiptNumber}&invoice=${payment.id}`;
}

/**
 * Generate GCash payment deep link URL
 * This creates a URL that can open GCash app with pre-filled payment details
 */
export function generateGCashPaymentURL(
  account: PaymentAccount,
  amount: number,
  reference: string
): string {
  const cleanPhone = account.accountNumber.replace(/[^0-9]/g, '');
  return `gcash://pay?number=${cleanPhone}&amount=${amount}&reference=${reference}`;
}

/**
 * Generate QR-PH compatible QR code string
 * QR-PH is the standard QR code format for payments in the Philippines
 * This format is recognized by GCash, PayMaya, and other payment apps
 */
export function generateQRPHCode(
  payment: RentPayment,
  account: PaymentAccount
): string {
  const cleanPhone = account.accountNumber.replace(/[^0-9]/g, '');
  const amount = Math.round(payment.totalAmount * 100); // Convert to centavos
  const reference = payment.receiptNumber || payment.id.slice(-8).toUpperCase();
  
  // QR-PH / EMV QR Code format
  // Format: 00-99 are data object identifiers (DOIs)
  // Each DOI has a length and value
  
  const merchantAccount = `000201010212`; // Payload Format Indicator + Point of Initiation
  const merchantInfo = `26${String(cleanPhone.length + 4).padStart(2, '0')}0016${cleanPhone}0201`; // Merchant Account Information
  const merchantCategory = `52${String('0000').length.toString().padStart(2, '0')}0000`; // Merchant Category Code (0000 = default)
  const currency = `5303${'608'}`; // Transaction Currency (608 = PHP)
  const amountStr = `54${String(amount.toString().length).padStart(2, '0')}${amount}`; // Transaction Amount (in centavos)
  const country = `5802${'PH'}`; // Country Code
  const merchantName = `59${String(account.accountName.length).padStart(2, '0')}${account.accountName.substring(0, 25)}`; // Merchant Name (max 25 chars)
  const city = `60${String('Philippines'.length).padStart(2, '0')}Philippines`; // Merchant City
  const additionalData = `62${String(reference.length + 5).padStart(2, '0')}05${String(reference.length).padStart(2, '0')}${reference}`; // Additional Data Field (Reference)
  
  // Combine all fields
  const qrData = `${merchantAccount}${merchantInfo}${merchantCategory}${currency}${amountStr}${country}${merchantName}${city}${additionalData}6304`; // CRC placeholder
  
  // Calculate CRC (simplified - in production, use proper CRC16)
  // For now, we'll use a simpler format that GCash can recognize
  return qrData;
}

/**
 * Calculate CRC16 for QR-PH code
 * Uses CRC-16/CCITT-FALSE algorithm (also known as CRC-16/IBM)
 * This is the standard CRC algorithm for EMV QR Codes
 */
/**
 * Calculate CRC16 for QR-PH code
 * Uses CRC-16/CCITT-FALSE algorithm (ISO/IEC 13239)
 * This is the standard CRC algorithm for EMV QR Codes
 */
function calculateCRC16(data: string): string {
  let crc = 0xFFFF;
  const polynomial = 0x1021;
  
  for (let i = 0; i < data.length; i++) {
    crc ^= (data.charCodeAt(i) << 8) & 0xFFFF;
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = ((crc << 1) ^ polynomial) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }
  
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Copy original QR code exactly and only update amount and reference
 * This preserves 100% of the original structure - we only change the amount and reference fields
 */
function copyOriginalQRCodeWithUpdates(
  originalQRData: string,
  amount: number,
  reference: string,
  includeAmount: boolean
): string {
  try {
    console.log('🔧 Copying original QR code structure exactly...');
    console.log('📊 Original QR data length:', originalQRData.length);
    console.log('📊 Original QR data (first 200 chars):', originalQRData.substring(0, 200));
    console.log('📊 Original QR data (last 50 chars):', originalQRData.substring(originalQRData.length - 50));
    
    // Parse the original QR code to understand its structure
    const parsed = parseQRPHCode(originalQRData);
    if (!parsed || !parsed.isValid) {
      console.warn('⚠️ Could not parse original QR code, will generate new one');
      return '';
    }

    console.log('✅ Parsed original QR code:', { phone: parsed.phoneNumber, guid: parsed.guid, isStatic: parsed.isStatic });
    
    // Start with the original QR code - we'll only modify specific fields
    let qrString = originalQRData;
    let pos = 6; // After "000201"
    
    // Update Point of Initiation Method
    if (pos + 2 <= qrString.length && qrString.substring(pos, pos + 2) === '01') {
      pos += 2;
      if (pos + 2 <= qrString.length) {
        const poiLength = parseInt(qrString.substring(pos, pos + 2));
        pos += 2;
        if (pos + poiLength <= qrString.length) {
          const oldPOI = qrString.substring(pos, pos + poiLength);
          const newPOI = includeAmount ? '12' : '11';
          
          if (oldPOI !== newPOI) {
            // Replace the POI value
            qrString = qrString.substring(0, pos) + newPOI + qrString.substring(pos + poiLength);
            console.log('✅ Updated Point of Initiation:', oldPOI, '->', newPOI);
            // Adjust position after replacement
            pos = pos - poiLength + newPOI.length;
          } else {
            pos += poiLength;
          }
        }
      }
    }

    // Find and update Transaction Amount (54) if dynamic QR
    if (includeAmount) {
      const amountTagIndex = qrString.indexOf('54');
      if (amountTagIndex > 0) {
        // Find the amount field
        let amountPos = amountTagIndex + 2;
        const amountLength = parseInt(qrString.substring(amountPos, amountPos + 2));
        amountPos += 2;
        const oldAmount = qrString.substring(amountPos, amountPos + amountLength);
        
        // Calculate new amount in centavos
        const newAmountInCentavos = Math.round(amount * 100);
        const newAmountStr = newAmountInCentavos.toString();
        const newAmountLength = String(newAmountStr.length).padStart(2, '0');
        
        // Replace the amount
        qrString = qrString.substring(0, amountPos - 2) + 
                  newAmountLength + 
                  newAmountStr + 
                  qrString.substring(amountPos + amountLength);
        console.log('✅ Updated Amount:', oldAmount, '->', newAmountStr);
      } else {
        // Amount field doesn't exist, need to insert it
        // Find position after Currency (53) and before Country (58)
        const currencyIndex = qrString.indexOf('5303608');
        if (currencyIndex > 0) {
          const insertPos = currencyIndex + 7; // After "5303608"
          const amountInCentavos = Math.round(amount * 100);
          const newAmountStr = amountInCentavos.toString();
          const newAmountLength = String(newAmountStr.length).padStart(2, '0');
          const amountField = `54${newAmountLength}${newAmountStr}`;
          qrString = qrString.substring(0, insertPos) + amountField + qrString.substring(insertPos);
          console.log('✅ Inserted Amount field:', amountField);
        }
      }
    } else {
      // Remove amount field if it exists (for static QR)
      const amountTagIndex = qrString.indexOf('54');
      if (amountTagIndex > 0) {
        let amountPos = amountTagIndex + 2;
        const amountLength = parseInt(qrString.substring(amountPos, amountPos + 2));
        amountPos += 2;
        // Remove the amount field
        qrString = qrString.substring(0, amountTagIndex) + qrString.substring(amountPos + amountLength);
        console.log('✅ Removed Amount field for static QR');
      }
    }

    // Update Additional Data Field (62) - Reference number
    // Keep all other fields in additional data, only update reference (tag 05)
    const newRef = reference.substring(0, 25); // Max 25 chars
    const newRefLength = String(newRef.length).padStart(2, '0');
    const newRefData = `05${newRefLength}${newRef}`;
    
    const additionalDataIndex = qrString.indexOf('62');
    if (additionalDataIndex > 0 && additionalDataIndex < qrString.length - 10) {
      let dataPos = additionalDataIndex + 2;
      if (dataPos + 2 <= qrString.length) {
        const dataLength = parseInt(qrString.substring(dataPos, dataPos + 2));
        dataPos += 2;
        
        if (dataPos + dataLength <= qrString.length) {
          const additionalData = qrString.substring(dataPos, dataPos + dataLength);
          const refTagIndex = additionalData.indexOf('05');
          
          if (refTagIndex >= 0) {
            // Reference tag exists - update it
            let refPos = refTagIndex + 2;
            if (refPos + 2 <= additionalData.length) {
              const oldRefLength = parseInt(additionalData.substring(refPos, refPos + 2));
              refPos += 2;
              if (refPos + oldRefLength <= additionalData.length) {
                const oldRef = additionalData.substring(refPos, refPos + oldRefLength);
                // Replace only the reference part, keep everything else
                const newAdditionalData = additionalData.substring(0, refTagIndex) + 
                                         newRefData + 
                                         additionalData.substring(refPos + oldRefLength);
                const newAdditionalDataLength = String(newAdditionalData.length).padStart(2, '0');
                
                // Replace the entire additional data field
                qrString = qrString.substring(0, dataPos - 2) + 
                          newAdditionalDataLength + 
                          newAdditionalData + 
                          qrString.substring(dataPos + dataLength);
                console.log('✅ Updated Reference in Additional Data:', oldRef, '->', newRef);
              }
            }
          } else {
            // No reference tag - add it to existing additional data
            const newAdditionalData = additionalData + newRefData;
            const newAdditionalDataLength = String(newAdditionalData.length).padStart(2, '0');
            
            qrString = qrString.substring(0, dataPos - 2) + 
                      newAdditionalDataLength + 
                      newAdditionalData + 
                      qrString.substring(dataPos + dataLength);
            console.log('✅ Added Reference to existing Additional Data:', newRef);
          }
        }
      }
    } else {
      // Additional data field doesn't exist - add it before CRC
      const crcIndex = qrString.indexOf('6304');
      if (crcIndex > 0) {
        const newAdditionalData = newRefData;
        const newAdditionalDataLength = String(newAdditionalData.length).padStart(2, '0');
        const additionalDataField = `62${newAdditionalDataLength}${newAdditionalData}`;
        
        qrString = qrString.substring(0, crcIndex) + additionalDataField + qrString.substring(crcIndex);
        console.log('✅ Inserted new Additional Data field with Reference:', newRef);
      } else {
        console.warn('⚠️ Could not find CRC field to insert Additional Data');
      }
    }

    // Recalculate CRC16
    const crcIndex = qrString.indexOf('6304');
    if (crcIndex > 0) {
      const dataForCRC = qrString.substring(0, crcIndex) + '6304';
      const newCRC = calculateCRC16(dataForCRC);
      qrString = qrString.substring(0, crcIndex + 4) + newCRC;
      console.log('✅ Recalculated CRC:', newCRC);
      console.log('📊 Final QR code length:', qrString.length);
      console.log('📊 Final QR code preview:', qrString.substring(0, 150) + '...');
      
      // Validate the modified QR code can be parsed
      const validationParsed = parseQRPHCode(qrString);
      if (validationParsed && validationParsed.isValid) {
        console.log('✅ Modified QR code validation passed');
      } else {
        console.warn('⚠️ Modified QR code validation failed - structure might be broken');
      }
    } else {
      console.error('❌ Could not find CRC field in QR code');
      return '';
    }

    return qrString;
  } catch (error) {
    console.error('❌ Error modifying original QR code:', error);
    return '';
  }
}

/**
 * Generate QR-PH format that works with GCash and PayMaya
 * QR-PH follows EMV QR Code standard used in the Philippines
 * This format is compatible with GCash, PayMaya, and other payment apps
 * 
 * IMPORTANT: GCash Dynamic QR Code Support
 * - GCash DOES support dynamic QR codes, but ONLY for MERCHANT accounts
 * - GCash PERSONAL accounts typically only support STATIC QR codes
 * - If the owner uploaded a static QR code from a personal account, we cannot convert it to dynamic
 * - Converting static to dynamic will cause "QR code is not valid" errors
 * - For personal accounts: Use static QR codes (tenant enters amount manually)
 * - For merchant accounts: Dynamic QR codes work (amount is pre-filled)
 */
export function generateGCashQRPHCode(
  payment: RentPayment,
  account: PaymentAccount,
  includeAmount: boolean = true
): string {
  // If we have the original QR code data, use it intelligently
  if (account.qrCodeData) {
    console.log('🔍 Processing original QR code data...');
    console.log('📊 Original QR data (first 150 chars):', account.qrCodeData.substring(0, 150));
    
    // Parse the original QR code to understand its structure
    const parsed = parseQRPHCode(account.qrCodeData);
    if (parsed && parsed.isValid) {
      console.log('📊 Original QR code analysis:', {
        isStatic: parsed.isStatic,
        phone: parsed.phoneNumber,
        guid: parsed.guid,
        merchantName: parsed.merchantName
      });
      
      // For static QR codes: 
      // - GCash personal accounts: Use original QR code exactly as-is (they don't support dynamic)
      // - PayMaya: Can convert to dynamic if needed (PayMaya supports dynamic QR codes)
      if (parsed.isStatic) {
        if (account.type === 'gcash') {
          // GCash personal accounts only support static QR codes
          console.log('✅ Using original static QR code EXACTLY as uploaded (no modifications)');
          console.log('💡 GCash personal accounts only support static QR codes');
          console.log('💡 Tenant will need to enter payment amount manually in GCash app');
          return account.qrCodeData; // Return original QR code without any modifications
        } else if (account.type === 'paymaya' && includeAmount) {
          // PayMaya supports dynamic QR codes, so we can convert static to dynamic
          console.log('🔧 Converting PayMaya static QR code to dynamic with payment amount...');
          const modifiedQR = copyOriginalQRCodeWithUpdates(
            account.qrCodeData,
            payment.totalAmount,
            payment.receiptNumber || payment.id.slice(-8).toUpperCase(),
            true // Include amount (dynamic QR code)
          );
          
          if (modifiedQR && modifiedQR.length > 0) {
            const validationParsed = parseQRPHCode(modifiedQR);
            if (validationParsed && validationParsed.isValid) {
              console.log('✅ Successfully converted PayMaya QR code to dynamic with amount');
              return modifiedQR;
            }
          }
          // If conversion failed, use original static QR code
          console.log('⚠️ PayMaya QR code conversion failed, using original static QR code');
          return account.qrCodeData;
        } else {
          // For PayMaya without amount requirement, use original static
          console.log('✅ Using original static QR code for PayMaya');
          return account.qrCodeData;
        }
      }
      
      // For dynamic QR codes, try to modify it to include the payment amount
      if (!parsed.isStatic && includeAmount) {
        console.log('🔧 Modifying dynamic QR code to include payment amount...');
        const modifiedQR = copyOriginalQRCodeWithUpdates(
          account.qrCodeData,
          payment.totalAmount,
          payment.receiptNumber || payment.id.slice(-8).toUpperCase(),
          true // Include amount (dynamic QR code)
        );
        
        if (modifiedQR && modifiedQR.length > 0) {
          // Validate the modified QR code
          const validationParsed = parseQRPHCode(modifiedQR);
          if (validationParsed && validationParsed.isValid) {
            console.log('✅ Successfully modified and validated dynamic QR code with amount');
            return modifiedQR;
          } else {
            console.warn('⚠️ Modified QR code failed validation, using original');
            return account.qrCodeData;
          }
        } else {
          console.warn('⚠️ Failed to modify QR code, using original');
          return account.qrCodeData;
        }
      }
    } else {
      console.warn('⚠️ Could not parse original QR code, will generate new one');
    }
  }

  // If we have parsed QR code data, use it to extract the exact phone number format
  let cleanPhone = '';
  let guid = '';
  
  if (account.qrCodeData) {
    // Parse the stored QR code data to get exact format
    const parsed = parseQRPHCode(account.qrCodeData);
    if (parsed && parsed.isValid) {
      cleanPhone = parsed.phoneNumber; // Use exact format from original QR code
      guid = parsed.guid; // Use exact GUID from original QR code
      console.log('✅ Using parsed QR code data:', { phone: cleanPhone, guid });
    }
  }
  
  // Fallback to account number if no parsed data
  if (!cleanPhone) {
    // Normalize phone number for QR-PH format
    // GCash requires phone number in 09XXXXXXXXX format (11 digits)
    cleanPhone = account.accountNumber.replace(/[^0-9]/g, '');
    
    // Handle Philippines phone number format
    // Standard format: 09XXXXXXXXX (11 digits starting with 09)
    // Acceptable inputs: +639XXXXXXXXX, 639XXXXXXXXX, 09XXXXXXXXX, 9XXXXXXXXX
    
    // If starts with 63 (country code), convert to 09 format
    if (cleanPhone.startsWith('63')) {
      if (cleanPhone.length === 12) {
        cleanPhone = '0' + cleanPhone.substring(2);
      } else if (cleanPhone.length === 11) {
        cleanPhone = '0' + cleanPhone.substring(2);
      }
    }
    
    // If 10 digits starting with 9 (missing leading 0), add 0
    if (cleanPhone.length === 10 && cleanPhone.startsWith('9')) {
      cleanPhone = '0' + cleanPhone;
    }
    
    // If longer than 11 digits, take last 11 digits
    if (cleanPhone.length > 11) {
      cleanPhone = cleanPhone.slice(-11);
    }
    
    // Final validation and fix: must be 11 digits starting with 09
    if (cleanPhone.length !== 11 || !cleanPhone.startsWith('09')) {
      console.warn('⚠️ Invalid phone number format for QR code:', account.accountNumber, '->', cleanPhone);
      // Try to salvage: if 10 digits, add 0
      if (cleanPhone.length === 10) {
        cleanPhone = '0' + cleanPhone;
      }
      // If still invalid, use a default format
      if (cleanPhone.length !== 11 || !cleanPhone.startsWith('09')) {
        console.error('❌ Could not normalize phone number, using as-is:', cleanPhone);
      }
    }
  }
  
  const reference = payment.receiptNumber || payment.id.slice(-8).toUpperCase();
  
  // Clean merchant name (remove special characters, max 25 chars)
  const merchantName = account.accountName
    .substring(0, 25)
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .trim() || 'Merchant';
  
  // Use GUID from parsed QR code if available, otherwise determine from account type
  // GUID "01" = GCash, GUID "02" = PayMaya (Maya)
  if (!guid) {
    guid = account.type === 'paymaya' ? '02' : '01';
  }
  
  // Build QR-PH / EMV QR Code structure
  // Payload Format Indicator (00) - Always "01" for EMV QR
  let qrString = '000201';
  
  // Point of Initiation Method (01)
  // "11" = Static QR (no amount, user enters amount)
  // "12" = Dynamic QR (amount included)
  // GCash personal accounts may only support static QR codes
  const pointOfInitiation = includeAmount ? '12' : '11';
  qrString += `0102${pointOfInitiation}`;
  
  // Merchant Account Information (26)
  // For GCash: 00 = GUID "01", 01 = Account Identifier (phone number)
  // For PayMaya: 00 = GUID "02", 01 = Account Identifier (phone number)
  // Structure: 00[GUID length][GUID]01[phone length][phone]
  // Example for GCash: 00020101011[phone] where phone is 11 digits (09XXXXXXXXX)
  const guidLength = String(guid.length).padStart(2, '0');
  const accountIdTag = '01'; // Account identifier tag (01 = mobile number)
  const phoneLength = String(cleanPhone.length).padStart(2, '0');
  
  // Build Merchant Account Information: 00[GUID length][GUID]01[phone length][phone]
  // Example: 00020101011[09XXXXXXXXX] for GCash
  const merchantAccountInfo = `00${guidLength}${guid}${accountIdTag}${phoneLength}${cleanPhone}`;
  const merchantAccountInfoLength = String(merchantAccountInfo.length).padStart(2, '0');
  qrString += `26${merchantAccountInfoLength}${merchantAccountInfo}`;
  
  // Merchant Category Code (52) - 0000 = Default/Unspecified
  qrString += '52040000';
  
  // Transaction Currency (53) - 608 = Philippine Peso (PHP)
  qrString += '5303608';
  
  // Transaction Amount (54) - Only include if dynamic QR (includeAmount = true)
  // Amount in centavos (smallest currency unit)
  if (includeAmount) {
    const amountInCentavos = Math.round(payment.totalAmount * 100);
    const amountStr = amountInCentavos.toString();
    const amountLength = String(amountStr.length).padStart(2, '0');
    qrString += `54${amountLength}${amountStr}`;
  }
  
  // Country Code (58) - PH = Philippines
  qrString += '5802PH';
  
  // Merchant Name (59) - Max 25 characters
  const nameLength = Math.min(merchantName.length, 25);
  const nameLengthStr = String(nameLength).padStart(2, '0');
  qrString += `59${nameLengthStr}${merchantName.substring(0, nameLength)}`;
  
  // Merchant City (60) - Max 15 characters
  const city = 'Philippines';
  const cityLength = String(city.length).padStart(2, '0');
  qrString += `60${cityLength}${city}`;
  
  // Additional Data Field Template (62) - Contains reference number
  // Format: 05 = Bill Number, length + reference
  const refLength = Math.min(reference.length, 25);
  const refLengthStr = String(refLength).padStart(2, '0');
  const additionalData = `05${refLengthStr}${reference.substring(0, refLength)}`;
  const additionalDataLength = String(additionalData.length).padStart(2, '0');
  qrString += `62${additionalDataLength}${additionalData}`;
  
  // Calculate CRC16 (63) - Must calculate on data WITH "6304" prefix but WITHOUT CRC value
  // The CRC is calculated on: all data + "6304" (without the CRC value itself)
  const dataForCRC = qrString + '6304';
  const crc = calculateCRC16(dataForCRC);
  qrString += `6304${crc}`;
  
  // Debug log for troubleshooting
  const amountInCentavos = includeAmount ? Math.round(payment.totalAmount * 100) : 0;
  console.log('🔍 Generated QR-PH Code:', {
    type: account.type,
    guid,
    phone: cleanPhone,
    includeAmount,
    amount: includeAmount ? amountInCentavos : 'N/A (static)',
    reference,
    qrLength: qrString.length,
    crc,
    qrPreview: qrString.substring(0, 50) + '...'
  });
  
  return qrString;
}

/**
 * Get QR code component props for rendering
 * Generates QR-PH compatible QR code that works with GCash and PayMaya
 * 
 * For GCash personal accounts, uses static QR code (no amount) as GCash
 * may not support dynamic QR codes for personal accounts.
 */
export function getQRCodeProps(
  payment: RentPayment,
  account: PaymentAccount,
  size: number = 200
) {
  // Determine if we should include amount in QR code
  // GCash personal accounts: Only static QR codes (no amount)
  // PayMaya: Supports dynamic QR codes (with amount)
  const hasOriginalQRData = !!account.qrCodeData;
  let includeAmount = false; // Default to static (safer for GCash)
  
  if (hasOriginalQRData && account.qrCodeData) {
    try {
      const parsed = parseQRPHCode(account.qrCodeData);
      if (parsed && parsed.isValid) {
        // For GCash, if original is static, use static QR codes
        // GCash personal accounts do NOT support dynamic QR codes
        if (account.type === 'gcash' && parsed.isStatic) {
          includeAmount = false;
          console.log('💡 Using static QR code for GCash (personal accounts do not support dynamic QR codes)');
        } else if (account.type === 'paymaya') {
          // PayMaya supports dynamic QR codes, so always use dynamic for better UX
          includeAmount = true;
          console.log('💡 Using dynamic QR code for PayMaya (amount will be pre-filled)');
        } else if (!parsed.isStatic) {
          // Original was dynamic, so we can use dynamic
          includeAmount = true;
        }
      }
    } catch (e) {
      console.warn('⚠️ Could not parse original QR code, defaulting based on account type');
      // Default: static for GCash, dynamic for PayMaya
      includeAmount = account.type === 'paymaya';
    }
  } else {
    // No original QR data: use dynamic for PayMaya, static for GCash
    includeAmount = account.type === 'paymaya';
  }
  
  // Generate QR-PH format QR code that works with both GCash and PayMaya
  const qrData = generateGCashQRPHCode(payment, account, includeAmount);
  
  console.log('🔍 Generating QR code:', {
    hasOriginalData: hasOriginalQRData,
    includeAmount,
    accountType: account.type,
    qrLength: qrData.length,
    qrPreview: qrData.substring(0, 100) + '...'
  });
  
  const props: any = {
    value: qrData,
    size,
    color: '#000000',
    backgroundColor: '#FFFFFF',
  };

  // Removed logo overlay - it can interfere with QR code scanning, especially for payment QR codes
  // Payment QR codes need to be scanned accurately, and logo overlays can cause scanning failures
  // The logo was causing "QR code is not valid" errors in GCash and PayMaya apps
  // if (account.qrCodeImageUri) {
  //   props.logo = { uri: account.qrCodeImageUri };
  //   props.logoSize = size * 0.3;
  //   props.logoBackgroundColor = '#FFFFFF';
  //   props.logoMargin = 2;
  //   props.logoBorderRadius = 8;
  // }
  
  return props;
}

/**
 * Parsed QR-PH code data structure
 */
export interface ParsedQRPHData {
  phoneNumber: string;
  guid: string; // "01" for GCash, "02" for PayMaya
  merchantName?: string;
  isStatic: boolean; // true if no amount field (static QR)
  isValid: boolean;
}

/**
 * Parse EMV QR-PH code string to extract account information
 * QR-PH format: EMV QR Code standard used in the Philippines
 */
export function parseQRPHCode(qrString: string): ParsedQRPHData | null {
  try {
    // Clean the QR string - remove any whitespace or special characters
    qrString = qrString.trim();
    
    // Log the QR string for debugging (first 100 chars)
    console.log('🔍 Parsing QR code (first 100 chars):', qrString.substring(0, 100));
    console.log('🔍 QR code length:', qrString.length);
    
    // Validate it's an EMV QR code (starts with 000201)
    if (!qrString.startsWith('000201')) {
      console.warn('⚠️ Not a valid EMV QR code format. Expected to start with "000201", got:', qrString.substring(0, 10));
      // Try to find EMV QR code pattern in the string (might be embedded in other data)
      const emvPattern = /000201\d+/;
      const match = qrString.match(emvPattern);
      if (match) {
        console.log('✅ Found EMV QR pattern in string, using it');
        qrString = match[0] + qrString.substring(qrString.indexOf(match[0]) + match[0].length);
        // Try to extract just the QR code part (up to CRC)
        const crcIndex = qrString.indexOf('6304');
        if (crcIndex > 0) {
          qrString = qrString.substring(0, crcIndex + 8); // Include CRC
        }
      } else {
        return null;
      }
    }

    let phoneNumber = '';
    let guid = '';
    let merchantName = '';
    let isStatic = false;

    // Parse the QR string
    let pos = 0;
    
    // Validate minimum length
    if (qrString.length < 20) {
      console.warn('⚠️ QR code string too short:', qrString.length);
      return null;
    }
    
    // Skip Payload Format Indicator (00) and Point of Initiation (01)
    // 000201 = Payload Format Indicator "01"
    pos = 6;
    
    // Point of Initiation Method (01)
    if (pos + 2 <= qrString.length && qrString.substring(pos, pos + 2) === '01') {
      pos += 2;
      if (pos + 2 <= qrString.length) {
        const poiLength = parseInt(qrString.substring(pos, pos + 2));
        pos += 2;
        if (pos + poiLength <= qrString.length) {
          const poiValue = qrString.substring(pos, pos + poiLength);
          pos += poiLength;
          // "11" = Static, "12" = Dynamic
          isStatic = poiValue === '11';
          console.log('📊 Point of Initiation:', poiValue, isStatic ? '(Static)' : '(Dynamic)');
        }
      }
    }

    // Merchant Account Information (26 or 27)
    // Note: Some QR codes use tag 27 instead of 26
    while (pos < qrString.length - 1) {
      if (pos + 2 > qrString.length) break;
      
      const tag = qrString.substring(pos, pos + 2);
      pos += 2;
      
      if (tag === '26' || tag === '27') {
        // Merchant Account Information
        if (pos + 2 > qrString.length) break;
        const maiLength = parseInt(qrString.substring(pos, pos + 2));
        pos += 2;
        
        if (pos + maiLength > qrString.length) {
          console.warn('⚠️ Merchant Account Information length exceeds remaining string');
          break;
        }
        
        const maiData = qrString.substring(pos, pos + maiLength);
        pos += maiLength;
        
        console.log('📊 Merchant Account Info (tag', tag, ') length:', maiLength, 'data:', maiData.substring(0, 100));
        
        // Parse Merchant Account Information
        // Some QR codes use different formats:
        // Format 1: Standard EMV with 00 (GUID) and 01 (Account ID)
        // Format 2: Direct format like "com.p2pqrpay" followed by account ID
        // Format 3: Other custom formats
        
        let maiPos = 0;
        while (maiPos < maiData.length - 1) {
          if (maiPos + 2 > maiData.length) break;
          
          const maiTag = maiData.substring(maiPos, maiPos + 2);
          maiPos += 2;
          
          if (maiTag === '00') {
            // GUID or Provider Identifier
            if (maiPos + 2 > maiData.length) break;
            const guidLength = parseInt(maiData.substring(maiPos, maiPos + 2));
            maiPos += 2;
            if (maiPos + guidLength <= maiData.length) {
              const guidValue = maiData.substring(maiPos, maiPos + guidLength);
              maiPos += guidLength;
              console.log('📊 Found GUID/Provider (tag 00):', guidValue);
              
              // Check if it's a provider identifier (like "com.p2pqrpay") or numeric GUID
              if (guidValue === '01' || guidValue.toLowerCase().includes('gcash') || 
                  guidValue.toLowerCase().includes('gxch') || 
                  guidValue.toLowerCase().includes('p2pqrpay')) {
                guid = '01'; // GCash
                console.log('✅ Detected GCash from GUID value:', guidValue);
              } else if (guidValue === '02' || guidValue.toLowerCase().includes('paymaya') || 
                         guidValue.toLowerCase().includes('maya') || guidValue.toLowerCase().includes('pymy')) {
                guid = '02'; // PayMaya
                console.log('✅ Detected PayMaya from GUID value:', guidValue);
              } else {
                // Store the raw GUID value for later detection
                guid = guidValue;
              }
            }
          } else if (maiTag === '01') {
            // Account Identifier (phone number)
            if (maiPos + 2 > maiData.length) break;
            const accountLength = parseInt(maiData.substring(maiPos, maiPos + 2));
            maiPos += 2;
            if (maiPos + accountLength <= maiData.length) {
              phoneNumber = maiData.substring(maiPos, maiPos + accountLength);
              maiPos += accountLength;
              console.log('✅ Found phone number (tag 01):', phoneNumber);
            }
          } else if (maiTag === '02') {
            // Alternative account identifier format (often contains phone number)
            if (maiPos + 2 > maiData.length) break;
            const accountLength = parseInt(maiData.substring(maiPos, maiPos + 2));
            maiPos += 2;
            if (maiPos + accountLength <= maiData.length) {
              const accountId = maiData.substring(maiPos, maiPos + accountLength);
              maiPos += accountLength;
              console.log('📊 Found account ID (tag 02):', accountId);
              // Check if it looks like a phone number (digits only, 9-11 digits)
              if (!phoneNumber && /^\d{9,11}$/.test(accountId)) {
                phoneNumber = accountId;
                console.log('✅ Using account ID (tag 02) as phone number:', phoneNumber);
              } else if (!phoneNumber) {
                // Try to extract phone number from the account ID string
                const phoneMatch = accountId.match(/(\d{9,11})/);
                if (phoneMatch) {
                  phoneNumber = phoneMatch[1];
                  console.log('✅ Extracted phone number from account ID:', phoneNumber);
                }
              }
            }
          } else {
            // Check if this might be a direct format (no tag structure)
            // Some QR codes have format like "com.p2pqrpay" directly
            maiPos -= 2; // Go back to check the data
            
            // Try to find phone number pattern in the remaining data
            const remainingData = maiData.substring(maiPos);
            console.log('📊 Checking remaining data for phone number:', remainingData.substring(0, 50));
            
            // Look for phone number patterns: 9-11 digits, possibly with country code
            const phonePattern = /(\d{9,11})/;
            const phoneMatch = remainingData.match(phonePattern);
            if (phoneMatch && !phoneNumber) {
              phoneNumber = phoneMatch[1];
              console.log('✅ Found phone number pattern in data:', phoneNumber);
            }
            
            // Look for GUID patterns: prioritize provider identifiers over numeric GUIDs
            if (!guid || (guid !== '01' && guid !== '02')) {
              const remainingLower = remainingData.toLowerCase();
              
              // PRIORITY 1: Check for GCash identifiers (most specific)
              if (remainingData.includes('GXCH') || remainingData.includes('gxch') || 
                  remainingLower.includes('gcash') || 
                  remainingData.includes('com.p2pqrpay') ||
                  remainingLower.includes('p2pqrpay')) {
                guid = '01';
                console.log('✅ Detected GCash GUID from data (GXCH/com.p2pqrpay) - PRIORITY');
              } 
              // PRIORITY 2: Check for PayMaya identifiers
              else if (remainingData.includes('PYMY') || remainingData.includes('pymy') ||
                       remainingLower.includes('paymaya') || 
                       remainingLower.includes('maya')) {
                guid = '02';
                console.log('✅ Detected PayMaya GUID from data - PRIORITY');
              }
              // PRIORITY 3: Check for numeric GUIDs (less reliable, only if no provider ID found)
              else if (!guid) {
                // Look for standalone "01" or "02" patterns (not part of other numbers)
                const guid01Pattern = /(^|[^0-9])01([^0-9]|$)/;
                const guid02Pattern = /(^|[^0-9])02([^0-9]|$)/;
                
                if (guid01Pattern.test(remainingData)) {
                  guid = '01';
                  console.log('✅ Detected GUID "01" from data (fallback)');
                } else if (guid02Pattern.test(remainingData)) {
                  guid = '02';
                  console.log('✅ Detected GUID "02" from data (fallback)');
                }
              }
            }
            
            // Skip unknown tags
            if (maiPos + 2 > maiData.length) break;
            const unknownLength = parseInt(maiData.substring(maiPos, maiPos + 2));
            maiPos += 2;
            if (maiPos + unknownLength <= maiData.length) {
              maiPos += unknownLength;
            } else {
              break;
            }
          }
        }
      } else if (tag === '59') {
        // Merchant Name
        if (pos + 2 > qrString.length) break;
        const nameLength = parseInt(qrString.substring(pos, pos + 2));
        pos += 2;
        if (pos + nameLength <= qrString.length) {
          merchantName = qrString.substring(pos, pos + nameLength);
          pos += nameLength;
          console.log('✅ Found merchant name:', merchantName);
        }
      } else if (tag === '63') {
        // CRC - end of data
        break;
      } else {
        // Skip other tags
        if (pos + 2 > qrString.length) break;
        const tagLength = parseInt(qrString.substring(pos, pos + 2));
        pos += 2;
        if (pos + tagLength <= qrString.length) {
          pos += tagLength;
        } else {
          break;
        }
      }
    }

    console.log('📊 Parsing result:', { phoneNumber, guid, merchantName, isStatic });

    // If we still don't have phone number or GUID, try to extract from the raw QR string
    if (!phoneNumber || !guid) {
      console.log('🔍 Attempting fallback extraction from raw QR string...');
      
      // Try to find phone number in the entire QR string (9-11 digit pattern)
      if (!phoneNumber) {
        const phonePattern = /(\d{9,11})/g;
        const matches = qrString.match(phonePattern);
        if (matches && matches.length > 0) {
          // Filter out common non-phone numbers (like years, amounts, etc.)
          const validPhones = matches.filter(m => {
            // Exclude if it looks like a year (starts with 19 or 20)
            if (/^(19|20)\d{2}$/.test(m)) return false;
            // Exclude if it's part of a longer number (likely amount or ID)
            return true;
          });
          if (validPhones.length > 0) {
            phoneNumber = validPhones[0];
            console.log('✅ Found phone number via fallback:', phoneNumber);
          }
        }
      }
      
      // Try to detect GUID from QR string content (prioritize provider identifiers)
      if (!guid || (guid !== '01' && guid !== '02')) {
        const qrLower = qrString.toLowerCase();
        const qrUpper = qrString.toUpperCase();
        
        // PRIORITY: Check for GCash identifiers first
        if (qrString.includes('GXCH') || qrUpper.includes('GXCH') || 
            qrLower.includes('gcash') || 
            qrString.includes('com.p2pqrpay') ||
            qrLower.includes('p2pqrpay')) {
          guid = '01';
          console.log('✅ Detected GCash GUID via fallback (GXCH/com.p2pqrpay)');
        } 
        // Then check for PayMaya identifiers
        else if (qrString.includes('PYMY') || qrUpper.includes('PYMY') ||
                 qrLower.includes('paymaya') || 
                 qrLower.includes('maya')) {
          guid = '02';
          console.log('✅ Detected PayMaya GUID via fallback');
        }
        // Last resort: numeric GUIDs
        else if (!guid) {
          // Look for standalone "01" or "02" (not part of dates or other numbers)
          const guid01Match = qrString.match(/(^|[^0-9])01([^0-9]|$)/);
          const guid02Match = qrString.match(/(^|[^0-9])02([^0-9]|$)/);
          
          if (guid01Match) {
            guid = '01';
            console.log('✅ Detected GUID "01" via fallback (numeric)');
          } else if (guid02Match) {
            guid = '02';
            console.log('✅ Detected GUID "02" via fallback (numeric)');
          }
        }
      }
    }

    if (!phoneNumber || !guid) {
      console.warn('⚠️ Could not extract phone number or GUID from QR code');
      console.warn('   Phone number:', phoneNumber || 'MISSING');
      console.warn('   GUID:', guid || 'MISSING');
      console.warn('   Full QR string (first 300 chars):', qrString.substring(0, 300));
      return null;
    }

    return {
      phoneNumber,
      guid,
      merchantName: merchantName || undefined,
      isStatic,
      isValid: true
    };
  } catch (error) {
    console.error('❌ Error parsing QR-PH code:', error);
    console.error('   QR string (first 200 chars):', qrString.substring(0, 200));
    return null;
  }
}

/**
 * Decode QR code from image URI
 * Uses a web-based QR decoder API to read QR code from image
 */
export async function decodeQRCodeFromImage(imageUri: string): Promise<string | null> {
  try {
    console.log('📸 Attempting to decode QR code from image:', imageUri);
    
    // Convert image to base64
    // Note: For React Native, we'll use the image URI directly in FormData
    // The API will handle the image file
    let base64Image: string | null = null;
    
    // Try to read as base64 if possible (for web platform)
    try {
      if (Platform.OS === 'web') {
        base64Image = await FileSystem.readAsStringAsync(imageUri, {
          encoding: 'base64' as any,
        });
      }
    } catch (base64Error) {
      // Ignore base64 conversion error, we'll use URI directly
      console.log('Using image URI directly for native platforms');
    }
    
    // Use a web-based QR decoder API
    // Using api.qrserver.com as a free QR decoder service
    const formData = new FormData();
    
    if (Platform.OS === 'web' && base64Image) {
      // For web, convert base64 to blob
      const blob = await fetch(`data:image/jpeg;base64,${base64Image}`).then(r => r.blob());
      formData.append('file', blob, 'qr-code.jpg');
    } else {
      // For native platforms, use the URI directly
      formData.append('file', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'qr-code.jpg',
      } as any);
    }
    
    try {
      // Try using a QR decoder API
      const response = await fetch('https://api.qrserver.com/v1/read-qr-code/', {
        method: 'POST',
        body: formData,
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('📊 QR decoder API response:', JSON.stringify(data).substring(0, 200));
        
        if (data && data[0] && data[0].symbol && data[0].symbol[0] && data[0].symbol[0].data) {
          const qrData = data[0].symbol[0].data;
          console.log('✅ QR code decoded successfully (api.qrserver.com):', qrData.substring(0, 100) + '...');
          console.log('📏 QR code data length:', qrData.length);
          return qrData;
        } else {
          console.warn('⚠️ QR decoder API response format unexpected:', data);
        }
      } else {
        console.warn('⚠️ QR decoder API response not OK:', response.status, response.statusText);
      }
    } catch (apiError) {
      console.warn('⚠️ QR decoder API failed, trying alternative method:', apiError);
    }
    
    // Alternative: Try using goqr.me API
    try {
      const formData2 = new FormData();
      if (Platform.OS === 'web' && base64Image) {
        const blob = await fetch(`data:image/jpeg;base64,${base64Image}`).then(r => r.blob());
        formData2.append('file', blob, 'qr-code.jpg');
      } else {
        formData2.append('file', {
          uri: imageUri,
          type: 'image/jpeg',
          name: 'qr-code.jpg',
        } as any);
      }
      
      const response2 = await fetch('https://api.goqr.me/api/read-qr-code/', {
        method: 'POST',
        body: formData2,
      });
      
      if (response2.ok) {
        const data = await response2.json();
        console.log('📊 Alternative QR decoder API response:', JSON.stringify(data).substring(0, 200));
        
        if (data && data.type === 'qrcode' && data.symbol && data.symbol[0] && data.symbol[0].data) {
          const qrData = data.symbol[0].data;
          console.log('✅ QR code decoded successfully (goqr.me):', qrData.substring(0, 100) + '...');
          console.log('📏 QR code data length:', qrData.length);
          return qrData;
        } else if (data && data.data) {
          // Some APIs return data directly
          const qrData = data.data;
          console.log('✅ QR code decoded successfully (alternative format):', qrData.substring(0, 100) + '...');
          return qrData;
        } else {
          console.warn('⚠️ Alternative QR decoder API response format unexpected:', data);
        }
      } else {
        console.warn('⚠️ Alternative QR decoder API response not OK:', response2.status, response2.statusText);
      }
    } catch (apiError2) {
      console.warn('⚠️ Alternative QR decoder API also failed:', apiError2);
    }
    
    console.warn('⚠️ All QR decoding methods failed, please use manual input');
    return null;
  } catch (error) {
    console.error('❌ Error decoding QR code from image:', error);
    return null;
  }
}

/**
 * Extract payment account information from uploaded QR code
 * This function parses the QR code and extracts phone number, GUID, and merchant name
 */
export async function extractAccountInfoFromQRCode(
  imageUri: string,
  accountType: 'gcash' | 'paymaya'
): Promise<{
  phoneNumber?: string;
  accountName?: string;
  isValid: boolean;
  error?: string;
}> {
  try {
    // First, decode the QR code from the image
    const qrData = await decodeQRCodeFromImage(imageUri);
    
    if (!qrData) {
      // If automatic decoding fails, return instructions for manual input
      return {
        isValid: false,
        error: 'Could not automatically decode QR code. Please manually enter the account number, or scan the QR code with a QR reader app and paste the data.'
      };
    }

    // Parse the QR-PH code
    const parsed = parseQRPHCode(qrData);
    
    if (!parsed || !parsed.isValid) {
      return {
        isValid: false,
        error: 'QR code is not in QR-PH format or is invalid.'
      };
    }

    // Validate GUID matches account type
    const expectedGUID = accountType === 'gcash' ? '01' : '02';
    if (parsed.guid !== expectedGUID) {
      return {
        isValid: false,
        error: `QR code is for ${parsed.guid === '01' ? 'GCash' : 'PayMaya'}, but account type is set to ${accountType === 'gcash' ? 'GCash' : 'PayMaya'}.`
      };
    }

    // Normalize phone number
    let phoneNumber = parsed.phoneNumber.replace(/[^0-9]/g, '');
    
    // Convert to 09XXXXXXXXX format if needed
    if (phoneNumber.startsWith('63') && phoneNumber.length >= 11) {
      phoneNumber = '0' + phoneNumber.substring(2);
    }

    return {
      phoneNumber,
      accountName: parsed.merchantName,
      isValid: true
    };
  } catch (error) {
    console.error('❌ Error extracting account info from QR code:', error);
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

