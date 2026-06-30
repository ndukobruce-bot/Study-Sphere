(function() {
  const WEB3FORMS_PUBLIC_ACCESS_KEY = "3a0213b3-d098-4644-90f1-8a22ca739221";
  const FEEDBACK_RECIPIENT = "tijalabs@gmail.com";
  const form = document.getElementById("feedback-form");
  if (!form) return;

  const currentUser = JSON.parse(localStorage.getItem("ss_current_user") || "null");
  const emailInput = document.getElementById("feedback-email");
  const nameInput = document.getElementById("feedback-name");
  const statusEl = document.getElementById("feedback-status");
  const submitBtn = document.getElementById("feedback-submit");

  if (currentUser) {
    emailInput.value = currentUser.email || "";
    nameInput.value = currentUser.name || "";
  }

  function setStatus(message, type) {
    statusEl.textContent = message;
    statusEl.className = `form-status ${type || ""}`.trim();
  }

  async function sendViaBackend(payload) {
    const response = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Backend delivery failed.");
    }
    return data;
  }

  async function sendViaWeb3Forms(payload) {
    const response = await fetch("https://api.web3forms.com/submit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify({
        access_key: WEB3FORMS_PUBLIC_ACCESS_KEY,
        name: payload.name || "StudySphere user",
        email: payload.email,
        subject: `StudySphere ${payload.type}`,
        message: [
          payload.message,
          "",
          `Type: ${payload.type}`,
          `Page: ${payload.page}`,
          `User agent: ${payload.userAgent}`,
          `Recipient: ${FEEDBACK_RECIPIENT}`
        ].join("\n"),
        botcheck: ""
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.success === false) {
      throw new Error(data.message || "Web3Forms delivery failed.");
    }
    return data;
  }

  form.addEventListener("submit", async function(event) {
    event.preventDefault();
    setStatus("Sending your message...", "loading");
    submitBtn.disabled = true;

    const payload = {
      email: emailInput.value.trim(),
      name: nameInput.value.trim(),
      type: document.getElementById("feedback-type").value,
      message: document.getElementById("feedback-message").value.trim(),
      page: location.pathname.split("/").pop() || "feedback.html",
      userAgent: navigator.userAgent,
      sentAt: new Date().toISOString()
    };

    try {
      try {
        await sendViaBackend(payload);
      } catch (backendError) {
        await sendViaWeb3Forms(payload);
      }
      form.reset();
      if (currentUser) {
        emailInput.value = currentUser.email || "";
        nameInput.value = currentUser.name || "";
      }
      setStatus("Message sent. Thank you for helping improve StudySphere.", "success");
    } catch (error) {
      setStatus(error.message + " Your message is still here, so you can try again.", "error");
    } finally {
      submitBtn.disabled = false;
    }
  });
})();
