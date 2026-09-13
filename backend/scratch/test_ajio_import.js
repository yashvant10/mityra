// Load env vars first
require('dotenv').config();

// Test the AJIO product import for the exact URL specified in the task
const { parseProductUrl } = require('../dist/services/scraperService');

async function testAjioImport() {
  const url = 'https://www.ajio.com/lp-jeans-men-slim-fit-polo-t-shirt-with-brand-print/p/469794965_wine?user=old&itm_source=banner&itm_source_detail=NA';
  
  console.log('=== AJIO EXACT PRODUCT VERIFICATION TEST ===');
  console.log(`URL: ${url}`);
  console.log('Expected Product ID: 469794965');
  console.log('Expected Variant: wine');
  console.log('Expected Product: LP JEANS Men Slim Fit Polo T-Shirt with Brand Print');
  console.log('');
  
  try {
    const result = await parseProductUrl(url);
    
    console.log('\n=== RESULT ===');
    console.log('Title:', result.title);
    console.log('Brand:', result.brand);
    console.log('Price:', result.price);
    console.log('Platform:', result.platform);
    console.log('Image URL:', result.imageUrl);
    console.log('URL:', result.url);
    
    // Verification checks
    console.log('\n=== VERIFICATION ===');
    
    const urlContainsId = result.url?.includes('469794965');
    console.log('1. Product ID (469794965) in URL:', urlContainsId ? '✓ YES' : '✗ NO');
    console.log('1b. Product ID property:', result.productId === '469794965' ? '✓ YES (469794965)' : '✗ NO');
    
    const hasVariant = result.url?.includes('wine') ||
                       result.imageUrl?.toLowerCase().includes('wine') ||
                       result.title?.toLowerCase().includes('wine') ||
                       result.variant === 'wine';
    console.log('2. Variant (wine) detected:', hasVariant ? '✓ YES' : '✗ NO');
    console.log('2b. Variant property:', result.variant === 'wine' ? '✓ YES (wine)' : '✗ NO');
    
    const hasLpJeans = result.title === 'LP JEANS Men Slim Fit Polo T-Shirt with Brand Print';
    console.log('3. Exact Product Title match:', hasLpJeans ? '✓ YES ("LP JEANS Men Slim Fit Polo T-Shirt with Brand Print")' : '✗ NO');
    
    const hasPolo = result.title?.toLowerCase().includes('polo');
    console.log('4. Product has "Polo":', hasPolo ? '✓ YES' : '✗ NO');
    
    const hasTShirt = result.title?.includes('T-Shirt');
    console.log('5. Product has "T-Shirt":', hasTShirt ? '✓ YES' : '✗ NO');
    
    const hasImage = result.imageUrl && result.imageUrl.startsWith('http');
    console.log('6. Has valid image URL:', hasImage ? '✓ YES' : '✗ NO');
    
    const isAjio = result.platform === 'ajio';
    console.log('7. Platform is "ajio":', isAjio ? '✓ YES' : '✗ NO');
    
    const isExactProduct = result.url?.includes('469794965');
    console.log('8. Exact product (not substituted):', isExactProduct ? '✓ YES' : '✗ NO');
    
    const allPassed = urlContainsId && result.productId === '469794965' && result.variant === 'wine' && hasLpJeans && hasPolo && hasTShirt && hasImage && isAjio && isExactProduct;
    console.log('\n' + '='.repeat(50));
    console.log(allPassed ? '✓ ALL CHECKS PASSED — AJIO Import Successful!' : '✗ SOME CHECKS FAILED');
    console.log('='.repeat(50));
    
  } catch (error) {
    console.error('\n=== ERROR ===');
    console.error('Import failed:', error.message);
  }
}

testAjioImport();
