const express = require('express');
const fetch = require('node-fetch');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  next();
});

// ---------------- API ----------------

// Send OTP
app.post('/api/send-otp', async (req, res) => {
  const { phone } = req.body; // frontend sends "phone"
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
        mobile: phone,
        phone_details: "web"
      }),
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to send OTP', details: err.message });
  }
});

// Verify OTP + Subscribe in one step
app.post('/api/verify-and-subscribe', async (req, res) => {
  const { phone, otp } = req.body;
  try {
    // First verify OTP
    const verifyResponse = await fetch('https://jazztv.pk/alpha/api_gateway/index.php/v3/users-dbss/authentication-wc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json;charset=UTF-8' },
      body: JSON.stringify({
        type: "prepaid",
        mobile: phone,
        code: otp,
        telco: "jazz",
        service_class: "16",
        other_telco: "jazz",
        device_id: "web",
        is_jazz_user: "yes",
        phone_details: "web"
      }),
    });
    const verifyData = await verifyResponse.json();

    if (!verifyResponse.ok || !verifyData.token) {
      return res.status(400).json({ error: "OTP verification failed", details: verifyData });
    }

    // Then subscribe
    const subscribeResponse = await fetch('https://jazztv.pk/alpha/api_gateway/index.php/v3/users-dbss/subscribe-dbss', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${verifyData.token}`,
        'Content-Type': 'application/json;charset=UTF-8'
      },
      body: JSON.stringify({
        type: "prepaid",
        user_id: verifyData.user_id,
        mobile: phone,
        package_id: 3,
        user_agent: "Web_Client",
        dbss_sub_id: null
      }),
    });

    const subData = await subscribeResponse.json();
    res.json({ message: "Subscribed successfully", verifyData, subData });
  } catch (err) {
    res.status(500).json({ error: 'Failed to verify and subscribe', details: err.message });
  }
});

// ---------------- FRONTEND ----------------
app.use(express.static(path.join(__dirname, '../frontend')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
