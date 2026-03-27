import fs from 'fs';
const path = 'src/pages/Messages.jsx';
let file = fs.readFileSync(path, 'utf8');

// The backgrounds that were previously var(--white)
file = file.replace(/background: 'var\(--white\)', color: 'var\(--black\)'/g, "background: 'var(--bg-body)', color: 'var(--text-body)'");

// Bubble background #f8f6f0
file = file.replace(/background: isMe \? 'var\(--black\)' : '#f8f6f0'/g, "background: isMe ? 'var(--black)' : 'color-mix(in srgb, var(--text-body) 6%, transparent)'");

// Explicit text colors
file = file.replace(/color: 'var\(--black\)', margin: '0 0 4px'/g, "color: 'var(--text-body)', margin: '0 0 4px'");
file = file.replace(/fontSize: '14px', color: 'var\(--black\)'/g, "fontSize: '14px', color: 'var(--text-body)'");
file = file.replace(/color: 'var\(--black\)', overflow/g, "color: 'var(--text-body)', overflow");
file = file.replace(/color: conv\.unread > 0 \? 'var\(--black\)' :/g, "color: conv.unread > 0 ? 'var(--text-body)' :");
file = file.replace(/color: 'var\(--black\)',[\r\n\s]+overflow:/g, "color: 'var(--text-body)',\n                                                    overflow:");
file = file.replace(/color: isMe \? 'var\(--white\)' : 'var\(--black\)'/g, "color: isMe ? 'var(--white)' : 'var(--text-body)'");
file = file.replace(/color: 'var\(--black\)',[\r\n\s]+minHeight:/g, "color: 'var(--text-body)',\n                                            minHeight:");

// All rgba(10,10,10,X) to color-mix
file = file.replace(/rgba\(10,10,10,(0\.[0-9]+)\)/g, (match, p1) => {
    const pct = Math.round(parseFloat(p1) * 100);
    return `color-mix(in srgb, var(--text-body) ${pct}%, transparent)`;
});

fs.writeFileSync(path, file);
console.log('Update complete!');
