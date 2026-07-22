import { defineQueryOptions } from '@pinia/colada'
import { getProductById } from '#shared/api/products'

export const PRODUCT_QUERY_KEYS = {
  root: ['products'] as const,
  byId: (id: string) => [...PRODUCT_QUERY_KEYS.root, id] as const,
}

export const productByIdQuery = defineQueryOptions((id: string) => ({
  key: PRODUCT_QUERY_KEYS.byId(id),
  query: () => getProductById(id),
}))
