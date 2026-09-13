import admin from 'firebase-admin';
import * as dotenv from 'dotenv';
dotenv.config();

const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

if (!serviceAccount.projectId) {
  console.error("Missing Firebase credentials in .env");
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function createUser() {
  try {
    const userRecord = await admin.auth().createUser({
      email: 'yashwanthrao2626@gmail.com',
      password: 'adminPassword123!',
      displayName: 'Master Admin',
    });
    console.log('Successfully created new user:', userRecord.uid);
  } catch (error: any) {
    if (error.code === 'auth/email-already-exists') {
      console.log('User already exists! Updating password...');
      const user = await admin.auth().getUserByEmail('yashwanthrao2626@gmail.com');
      await admin.auth().updateUser(user.uid, { password: 'adminPassword123!' });
      console.log('Password updated successfully.');
    } else {
      console.error('Error creating new user:', error);
    }
  }
  process.exit(0);
}

createUser();
