const express = require("express");
const fetch = require("node-fetch");
const bodyParser = require("body-parser");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

// ✅ Allow CORS
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*"); 
  res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type,Authorization");
  next();
});

// ✅ Utility: Decode/parse API responses
function parsePossiblyEncodedResponse(text) {
  if (typeof text !== "string") return text;
  try {
    return JSON.parse(text);
  } catch (e) {}
  const t = text.trim();
  const base64Regex = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
  if (base64Regex.test(t)) {
    try {
      const decoded = Buffer.from(t, "base64").toString("utf8");
      try {
        return JSON.parse(decoded);
      } catch {
        return decoded;
      }
    } catch {}
  }
  return text;
}

// ✅ Common headers
function buildCommonHeaders() {
  return {
    "Content-Type": "application/json;charset=UTF-8",
    "User-Agent": "Mozilla/5.0 (Linux; Android 12; Web Client)",
    Accept: "application/json, text/plain, */*",
    Origin: "http://portal.tamashaweb.com",
  };
}

// ---------------- API ROUTES ----------------

// 1) 📲 Send OTP
app.post("/api/sign-up-wc", async (req, res) => {
  const mobile = req.body.mobile || req.body.phone;
  if (!mobile) return res.status(400).json({ success: false, message: "mobile is required" });

  try {
    const url = "https://jazztv.pk/alpha/api_gateway/index.php/v3/users-dbss/sign-up-wc";
    const payload = {
      from_screen: "signUp",
      device: "web",
      telco: "jazz",
      device_id: "web",
      is_header_enrichment: "no",
      other_telco: "jazz",
      mobile: mobile,
      phone_details: "web"
    };

    const remoteRes = await fetch(url, {
      method: "POST",
      headers: buildCommonHeaders(),
      body: JSON.stringify(payload),
    });

    const text = await remoteRes.text();
    const parsed = parsePossiblyEncodedResponse(text);

    return res.status(remoteRes.status).json({
      ok: remoteRes.ok,
      status: remoteRes.status,
      data: parsed
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to send OTP", error: err.message });
  }
});

// 2) ✅ Verify OTP
app.post("/api/authentication-wc", async (req, res) => {
  const {
    otpId = "",
    salt = "",
    uuid = "",
    user_id = "",
    mobile,
    phone,
    code,
    otp
  } = req.body;

  const mobileFinal = mobile || phone;
  const codeValue = code || otp;

  if (!mobileFinal || !codeValue) {
    return res.status(400).json({ success: false, message: "mobile and code (otp) are required" });
  }

  try {
    const url = "https://jazztv.pk/alpha/api_gateway/index.php/v3/users-dbss/authentication-wc";
    const payload = {
      type: "prepaid",
      otpId,
      phone_details: "web",
      code: codeValue,
      telco: "jazz",
      service_class: "19", // ⚠️ updated as per your example
      other_telco: "jazz",
      mobile: mobileFinal,
      user_id,
      device_id: "web",
      is_jazz_user: "yes",
      opId: 0,
      salt,
      uuid
    };

    const remoteRes = await fetch(url, {
      method: "POST",
      headers: buildCommonHeaders(),
      body: JSON.stringify(payload),
    });

    const text = await remoteRes.text();
    const parsed = parsePossiblyEncodedResponse(text);

    const token = parsed?.data?.token || parsed?.token || null;
    const userIdResp = parsed?.data?.user_id || parsed?.user_id || null;

    return res.status(remoteRes.status).json({
      ok: remoteRes.ok,
      status: remoteRes.status,
      token,
      user_id: userIdResp,
      raw: parsed
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to verify OTP", error: err.message });
  }
});

// 3) 🎟️ Subscribe
app.post("/api/subscribe-dbss", async (req, res) => {
  const { token, user_id, mobile, phone } = req.body;
  const mobileFinal = mobile || phone;
  if (!token || !user_id || !mobileFinal) {
    return res.status(400).json({ success: false, message: "token, user_id and mobile are required" });
  }

  try {
    const url = "https://jazztv.pk/alpha/api_gateway/index.php/v3/users-dbss/subscribe-dbss";
    const payload = {
      type: "prepaid",
      user_id,
      mobile: mobileFinal,
      package_id: 3,
      user_agent: "Web_Client",
      dbss_sub_id: null
    };

    const remoteRes = await fetch(url, {
      method: "POST",
      headers: {
        ...buildCommonHeaders(),
        Authorization: `Bearer ${token}`,
        token
      },
      body: JSON.stringify(payload)
    });

    const text = await remoteRes.text();
    const parsed = parsePossiblyEncodedResponse(text);

    return res.status(remoteRes.status).json({
      ok: remoteRes.ok,
      status: remoteRes.status,
      data: parsed
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to subscribe", error: err.message });
  }
});

// ---------------- FRONTEND ----------------
app.use(express.static(path.join(__dirname, "../frontend")));
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

app.listen(PORT, () => {
  console.log(`🚀 Proxy server running on http://localhost:${PORT}`);
});
