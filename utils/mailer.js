import dotenv from "dotenv";
dotenv.config();
import { Resend } from "resend";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Path to logo — embedded as inline attachment so it shows in all email clients
const LOGO_PATH = path.join(__dirname, "../../sharda-academy-student/public/logo.png");

const resend = new Resend(process.env.RESEND_API_KEY || "re_dummy_key_to_prevent_crash_on_startup");

/**
 * Send OTP email to a student
 * @param {string} toEmail
 * @param {string} otp
 * @param {"registration"|"recovery"} type
 */
export const sendOTPEmail = async (toEmail, otp, type = "registration") => {
  const isRegistration = type === "registration";

  const subject = isRegistration
    ? "🎓 Sharda Academy – Your Registration Verification Code"
    : "Sharda Academy – Password Recovery Code";

  const actionText = isRegistration
    ? "You are registering on the <strong>Sharda Academy Student Portal</strong>. Enter the code below to verify your email and activate your account:"
    : "We received a request to <strong>reset your password</strong>. Enter the code below to proceed with the password reset:";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#f0f4f8;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;border-radius:20px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,0.12);">

          <!-- HEADER -->
          <tr>
            <td style="background:linear-gradient(135deg,#1a2e5a 0%,#0d1e3d 100%);padding:36px 40px;text-align:center;">
              <img src="cid:sharda-logo" alt="Sharda Academy Logo" width="90" height="90" style="margin-bottom:16px;display:block;margin-left:auto;margin-right:auto;object-fit:contain;" />
              <h1 style="color:#f5c842;margin:0;font-size:24px;font-weight:900;letter-spacing:3px;text-transform:uppercase;">SHARDA ACADEMY</h1>
              <p style="color:#a0b4d0;margin:6px 0 0;font-size:11px;letter-spacing:2px;text-transform:uppercase;">Mankhurd – 43 &nbsp;|&nbsp; Student Academic Portal</p>
            </td>
          </tr>

          <!-- GOLD DIVIDER -->
          <tr>
            <td style="background:#f5c842;height:4px;"></td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="background:#ffffff;padding:40px 40px 32px;">
              <p style="color:#1a2e5a;font-size:16px;font-weight:700;margin:0 0 8px;">Hello! 👋</p>
              <p style="color:#4a5568;font-size:14px;line-height:1.8;margin:0 0 28px;">${actionText}</p>

              <!-- OTP BOX -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="background:linear-gradient(135deg,#f5f0e0,#fef9ec);border:2px solid #f5c842;border-radius:16px;padding:32px 20px;">
                    <p style="color:#1a2e5a;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin:0 0 16px;">Your Verification Code</p>
                    <table cellpadding="0" cellspacing="6">
                      <tr>
                        <td style="background:#1a2e5a;border-radius:10px;padding:16px 24px;text-align:center;vertical-align:middle;letter-spacing:10px;">
                          <span style="color:#f5c842;font-size:36px;font-weight:900;font-family:'Courier New',monospace;line-height:1;margin-right:-10px;">${otp}</span>
                        </td>
                      </tr>
                    </table>
                    <p style="color:#8a7a40;font-size:11px;margin:16px 0 0;font-weight:600;">⏳ &nbsp;Valid for <strong>5 minutes</strong> only</p>
                  </td>
                </tr>
              </table>

              <!-- WARNING -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
                <tr>
                  <td style="background:#fff8e1;border-left:4px solid #f5c842;border-radius:0 8px 8px 0;padding:14px 18px;">
                    <p style="margin:0;color:#7a6000;font-size:12px;line-height:1.6;">
                      🔒 &nbsp;<strong>Never share this code</strong> with anyone, including Sharda Academy staff.<br/>
                      If you did not request this, please ignore this email safely.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background:#1a2e5a;padding:24px 40px;text-align:center;">
              <p style="color:#a0b4d0;font-size:11px;margin:0;letter-spacing:0.5px;">
                © ${new Date().getFullYear()} <strong style="color:#f5c842;">Sharda Academy</strong>, Mankhurd – 43 &nbsp;|&nbsp; Do not reply to this email
              </p>
              <p style="color:#6b7f9e;font-size:10px;margin:6px 0 0;">
                This is an automated message from the Sharda Academy Student Portal
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  // Prepare attachments — embed logo as inline CID image
  const attachments = [];
  if (fs.existsSync(LOGO_PATH)) {
    attachments.push({
      filename: "logo.png",
      path: LOGO_PATH,
      cid: "sharda-logo", // referenced in HTML as cid:sharda-logo
    });
  }

  const fromEmail = process.env.RESEND_FROM || process.env.SMTP_FROM || process.env.SMTP_USER || process.env.GMAIL_USER || "onboarding@resend.dev";
  await resend.emails.send({
    from: `"Sharda Academy" <${fromEmail}>`,
    to: [toEmail],
    subject,
    html,
    attachments: attachments.map(a => ({ filename: a.filename, content: fs.readFileSync(a.path) })),
  });

  console.log(`✅ [MAILER] OTP email sent to ${toEmail} (type: ${type})`);
};

