import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { PrismaClient } from '@prisma/client'

const app = new Hono()

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

const prisma = new PrismaClient();

await prisma.customer.createMany({
  data: [
    { name: 'Alice',
      email: 'alice@gmail.com',
      phoneNumber: '1234567890',
      address: '123 Main St, New York, NY 10001' },
    { name: 'Bob',
      email: 'bob@gmail.com',
      phoneNumber: '1234567891',
      address: '124 Main St, New York, NY 10001' },
  ]});

app.post('/customers', async (c) => {
  const { name, email, phoneNumber, address } = await c.req.json();
  const customer = await prisma.customer.create({
    data: { name, email, phoneNumber, address },
  });
  return c.json(customer);
});

app.get('/customers/:id', async (c) => {
  const id = c.req.param('id');
  const customer = await prisma.customer.findUnique({
    where: { id: Number(id) },
  });
  return c.json(customer);
});

app.get('/customers/:id/orders', async (c) => {
  const id = c.req.param('id');
  const orders = await prisma.order.findMany({
    where: { customerId: Number(id) },
    include: { orderItems: true },
  });
  return c.json(orders);
});

app.post('/restaurants', async (c) => {
  const { name, location } = await c.req.json();
  const restaurant = await prisma.restaurant.create({
    data: { name, location },
  });
  return c.json(restaurant);
});

app.get('/restaurants/:id/menu', async (c) => {
  const id = c.req.param('id');
  const menuItems = await prisma.menuItem.findMany({
    where: { restaurantId: Number(id), isAvailable: true },
  });
  return c.json(menuItems);
});

app.post('/restaurants/:id/menu', async (c) => {
  const id = c.req.param('id');
  const { name, price } = await c.req.json();
  const menuItem = await prisma.menuItem.create({
    data: { name, price, restaurantId: Number(id) },
  });
  return c.json(menuItem);
});

app.patch('/menu/:id', async (c) => {
  const id = c.req.param('id');
  const { isAvailable, price } = await c.req.json();
  const menuItem = await prisma.menuItem.update({
    where: { id: Number(id) },
    data: { isAvailable, price },
  });
  return c.json(menuItem);
});

app.post('/orders', async (c) => {
  const { customerId, restaurantId, items } = await c.req.json();
  const order = await prisma.order.create({
    data: {
      customerId,
      restaurantId,
      totalPrice: items.reduce((sum: number, item: { price: number; quantity: number }) => sum + item.price * item.quantity, 0),
      orderItems: {
        create: items.map((item: { menuItemId: number; quantity: number }) => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
        })),
      },
    },
  });
  return c.json(order);
});

app.get('/orders/:id', async (c) => {
  const id = c.req.param('id');
  const order = await prisma.order.findUnique({
    where: { id: Number(id) },
    include: { orderItems: true },
  });
  return c.json(order);
});

app.patch('/orders/:id/status', async (c) => {
  const id = c.req.param('id');
  const { status } = await c.req.json();
  const order = await prisma.order.update({
    where: { id: Number(id) },
    data: { status },
  });
  return c.json(order);
});

app.get('/restaurants/:id/revenue', async (c) => {
  const id = c.req.param('id');
  const revenue = await prisma.order.aggregate({
    where: { restaurantId: Number(id) },
    _sum: { totalPrice: true },
  });
  return c.json(revenue._sum.totalPrice);
});

app.get('/menu/top-items', async (c) => {
  const topItems = await prisma.orderItem.groupBy({
    by: ['menuItemId'],
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: 'desc' } },
    take: 1,
  });
  return c.json(topItems);
});

app.get('/customers/top', async (c) => {
  const topCustomers = await prisma.customer.findMany({
    orderBy: { orders: { _count: 'desc' } },
    take: 5,
  });
  return c.json(topCustomers);
});


 
serve({
  fetch: app.fetch,
  port: 3000
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})