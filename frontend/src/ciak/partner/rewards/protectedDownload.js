import { authHeaders } from "../api";

export async function downloadProtectedDocument(url, filename) {
  const response = await fetch(url, { headers: authHeaders() });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);
}
