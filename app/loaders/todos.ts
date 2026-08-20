import { defineColadaLoader } from 'vue-router/experimental/pinia-colada'
import { getTodoList } from '#shared/api/todos'
import { todoListQuery } from '~/queries/todos'

export const useTodoList = defineColadaLoader({
  ...todoListQuery,
  // type mismatch between defined options
  query: getTodoList,
})
