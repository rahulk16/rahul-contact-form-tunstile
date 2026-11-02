"use strict";

const form = document.getElementById("contact-form");
const submitButton = document.getElementById("submit-button");
const buttonText = document.getElementById("button-text");
const formStatus = document.getElementById("form-status");

function showStatus(message, type) {
  formStatus.textContent = message;
  formStatus.className = `form-status ${type}`;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!form.reportValidity()) {
    return;
  }

  submitButton.disabled = true;
  buttonText.textContent = "Sending...";
  showStatus("", "");

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
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok || result.ok !== true) {
      throw new Error(
        result.message || "Unable to submit the form."
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
    submitButton.disabled = false;
    buttonText.textContent = "Send message";
  }
});
