import { UnwrapRef, reactive, ref, readonly } from '@vue/reactivity'
import { useState, useEffect } from 'react'
import { getNewInstanceId, createNewInstanceWithId, useInstanceScope, unmountInstance } from './component'
import { watch } from './watch'

export function useSetup<State, Props = {}>(
  setupFunction: (props: Props) => State,
  Props: Props,
): UnwrapRef<State> {
  const [id] = useState(getNewInstanceId)
  const setTick = useState(0)[1]

  // run setup function
  const [state] = useState(() => {
    const props = reactive({ ...(Props || {}) }) as any
    const instance = createNewInstanceWithId(id, props)

    useInstanceScope(id, () => {
      // TODO: bind instance
      const data = ref(setupFunction(readonly(props)))

      instance.data = data
    })

    return instance.data.value
  })

  // sync props changes
  useEffect(() => {
    if (!Props) return

    useInstanceScope(id, (instance) => {
      if (!instance)
        return
      const { props } = instance
      for (const key of Object.keys(Props))
        props[key] = (Props as any)[key]
    })
  }, [Props])

  // trigger React re-render on data changes
  useEffect(() => {
    useInstanceScope(id, (instance) => {
      if (!instance)
        return
      const { data } = instance
      watch(
        data,
        () => {
          // trigger React update
          setTick(+new Date())
        },
        { deep: true, flush: 'post' },
      )
    })

    return () => {
      console.log('unmounted', id)
      unmountInstance(id)
    }
  }, [])

  return state
}