"use strict";

const express = require("express");
const helmet = require("helmet");
const path = require("path");

const app = express();

const PORT = Number(process.env.PORT) || 8080;
const MAX_BODY_SIZE = "32kb";

app.disable("x-powered-by");

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        frameAncestors: ["'none'"]
      }
    }
  })
);

app.use(express.json({ limit: MAX_BODY_SIZE }));

app.use(express.static(path.join(__dirname, "public")));

function cleanString(value, maxLength) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, maxLength);
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok"
  });
});

app.post("/api/contact", (req, res) => {
  const name = cleanString(req.body?.name, 100);
  const email = cleanString(req.body?.email, 254);
  const subject = cleanString(req.body?.subject, 150);
  const message = cleanString(req.body?.message, 5000);

  if (!name || !email || !subject || !message) {
    return res.status(400).json({
      ok: false,
      error: "missing_fields",
      message: "Please complete all required fields."
    });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({
      ok: false,
      error: "invalid_email",
      message: "Please enter a valid email address."
    });
  }

  const requestId = crypto.randomUUID();

  // Do not log the submitted message or other personal information.
  console.log(
    JSON.stringify({
      event: "contact_form_received",
      requestId,
      timestamp: new Date().toISOString()
    })
  );

  // Phase 1: Validate only.
  // Phase 2: Add Turnstile verification before processing.
  // Phase 3: Connect an email provider or durable storage.

  return res.status(200).json({
    ok: true,
    requestId,
    message: "Your form was validated successfully."
  });
});

app.use((err, req, res, next) => {
  if (err.type === "entity.too.large") {
    return res.status(413).json({
      ok: false,
      error: "request_too_large",
      message: "The submitted request is too large."
    });
  }

  if (err instanceof SyntaxError && "body" in err) {
    return res.status(400).json({
      ok: false,
      error: "invalid_json",
      message: "The request body must contain valid JSON."
    });
  }

  console.error(
    JSON.stringify({
      event: "request_error",
      timestamp: new Date().toISOString()
    })
  );

  return res.status(500).json({
    ok: false,
    error: "internal_error",
    message: "An unexpected error occurred."
  });
});

const crypto = require("crypto");

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Contact form server listening on port ${PORT}`);
});
