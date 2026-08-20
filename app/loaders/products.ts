import { defineColadaLoader } from 'vue-router/experimental/pinia-colada'
import { getProductById } from '#shared/api/products'
import { PRODUCT_QUERY_KEYS } from '~/queries/products'

export const useProductData = defineColadaLoader('/products/[productId]', {
  key: (to) => PRODUCT_QUERY_KEYS.byId(to.params.productId),
  query: (to) => getProductById(to.params.productId),
  staleTime: 10_000,
  errors: true,
})
