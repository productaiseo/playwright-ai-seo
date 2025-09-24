/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-require-imports */
const admin = require('firebase-admin');
const serviceAccount = require('../../../../firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'aiseo-mvp-77790251'
});

async function test() {
  try {
    const auth = admin.auth();
    const token = await auth.createCustomToken('test-user');
    console.log('Success: Token created');
    const db = admin.firestore();
    await db.collection('_test').doc('_test').get();
    console.log('Success: Firestore accessible');
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error:', error.message);
    } else {
      console.error('Error:', error);
    }
  }
}

test();