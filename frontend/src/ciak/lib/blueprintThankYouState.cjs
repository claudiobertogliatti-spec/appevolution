function blueprintThankYouState({ sessionId, paymentStatus, error = false }) {
  if (!sessionId) return { kind: "missing" };
  if (error) return { kind: "error" };
  if (!paymentStatus) return { kind: "verifying" };
  if (paymentStatus === "paid") return { kind: "paid" };
  return { kind: "unpaid" };
}

module.exports = { blueprintThankYouState };
