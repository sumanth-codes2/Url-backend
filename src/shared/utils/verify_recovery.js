import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: 'c:/Users/SUMANTH/OneDrive/Url_Shortner/backend/.env' });

if (process.env.GMAIL_USER && process.env.GMAIL_USER.includes('your_gmail_username')) {
  console.log('Detected placeholder Gmail credentials. Bypassing Gmail to allow verification tests via Ethereal SMTP...');
  process.env.GMAIL_USER = '';
  process.env.GMAIL_PASS = '';
}

const API_BASE = 'http://localhost:5000/api/auth';
const TEST_EMAIL = 'verify_test_user@example.com';
const TEST_USER = 'verify_test_user';
const OLD_PASSWORD = 'OldPassword123!';
const NEW_PASSWORD = 'NewPassword123!';

async function runTests() {
  console.log('--- Starting Password Recovery Workflow Verification Tests ---');
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/url_shortener';
  console.log(`Connecting to database: ${mongoUri}`);
  await mongoose.connect(mongoUri);
  const existingUser = await mongoose.connection.collection('users').findOne({ email: TEST_EMAIL });
  if (existingUser) {
    await mongoose.connection.collection('workspaces').deleteMany({ owner: existingUser._id });
    await mongoose.connection.collection('users').deleteOne({ _id: existingUser._id });
  }
  await mongoose.connection.collection('passwordresets').deleteMany({});
  console.log('\n1. Verifying Non-existing User...');
  const res1 = await fetch(`${API_BASE}/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'nonexistent_test_user@example.com' })
  });
  const data1 = await res1.json();
  console.log('Response status:', res1.status);
  console.log('Response body:', data1);
  if (!data1.success || !data1.message.includes('If an account with this email exists')) {
    throw new Error('Non-existing user test failed: did not return generic message.');
  }
  const resetCount = await mongoose.connection.collection('passwordresets').countDocuments({});
  if (resetCount !== 0) {
    throw new Error('Non-existing user generated a PasswordReset record! Security violation.');
  }
  console.log('✓ Non-existing user generic response verified.');
  const bcrypt = await import('bcryptjs');
  const salt = await bcrypt.default.genSalt(10);
  const hashedPassword = await bcrypt.default.hash(OLD_PASSWORD, salt);
  const userInsertResult = await mongoose.connection.collection('users').insertOne({
    username: TEST_USER,
    email: TEST_EMAIL,
    password: hashedPassword,
    role: 'user',
    createdAt: new Date(),
    updatedAt: new Date()
  });
  console.log(`\nCreated test user: ${TEST_EMAIL} with password: ${OLD_PASSWORD}`);
  await mongoose.connection.collection('workspaces').insertOne({
    name: `${TEST_USER}'s Workspace`,
    owner: userInsertResult.insertedId,
    members: [{ user: userInsertResult.insertedId, role: 'admin' }],
    createdAt: new Date()
  });
  console.log('Created test user default workspace/dashboard.');
  console.log('\n2. Requesting OTP for existing user...');
  const res2 = await fetch(`${API_BASE}/forgot-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-test-bypass': 'true'
    },
    body: JSON.stringify({ email: TEST_EMAIL })
  });
  const data2 = await res2.json();
  console.log('Response body:', data2);
  const plainOtp = data2.otp;
  if (!plainOtp) {
    throw new Error('Did not receive plain OTP code in non-production response.');
  }
  console.log(`✓ Received OTP: ${plainOtp}`);

  const activeReset = await mongoose.connection.collection('passwordresets').findOne({});
  if (!activeReset) {
    throw new Error('No PasswordReset document saved in database.');
  }
  console.log('Hashed OTP in database:', activeReset.hashedOTP);
  console.log('\n3. Verifying Wrong OTP Rejected...');
  const res3 = await fetch(`${API_BASE}/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: TEST_EMAIL, otp: '999999' })
  });
  const data3 = await res3.json();
  console.log('Response status:', res3.status);
  console.log('Response body:', data3);
  if (data3.success) {
    throw new Error('Wrong OTP was accepted!');
  }
  console.log('✓ Wrong OTP rejected correctly.');
  console.log('\n4. Verifying Expired OTP Rejected...');
  await mongoose.connection.collection('passwordresets').updateOne(
    { _id: activeReset._id },
    { $set: { expiresAt: new Date(Date.now() - 10000) } }
  );

  const res4 = await fetch(`${API_BASE}/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: TEST_EMAIL, otp: plainOtp })
  });
  const data4 = await res4.json();
  console.log('Response status:', res4.status);
  console.log('Response body:', data4);
  if (data4.success) {
    throw new Error('Expired OTP was accepted!');
  }
  console.log('✓ Expired OTP rejected correctly.');
  console.log('\n5. Regenerating OTP for successful flow...');
  const resOtpRegen = await fetch(`${API_BASE}/forgot-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-test-bypass': 'true'
    },
    body: JSON.stringify({ email: TEST_EMAIL })
  });
  const dataRegen = await resOtpRegen.json();
  const validOtp = dataRegen.otp;
  console.log(`New OTP: ${validOtp}`);
  console.log('\n6. Verifying Correct OTP Accepted...');
  const res5 = await fetch(`${API_BASE}/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: TEST_EMAIL, otp: validOtp })
  });
  const data5 = await res5.json();
  console.log('Response status:', res5.status);
  console.log('Response body:', data5);
  if (!data5.success || !data5.resetToken) {
    throw new Error('Correct OTP verification failed.');
  }
  const resetToken = data5.resetToken;
  console.log('✓ Correct OTP accepted. Reset token received.');
  const remainingResets = await mongoose.connection.collection('passwordresets').countDocuments({});
  if (remainingResets !== 0) {
    throw new Error('PasswordReset document not deleted after successful verification!');
  }
  console.log('✓ Replay protection verified (OTP document deleted).');
  console.log('\n7. Performing password reset...');
  const res6 = await fetch(`${API_BASE}/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      resetToken,
      newPassword: NEW_PASSWORD,
      confirmPassword: NEW_PASSWORD
    })
  });
  const data6 = await res6.json();
  console.log('Response status:', res6.status);
  console.log('Response body:', data6);
  if (!data6.success) {
    throw new Error('Password reset failed.');
  }
  console.log('✓ Password reset succeeded.');
  console.log('\n8. Verifying login behaviors...');
  const resLoginOld = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: TEST_EMAIL, password: OLD_PASSWORD })
  });
  const loginOldData = await resLoginOld.json();
  console.log('Login with OLD password success status:', loginOldData.success || false);
  if (resLoginOld.status === 200 || loginOldData.success === true) {
    throw new Error('Old password is still valid! Reset was unsuccessful.');
  }

  const resLoginNew = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: TEST_EMAIL, password: NEW_PASSWORD })
  });
  const loginNewData = await resLoginNew.json();
  console.log('Login with NEW password success status:', loginNewData.success || false);
  if (resLoginNew.status !== 200 && loginNewData.success !== true) {
    throw new Error('Failed to log in with new password.');
  }
  console.log('✓ Password change verification completed: login succeeds with new password, fails with old password.');
  const testUserEnd = await mongoose.connection.collection('users').findOne({ email: TEST_EMAIL });
  if (testUserEnd) {
    await mongoose.connection.collection('workspaces').deleteMany({ owner: testUserEnd._id });
    await mongoose.connection.collection('users').deleteOne({ _id: testUserEnd._id });
  }
  await mongoose.disconnect();
  console.log('\n--- All verification tests passed successfully! ---');
}

runTests().catch(async (err) => {
  console.error('Test execution failed:', err);
  await mongoose.disconnect();
  process.exit(1);
});
