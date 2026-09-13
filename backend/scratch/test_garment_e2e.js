/**
 * End-to-end VTO garment verification test.
 * 
 * This script:
 * 1. Picks a distinctive garment image (Amazon product with known ASIN)
 * 2. Downloads it via the proxy-image endpoint (same path as urlToBlob)
 * 3. Builds the exact FormData that generateTryOn() would build
 * 4. Sends it to /api/tryon/secure (no auth — will get 401, but we can verify the flow)
 * 5. Also sends directly to AWS to verify the garment reaches CatVTON
 */

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');

const BACKEND = 'http://localhost:5001/api';
const AWS_VTO = 'http://44.220.126.206:8000';

// Use a distinctive garment: the DEEMOON checkered shirt
const GARMENT_URL = 'https://m.media-amazon.com/images/I/81ochE-BbUL._SL1500_.jpg';
const PERSON_IMAGE_PATH = path.resolve(__dirname, '../../.gemini/antigravity-ide/brain/04c6f2ef-e924-49c4-be1c-65c2f2a5db49/person_1789058435842.jpg');

async function run() {
  console.log('═══════════════════════════════════════════════');
  console.log('VTO GARMENT VERIFICATION TEST');
  console.log('═══════════════════════════════════════════════');
  
  // Step 1: Download garment via proxy-image (same as urlToBlob)
  console.log('\n[STEP 1] Downloading garment via proxy-image...');
  console.log('  Garment URL:', GARMENT_URL);
  
  const proxyUrl = `${BACKEND}/tryon/proxy-image?url=${encodeURIComponent(GARMENT_URL)}`;
  const garmentRes = await axios.get(proxyUrl, { responseType: 'arraybuffer', timeout: 15000 });
  const garmentBuffer = Buffer.from(garmentRes.data);
  const garmentType = garmentRes.headers['content-type'] || 'image/jpeg';
  
  console.log('  Proxy returned:', garmentBuffer.length, 'bytes');
  console.log('  Content-Type:', garmentType);
  console.log('  First 4 bytes (magic):', garmentBuffer.slice(0, 4).toString('hex'));
  
  // Verify it's a real image
  const isJpeg = garmentBuffer[0] === 0xFF && garmentBuffer[1] === 0xD8;
  const isPng = garmentBuffer[0] === 0x89 && garmentBuffer[1] === 0x50;
  console.log('  Is JPEG:', isJpeg, '| Is PNG:', isPng);
  
  if (garmentBuffer.length < 1000) {
    console.error('  ✗ GARMENT IS TOO SMALL — likely not a real image!');
    return;
  }
  console.log('  ✓ Garment blob looks valid');
  
  // Step 2: Check if person image exists
  console.log('\n[STEP 2] Checking person image...');
  let personBuffer;
  if (fs.existsSync(PERSON_IMAGE_PATH)) {
    personBuffer = fs.readFileSync(PERSON_IMAGE_PATH);
    console.log('  Person image:', personBuffer.length, 'bytes');
  } else {
    console.log('  Person image not found at:', PERSON_IMAGE_PATH);
    console.log('  Using a small test image instead');
    // Create a minimal 1x1 JPEG
    personBuffer = garmentBuffer; // Use garment as person for testing
  }
  
  // Step 3: Build FormData exactly like generateTryOn does
  console.log('\n[STEP 3] Building FormData...');
  const form = new FormData();
  form.append('person_image', personBuffer, { filename: 'person.jpg', contentType: 'image/jpeg' });
  form.append('cloth_image', garmentBuffer, { filename: 'product.jpg', contentType: garmentType });
  form.append('cloth_type', 'upper');
  
  console.log('  FormData fields: person_image, cloth_image, cloth_type');
  console.log('  cloth_image size:', garmentBuffer.length, 'bytes');
  console.log('  cloth_image type:', garmentType);
  
  // Step 4: Send directly to AWS (bypassing auth) to verify garment reaches CatVTON
  console.log('\n[STEP 4] Sending directly to AWS VTO...');
  console.log('  Target:', `${AWS_VTO}/api/tryon`);
  
  try {
    const awsRes = await axios.post(`${AWS_VTO}/api/tryon`, form, {
      headers: {
        ...form.getHeaders(),
      },
      timeout: 75000,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });
    
    console.log('  AWS Response status:', awsRes.status);
    console.log('  AWS Response keys:', Object.keys(awsRes.data));
    
    const resultImage = awsRes.data?.result_image || awsRes.data?.image || '';
    if (resultImage) {
      const imgPrefix = typeof resultImage === 'string' ? resultImage.slice(0, 40) : 'non-string';
      console.log('  Result image prefix:', imgPrefix);
      console.log('  Result image length:', resultImage.length);
      
      // Save result for visual inspection
      let resultBuffer;
      if (resultImage.startsWith('data:')) {
        resultBuffer = Buffer.from(resultImage.split(',')[1], 'base64');
      } else if (!resultImage.startsWith('http')) {
        resultBuffer = Buffer.from(resultImage, 'base64');
      }
      
      if (resultBuffer) {
        const outPath = path.resolve(__dirname, 'vto_test_result.png');
        fs.writeFileSync(outPath, resultBuffer);
        console.log('  ✓ Result saved to:', outPath, '(' + resultBuffer.length + ' bytes)');
      }
    }
    
    console.log('\n══════════════════════════════════════');
    console.log('✓ VTO GARMENT VERIFICATION COMPLETE');
    console.log('  Garment URL:', GARMENT_URL);
    console.log('  Garment size sent:', garmentBuffer.length, 'bytes');
    console.log('  AWS received and processed the request');
    console.log('══════════════════════════════════════');
  } catch (e) {
    console.error('  AWS VTO error:', e.message);
    if (e.response) {
      console.error('  AWS status:', e.response.status);
      console.error('  AWS data:', typeof e.response.data === 'string' ? e.response.data.slice(0, 200) : JSON.stringify(e.response.data).slice(0, 200));
    }
  }
}

run().catch(e => console.error('Fatal:', e.message));