/**
 * Send bulk Notice bulletin email
 */
export const sendNoticeBulkEmail = async (toEmails, noticeTitle, noticeContent) => {
  if (!toEmails || toEmails.length === 0) return;
  
  const subject = `📢 Sharda Academy – Notice: ${noticeTitle}`;
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#f0f4f8;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;border-radius:20px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,0.12);">
          <tr>
            <td style="background:linear-gradient(135deg,#1a2e5a 0%,#0d1e3d 100%);padding:36px 40px;text-align:center;">
              <img src="cid:sharda-logo" alt="Sharda Academy Logo" width="90" height="90" style="margin-bottom:16px;display:block;margin-left:auto;margin-right:auto;object-fit:contain;" />
              <h1 style="color:#f5c842;margin:0;font-size:24px;font-weight:900;letter-spacing:3px;text-transform:uppercase;">SHARDA ACADEMY</h1>
              <p style="color:#a0b4d0;margin:6px 0 0;font-size:11px;letter-spacing:2px;text-transform:uppercase;">Academic Notice Bulletin</p>
            </td>
          </tr>
          <tr>
            <td style="background:#f5c842;height:4px;"></td>
          </tr>
          <tr>
            <td style="background:#ffffff;padding:40px 40px 32px;text-align:left;">
              <p style="color:#1a2e5a;font-size:18px;font-weight:700;margin:0 0 16px;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #f0f4f8;padding-bottom:8px;">${noticeTitle}</p>
              <div style="color:#4a5568;font-size:14px;line-height:1.8;margin:0 0 28px;white-space:pre-line;">${noticeContent}</div>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
                <tr>
                  <td style="background:#f7fafc;border-left:4px solid #1a2e5a;border-radius:0 8px 8px 0;padding:14px 18px;">
                    <p style="margin:0;color:#718096;font-size:12px;line-height:1.6;">
                      ℹ️ This notice was broadcasted from the Master Administration console. Please check your Student Dashboard for more details.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background:#1a2e5a;padding:24px 40px;text-align:center;">
              <p style="color:#a0b4d0;font-size:11px;margin:0;letter-spacing:0.5px;">
                © ${new Date().getFullYear()} <strong style="color:#f5c842;">Sharda Academy</strong>, Mankhurd – 43 &nbsp;|&nbsp; Do not reply
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const attachments = [];
  if (fs.existsSync(LOGO_PATH)) {
    attachments.push({
      filename: "logo.png",
      path: LOGO_PATH,
      cid: "sharda-logo",
    });
  }

  const fromEmail = process.env.RESEND_FROM || process.env.SMTP_FROM || process.env.SMTP_USER || process.env.GMAIL_USER || "onboarding@resend.dev";
  
  try {
    await resend.emails.send({
      from: `"Sharda Academy" <${fromEmail}>`,
      to: [fromEmail],
      bcc: toEmails,
      subject,
      html,
      attachments: attachments.map(a => ({ filename: a.filename, content: fs.readFileSync(a.path) })),
    });
    console.log(`✅ [MAILER] Notice bulk email sent to ${toEmails.length} recipients`);
  } catch (error) {
    console.error("❌ Notice bulk email delivery failed:", error.message);
  }
};

