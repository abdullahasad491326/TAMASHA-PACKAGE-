const express = require("express");
const fetch = require("node-fetch");
const bodyParser = require("body-parser");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

// Allow CORS (adjust origin in production)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*"); 
  res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type,Authorization");
  next();
});

// Utility: try to parse JSON, else detect base64 -> decode -> parse, else return raw text
function parsePossiblyEncodedResponse(text) {
  if (typeof text !== "string") return text;
  // try JSON
  try {
    return JSON.parse(text);
  } catch (e) {
    // not JSON
  }
  // trim
  const t = text.trim();

  // detect likely base64 (simple heuristic)
  const base64Regex = /^(?:[A-Za-z0-9+\/]{4})*(?:[A-Za-z0-9+\/]{2}==|[A-Za-z0-9+\/]{3}=)?$/;
  if (base64Regex.test(t)) {
    try {
      const decoded = Buffer.from(t, "base64").toString("utf8");
      try {
        return JSON.parse(decoded);
      } catch (e2) {
        // return decoded text if not json
        return decoded;
      }
    } catch (err) {
      // fallthrough
    }
  }

  // otherwise raw text
  return text;
}

// Common headers used in example requests
function buildCommonHeaders() {
  return {
    "Content-Type": "application/json;charset=UTF-8",
    "User-Agent": "Mozilla/5.0 (Linux; Android 12; Web Client) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.7258.94 Mobile Safari/537.36",
    Accept: "application/json, text/plain, */*",
    Origin: "http://portal.tamashaweb.com",
    "X-Requested-With": "mark.via.gp",
    // optional UA hints — include if needed by the API
    'sec-ch-ua-platform': '"Android"',
    'sec-ch-ua-mobile': '?1'
  };
}

// ---------------- ROUTES ----------------

// 1) Send OTP -> proxies to sign-up-wc
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

// 2) Verify OTP -> proxies to authentication-wc
app.post("/api/authentication-wc", async (req, res) => {
  // Accept either full otpData object (otpId, salt, uuid, user_id, mobile) OR mobile + code
  const body = req.body || {};
  const {
    otpId,
    salt,
    uuid,
    user_id,
    mobile: mobileFromBody,
    phone, // allow phone alias
    code, // code OR otp
    otp
  } = body;

  const mobile = mobileFromBody || phone || (body.otpData && (body.otpData.mobile || body.otpData.phone));

  const codeValue = code || otp || (body.otpData && body.otpData.code);

  if (!mobile || !codeValue) {
    return res.status(400).json({ success: false, message: "mobile and code (otp) are required" });
  }

  try {
    const url = "https://jazztv.pk/alpha/api_gateway/index.php/v3/users-dbss/authentication-wc";

    // Build payload. Include optional fields if provided.
    const payload = {
      type: "prepaid",
      otpId: otpId || (body.otpData && body.otpData.otpId) || "",
      phone_details: "web",
      code: codeValue,
      telco: "jazz",
      service_class: "16",
      other_telco: "jazz",
      mobile: mobile,
      user_id: user_id || (body.otpData && body.otpData.user_id) || "",
      device_id: "web",
      is_jazz_user: "yes",
      opId: 0,
      salt: salt || (body.otpData && body.otpData.salt) || "",
      uuid: uuid || (body.otpData && body.otpData.uuid) || ""
    };

    const remoteRes = await fetch(url, {
      method: "POST",
      headers: buildCommonHeaders(),
      body: JSON.stringify(payload),
    });

    const text = await remoteRes.text();
    const parsed = parsePossiblyEncodedResponse(text);

    // Try to pick a token (many Jazz responses place tokens under .data)
    const token =
      (parsed && parsed.data && parsed.data.token) ||
      (parsed && parsed.token) ||
      null;

    const user_id_in_resp =
      (parsed && parsed.data && parsed.data.user_id) ||
      (parsed && parsed.user_id) ||
      null;

    return res.status(remoteRes.status).json({
      ok: remoteRes.ok,
      status: remoteRes.status,
      token: token,
      user_id: user_id_in_resp,
      raw: parsed
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to verify OTP", error: err.message });
  }
});

// 3) Subscribe -> proxies to subscribe-dbss
app.post("/api/subscribe-dbss", async (req, res) => {
  // expects { token, user_id, mobile } in body
  const { token, user_id, mobile, phone } = req.body;
  const mobileFinal = mobile || phone;
  if (!token || !user_id || !mobileFinal) {
    return res.status(400).json({ success: false, message: "token, user_id and mobile are required" });
  }

  try {
    const url = "https://jazztv.pk/alpha/api_gateway/index.php/v3/users-dbss/subscribe-dbss";
    const payload = {
      type: "prepaid",
      user_id: user_id,
      mobile: mobileFinal,
      package_id: 3,
      user_agent: "Dummy_User_Agent",
      dbss_sub_id: null
    };

    const remoteRes = await fetch(url, {
      method: "POST",
      headers: Object.assign({}, buildCommonHeaders(), {
        Authorization: `Bearer ${token}`,
        token: token // sample showed duplicate token header
      }),
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

// ---------------- FRONTEND STATIC ----------------
app.use(express.static(path.join(__dirname, "../frontend")));
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

app.listen(PORT, () => {
  console.log(`🚀 Proxy server running on http://localhost:${PORT}`);
});
