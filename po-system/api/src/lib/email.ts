interface EmailParams {
  to: string;
  subject: string;
  html: string;
  apiKey: string;
}

export async function sendEmail({ to, subject, html, apiKey }: EmailParams): Promise<boolean> {
  if (!apiKey || apiKey === 'placeholder') return true; // skip in dev
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: 'PO System <noreply@yourdomain.com>', to, subject, html }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function poSubmittedEmail(poNumber: string, approverName: string, total: number) {
  return {
    subject: `[Action Required] PO ${poNumber} awaiting your approval`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#1a56db">Purchase Order Approval Request</h2>
        <p>Dear ${approverName},</p>
        <p>A new purchase order <strong>${poNumber}</strong> has been submitted for your approval.</p>
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:8px;background:#f3f4f6">Total Amount</td>
              <td style="padding:8px;background:#f3f4f6;font-weight:bold">฿${total.toFixed(2)}</td></tr>
        </table>
        <p>Please log in to the PO system to review and approve.</p>
        <hr/><p style="font-size:12px;color:#6b7280">PO Management System — Microchip Technology Thailand</p>
      </div>`,
  };
}

export function poApprovedEmail(poNumber: string, buyerName: string, total: number) {
  return {
    subject: `PO ${poNumber} has been approved`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#059669">Purchase Order Approved ✓</h2>
        <p>Dear ${buyerName},</p>
        <p>Your purchase order <strong>${poNumber}</strong> (฿${total.toFixed(2)}) has been <strong>approved</strong>.</p>
        <p>You may now proceed to place the order with the supplier.</p>
        <hr/><p style="font-size:12px;color:#6b7280">PO Management System — Microchip Technology Thailand</p>
      </div>`,
  };
}

export function poRejectedEmail(poNumber: string, buyerName: string, comment: string) {
  return {
    subject: `PO ${poNumber} was rejected`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#dc2626">Purchase Order Rejected</h2>
        <p>Dear ${buyerName},</p>
        <p>Your purchase order <strong>${poNumber}</strong> has been <strong>rejected</strong>.</p>
        <p><strong>Reason:</strong> ${comment || 'No comment provided.'}</p>
        <p>Please revise and resubmit.</p>
        <hr/><p style="font-size:12px;color:#6b7280">PO Management System — Microchip Technology Thailand</p>
      </div>`,
  };
}
