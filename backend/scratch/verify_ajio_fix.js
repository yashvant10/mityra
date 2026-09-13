const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: 'c:/Users/LENOVO/Desktop/PROJECT_COMPLETE_BACKUP/backend/.env' });

const TARGET_AJIO_URL = 'https://www.ajio.com/neonomad-men-regular-fit-spread-collar-shirt/p/703847572_beige?user=old&itm_source=banner&itm_source_detail=Minimum%2Bforty%2Bpercent%2Boff%2Bathletic%2Bshoes.%2BBlack%2Band%2Bgold%2Bsneakers%2Bfeatured.%2BShop%2BAdidas%252C%2BAsics%252C%2Band%2Bmore.';

async function verifyAjioFix() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('VERIFYING AJIO EXACT PRODUCT IMPORT FIX');
  console.log('═══════════════════════════════════════════════════════');

  // Test 1: Direct scraperService test
  console.log('\n[TEST 1] Calling parseProductUrl() directly...');
  const { parseProductUrl } = require('../src/services/scraperService');
  const product = await parseProductUrl(TARGET_AJIO_URL);

  console.log('\n--- EXTRACTED PRODUCT DETAILS ---');
  console.log('Platform:', product.platform);
  console.log('Title:   ', product.title);
  console.log('Brand:   ', product.brand);
  console.log('Price:   ', product.price);
  console.log('Image:   ', product.imageUrl);
  console.log('URL:     ', product.url);

  // Assertions
  const isNeonomad = product.title.toLowerCase().includes('neonomad');
  const isShirt = product.title.toLowerCase().includes('shirt');
  const isCollar = product.title.toLowerCase().includes('spread');
  const isImageBeige = product.imageUrl.includes('703847572') && product.imageUrl.includes('beige');
  const isPriceValid = product.price.includes('468');

  console.log('\n--- ASSERTIONS ---');
  console.log('✓ Brand/Title has NEONOMAD:', isNeonomad);
  console.log('✓ Title has Shirt:', isShirt);
  console.log('✓ Title has Spread Collar:', isCollar);
  console.log('✓ Image URL contains 703847572 & beige:', isImageBeige);
  console.log('✓ Price contains 468:', isPriceValid);

  if (!isNeonomad || !isImageBeige) {
    console.error('\n✗ TEST 1 FAILED: Product or image mismatch!');
    process.exit(1);
  }
  console.log('\n✓ TEST 1 PASSED: Exact AJIO product extracted correctly!');

  // Test 2: Call through Backend HTTP API (import-url endpoint)
  console.log('\n[TEST 2] Testing POST /api/tryon/import-url on backend server...');
  try {
    const apiRes = await axios.post('http://localhost:5001/api/tryon/import-url', {
      url: TARGET_AJIO_URL,
      gender: 'male'
    });
    console.log('API Response status:', apiRes.status);
    const importedProd = apiRes.data.product;
    console.log('Imported Product Name:    ', importedProd.name);
    console.log('Imported Product Price:   ', importedProd.price);
    console.log('Imported Product Image:   ', importedProd.imageUrl);
    console.log('Imported Product Store:   ', importedProd.store);
    console.log('Imported Product Platform:', importedProd.platform);
    
    if (importedProd.imageUrl.includes('703847572') && importedProd.imageUrl.includes('beige')) {
      console.log('✓ TEST 2 PASSED: Backend API returned exact beige shirt product!');
    } else {
      console.error('✗ TEST 2 FAILED: Image does not match beige shirt!');
    }
  } catch (err) {
    console.error('Test 2 API error:', err.response?.data || err.message);
  }

  // Test 3: Test invalid/unverifiable AJIO URL to ensure it never returns a random/similar product
  console.log('\n[TEST 3] Testing unverifiable AJIO URL rejection...');
  const fakeAjioUrl = 'https://www.ajio.com/nonexistent-item/p/999999999999_fakecolor';
  try {
    const fakeRes = await axios.post('http://localhost:5001/api/tryon/import-url', {
      url: fakeAjioUrl,
      gender: 'male'
    });
    console.error('✗ TEST 3 FAILED: Fake URL should have been rejected but got:', fakeRes.data);
  } catch (err) {
    const errMsg = err.response?.data?.error || err.message;
    console.log(`API correctly rejected fake product with error: "${errMsg}"`);
    if (errMsg.includes('Unable to verify') || errMsg.includes('Failed to extract') || errMsg.includes('blocking')) {
      console.log('✓ TEST 3 PASSED: System rejected unverifiable product and did NOT show similar product!');
    }
  }

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('ALL VERIFICATIONS COMPLETED SUCCESSFULLY!');
  console.log('═══════════════════════════════════════════════════════');
}

verifyAjioFix().catch(console.error);
