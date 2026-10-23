import { config } from "../config.js";
import { HttpError } from "../middleware/errorHandler.js";

const { brevoApiKey, fromEmail, fromName } = config.mail;

export const isEmailConfigured = () => Boolean(brevoApiKey && fromEmail);

interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

// Transactional email via the Brevo REST API (https://developers.brevo.com/reference/sendtransacemail).
export const sendEmail = async ({ to, subject, html, text }: EmailMessage) => {
  if (!isEmailConfigured()) {
    throw new HttpError(503, "Email is not configured on the server");
  }

  let response: Response;
  try {
    response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": brevoApiKey, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        sender: { email: fromEmail, name: fromName },
        to: [{ email: to }],
        subject,
        htmlContent: html,
        textContent: text
      }),
      signal: AbortSignal.timeout(15_000)
    });
  } catch (error) {
    console.error("Brevo request failed:", error);
    throw new HttpError(502, "We couldn't send the email. Please try again.");
  }

  if (!response.ok) {
    // Logged server-side only; provider messages can include account details.
    const result = (await response.json().catch(() => ({}))) as { message?: string };
    console.error(`Brevo send failed (${response.status}):`, result.message);
    throw new HttpError(502, "We couldn't send the email. Please try again.");
  }
};
