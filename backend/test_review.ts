import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

async function testReview() {
  try {
    const url = 'http://localhost:5001/api/tryon/review';
    
    // We'll use a dummy image URL for test
    const dummyImage = "https://i.ibb.co/hKw60fB/test-vto.jpg";

    console.log("Sending POST to /api/tryon/review");
    const res = await axios.post(url, {
      resultImageUrl: dummyImage,
      product: {
        name: "Vintage White Crop Top",
        brand: "H&M",
        price: "$19.99"
      }
    });

    console.log("Response:", JSON.stringify(res.data, null, 2));

  } catch (err: any) {
    if (err.response) {
      console.error("Error Response Data:", err.response.data);
    } else {
      console.error("Error:", err.message);
    }
  }
}

testReview();
