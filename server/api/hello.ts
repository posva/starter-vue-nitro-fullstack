import { defineHandler } from 'nitro'

export default defineHandler(() => {
  return {
    hello: 'world',
  }
})