/**
 * Send bulk Homework assignment upload notice email
 */
export const sendHomeworkBulkEmail = async (toEmails, homeworkTitle, subjectName, dueDate) => {
  if (!toEmails || toEmails.length === 0) return;

  const subject = `📚 Sharda Academy – New Assignment: ${subjectName}`;
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#f0f4f8;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;border-radius:20px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,0.12);">
          <tr>
            <td style="background:linear-gradient(135deg,#1a2e5a 0%,#0d1e3d 100%);padding:36px 40px;text-align:center;">
              <img src="cid:sharda-logo" alt="Sharda Academy Logo" width="90" height="90" style="margin-bottom:16px;display:block;margin-left:auto;margin-right:auto;object-fit:contain;" />
              <h1 style="color:#f5c842;margin:0;font-size:24px;font-weight:900;letter-spacing:3px;text-transform:uppercase;">SHARDA ACADEMY</h1>
              <p style="color:#a0b4d0;margin:6px 0 0;font-size:11px;letter-spacing:2px;text-transform:uppercase;">New Homework Assignment</p>
            </td>
          </tr>
          <tr>
            <td style="background:#f5c842;height:4px;"></td>
          </tr>
          <tr>
            <td style="background:#ffffff;padding:40px 40px 32px;text-align:left;">
              <p style="color:#1a2e5a;font-size:18px;font-weight:700;margin:0 0 16px;border-bottom:1px solid #f0f4f8;padding-bottom:8px;">New Assignment Posted!</p>
              <p style="color:#4a5568;font-size:14px;line-height:1.8;margin:0 0 20px;">
                A new homework assignment has been uploaded to your portal:
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;background:#f7fafc;border-radius:12px;padding:16px;border:1px solid #edf2f7;">
                <tr>
                  <td style="padding:6px 0;font-size:13px;color:#718096;width:120px;"><strong>Subject:</strong></td>
                  <td style="padding:6px 0;font-size:13px;color:#1a2e5a;font-weight:700;">${subjectName}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;font-size:13px;color:#718096;"><strong>Topic/Title:</strong></td>
                  <td style="padding:6px 0;font-size:13px;color:#2d3748;font-weight:600;">${homeworkTitle}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;font-size:13px;color:#718096;"><strong>Due Date:</strong></td>
                  <td style="padding:6px 0;font-size:13px;color:#e53e3e;font-weight:700;">${dueDate}</td>
                </tr>
              </table>
              <p style="color:#4a5568;font-size:14px;line-height:1.8;margin:0 0 28px;">
                Please login to the Student Portal to read complete instructions, download attachments, and submit your homework before the deadline.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#1a2e5a;padding:24px 40px;text-align:center;">
              <p style="color:#a0b4d0;font-size:11px;margin:0;letter-spacing:0.5px;">
                © ${new Date().getFullYear()} <strong style="color:#f5c842;">Sharda Academy</strong>, Mankhurd – 43
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const attachments = [];
  if (fs.existsSync(LOGO_PATH)) {
    attachments.push({
      filename: "logo.png",
      path: LOGO_PATH,
      cid: "sharda-logo",
    });
  }

  const fromEmail = process.env.RESEND_FROM || process.env.SMTP_FROM || process.env.SMTP_USER || process.env.GMAIL_USER || "onboarding@resend.dev";
  try {
    await resend.emails.send({
      from: `"Sharda Academy" <${fromEmail}>`,
      to: [fromEmail],
      bcc: toEmails,
      subject,
      html,
      attachments: attachments.map(a => ({ filename: a.filename, content: fs.readFileSync(a.path) })),
    });
    console.log(`✅ [MAILER] Homework alert bulk email sent to ${toEmails.length} students`);
  } catch (error) {
    console.error("❌ Homework bulk email delivery failed:", error.message);
  }
};

/**
 * Send individual Fees Invoice alert or reminder email
 */
