require('dotenv').config();
const bcrypt = require('bcryptjs');
const { read, write } = require('./db');
const { v4: uuid } = require('uuid');

const now = new Date().toISOString();
const allowDemoSeed = process.env.ALLOW_DEMO_SEED === 'true';

const users = read('users', []);
if (users.length === 0 && allowDemoSeed) {
  const demoSuperEmail = process.env.DEMO_SUPER_ADMIN_EMAIL;
  const demoSuperPassword = process.env.DEMO_SUPER_ADMIN_PASSWORD;
  const demoOrdersEmail = process.env.DEMO_ORDERS_ADMIN_EMAIL;
  const demoOrdersPassword = process.env.DEMO_ORDERS_ADMIN_PASSWORD;

  if (!demoSuperEmail || !demoSuperPassword || !demoOrdersEmail || !demoOrdersPassword) {
    throw new Error('ALLOW_DEMO_SEED=true requires DEMO_SUPER_ADMIN_EMAIL, DEMO_SUPER_ADMIN_PASSWORD, DEMO_ORDERS_ADMIN_EMAIL and DEMO_ORDERS_ADMIN_PASSWORD.');
  }

  users.push({ id: uuid(), name: 'Super Admin', email: demoSuperEmail, role: 'super_admin', passwordHash: bcrypt.hashSync(demoSuperPassword, 10), createdAt: now });
  users.push({ id: uuid(), name: 'Orders Admin', email: demoOrdersEmail, role: 'orders_admin', passwordHash: bcrypt.hashSync(demoOrdersPassword, 10), createdAt: now });
  write('users', users);
} else if (users.length === 0) {
  console.warn('No admin users found. Set ALLOW_DEMO_SEED=true only in local development, or create admin users through a secure migration.');
}

const products = read('products', []);
if (products.length === 0) {
  write('products', [
    { id: uuid(), name: 'FemiFresh Starter Business Pack', slug: 'femifresh-starter-business-pack', category: 'Business Pack', price: 1000, stockPrice: 0, stock: 100, image: '/images/products/starter-business-pack.jpeg', description: 'Start your FemiFresh business with a starter pack. Includes 5 feminine washes for now.', active: true, createdAt: now },
    { id: uuid(), name: 'FemiFresh Anti-Chafe Balm', slug: 'femifresh-anti-chafe-balm', category: 'Body Care', price: 1000, stockPrice: 0, stock: 100, image: '/images/products/anti-chafe-balm.jpeg', description: 'Smooth glide comfort balm for thighs and sensitive skin areas. Helps with everyday comfort.', active: true, createdAt: now },
    { id: uuid(), name: 'FemiFresh Cranberries Urinary Tract Tea', slug: 'femifresh-cranberries-urinary-tract-tea', category: 'Wellness Tea', price: 1000, stockPrice: 0, stock: 100, image: '/images/products/cranberries-urinary-tract-tea.jpeg', description: 'Cranberries urinary tract tea for daily care and natural wellness support.', active: true, createdAt: now },
    { id: uuid(), name: 'FemiFresh Distributor T-Shirt', slug: 'femifresh-distributor-tshirt', category: 'Merchandise', price: 1000, stockPrice: 0, stock: 100, image: '/images/products/distributor-tshirt.jpeg', description: 'FemiFresh branded distributor T-shirt for events, meetings, activations and daily wear.', active: true, createdAt: now }
  ]);
}

const deliveryMethods = read('deliveryMethods', []);
if (deliveryMethods.length === 0) {
  write('deliveryMethods', [
    { id: uuid(), name: 'Collection', price: 0, active: true, description: 'Customer collects from agreed location' },
    { id: uuid(), name: 'Paxi', price: 60, active: true, description: 'Paxi delivery' },
    { id: uuid(), name: 'Courier', price: 100, active: true, description: 'Door-to-door courier' }
  ]);
}

['orders','customers','paymentLogs','emailLogs','settings'].forEach(name => read(name, name === 'settings' ? {} : []));
console.log('Seed complete');
if (allowDemoSeed) {
  console.log('Demo admin users created for local development.');
}
