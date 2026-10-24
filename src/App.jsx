import { useEffect, useState } from 'react'
import './App.css'

const initialTasks = [
  { id: 1, title: 'Learn React', completed: true },
  { id: 2, title: 'Build my first project', completed: false },
  { id: 3, title: 'Upload project to GitHub', completed: false },
]

function App() {
  const [tasks, setTasks] = useState(() => {
    try {
      const savedTasks = localStorage.getItem('mini-task-manager')
      return savedTasks ? JSON.parse(savedTasks) : initialTasks
    } catch {
      return initialTasks
    }
  })

  const [newTask, setNewTask] = useState('')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')

  useEffect(() => {
    localStorage.setItem('mini-task-manager', JSON.stringify(tasks))
  }, [tasks])

  const completedCount = tasks.filter((task) => task.completed).length

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch = task.title
      .toLowerCase()
      .includes(search.toLowerCase())

    const matchesFilter =
      filter === 'All' ||
      (filter === 'Active' && !task.completed) ||
      (filter === 'Completed' && task.completed)

    return matchesSearch && matchesFilter
  })

  function addTask(event) {
    event.preventDefault()

    const title = newTask.trim()

    if (!title) return

    setTasks((currentTasks) => [
      ...currentTasks,
      {
        id: crypto.randomUUID(),
        title,
        completed: false,
      },
    ])

    setNewTask('')
  }

  function toggleTask(id) {
  setTasks((currentTasks) => {
    const updatedTasks = currentTasks.map((task) =>
      task.id === id
        ? { ...task, completed: !task.completed }
        : task
    )

    localStorage.setItem(
      'mini-task-manager',
      JSON.stringify(updatedTasks)
    )

    return updatedTasks
  })
}
  function deleteTask(id) {
    setTasks((currentTasks) =>
      currentTasks.filter((task) => task.id !== id),
    )
  }

  return (
    <main className="app">
      <header className="header">
        <div>
          <p className="eyebrow">MY WORKSPACE</p>
          <h1>Mini Task Manager</h1>
          <p className="subtitle">
            Organize your day, one task at a time.
          </p>
        </div>

        <div className="progress-card">
          <span>Completed</span>
          <strong>
            {completedCount}/{tasks.length}
          </strong>
          <div className="progress-track">
            <div
              className="progress-fill"
              style={{
                width: `${tasks.length ? (completedCount / tasks.length) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      </header>

      <section className="task-panel">
        <h2>Add a new task</h2>

        <form className="add-form" onSubmit={addTask}>
          <input
            type="text"
            value={newTask}
            onChange={(event) => setNewTask(event.target.value)}
            placeholder="What do you need to do?"
            aria-label="New task"
            maxLength={120}
          />

          <button type="submit" className="primary-button">
            + Add Task
          </button>
        </form>

        <div className="toolbar">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search tasks..."
            aria-label="Search tasks"
          />

          <div className="filters">
            {['All', 'Active', 'Completed'].map((option) => (
              <button
                key={option}
                type="button"
                className={filter === option ? 'filter active' : 'filter'}
                onClick={() => setFilter(option)}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <div className="task-list">
          {filteredTasks.map((task) => (
            <article className="task-item" key={task.id}>
              <label className="task-label">
                <input
                  type="checkbox"
                  checked={task.completed}
                  onChange={() => toggleTask(task.id)}
                />

                <span
                  className={task.completed ? 'task-title completed' : 'task-title'}
                >
                  {task.title}
                </span>
              </label>

              <button
                type="button"
                className="delete-button"
                onClick={() => deleteTask(task.id)}
                aria-label={`Delete ${task.title}`}
                title="Delete task"
              >
                Delete
              </button>
            </article>
          ))}

          {filteredTasks.length === 0 && (
            <p className="empty-state">
              No tasks found. Try another search or add a new task.
            </p>
          )}
        </div>

        <footer className="task-footer">
          <span>{tasks.length} total tasks</span>

          <button
            type="button"
            className="clear-button"
            disabled={completedCount === 0}
            onClick={() =>
              setTasks((currentTasks) =>
                currentTasks.filter((task) => !task.completed),
              )
            }
          >
            Clear completed
          </button>
        </footer>
      </section>

      <footer className="app-footer">
        Built with React · Mini portfolio project
      </footer>
    </main>
  )
}

export default App