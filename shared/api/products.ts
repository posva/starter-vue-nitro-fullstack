import { fetch } from '#shared/fetch'
import { mande } from 'mande'

export interface Product {
  id: string
  name: string
  description: string
  price: number
  inStock: boolean
}

const products = mande('/api/products', {}, fetch)

export function getProductById(id: string) {
  return products.get<Product>(id)
}
