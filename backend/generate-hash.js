const bcrypt = require('bcryptjs');

const password = 'admin123';
const saltRounds = 10;

const hash = bcrypt.hashSync(password, saltRounds);
console.log('Password:', password);
console.log('Hash:', hash);
console.log('\nAdd this to your USERS array:');
console.log(`{
  id: 1,
  username: 'admin',
  password: '${hash}',
  role: 'admin',
  email: 'admin@example.com'
}`);