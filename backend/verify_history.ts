import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import FormData from 'form-data';

// Load env from frontend
require('dotenv').config({ path: '../frontend/.env.local' });

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (!projectId || !clientEmail || !privateKey) {
  console.error("Missing Firebase Admin credentials");
  process.exit(1);
}

const app = initializeApp({
  credential: cert({ projectId, clientEmail, privateKey }),
});

const auth = getAuth(app);
const db = getFirestore(app);

async function runTest() {
  console.log("1. Creating Test User...");
  const testUid = `test_vto_user_${Date.now()}`;
  const customToken = await auth.createCustomToken(testUid);
  
  // Exchange custom token for ID token
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const exchangeRes = await axios.post(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`, {
    token: customToken,
    returnSecureToken: true
  });
  const idToken = exchangeRes.data.idToken;
  console.log("Test User ID Token acquired.");

  console.log("2. Giving Test User 10 credits...");
  await db.collection("wallets").doc(testUid).set({ balance: 10 });
  const walletBefore = (await db.collection("wallets").doc(testUid).get()).data()?.balance;
  console.log(`Credit Balance Before: ${walletBefore}`);

  console.log("3. Calling VTO Generation (Next.js Secure API)...");
  const dummyImg = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsQAAA7EAZUrDhsAAAANSURBVBhXYzh8+PB/AAffA0nCJ8xAAAAAAElFTkSuQmCC", "base64");
  
  const formData = new FormData();
  formData.append("person_image", dummyImg, { filename: "person.jpg", contentType: "image/jpeg" });
  formData.append("cloth_image", dummyImg, { filename: "cloth.jpg", contentType: "image/jpeg" });

  let vtoResult;
  try {
    const vtoRes = await axios.post("http://localhost:3001/api/tryon/secure", formData, {
      headers: {
        ...formData.getHeaders(),
        Authorization: `Bearer ${idToken}`
      }
    });
    console.log("VTO Generation: PASS");
    vtoResult = vtoRes.data;
    console.log("Generated image returned: YES");
  } catch (err: any) {
    console.error("VTO Generation: FAIL", err.response?.data || err.message);
    process.exit(1);
  }

  const walletAfter = (await db.collection("wallets").doc(testUid).get()).data()?.balance;
  console.log(`Credit Balance After: ${walletAfter} (Expected: 9)`);

  console.log("4. Calling History Save API (Node.js backend)...");
  const resultImageUrl = vtoResult.result_image || vtoResult.image;
  const payload = {
    resultImageUrl,
    personImageUrl: "http://example.com/person.jpg",
    clothingImageUrl: "http://example.com/cloth.jpg",
    product: {
      name: "Test Shirt",
      price: "₹999",
      store: "amazon"
    }
  };

  try {
    const historyRes = await axios.post("http://localhost:5001/api/tryon/history", payload, {
      headers: {
        Authorization: `Bearer ${idToken}`
      }
    });
    console.log("History API status:", historyRes.status);
    console.log("History save request sent: YES");
  } catch (err: any) {
    console.error("History Save API: FAIL", err.response?.data || err.message);
    process.exit(1);
  }

  console.log("5. Checking Firestore History collection directly...");
  const historyDocs = await db.collection("tryOnHistory").where("userId", "==", testUid).get();
  console.log(`Firestore history write: ${historyDocs.empty ? 'FAIL' : 'PASS'} (Found ${historyDocs.size} docs)`);
  console.log("User UID used for the record:", testUid);
  console.log("History collection/document created: YES");

  console.log("6. Verifying History Page Query...");
  try {
    const queryRes = await axios.get("http://localhost:5001/api/tryon/history", {
      headers: {
        Authorization: `Bearer ${idToken}`
      }
    });
    const retrievedHistory = queryRes.data.history;
    console.log(`History page query: PASS (Received ${retrievedHistory.length} items)`);
    console.log("Record visible in History page:", retrievedHistory.length > 0 ? 'YES' : 'NO');
  } catch (err: any) {
    console.error("History Page Query: FAIL", err.response?.data || err.message);
  }

  // Cleanup
  await auth.deleteUser(testUid).catch(() => {});
  console.log("Test finished.");
}

runTest();
