const d = require('./fk_resp.json');
const slots = d.RESPONSE?.slots || [];

const s4 = slots.find(s => s.widget?.viewType?.includes('productTitle'));
console.log('--- PRODUCT TITLE DATA ---');
console.log(JSON.stringify(s4?.widget?.data, null, 2));

const s2 = slots.find(s => s.widget?.viewType?.includes('multimedia'));
console.log('--- MULTIMEDIA DATA ---');
console.log(JSON.stringify(s2?.widget?.data, null, 2));
