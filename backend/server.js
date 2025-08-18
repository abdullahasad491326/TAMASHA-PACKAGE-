import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public")); // serve index.html from 'public' folder

// Convert local 03xxxxxxxxx to 923xxxxxxxxx format
function formatMobile(number) {
  if(number.startsWith("03") && number.length === 11){
    return "92" + number.slice(1);
  }
  return number; // assume already in full format
}

// Endpoint to send OTP
app.post("/send-otp", async (req, res) => {
  let { mobile_number, count } = req.body;
  mobile_number = formatMobile(mobile_number);

  if (!mobile_number.match(/^92\d{10}$/)) {
    return res.json({ status: false, message: "Invalid mobile number" });
  }

  const otpCount = count && count > 0 ? count : 1;
  const results = [];

  for (let i = 1; i <= otpCount; i++) {
    try {
      const response = await fetch("https://e-epd.punjab.gov.pk/api/sns_generate_mobile_otp", {
        method: "POST",
        headers: {
          "app": "sans",
          "version": "34",
          "Content-Type": "application/json",
          "User-Agent": "okhttp/4.5.0"
        },
        body: JSON.stringify({ mobile_number })
      });

      const data = await response.json();
      results.push({ attempt: i, response: data });

      // 1-second delay between requests
      if (i < otpCount) await new Promise(r => setTimeout(r, 1000));

    } catch (err) {
      results.push({ attempt: i, error: err.message });
    }
  }

  res.json({ status: true, results });
});

app.listen(PORT, () => {
  console.log(`OTP Sender server running at http://localhost:${PORT}`);
});
