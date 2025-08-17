const express = require('express');
const fetch = require('node-fetch');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());

// Enable CORS for all origins (adjust in production)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*'); 
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// Send OTP
app.post('/api/send-otp', async (req, res) => {
  const { mobile } = req.body;
  try {
    const response = await fetch('https://jazztv.pk/alpha/api_gateway/index.php/v3/users-dbss/sign-up-wc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json;charset=UTF-8' },
      body: JSON.stringify({
        from_screen: "signUp",
        device: "web",
        telco: "jazz",
        device_id: "web",
        is_header_enrichment: "no",
        other_telco: "jazz",
        mobile: mobile,
        phone_details: "web"
      }),
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to send OTP', details: err.message });
  }
});

// Verify OTP
app.post('/api/verify-otp', async (req, res) => {
  const { otpData, code } = req.body;
  try {
    const response = await fetch('https://jazztv.pk/alpha/api_gateway/index.php/v3/users-dbss/authentication-wc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json;charset=UTF-8' },
      body: JSON.stringify({
        type: "prepaid",
        otpId: otpData.otpId,
        phone_details: "web",
        code: code,
        telco: "jazz",
        service_class: "16",
        other_telco: "jazz",
        mobile: otpData.mobile,
        user_id: otpData.user_id,
        device_id: "web",
        is_jazz_user: "yes",
        opId: 0,
        salt: otpData.salt,
        uuid: otpData.uuid
      }),
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to verify OTP', details: err.message });
  }
});

// Subscribe package
app.post('/api/subscribe', async (req, res) => {
  const { token, user_id, mobile } = req.body;
  try {
    const response = await fetch('https://jazztv.pk/alpha/api_gateway/index.php/v3/users-dbss/subscribe-dbss', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json;charset=UTF-8'
      },
      body: JSON.stringify({
        type: "prepaid",
        user_id: user_id,
        mobile: mobile,
        package_id: 3,
        user_agent: "Dummy_User_Agent",
        dbss_sub_id: null
      }),
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to subscribe', details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
