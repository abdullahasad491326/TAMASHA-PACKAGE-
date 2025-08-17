let otpData = {}; // Store OTP info
let bearerToken = ""; 

const sendResponsePre = document.getElementById('sendResponse');
const verifyResponsePre = document.getElementById('verifyResponse');
const subscribeResponsePre = document.getElementById('subscribeResponse');

async function sendOtp() {
  const number = document.getElementById('phoneNumber').value.trim();
  if (!number) {
    alert('Please enter a valid number.');
    return;
  }
  sendResponsePre.textContent = "Sending OTP...";
  try {
    const response = await fetch('https://<YOUR_DEPLOYED_BACKEND_URL>/api/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile: number }),
    });
    const data = await response.json();
    sendResponsePre.textContent = JSON.stringify(data, null, 2);

    // Save OTP data for verification
    otpData = {
      otpId: data.otpId,
      salt: data.salt,
      uuid: data.uuid,
      user_id: data.user_id,
      mobile: number,
    };
  } catch (err) {
    sendResponsePre.textContent = 'Error: ' + err.message;
  }
}

async function verifyOtp() {
  const code = document.getElementById('otp').value.trim();
  if (!code || !otpData.otpId) {
    alert('Send OTP first.');
    return;
  }
  verifyResponsePre.textContent = "Verifying OTP...";
  try {
    const response = await fetch('https://<YOUR_DEPLOYED_BACKEND_URL>/api/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ otpData, code }),
    });
    const data = await response.json();
    verifyResponsePre.textContent = JSON.stringify(data, null, 2);
    if (data.token) {
      bearerToken = data.token;
      alert('OTP verified! You can now subscribe.');
    }
  } catch (err) {
    verifyResponsePre.textContent = 'Error: ' + err.message;
  }
}

async function subscribePackage() {
  if (!bearerToken) {
    alert('Verify OTP first.');
    return;
  }
  subscribeResponsePre.textContent = "Subscribing...";
  try {
    const response = await fetch('https://<YOUR_DEPLOYED_BACKEND_URL>/api/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${bearerToken}`,
      },
      body: JSON.stringify({
        token: bearerToken,
        user_id: otpData.user_id,
        mobile: otpData.mobile,
      }),
    });
    const data = await response.json();
    subscribeResponsePre.textContent = JSON.stringify(data, null, 2);
  } catch (err) {
    subscribeResponsePre.textContent = 'Error: ' + err.message;
  }
}
