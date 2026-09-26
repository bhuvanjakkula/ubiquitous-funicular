import fs from 'node:fs';

const html = fs.readFileSync('src/static/index.html', 'utf8');
const app = fs.readFileSync('src/static/app.js', 'utf8');

// Extract all button tags
const btnRegex = /<button\b([^>]*)>([\s\S]*?)<\/button>/gi;
let match;
const buttons = [];

while ((match = btnRegex.exec(html)) !== null) {
  const attrs = match[1];
  const inner = match[2].replace(/<[^>]+>/g, '').trim().replace(/\s+/g, ' ');
  const idMatch = attrs.match(/id=["']([^"']+)["']/i);
  const onclickMatch = attrs.match(/onclick=["']([^"']+)["']/i);
  const classMatch = attrs.match(/class=["']([^"']+)["']/i);
  const typeMatch = attrs.match(/type=["']([^"']+)["']/i);
  
  buttons.push({
    id: idMatch ? idMatch[1] : null,
    onclick: onclickMatch ? onclickMatch[1] : null,
    class: classMatch ? classMatch[1] : null,
    type: typeMatch ? typeMatch[1] : 'button',
    text: inner,
    rawAttrs: attrs.trim()
  });
}

console.log(`Total <button> elements in index.html: ${buttons.length}`);

// Categorize and inspect handlers
const unhandled = [];
const handled = [];

buttons.forEach((b, idx) => {
  let isHandled = false;
  let reason = '';

  if (b.onclick) {
    isHandled = true;
    reason = `inline onclick="${b.onclick}"`;
  } else if (b.id && app.includes(b.id)) {
    isHandled = true;
    reason = `id matched in app.js ("${b.id}")`;
  } else if (b.class) {
    const classes = b.class.split(/\s+/).filter(Boolean);
    const matchedClass = classes.find(c => app.includes(`.${c}`) || app.includes(`"${c}"`) || app.includes(`'${c}'`));
    if (matchedClass) {
      isHandled = true;
      reason = `class matched in app.js ("${matchedClass}")`;
    }
  }

  // Also check if inside a form where type="submit" and form has submit handler
  if (b.type === 'submit') {
    reason += ' (type="submit")';
  }

  if (isHandled) {
    handled.push({ idx, ...b, reason });
  } else {
    unhandled.push({ idx, ...b });
  }
});

console.log(`\nHandled: ${handled.length}`);
console.log(`Unhandled: ${unhandled.length}`);

if (unhandled.length > 0) {
  console.log('\n--- UNHANDLED BUTTONS ---');
  unhandled.forEach(u => {
    console.log(`[#${u.idx}] Text: "${u.text}" | ID: ${u.id} | Class: ${u.class} | Attrs: ${u.rawAttrs}`);
  });
}

// Let's also check all forms and their submit buttons
const formRegex = /<form\b([^>]*)>([\s\S]*?)<\/form>/gi;
let formMatch;
const forms = [];
while ((formMatch = formRegex.exec(html)) !== null) {
  const fAttrs = formMatch[1];
  const fBody = formMatch[2];
  const idMatch = fAttrs.match(/id=["']([^"']+)["']/i);
  forms.push({
    id: idMatch ? idMatch[1] : null,
    hasSubmit: /type=["']submit["']|<button(?![^>]*type=["']button["'])/i.test(fBody),
    handledInJs: idMatch && app.includes(idMatch[1])
  });
}

console.log(`\n--- FORMS (${forms.length}) ---`);
forms.forEach(f => {
  console.log(`Form ID: ${f.id} | Has Submit: ${f.hasSubmit} | Handled in app.js: ${f.handledInJs}`);
});