export const sendFeeReminderEmail = async (toEmail, studentName, invoiceId, amount, dueDate) => {
  if (!toEmail) return;

  const subject = `💳 Sharda Academy – Fees Invoice Reminder: ₹${amount.toLocaleString()}`;
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#f0f4f8;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;border-radius:20px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,0.12);">
          <tr>
            <td style="background:linear-gradient(135deg,#1a2e5a 0%,#0d1e3d 100%);padding:36px 40px;text-align:center;">
              <img src="cid:sharda-logo" alt="Sharda Academy Logo" width="90" height="90" style="margin-bottom:16px;display:block;margin-left:auto;margin-right:auto;object-fit:contain;" />
              <h1 style="color:#f5c842;margin:0;font-size:24px;font-weight:900;letter-spacing:3px;text-transform:uppercase;">SHARDA ACADEMY</h1>
              <p style="color:#a0b4d0;margin:6px 0 0;font-size:11px;letter-spacing:2px;text-transform:uppercase;">Tuition Fee Notice</p>
            </td>
          </tr>
          <tr>
            <td style="background:#f5c842;height:4px;"></td>
          </tr>
          <tr>
            <td style="background:#ffffff;padding:40px 40px 32px;text-align:left;">
              <p style="color:#1a2e5a;font-size:18px;font-weight:700;margin:0 0 16px;border-bottom:1px solid #f0f4f8;padding-bottom:8px;">Dear Parent / Student,</p>
              <p style="color:#4a5568;font-size:14px;line-height:1.8;margin:0 0 20px;">
                This is a friendly reminder that a tuition invoice has been issued or is currently pending payment:
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;background:#fef9ec;border-radius:12px;padding:16px;border:1px solid #f5c842;">
                <tr>
                  <td style="padding:6px 0;font-size:13px;color:#8a7a40;width:120px;"><strong>Student Name:</strong></td>
                  <td style="padding:6px 0;font-size:13px;color:#1a2e5a;font-weight:700;">${studentName}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;font-size:13px;color:#8a7a40;"><strong>Invoice ID:</strong></td>
                  <td style="padding:6px 0;font-size:13px;color:#2d3748;font-weight:600;font-family:monospace;">${invoiceId}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;font-size:13px;color:#8a7a40;"><strong>Amount Due:</strong></td>
                  <td style="padding:6px 0;font-size:13px;color:#1a2e5a;font-weight:900;">₹${amount.toLocaleString()}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;font-size:13px;color:#8a7a40;"><strong>Due Date:</strong></td>
                  <td style="padding:6px 0;font-size:13px;color:#e53e3e;font-weight:700;">${dueDate}</td>
                </tr>
              </table>
              <p style="color:#4a5568;font-size:14px;line-height:1.8;margin:0 0 28px;">
                You can settle the payment online using UPI/Card sync in the Student Portal, or cash at the administration desk. Prompt payment is highly appreciated.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#1a2e5a;padding:24px 40px;text-align:center;">
              <p style="color:#a0b4d0;font-size:11px;margin:0;letter-spacing:0.5px;">
                © ${new Date().getFullYear()} <strong style="color:#f5c842;">Sharda Academy</strong>, Mankhurd – 43
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const attachments = [];
  if (fs.existsSync(LOGO_PATH)) {
    attachments.push({
      filename: "logo.png",
      path: LOGO_PATH,
      cid: "sharda-logo",
    });
  }

  const fromEmail = process.env.RESEND_FROM || process.env.SMTP_FROM || process.env.SMTP_USER || process.env.GMAIL_USER || "onboarding@resend.dev";
  try {
    await resend.emails.send({
      from: `"Sharda Academy" <${fromEmail}>`,
      to: [toEmail],
      subject,
      html,
      attachments: attachments.map(a => ({ filename: a.filename, content: fs.readFileSync(a.path) })),
    });
    console.log(`✅ [MAILER] Fee reminder email sent to ${toEmail}`);
  } catch (error) {
    console.error("❌ Fee reminder email delivery failed:", error.message);
  }
};

/**
 * Send Exam Score Card alert email to student and parents
 */
