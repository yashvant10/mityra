const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');

const AWS_VTO = 'http://44.220.126.206:8000';
const PERSON_IMAGE_PATH = path.resolve(__dirname, '../../.gemini/antigravity-ide/brain/04c6f2ef-e924-49c4-be1c-65c2f2a5db49/person_1789058435842.jpg');
const AJIO_IMAGE_PATH = path.resolve(__dirname, 'ajio_beige_shirt.jpg');

async function testAjioVto() {
  console.log('--- Testing AJIO Beige Shirt with AWS CatVTON ---');

  if (!fs.existsSync(AJIO_IMAGE_PATH)) {
    console.error('AJIO image not found at:', AJIO_IMAGE_PATH);
    return;
  }
  const garmentBuffer = fs.readFileSync(AJIO_IMAGE_PATH);
  console.log('Garment buffer size:', garmentBuffer.length, 'bytes');

  let personBuffer;
  if (fs.existsSync(PERSON_IMAGE_PATH)) {
    personBuffer = fs.readFileSync(PERSON_IMAGE_PATH);
    console.log('Person image size:', personBuffer.length, 'bytes');
  } else {
    personBuffer = garmentBuffer;
  }

  const form = new FormData();
  form.append('person_image', personBuffer, { filename: 'person.jpg', contentType: 'image/jpeg' });
  form.append('cloth_image', garmentBuffer, { filename: 'product.jpg', contentType: 'image/jpeg' });
  form.append('cloth_type', 'upper');

  console.log('Sending to AWS VTO:', `${AWS_VTO}/api/tryon`);
  try {
    const res = await axios.post(`${AWS_VTO}/api/tryon`, form, {
      headers: { ...form.getHeaders() },
      timeout: 75000
    });
    console.log('AWS VTO response status:', res.status);
    console.log('AWS VTO response keys:', Object.keys(res.data));
    const resultImg = res.data.result_image || res.data.image;
    if (resultImg) {
      console.log('✓ Success! Generated result image length:', resultImg.length);
      const base64Data = resultImg.replace(/^data:image\/\w+;base64,/, '');
      fs.writeFileSync('backend/scratch/ajio_vto_result.png', Buffer.from(base64Data, 'base64'));
      console.log('Saved result to backend/scratch/ajio_vto_result.png');
    }
  } catch (err) {
    console.error('AWS VTO error:', err.response?.status, err.response?.data || err.message);
  }
}

testAjioVto();
