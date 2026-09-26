import fs from 'node:fs';

const html = fs.readFileSync('src/static/index.html', 'utf8');
const app = fs.readFileSync('src/static/app.js', 'utf8');

// Parse lines to get context
const lines = html.split('\n');
const buttons = [];

lines.forEach((line, idx) => {
  const btnMatch = line.match(/<button\b([^>]*)>([\s\S]*?)(?:<\/button>|$)/i);
  if (btnMatch) {
    const attrs = btnMatch[1];
    let content = btnMatch[2].replace(/<[^>]+>/g, '').trim();
    if (!line.includes('</button>')) {
      // button spans multiple lines
      for (let j = idx + 1; j < Math.min(idx + 10, lines.length); j++) {
        content += ' ' + lines[j].replace(/<[^>]+>/g, '').trim();
        if (lines[j].includes('</button>')) break;
      }
    }
    content = content.replace(/\s+/g, ' ').trim();

    const idMatch = attrs.match(/id=["']([^"']+)["']/i);
    const onclickMatch = attrs.match(/onclick=["']([^"']+)["']/i);
    const classMatch = attrs.match(/class=["']([^"']+)["']/i);
    const typeMatch = attrs.match(/type=["']([^"']+)["']/i);

    buttons.push({
      line: idx + 1,
      id: idMatch ? idMatch[1] : null,
      onclick: onclickMatch ? onclickMatch[1] : null,
      class: classMatch ? classMatch[1] : null,
      type: typeMatch ? typeMatch[1] : 'button',
      text: content,
      raw: line.trim()
    });
  }
});

console.log(`Found ${buttons.length} buttons.`);
buttons.forEach((b, i) => {
  let status = 'MISSING';
  if (b.onclick) status = `ONCLICK: ${b.onclick}`;
  else if (b.id && app.includes(`'${b.id}'`)) status = `ATTACHED (id '${b.id}')`;
  else if (b.id && app.includes(`"${b.id}"`)) status = `ATTACHED (id "${b.id}")`;
  else if (b.type === 'submit') status = 'FORM SUBMIT';
  else if (b.class && b.class.includes('modal-close')) status = 'MODAL CLOSE';
  else if (b.class && b.class.includes('tab-btn')) status = 'TAB BUTTON';
  else if (b.class && b.class.includes('btn-close')) status = 'CLOSE BUTTON';
  
  console.log(`[#${i+1} Line ${b.line}] Text: "${b.text}" | ID: ${b.id} | Class: ${b.class} | Status: ${status}`);
});
