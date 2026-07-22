import { defineHandler, HTTPError } from 'nitro'
import type { Product } from '#shared/api/products'

// GET /api/products/:productId -> demo product derived deterministically from
// the id (no products table; this route exists to demo dynamic queries).
export default defineHandler((event): Product => {
  const productId = event.context.params?.productId
  if (!productId || !/^\d+$/.test(productId)) {
    throw new HTTPError('Product not found', { status: 404 })
  }

  const seed = Number(productId)
  const adjectives = ['Aged', 'Handmade', 'Recycled', 'Sleek', 'Rustic']
  const materials = ['Wooden', 'Steel', 'Cotton', 'Granite', 'Ceramic']
  const items = ['Chair', 'Keyboard', 'Lamp', 'Mug', 'Backpack']

  return {
    id: productId,
    name: `${adjectives[seed % adjectives.length]} ${materials[seed % materials.length]} ${items[seed % items.length]}`,
    description: `A fine piece of craftsmanship, catalog entry #${productId}.`,
    price: 10 + ((seed * 7) % 90),
    inStock: seed % 4 !== 0,
  }
})
