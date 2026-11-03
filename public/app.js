"use strict";

const form = document.getElementById("contact-form");
const submitButton = document.getElementById("submit-button");
const buttonText = document.getElementById("button-text");
const formStatus = document.getElementById("form-status");

// Turnstile widget state.
let turnstileWidgetId = null;
let pendingTurnstileSubmission = false;

function showStatus(message, type) {
  formStatus.textContent = message;
  formStatus.className = `form-status ${type}`;
}

/*
 * Step 1: Turnstile is initialized
 * This function runs when the Turnstile API script invokes the configured onTurnstileLoad callback.
 * Initialize Turnstile when its API script loads.
 *
 * execution: "execute" ensures the challenge does not execute automatically.
 * The challenge is explicitly triggered by the form submit handler below.
 */
window.onTurnstileLoad = function () {
  turnstileWidgetId = window.turnstile.render(
    "#turnstile-container",
    {
      sitekey: "0x4AAAAAAFxy6b1JqBG9rWRvJfH0H8p4ZZs",
      action: "contact_form",
      execution: "execute",
      appearance: "execute",

      // Step 5: Turnstile returns a token - Called after Turnstile successfully generates a token.
      callback: function (token) {
        if (!pendingTurnstileSubmission) {
          return;
        }

        // Submit the form using the verified challenge token.
        submitContactForm(token);
      },

      // Step 8: Turnstile errors are handled - Handle verification errors.
      "error-callback": function () {
        pendingTurnstileSubmission = false;
        submitButton.disabled = false;
        buttonText.textContent = "Send message";

        showStatus(
          "Security verification failed. Please try again.",
          "error"
        );
      },

      // Handle expired tokens.
      "expired-callback": function () {
        pendingTurnstileSubmission = false;
        submitButton.disabled = false;
        buttonText.textContent = "Send message";

        showStatus(
          "Security verification expired. Please try again.",
          "error"
        );
      }
    }
  );
};

/*
 * Step 2: The user clicks Submit
 * Start verification only after the user clicks Submit.
 */
form.addEventListener("submit", (event) => {
  event.preventDefault();

  // Validate required fields before starting Turnstile.
  if (!form.reportValidity()) {
    return;
  }

  // Ensure Turnstile has initialized.
  if (!window.turnstile || turnstileWidgetId === null) {
    showStatus(
      "Security verification is not ready. Please try again.",
      "error"
    );
    return;
  }

  // Step 3: Duplicate submissions are prevented 
  if (pendingTurnstileSubmission) {
    return;
  }

  pendingTurnstileSubmission = true;
  submitButton.disabled = true;
  buttonText.textContent = "Verifying...";
  showStatus("", "");

  try {
    // Step 4: Turnstile executes - The invisible challenge executes here, after the Submit click.
    window.turnstile.execute(turnstileWidgetId);
  } catch (error) {
    pendingTurnstileSubmission = false;
    submitButton.disabled = false;
    buttonText.textContent = "Send message";

    showStatus(
      "Unable to start security verification. Please try again.",
      "error"
    );
  }
});

/*
* Step 6: The contact request includes the token
 * Submit the contact request only after Turnstile provides a token.
 */
async function submitContactForm(token) {
  buttonText.textContent = "Sending...";

  const formData = new FormData(form);

  const payload = {
    name: formData.get("name"),
    email: formData.get("email"),
    subject: formData.get("subject"),
    message: formData.get("message")
  };

  try {
    const response = await fetch("/api/contact", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",

        // Send the Turnstile token in an HTTP header.
        "x-cf-turnstile": token
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok || result.ok !== true) {
      throw new Error(
        result.message ||
        result.error ||
        "Unable to submit the form."
      );
    }

    showStatus(
      `Success! Request reference: ${result.requestId}`,
      "success"
    );

    form.reset();
  } catch (error) {
    showStatus(
      error.message || "Something went wrong. Please try again.",
      "error"
    );
  } finally {
    // Reset the widget so the next submission obtains a fresh token.
    if (window.turnstile && turnstileWidgetId !== null) {
      try {
        window.turnstile.reset(turnstileWidgetId);
      } catch (error) {
        // Allow form recovery even if resetting the widget fails.
      }
    }

    pendingTurnstileSubmission = false;
    submitButton.disabled = false;
    buttonText.textContent = "Send message";
  }
}
