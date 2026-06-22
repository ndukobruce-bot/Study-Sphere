(function() {
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
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Message could not be sent right now.");
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
