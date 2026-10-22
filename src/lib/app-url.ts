/** Public site origin used in emails and other links that leave the browser. */
export function appBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  return (configured || "https://eacrm.net").replace(/\/$/, "");
}

export function inboxUrl(conversationId: string) {
  return `${appBaseUrl()}/inbox?c=${encodeURIComponent(conversationId)}`;
}
