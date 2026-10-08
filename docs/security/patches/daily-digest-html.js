// Patch — "Zoho CRM Daily Digest" (workflow IW2YiWSiRawDEgXh)
// Node: "Build Digest HTML" → parameter jsCode
//
// Fix: make the fmt() helper HTML-escape every value. All lead/deal fields
// already route through fmt(); the Amount is numeric (Number(...)) so it's
// safe. Only change vs the original is the added esc() and fmt() escaping.
//
// Status: prepared, NOT applied — the MCP write connection kept failing on
// this workflow (low-severity/internal, so not worth blocking on). Paste
// this into the node's jsCode field in the n8n UI and Publish, or re-apply
// via MCP once the write path is stable.

const CUTOFF = Date.now() - 24 * 60 * 60 * 1000;
const esc = (s) => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const fmt = (v) => (v === null || v === undefined || v === '') ? '-' : esc(String(v));
const leads = $('Get New Leads').all().map(i => i.json).filter(r => r.Created_Time && new Date(r.Created_Time).getTime() >= CUTOFF);
const deals = $('Get Recent Deals').all().map(i => i.json).filter(r => r.Modified_Time && new Date(r.Modified_Time).getTime() >= CUTOFF);
const th = 'style="text-align:left;padding:6px 10px;border-bottom:2px solid #15394A;color:#15394A"';
const td = 'style="padding:6px 10px;border-bottom:1px solid #e0e0e0"';
const tbl = 'style="border-collapse:collapse;width:100%;font-family:Arial,Helvetica,sans-serif;font-size:13px"';
const leadName = (l) => fmt(l.Full_Name || ((l.First_Name || '') + ' ' + (l.Last_Name || '')).trim());
const leadRows = leads.map(l => '<tr><td ' + td + '>' + leadName(l) + '</td><td ' + td + '>' + fmt(l.Email) + '</td><td ' + td + '>' + fmt(l.Phone || l.Mobile) + '</td><td ' + td + '>' + fmt(l.Lead_Source) + '</td></tr>').join('');
const dealRows = deals.map(d => '<tr><td ' + td + '>' + fmt(d.Deal_Name) + '</td><td ' + td + '>' + fmt(d.Stage) + '</td><td ' + td + '>' + (d.Amount ? '$' + Number(d.Amount).toLocaleString('en-US') : '-') + '</td><td ' + td + '>' + fmt(d.Closing_Date) + '</td></tr>').join('');
let body = '<div style="font-family:Arial,Helvetica,sans-serif;max-width:680px">';
body += '<h2 style="color:#15394A;margin-bottom:4px">CRM Daily Digest</h2>';
body += '<p style="color:#555;margin-top:0">Last 24 hours - Zoho CRM (Prime Holdings)</p>';
if (leads.length === 0 && deals.length === 0) {
  body += '<p>No new leads or deal activity in the last 24 hours.</p>';
} else {
  body += '<h3 style="color:#15394A">New Leads (' + leads.length + ')</h3>';
  body += leads.length ? '<table ' + tbl + '><tr><th ' + th + '>Name</th><th ' + th + '>Email</th><th ' + th + '>Phone</th><th ' + th + '>Source</th></tr>' + leadRows + '</table>' : '<p>None.</p>';
  body += '<h3 style="color:#15394A;margin-top:24px">Deal Activity (' + deals.length + ')</h3>';
  body += deals.length ? '<table ' + tbl + '><tr><th ' + th + '>Deal</th><th ' + th + '>Stage</th><th ' + th + '>Amount</th><th ' + th + '>Closing</th></tr>' + dealRows + '</table>' : '<p>None.</p>';
}
body += '</div>';
const subject = 'CRM Daily Digest - ' + leads.length + ' new lead' + (leads.length === 1 ? '' : 's') + ', ' + deals.length + ' deal update' + (deals.length === 1 ? '' : 's');
return [{ json: { subject: subject, html: body, leadCount: leads.length, dealCount: deals.length } }];
