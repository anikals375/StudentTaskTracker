
import { useEffect, useState } from 'react'
import './App.css'

const API_BASE = 'http://127.0.0.1:8000/api/v1'
const TASK_URL = `${API_BASE}/tasks`
const USER_URL = `${API_BASE}/users`

function App() {
  const [token, setToken] = useState(
    () => sessionStorage.getItem('access_token') || ''
  )

  const [user, setUser] = useState(null)
  const [isRegistering, setIsRegistering] = useState(false)

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [showLoginPassword, setShowLoginPassword] = useState(false)
const [showCurrentPassword, setShowCurrentPassword] = useState(false)
const [showNewPassword, setShowNewPassword] = useState(false)
const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [tasks, setTasks] = useState([])
  const [students, setStudents] = useState([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [editingTaskId, setEditingTaskId] = useState(null)
const [editTitle, setEditTitle] = useState('')
const [editDescription, setEditDescription] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  function authHeaders() {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    }
  }

  async function readResponse(response) {
    const text = await response.text()

    if (!text) return {}

    try {
      return JSON.parse(text)
    } catch {
      return { detail: text }
    }
  }

  function logout() {
    sessionStorage.removeItem('access_token')
    setToken('')
    setUser(null)
    setTasks([])
    setPassword('')
    setError('')
    setMessage('')
  }

  async function handleAuth(event) {
    event.preventDefault()

    try {
      setLoading(true)
      setError('')
      setMessage('')

      if (isRegistering) {
        const response = await fetch(`${USER_URL}/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            full_name: fullName.trim(),
            email: email.trim(),
            password,
          }),
        })

        const result = await readResponse(response)

        if (!response.ok) {
          throw new Error(
            result.detail || 'Registration failed.'
          )
        }

        setMessage('Registration successful! Please log in.')
        setIsRegistering(false)
        setFullName('')
        setPassword('')
      } else {
        const response = await fetch(`${USER_URL}/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email.trim(),
            password,
          }),
        })

        const result = await readResponse(response)

        if (!response.ok) {
          throw new Error(result.detail || 'Login failed.')
        }

        if (!result.access_token) {
          throw new Error('Login response did not contain an access token.')
        }

        sessionStorage.setItem('access_token', result.access_token)
        setToken(result.access_token)
        setPassword('')
        setMessage('Login successful!')
      }
    } catch (err) {
      setError(err.message || 'Unable to connect to the backend.')
    } finally {
      setLoading(false)
    }
  }

  async function fetchTasks(currentToken) {
    try {
      const response = await fetch(TASK_URL, {
        headers: {
          Authorization: `Bearer ${currentToken}`,
        },
      })

      const result = await readResponse(response)

      if (response.status === 401) {
        logout()
        setError('Your session has expired. Please log in again.')
        return
      }

      if (!response.ok) {
        throw new Error(result.detail || 'Unable to load tasks.')
      }

      setTasks(result.data || [])
    } catch (err) {
      setError(err.message || 'Could not load tasks.')
    }
  }

  async function fetchUsers(currentToken) {
  try {
    const response = await fetch(USER_URL, {
      headers: {
        Authorization: `Bearer ${currentToken}`,
      },
    })

    const result = await readResponse(response)

    if (!response.ok) {
      throw new Error(result.detail || 'Unable to load students.')
    }

    setStudents(result.filter((item) => item.role === 'student'))
  } catch (err) {
    setError(err.message || 'Could not load students.')
  }
}

  async function fetchProfile(currentToken) {
    try {
      const response = await fetch(`${USER_URL}/me`, {
        headers: {
          Authorization: `Bearer ${currentToken}`,
        },
      })

      const result = await readResponse(response)

      if (response.ok) {
  setUser(result)

  if (result.role === 'admin') {
    await fetchUsers(currentToken)
  } else {
    setStudents([])
  }
}
    } catch {
      // Task loading will display its own error if the backend is unavailable.
    }
  }

  async function changePassword(event) {
  event.preventDefault()

  setError('')
  setMessage('')

  if (newPassword !== confirmPassword) {
    setError('New passwords do not match.')
    return
  }

  if (newPassword.length < 8) {
    setError('New password must contain at least 8 characters.')
    return
  }

  try {
    setLoading(true)

    const response = await fetch(`${USER_URL}/change-password`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
      }),
    })

    const result = await readResponse(response)

    if (!response.ok) {
      throw new Error(result.detail || 'Password change failed.')
    }

    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setMessage('Password changed successfully!')
  } catch (err) {
    setError(err.message || 'Unable to change password.')
  } finally {
    setLoading(false)
  }
}

  useEffect(() => {
    if (token) {
      fetchTasks(token)
      fetchProfile(token)
    } else {
      setTasks([])
      setStudents([])
      setUser(null)
    }
  }, [token])

  async function addTask(event) {
    event.preventDefault()

    if (!title.trim()) {
      setError('Please enter a task title.')
      return
    }

    try {
      setLoading(true)
      setError('')
      setMessage('')

      const response = await fetch(TASK_URL, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          status: 'todo',
          priority: 'medium',
        }),
      })

      const result = await readResponse(response)

      if (!response.ok) {
        throw new Error(result.detail || 'Could not create the task.')
      }

      setTasks((currentTasks) => [...currentTasks, result.data])
      setTitle('')
      setDescription('')
      setMessage('Task created successfully!')
    } catch (err) {
      setError(err.message || 'Could not create the task.')
    } finally {
      setLoading(false)
    }
  }

  async function changeStatus(task) {
    const newStatus =
      task.status === 'todo'
        ? 'in_progress'
        : task.status === 'in_progress'
          ? 'completed'
          : 'todo'

    try {
      setError('')

      const response = await fetch(`${TASK_URL}/${task.id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ status: newStatus }),
      })

      const result = await readResponse(response)

      if (!response.ok) {
        throw new Error(result.detail || 'Could not update the task.')
      }

      setTasks((currentTasks) =>
        currentTasks.map((item) =>
          item.id === task.id ? result.data : item
        )
      )
    } catch (err) {
      setError(err.message || 'Could not update the task.')
    }
  }
async function updateTask(event) {
  event.preventDefault()

  if (!editTitle.trim()) {
    setError('Please enter a task title.')
    return
  }

  try {
    setLoading(true)
    setError('')
    setMessage('')

    const response = await fetch(`${TASK_URL}/${editingTaskId}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({
        title: editTitle.trim(),
        description: editDescription.trim(),
      }),
    })

    const result = await readResponse(response)

    if (!response.ok) {
      throw new Error(result.detail || 'Could not update the task.')
    }

    setTasks((currentTasks) =>
      currentTasks.map((task) =>
        task.id === editingTaskId ? result.data : task
      )
    )

    setEditingTaskId(null)
    setEditTitle('')
    setEditDescription('')
    setMessage('Task updated successfully!')
  } catch (err) {
    setError(err.message || 'Could not update the task.')
  } finally {
    setLoading(false)
  }
}

  function editTask(task) {
  setEditingTaskId(task.id)
  setEditTitle(task.title)
  setEditDescription(task.description || '')
  setError('')
  setMessage('')
}

  async function deleteTask(task) {
    const confirmed = window.confirm(`Delete "${task.title}"?`)

    if (!confirmed) return

    try {
      setError('')

      const response = await fetch(`${TASK_URL}/${task.id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      })

      const result = await readResponse(response)

      if (!response.ok) {
        throw new Error(result.detail || 'Could not delete the task.')
      }

      setTasks((currentTasks) =>
        currentTasks.filter((item) => item.id !== task.id)
      )

      setMessage('Task deleted successfully!')
    } catch (err) {
      setError(err.message || 'Could not delete the task.')
    }
  }

  // Login and Registration screen
  if (!token) {
    return (
      <main>
        <h1>Student Task Tracker</h1>
        <p>Organize your tasks and keep track of your progress.</p>

        <h2>{isRegistering ? 'Create Account' : 'Student Login'}</h2>

        <form onSubmit={handleAuth}>
          {isRegistering && (
            <>
              <label htmlFor="fullName">Full Name</label>
              <input
                id="fullName"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Enter your full name"
                required
              />
            </>
          )}

          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Enter your email"
            required
          />

          <div className="password-input-container">
  <input
    id="password"
    type={showLoginPassword ? 'text' : 'password'}
    value={password}
    onChange={(event) => setPassword(event.target.value)}
    placeholder="Enter your password"
    minLength={8}
    required
  />

  <button
    type="button"
    className="password-toggle"
    onClick={() => setShowLoginPassword(!showLoginPassword)}
  >
    {showLoginPassword ? '🙈' : '👁'}
  </button>
</div>

          <button type="submit" disabled={loading}>
            {loading
              ? 'Please wait...'
              : isRegistering
                ? 'Register'
                : 'Login'}
          </button>
        </form>

        {error && <p role="alert">{error}</p>}
        {message && <p>{message}</p>}

        <p>
          {isRegistering
            ? 'Already have an account?'
            : "Don't have an account?"}{' '}
          <button
            type="button"
            onClick={() => {
              setIsRegistering(!isRegistering)
              setError('')
              setMessage('')
            }}
          >
            {isRegistering ? 'Login' : 'Register'}
          </button>
        </p>
      </main>
    )
  }

  // Logged-in task dashboard
  return (
    <main>
      <h1>Student Task Tracker</h1>
      <p>Organize your tasks and keep track of your progress.</p>

      <section>
        <p>
          Welcome, <strong>{user?.full_name || user?.email || 'Student'}</strong>
        </p>
        <p>Role: {user?.role || 'student'}</p>
        <button type="button" onClick={logout}>
          Logout
        </button>
        <button
  type="button"
  onClick={() => {
    setShowPasswordForm(!showPasswordForm)
    setError('')
    setMessage('')
  }}
>
  {showPasswordForm ? 'Cancel Change Password' : 'Change Password'}
</button>

{showPasswordForm && (
  <section>
    <h2>Change Password</h2>

    <form onSubmit={changePassword}>
      <label htmlFor="currentPassword">Current Password</label>
      <div className="password-input-container">
  <input
    id="currentPassword"
    type={showCurrentPassword ? 'text' : 'password'}
    value={currentPassword}
    onChange={(event) => setCurrentPassword(event.target.value)}
    placeholder="Enter current password"
    required
  />

  <button
    type="button"
    className="password-toggle"
    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
  >
    {showCurrentPassword ? '🙈' : '👁'}
  </button>
</div>

      <label htmlFor="newPassword">New Password</label>
      <div className="password-input-container">
  <input
    id="newPassword"
    type={showNewPassword ? 'text' : 'password'}
    value={newPassword}
    onChange={(event) => setNewPassword(event.target.value)}
    placeholder="Enter new password"
    minLength={8}
    required
  />

  <button
    type="button"
    className="password-toggle"
    onClick={() => setShowNewPassword(!showNewPassword)}
  >
    {showNewPassword ? '🙈' : '👁'}
  </button>
</div>

      <label htmlFor="confirmPassword">Confirm New Password</label>
<div className="password-input-container">
  <input
    id="confirmPassword"
    type={showConfirmPassword ? 'text' : 'password'}
    value={confirmPassword}
    onChange={(event) => setConfirmPassword(event.target.value)}
    placeholder="Confirm new password"
    minLength={8}
    required
  />

  <button
    type="button"
    className="password-toggle"
    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
  >
    {showConfirmPassword ? '🙈' : '👁'}
  </button>
</div>

      <button type="submit" disabled={loading}>
        {loading ? 'Changing...' : 'Update Password'}
      </button>
    </form>
  </section>
)}
      </section>

      {user?.role !== 'admin' && (
  <>
    <h2>Add Task</h2>

    <form onSubmit={addTask}>
      <label htmlFor="title">Task title</label>
      <input
        id="title"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Enter task title"
        required
      />

      <label htmlFor="description">Description</label>
      <textarea
        id="description"
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        placeholder="Enter task description"
      />

      <button type="submit" disabled={loading}>
        {loading ? 'Adding...' : 'Add Task'}
      </button>
    </form>
  </>
)}

      {error && <p role="alert">{error}</p>}
      {message && <p>{message}</p>}

{user?.role === 'admin' && (
  <section>
    <h2>Student Task Overview</h2>

    {students.length === 0 ? (
      <p>No students found.</p>
    ) : (
      students.map((student) => {
        const studentTasks = tasks.filter(
          (task) => String(task.user_id) === String(student.id)
        )

        return (
          <div key={student.id}>
            <h3>{student.full_name}</h3>
            <p>{student.email}</p>
            <p>Total Tasks: {studentTasks.length}</p>

            {studentTasks.length === 0 ? (
              <p>No tasks assigned yet.</p>
            ) : (
              <ul>
                {studentTasks.map((task) => (
                  <li key={task.id}>
                    <strong>{task.title}</strong>

                    {task.description && <p>{task.description}</p>}

                    <p>
                      Status: {task.status} | Priority: {task.priority}
                    </p>
                  </li>
                ))}
              </ul>
            )}

            <hr />
          </div>
        )
      })
    )}
  </section>
)}

      {user?.role !== 'admin' && (
  <section>
        <h2>Your Tasks ({tasks.length})</h2>

        {tasks.length === 0 ? (
          <p>No tasks yet. Add your first task above.</p>
        ) : (
          <ul>
            {tasks.map((task) => (
              <li key={task.id}>
                <strong>{task.title}</strong>

                {task.description && <p>{task.description}</p>}

                {editingTaskId === task.id && (
  <form onSubmit={updateTask}>
    <label>Edit Task Title</label>
    <input
      value={editTitle}
      onChange={(event) => setEditTitle(event.target.value)}
      required
    />

    <label>Edit Description</label>
    <textarea
      value={editDescription}
      onChange={(event) => setEditDescription(event.target.value)}
    />

    <button type="submit" disabled={loading}>
      Save Changes
    </button>

    <button
      type="button"
      onClick={() => setEditingTaskId(null)}
    >
      Cancel
    </button>
  </form>
)}

                <p>
                  Status: {task.status} | Priority: {task.priority}
                </p>

                <button
                  type="button"
                  onClick={() => changeStatus(task)}
                >
                  Change Status
                </button>

                <button
                  type="button"
                  onClick={() => editTask(task)}
                >
                  Edit
                </button>

                <button
                  type="button"
                  onClick={() => deleteTask(task)}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      )}
    </main>
  )
}

export default App
