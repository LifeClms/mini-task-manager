
import { useCallback, useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import './App.css'

export default function App() {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [loading, setLoading] = useState(false)
  const [tasks, setTasks] = useState([])
  const [newTask, setNewTask] = useState('')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignup, setIsSignup] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  // Check the current login session
  useEffect(() => {
    let mounted = true

    async function checkSession() {
      const { data, error } = await supabase.auth.getSession()

      if (!mounted) return

      if (error) setError(error.message)
      setUser(data.session?.user ?? null)
      setAuthLoading(false)
    }

    checkSession()

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
        if (!session) setTasks([])
      },
    )

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  // Load only this user's tasks
  const loadTasks = useCallback(async (userId) => {
    const { data, error } = await supabase
      .from('tasks')
      .select('id, title, completed, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })

    if (error) {
      setError(error.message)
      return
    }

    setTasks(data ?? [])
  }, [])

  useEffect(() => {
    if (!user) {
      return
    }

    let active = true

    async function initialLoad() {
      setLoading(true)
      await loadTasks(user.id)
      if (active) setLoading(false)
    }

    initialLoad()

    const channel = supabase
      .channel(`tasks-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `user_id=eq.${user.id}`,
        },
        () => loadTasks(user.id),
      )
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [user, loadTasks])

  // Email signup or login
  async function handleAuth(event) {
    event.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    try {
      if (isSignup) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: window.location.origin,
          },
        })

        if (error) throw error

        if (data.session) {
          setMessage('Account created successfully!')
        } else {
          setMessage(
            'Account created. Check your email to confirm, then log in.',
          )
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })

        if (error) throw error
      }
    } catch (err) {
      setError(err.message || 'Authentication failed.')
    } finally {
      setLoading(false)
    }
  }

  // Google login (requires Google provider setup in Supabase)
  async function signInWithGoogle() {
    setError('')
    setMessage('')

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    })

    if (error) setError(error.message)
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()

    if (error) {
      setError(error.message)
    } else {
      setTasks([])
      setMessage('')
      setError('')
    }
  }

  // Add task to Supabase
  async function addTask(event) {
    event.preventDefault()

    const title = newTask.trim()
    if (!title || !user) return

    setError('')
    setLoading(true)

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        user_id: user.id,
        title,
      })
      .select('id, title, completed, created_at')
      .single()

    if (error) {
      setError(error.message)
    } else {
      setTasks((current) =>
        current.some((task) => task.id === data.id)
          ? current
          : [...current, data],
      )
      setNewTask('')
    }

    setLoading(false)
  }

  // Update completion status
  async function toggleTask(task) {
    setError('')

    const { data, error } = await supabase
      .from('tasks')
      .update({ completed: !task.completed })
      .eq('id', task.id)
      .eq('user_id', user.id)
      .select('id, title, completed, created_at')
      .single()

    if (error) {
      setError(error.message)
      return
    }

    setTasks((current) =>
      current.map((item) => (item.id === data.id ? data : item)),
    )
  }

  // Delete a task
  async function deleteTask(id) {
    setError('')

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      setError(error.message)
      return
    }

    setTasks((current) => current.filter((task) => task.id !== id))
  }

  // Delete all completed tasks
  async function clearCompleted() {
    const completedIds = tasks
      .filter((task) => task.completed)
      .map((task) => task.id)

    if (!completedIds.length) return

    setError('')

    const { error } = await supabase
      .from('tasks')
      .delete()
      .in('id', completedIds)
      .eq('user_id', user.id)

    if (error) {
      setError(error.message)
      return
    }

    setTasks((current) => current.filter((task) => !task.completed))
  }

  if (authLoading) {
    return (
      <main className="app">
        <p>Checking your session...</p>
      </main>
    )
  }

  // Authentication screen
  if (!user) {
    return (
      <main className="app">
        <section className="task-panel auth-panel">
          <p className="eyebrow">MINI TASK MANAGER 2.0</p>

          <h1>{isSignup ? 'Create your account' : 'Welcome back'}</h1>

          <p className="subtitle">
            Your tasks, synced across your devices.
          </p>

          <form className="auth-form" onSubmit={handleAuth}>
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </label>

            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={isSignup ? 'new-password' : 'current-password'}
                minLength={6}
                required
              />
            </label>

            <button className="primary-button" disabled={loading}>
              {loading
                ? 'Please wait...'
                : isSignup
                  ? 'Sign Up'
                  : 'Log In'}
            </button>
          </form>

          <button
            type="button"
            className="google-button"
            onClick={signInWithGoogle}
          >
            Continue with Google
          </button>

          <button
            type="button"
            className="clear-button auth-switch"
            onClick={() => {
              setIsSignup((value) => !value)
              setError('')
              setMessage('')
            }}
          >
            {isSignup
              ? 'Already have an account? Log in'
              : "Don't have an account? Sign up"}
          </button>

          {message && <p className="success-message">{message}</p>}
          {error && <p className="error-message">{error}</p>}
        </section>
      </main>
    )
  }

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

  // Main task manager
  return (
    <main className="app">
      <header className="header">
        <div>
          <p className="eyebrow">CLOUD WORKSPACE</p>
          <h1>Mini Task Manager</h1>
          <p className="subtitle">
            Organize your day, one task at a time.
          </p>

          <p className="user-email">{user.email}</p>

          <button
            type="button"
            className="clear-button"
            onClick={signOut}
          >
            Log Out
          </button>
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
                width: `${
                  tasks.length
                    ? (completedCount / tasks.length) * 100
                    : 0
                }%`,
              }}
            />
          </div>
        </div>
      </header>

      {error && <p className="error-message">{error}</p>}
      {message && <p className="success-message">{message}</p>}

      <section className="task-panel">
        <h2>Add a new task</h2>

        <form className="add-form" onSubmit={addTask}>
          <input
            value={newTask}
            onChange={(event) => setNewTask(event.target.value)}
            placeholder="What do you need to do?"
            aria-label="New task"
            maxLength={120}
            required
          />

          <button className="primary-button" disabled={loading}>
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
          {loading && tasks.length === 0 && <p>Loading tasks...</p>}

          {filteredTasks.map((task) => (
            <article className="task-item" key={task.id}>
              <label className="task-label">
                <input
                  type="checkbox"
                  checked={task.completed}
                  onChange={() => toggleTask(task)}
                />

                <span
                  className={
                    task.completed ? 'task-title completed' : 'task-title'
                  }
                >
                  {task.title}
                </span>
              </label>

              <button
                type="button"
                className="delete-button"
                onClick={() => deleteTask(task.id)}
                aria-label={`Delete ${task.title}`}
              >
                Delete
              </button>
            </article>
          ))}

          {!loading && filteredTasks.length === 0 && (
            <p className="empty-state">
              {tasks.length === 0
                ? 'No tasks yet. Add your first task!'
                : 'No tasks found. Try another search or filter.'}
            </p>
          )}
        </div>

        <footer className="task-footer">
          <span>{tasks.length} total tasks</span>

          <button
            type="button"
            className="clear-button"
            disabled={completedCount === 0}
            onClick={clearCompleted}
          >
            Clear completed
          </button>
        </footer>
      </section>

      <footer className="app-footer">
        Built with React · Supabase Cloud Sync
      </footer>
    </main>
  )
}
