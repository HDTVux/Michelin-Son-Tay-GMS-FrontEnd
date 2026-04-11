const fs = require('fs');
const path = 'src/pages/Technician/ServiceTicket/ServiceTicket.jsx';
let c = fs.readFileSync(path, 'utf8');

const fixes = [
  {
    old: 'T' + '\u00e1\u00bb\u0090' + 'T',
    new: 'TỐT',
    label: 'TỐT column header'
  },
  {
    old: 'GHI CH' + '\u00c3\u0161' + ' C' + '\u00e1\u00bb\u0090' + ' V' + '\u00e1\u00ba\u00a4' + 'N',
    new: 'GHI CHÚ CỐ VẤN',
    label: 'GHI CHÚ CỐ VẤN column header'
  },
  {
    old: '\u00e2\u20ac\u201d',
    new: '—',
    label: 'em-dash'
  },
];

for (const fix of fixes) {
  if (c.includes(fix.old)) {
    c = c.split(fix.old).join(fix.new);
    console.log(`Fixed: ${fix.label}`);
  } else {
    console.log(`NOT FOUND: ${fix.label} - ${JSON.stringify(fix.old)}`);
  }
}

fs.writeFileSync(path, c, 'utf8');
console.log('Done');
