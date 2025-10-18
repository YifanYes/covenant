import { useTasksStore } from '@/hooks/use-tasks-store'
import { type Task as TaskType } from '@/types/models.types'
import { useDragAndDrop } from '@formkit/drag-and-drop/react'
import { clone, filter, flatten, values as getValues, map } from 'es-toolkit/compat'
import { useEffect } from 'react'
import { TaskStatus } from '../../../../server/schemas/tasks.schemas'
import Task from './Task'

const TaskList = ({ id, group, mutation }: { id: string; group: string; mutation: any }) => {
  const { tasks, setSelectedTask, setTasks } = useTasksStore()
  const [parent, values, setValues] = useDragAndDrop<HTMLUListElement, TaskType>(tasks?.[id] ?? [], {
    group,
    dragHandle: '.drag-handle',
    handleNodeDrop: (event, state) =>
      mutation.debouncedMutate({
        tasks: handleDrop({
          tasks,
          currentParentId: state.currentParent.el.dataset.listId as TaskStatus,
          formerParentId: state.initialParent.el.dataset.listId as TaskStatus,
          task: event.targetData.node.data.value,
          currentIndex: state.targetIndex,
          setTasks
        })
      })
  })

  const handleDrop = ({
    tasks,
    currentParentId = TaskStatus.TODO,
    formerParentId = TaskStatus.TODO,
    task,
    currentIndex,
    setTasks
  }: {
    tasks: Record<string, TaskType[]>
    currentParentId: string
    formerParentId: string
    task: TaskType
    currentIndex: number
    setTasks: (tasks: Record<string, TaskType[]>) => void
  }) => {
    const reIndex = (tasks: TaskType[]) => map(tasks, (t, i) => ({ ...t, order: i }))

    const from = filter(clone(tasks[formerParentId]), (item) => item.id !== task.id)
    const to = currentParentId === formerParentId ? from : clone(tasks[currentParentId])
    to.splice(currentIndex, 0, {
      ...task,
      order: currentIndex,
      ...(currentParentId !== formerParentId && { status: currentParentId })
    })
    const result = { ...tasks, [formerParentId]: reIndex(from), [currentParentId]: reIndex(to) }

    setTasks(result)
    return flatten(getValues(result))
  }

  useEffect(() => {
    setValues(tasks?.[id])
  }, [tasks, id, setValues])

  return (
    <section className='w-full py-6'>
      <header className='mb-2 flex items-center justify-between'>
        <h2 className='text-md font-medium'>{id}</h2>
      </header>
      <ul ref={parent} className='flex flex-col' data-list-id={id}>
        {map(values, (task: TaskType) => (
          <Task key={task.id} task={task} setSelectedTask={setSelectedTask} />
        ))}
      </ul>
    </section>
  )
}

export default TaskList
