const fs = require('fs');
const path = require('path');

async function testCatvton() {
  const url = 'http://44.220.126.206:8000/api/tryon';
  
  // Create dummy images
  const dummyPerson = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
  const dummyCloth = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  
  const formData = new FormData();
  formData.append('person_image', new Blob([dummyPerson], { type: 'image/png' }), 'person.png');
  formData.append('cloth_image', new Blob([dummyCloth], { type: 'image/png' }), 'cloth.png');

  try {
    console.log(`Sending direct request to ${url}...`);
    const res = await fetch(url, {
      method: 'POST',
      body: formData
    });
    
    if (!res.ok) {
      console.error(`HTTP Error: ${res.status} ${res.statusText}`);
      const text = await res.text();
      console.error(text);
      return;
    }
    
    const data = await res.json();
    console.log('Success:', Object.keys(data));
    console.log('Message:', data.message || data.error);
    if (data.result_image) {
      console.log('Result image exists, starts with:', data.result_image.substring(0, 30));
    }
  } catch (e) {
    console.error('Network Error:', e.message);
  }
}

testCatvton();
