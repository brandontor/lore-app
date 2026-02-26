import { Resend } from 'resend';

interface SendInvitationEmailOptions {
  to: string;
  campaignName: string;
  inviterName: string;
  inviteUrl: string;
  permission: 'read' | 'write';
}

export async function sendInvitationEmail({
  to,
  campaignName,
  inviterName,
  inviteUrl,
  permission,
}: SendInvitationEmailOptions) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const permissionLabel = permission === 'write' ? 'view and edit' : 'view';

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to,
    subject: `${inviterName} invited you to "${campaignName}" on Lore`,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="font-family: sans-serif; background: #09090b; color: #fafafa; padding: 40px 20px; margin: 0;">
        <div style="max-width: 480px; margin: 0 auto; background: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 40px;">
          <h1 style="font-size: 24px; font-weight: 700; margin: 0 0 8px;">Campaign Invitation</h1>
          <p style="color: #a1a1aa; margin: 0 0 24px;">
            <strong style="color: #fafafa;">${inviterName}</strong> has invited you to join
            <strong style="color: #fafafa;">${campaignName}</strong> on Lore with
            <strong style="color: #a78bfa;">${permissionLabel}</strong> access.
          </p>
          <a href="${inviteUrl}"
             style="display: inline-block; padding: 12px 28px; background: #7c3aed; color: #fff;
                    text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
            Accept Invitation
          </a>
          <p style="color: #52525b; font-size: 12px; margin: 24px 0 0;">
            This link expires in 7 days. If you did not expect this invitation, you can safely ignore it.
          </p>
          <p style="color: #3f3f46; font-size: 11px; margin: 8px 0 0; word-break: break-all;">
            ${inviteUrl}
          </p>
        </div>
      </body>
      </html>
    `,
  });
}
