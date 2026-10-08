// Replacement body for the `Build Queue Report HTML` node (id: wvq-005)
// in workflow `TC — Weekly Verification Queue Report` (5UMcYzORF4nigho7).
//
// Fix: HTML-escape every lead-derived value before interpolating it into
// the email template, and validate the Zoho lead id before building the
// CRM link. Prevents stored-HTML/email injection via attacker-controlled
// lead fields originating in Facebook Lead Ads / RingCentral / WhatsApp.

const esc = (v) => String(v ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const ZOHO_ID_RE = /^[0-9]{6,32}$/;

const leads = $input.all();
const count = leads.length;
const today = new Date().toLocaleDateString('en-US', {
  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  timeZone: 'America/New_York',
});

let rows = '';
for (const item of leads) {
  const l = item.json;

  if (!ZOHO_ID_RE.test(String(l.id ?? ''))) {
    continue;
  }
  const crmLink = 'https://crm.zoho.com/crm/org764080561/tab/Leads/' + l.id;

  const name = (((l.First_Name || '') + ' ' + (l.Last_Name || '')).trim()) || 'Unknown';
  const dest = Array.isArray(l.Destino_11) ? l.Destino_11.join(', ') : (l.Destino_11 || '—');
  const score = l.TC_Score || '?';
  const grade = l.Lead_Grade || '?';
  const rep = l.Vendedor || 'UNASSIGNED';
  const days = Number.isFinite(l.days_stuck) ? l.days_stuck : 0;
  const urgColor =
    days >= 30 ? '#7f1d1d' :
    days >= 14 ? '#dc2626' :
    days >= 7  ? '#f97316' : '#f59e0b';

  rows +=
    '<tr>' +
      '<td style="padding:8px 12px;border-bottom:1px solid #eee">' +
        '<a href="' + esc(crmLink) + '" style="color:#1B2A4A;font-weight:bold;text-decoration:none">' +
          esc(name) +
        '</a>' +
      '</td>' +
      '<td style="padding:8px 12px;border-bottom:1px solid #eee">' + esc(l.Phone || '⚠️ Missing') + '</td>' +
      '<td style="padding:8px 12px;border-bottom:1px solid #eee">' + esc(dest) + '</td>' +
      '<td style="padding:8px 12px;border-bottom:1px solid #eee">' + esc(l.Lead_Source || '—') + '</td>' +
      '<td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center">' +
        '<span style="background:#1B2A4A;color:#fff;padding:2px 8px;border-radius:10px;font-size:12px">' +
          esc(grade) + ' / ' + esc(score) +
        '</span>' +
      '</td>' +
      '<td style="padding:8px 12px;border-bottom:1px solid #eee">' + esc(rep) + '</td>' +
      '<td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center">' +
        '<span style="background:' + urgColor + ';color:#fff;padding:2px 8px;border-radius:10px;font-weight:bold">' +
          esc(days) + 'd' +
        '</span>' +
      '</td>' +
    '</tr>';
}

const renderedCount = (rows.match(/<tr>/g) || []).length;
const minRev = (renderedCount * 70).toLocaleString();
const maxRev = (renderedCount * 600).toLocaleString();

const html =
  '<div style="font-family:Arial,sans-serif;max-width:820px;margin:0 auto;background:#f9f9f9">' +
    '<div style="background:#1B2A4A;padding:24px 28px">' +
      '<h1 style="color:#fff;margin:0;font-size:22px">📋 Weekly Verification Queue Report</h1>' +
      '<p style="color:#aaa;margin:6px 0 0">' + esc(today) + ' · GoTravelCloud.com</p>' +
    '</div>' +
    '<div style="background:#fff;padding:24px 28px">' +
      '<div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:14px 18px;margin-bottom:20px;border-radius:0 6px 6px 0">' +
        '<strong style="color:#92400e;font-size:16px">⚠️ ' + renderedCount + ' HOT LEAD' + (renderedCount !== 1 ? 'S' : '') + ' STUCK IN VERIFICATION</strong><br>' +
        '<span style="color:#78350f">Qualified leads waiting — every day without contact is lost revenue.</span>' +
      '</div>' +
      '<table style="width:100%;border-collapse:collapse;font-size:13px">' +
        '<thead><tr style="background:#1B2A4A;color:#fff">' +
          '<th style="padding:10px 12px;text-align:left">Lead Name</th>' +
          '<th style="padding:10px 12px;text-align:left">Phone</th>' +
          '<th style="padding:10px 12px;text-align:left">Destination</th>' +
          '<th style="padding:10px 12px;text-align:left">Source</th>' +
          '<th style="padding:10px 12px;text-align:center">Grade/Score</th>' +
          '<th style="padding:10px 12px;text-align:left">Assigned Rep</th>' +
          '<th style="padding:10px 12px;text-align:center">Days Waiting</th>' +
        '</tr></thead>' +
        '<tbody>' + rows + '</tbody>' +
      '</table>' +
      '<div style="margin-top:24px;padding:16px;background:#f0fdf4;border-radius:6px;border:1px solid #86efac">' +
        '<strong style="color:#166534">💰 Revenue at Stake</strong><br>' +
        '<span style="color:#15803d">At $70–$600 deposit per close, ' + renderedCount + ' leads = $' + minRev + '–$' + maxRev + ' in potential immediate deposits. Call them TODAY.</span>' +
      '</div>' +
      '<div style="margin-top:20px;text-align:center">' +
        '<a href="https://crm.zoho.com/crm/org764080561/tab/Leads" style="background:#E8500A;color:#fff;padding:12px 32px;border-radius:4px;text-decoration:none;font-weight:bold;font-size:15px;display:inline-block">OPEN ZOHO CRM → WORK THE QUEUE</a>' +
      '</div>' +
    '</div>' +
    '<p style="text-align:center;color:#aaa;font-size:11px;padding:12px">GoTravelCloud Automation · 1-800-601-6414 · gotravelcloud.com</p>' +
  '</div>';

const subjectDate = today.replace(/[<>"'&]/g, '');
return [{
  json: {
    html,
    count: renderedCount,
    subject: '📋 [ACTION REQUIRED] ' + renderedCount + ' Hot Lead' + (renderedCount !== 1 ? 's' : '') + ' Stuck in Verification — ' + subjectDate,
  },
}];
