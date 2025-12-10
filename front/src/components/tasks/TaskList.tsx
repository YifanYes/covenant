import { useTasksStore } from '@/hooks/use-tasks-store'
import { type Task as TaskType } from '@/types/models.types'
import { useDragAndDrop } from '@formkit/drag-and-drop/react'
import { TaskStatus } from '@shared/schemas/tasks.schemas'
import { clone, filter, flatten, values as getValues, map } from 'es-toolkit/compat'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import Task from './Task'

const TaskList = ({ id, group, mutation }: { id: string; group: string; mutation: any }) => {
  const { t } = useTranslation()
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
    const to = currentParentId === formerParentId ? from : clone(tasks[currentParentId] ?? [])
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
    setValues(tasks?.[id] ?? [])
  }, [tasks, id, setValues])

  return (
    <section className='w-full py-4'>
      <header className='mb-2 flex items-center justify-between'>
        <h2 className='text-md font-medium'>{t(`task_status.${id}`).toUpperCase()}</h2>
      </header>
      <div className='relative min-h-[80px] rounded-md border-2'>
        {values.length === 0 && (
          <div className='text-muted-foreground pointer-events-none absolute inset-0 flex items-center justify-center p-4 text-sm italic'>
            {t(`tasks.empty.${id}` as any, { defaultValue: t('tasks.empty') })}
          </div>
        )}
        <ul ref={parent} className='flex h-full min-h-[80px] flex-col gap-1 rounded-md p-3' data-list-id={id}>
          {map(values, (task: TaskType) => (
            <Task key={task.id} task={task} setSelectedTask={setSelectedTask} />
          ))}
        </ul>
      </div>
    </section>
  )
}

export default TaskList
