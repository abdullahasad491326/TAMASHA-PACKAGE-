// server.js
const express = require('express');
const fetch = require('node-fetch'); // npm install node-fetch@2
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const app = express();

app.use(express.json());

// Serve frontend
app.use(express.static(path.join(__dirname, '../Frontend')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../Frontend/index.html'));
});

// Helper: generate random hex salt
function generateSalt() {
  return crypto.randomBytes(8).toString('hex');
}

// Send OTP
app.post('/send-otp', async (req, res) => {
  const { mobile } = req.body;
  try {
    const response = await fetch('https://jazztv.pk/alpha/api_gateway/index.php/v3/users-dbss/sign-up-wc', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'Origin': 'http://portal.tamashaweb.com'
      },
      body: JSON.stringify({
        from_screen: "signUp",
        device: "web",
        telco: "jazz",
        device_id: "web",
        is_header_enrichment: "no",
        other_telco: "jazz",
        mobile,
        phone_details: "web"
      })
    });

    const data = await response.json();

    if(data.code == 200 && data.eData) {
      res.json({ success: true, user_id: data.user_id });
    } else {
      res.json({ success: false, message: data.message || "Failed to send OTP" });
    }
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

// Verify OTP
app.post('/verify-otp', async (req, res) => {
  const { mobile, otp, user_id } = req.body;
  const salt = generateSalt();
  const uuid = uuidv4();

  try {
    const response = await fetch('https://jazztv.pk/alpha/api_gateway/index.php/v3/users-dbss/authentication-wc', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'Origin': 'http://portal.tamashaweb.com'
      },
      body: JSON.stringify({
        type: "prepaid",
        otpId: "",
        phone_details: "web",
        code: otp,
        telco: "jazz",
        service_class: "16",
        other_telco: "jazz",
        mobile,
        user_id,
        device_id: "web",
        is_jazz_user: "yes",
        opId: 0,
        salt,
        uuid
      })
    });

    const data = await response.json();
    if(data.code == 200) {
      res.json({ success: true });
    } else {
      res.json({ success: false, message: data.message || "OTP verification failed" });
    }
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
