const RESEND_KEY = process.env.RESEND_API_KEY;

export async function sendEmail({ to, subject, html }) {
  if (!RESEND_KEY || RESEND_KEY === 'placeholder') {
    console.log(`[Email skipped] To: ${to} | Subject: ${subject}`);
    return true;
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'PO System <noreply@yourdomain.com>',
        to, subject, html,
      }),
    });
    if (!res.ok) console.error('Email send failed:', await res.text());
    return res.ok;
  } catch (err) {
    console.error('Email error:', err.message);
    return false;
  }
}

export const poSubmittedEmail = (poNumber, total) => ({
  subject: `[Action Required] PO ${poNumber} awaiting approval`,
  html: `<div style="font-family:sans-serif;max-width:600px">
    <h2 style="color:#1a56db">Purchase Order Approval Request</h2>
    <p>PO <strong>${poNumber}</strong> (฿${total.toFixed(2)}) has been submitted for your approval.</p>
    <p>Please log in to the PO system to review.</p>
  </div>`,
});

export const poApprovedEmail = (poNumber, buyerName, total) => ({
  subject: `PO ${poNumber} has been approved`,
  html: `<div style="font-family:sans-serif;max-width:600px">
    <h2 style="color:#059669">Purchase Order Approved ✓</h2>
    <p>Dear ${buyerName}, your PO <strong>${poNumber}</strong> (฿${total.toFixed(2)}) has been approved.</p>
  </div>`,
});

export const poRejectedEmail = (poNumber, buyerName, comment) => ({
  subject: `PO ${poNumber} was rejected`,
  html: `<div style="font-family:sans-serif;max-width:600px">
    <h2 style="color:#dc2626">Purchase Order Rejected</h2>
    <p>Dear ${buyerName}, your PO <strong>${poNumber}</strong> was rejected.</p>
    <p><strong>Reason:</strong> ${comment}</p>
  </div>`,
});