export const sendExamAlertEmail = async (toEmail, studentName, examName, resultsSummary, percentage, grade) => {
  if (!toEmail) return;

  const subject = `🎓 Sharda Academy – Exam Results Published: ${examName}`;
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#f0f4f8;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;border-radius:20px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,0.12);">
          <tr>
            <td style="background:linear-gradient(135deg,#1a2e5a 0%,#0d1e3d 100%);padding:36px 40px;text-align:center;">
              <img src="cid:sharda-logo" alt="Sharda Academy Logo" width="90" height="90" style="margin-bottom:16px;display:block;margin-left:auto;margin-right:auto;object-fit:contain;" />
              <h1 style="color:#f5c842;margin:0;font-size:24px;font-weight:900;letter-spacing:3px;text-transform:uppercase;">SHARDA ACADEMY</h1>
              <p style="color:#a0b4d0;margin:6px 0 0;font-size:11px;letter-spacing:2px;text-transform:uppercase;">Exam Score Card Alert</p>
            </td>
          </tr>
          <tr>
            <td style="background:#f5c842;height:4px;"></td>
          </tr>
          <tr>
            <td style="background:#ffffff;padding:40px 40px 32px;text-align:left;">
              <p style="color:#1a2e5a;font-size:18px;font-weight:700;margin:0 0 16px;border-bottom:1px solid #f0f4f8;padding-bottom:8px;">Dear Parent / Student,</p>
              <p style="color:#4a5568;font-size:14px;line-height:1.8;margin:0 0 20px;">
                The results for the recently conducted <strong>${examName}</strong> have been evaluated and uploaded:
              </p>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;background:#f7fafc;border-radius:12px;padding:16px;border:1px solid #edf2f7;">
                <tr>
                  <td style="padding:6px 0;font-size:13px;color:#718096;width:140px;"><strong>Student Name:</strong></td>
                  <td style="padding:6px 0;font-size:13px;color:#1a2e5a;font-weight:700;">${studentName}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;font-size:13px;color:#718096;"><strong>Exam Name:</strong></td>
                  <td style="padding:6px 0;font-size:13px;color:#2d3748;font-weight:600;">${examName}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;font-size:13px;color:#718096;"><strong>Score Summary:</strong></td>
                  <td style="padding:6px 0;font-size:13px;color:#4a5568;font-weight:500;">${resultsSummary}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;font-size:13px;color:#718096;"><strong>Percentage Scored:</strong></td>
                  <td style="padding:6px 0;font-size:13px;color:#1a2e5a;font-weight:900;">${percentage}%</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;font-size:13px;color:#718096;"><strong>Assigned Grade:</strong></td>
                  <td style="padding:6px 0;font-size:13px;color:#38a169;font-weight:900;">${grade}</td>
                </tr>
              </table>
              <p style="color:#4a5568;font-size:14px;line-height:1.8;margin:0 0 28px;">
                Great work! For the detailed subject-wise breakdown, please sign in to the Sharda Academy Student Portal.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#1a2e5a;padding:24px 40px;text-align:center;">
              <p style="color:#a0b4d0;font-size:11px;margin:0;letter-spacing:0.5px;">
                © ${new Date().getFullYear()} <strong style="color:#f5c842;">Sharda Academy</strong>, Mankhurd – 43
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const attachments = [];
  if (fs.existsSync(LOGO_PATH)) {
    attachments.push({
      filename: "logo.png",
      path: LOGO_PATH,
      cid: "sharda-logo",
    });
  }

  const fromEmail = process.env.RESEND_FROM || process.env.SMTP_FROM || process.env.SMTP_USER || process.env.GMAIL_USER || "onboarding@resend.dev";
  try {
    await resend.emails.send({
      from: `"Sharda Academy" <${fromEmail}>`,
      to: [toEmail],
      subject,
      html,
      attachments: attachments.map(a => ({ filename: a.filename, content: fs.readFileSync(a.path) })),
    });
    console.log(`✅ [MAILER] Exam alert email sent to ${toEmail}`);
  } catch (error) {
    console.error("❌ Exam alert email delivery failed:", error.message);
  }
};


