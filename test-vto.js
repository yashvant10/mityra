const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');

async function testVTO() {
  const backendUrl = "http://44.220.126.206:8000/api/tryon";
  console.log("Testing VTO Backend Integration:", backendUrl);
  
  try {
    const personImagePath = './test_person_dl.jpg';
    const clothImagePath = './test_garment_dl.jpg';
    
    if (!fs.existsSync(personImagePath) || !fs.existsSync(clothImagePath)) {
      console.log("Required test images not found locally. Skipping test.");
      return;
    }

    const formData = new FormData();
    formData.append('person_image', fs.createReadStream(personImagePath));
    formData.append('cloth_image', fs.createReadStream(clothImagePath));

    console.log("Sending request to CatVTON API...");
    const response = await axios.post(backendUrl, formData, {
      headers: {
        ...formData.getHeaders(),
      }
    });

    console.log("Response Status:", response.status);
    console.log("Response Data keys:", Object.keys(response.data));
    
    if (response.data && response.data.result_image) {
      console.log("SUCCESS: Received generated image from CatVTON backend!");
      const base64Data = response.data.result_image.replace(/^data:image\/\w+;base64,/, "");
      fs.writeFileSync('./test-vto-result.jpg', base64Data, {encoding: 'base64'});
      console.log("Saved generated image to ./test-vto-result.jpg");
    } else {
      console.log("FAILED: No result_image in response.");
      console.log("Full Response:", response.data);
    }
  } catch (error) {
    console.error("Test failed:", error.message);
    if (error.response) {
      console.error("Server responded with:", error.response.status);
      console.error("Data:", error.response.data);
    }
  }
}

testVTO();
