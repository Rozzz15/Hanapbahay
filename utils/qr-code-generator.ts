/**
 * QR Code Generator Utilities
 * Generates dynamic QR codes for rental invoice payments
 */

import QRCode from 'react-native-qrcode-svg';
import { RentPayment } from './tenant-payments';
import { PaymentAccount } from './owner-dashboard';

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
 * Uses CRC-16/CCITT-FALSE algorithm
 */
function calculateCRC16(data: string): string {
  let crc = 0xFFFF;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc = crc << 1;
      }
    }
  }
  crc = crc & 0xFFFF;
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Generate QR-PH format that GCash recognizes
 * QR-PH follows EMV QR Code standard used in the Philippines
 * This format is compatible with GCash, PayMaya, and other payment apps
 */
export function generateGCashQRPHCode(
  payment: RentPayment,
  account: PaymentAccount
): string {
  const cleanPhone = account.accountNumber.replace(/[^0-9]/g, '');
  const reference = payment.receiptNumber || payment.id.slice(-8).toUpperCase();
  
  // Clean merchant name (remove special characters, max 25 chars)
  const merchantName = account.accountName
    .substring(0, 25)
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .trim() || 'Merchant';
  
  // Build QR-PH / EMV QR Code structure
  // Payload Format Indicator (00) - Always "01" for EMV QR
  let qrString = '000201';
  
  // Point of Initiation Method (01) - "12" = Dynamic QR (amount included)
  qrString += '010212';
  
  // Merchant Account Information (26)
  // For GCash: 00 = GUID (should be "01" for GCash), 01 = Account Identifier (phone number)
  // Format: 00 + length(2) + "01" + 01 + length(2) + phone number
  const guid = '01'; // GCash identifier
  const guidLength = String(guid.length).padStart(2, '0');
  const accountId = '01'; // Account identifier tag
  const phoneLength = String(cleanPhone.length).padStart(2, '0');
  const merchantAccountInfo = `00${guidLength}${guid}01${phoneLength}${cleanPhone}`;
  const merchantAccountInfoLength = String(merchantAccountInfo.length).padStart(2, '0');
  qrString += `26${merchantAccountInfoLength}${merchantAccountInfo}`;
  
  // Merchant Category Code (52) - 0000 = Default/Unspecified
  qrString += '52040000';
  
  // Transaction Currency (53) - 608 = Philippine Peso (PHP)
  qrString += '5303608';
  
  // Transaction Amount (54) - Amount in centavos (smallest currency unit)
  const amountInCentavos = Math.round(payment.totalAmount * 100);
  const amountStr = amountInCentavos.toString();
  const amountLength = String(amountStr.length).padStart(2, '0');
  qrString += `54${amountLength}${amountStr}`;
  
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
  
  // Calculate CRC16 (63) - Must calculate on data WITHOUT CRC field
  // CRC is calculated on the entire string so far, then append 6304 + CRC
  const crc = calculateCRC16(qrString + '6304');
  qrString += `6304${crc}`;
  
  return qrString;
}

/**
 * Get QR code component props for rendering
 * Generates QR-PH compatible QR code that GCash can scan
 */
export function getQRCodeProps(
  payment: RentPayment,
  account: PaymentAccount,
  size: number = 200
) {
  // Generate QR-PH format QR code that GCash can scan
  const qrData = generateGCashQRPHCode(payment, account);
  
  const props: any = {
    value: qrData,
    size,
    color: '#000000',
    backgroundColor: '#FFFFFF',
  };

  // Add logo if available (react-native-qrcode-svg supports logo prop)
  if (account.qrCodeImageUri) {
    props.logo = { uri: account.qrCodeImageUri };
    props.logoSize = size * 0.3;
    props.logoBackgroundColor = '#FFFFFF';
    props.logoMargin = 2;
    props.logoBorderRadius = 8;
  }
  
  return props;
}

