import React, { useState, useEffect, useCallback } from "react";
import { fetchTodos, createTodo, updateTodo, deleteTodo } from "./api";
import "./App.css";

const PRIORITIES = ["low", "medium", "high"];
const PRIORITY_COLORS = { low: "#10b981", medium: "#f59e0b", high: "#ef4444" };
const PRIORITY_BG = { low: "#d1fae5", medium: "#fef3c7", high: "#fee2e2" };

function Modal({ todo, onSave, onClose }) {
  const [title, setTitle] = useState(todo?.title || "");
  const [description, setDescription] = useState(todo?.description || "");
  const [priority, setPriority] = useState(todo?.priority || "medium");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    onSave({ title: title.trim(), description: description.trim(), priority });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{todo ? "✏️ Edit Task" : "➕ Add New Task"}</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => { setTitle(e.target.value); setError(""); }}
              placeholder="What needs to be done?"
              autoFocus
            />
            {error && <span className="error">{error}</span>}
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add more details (optional)..."
              rows={3}
            />
          </div>
          <div className="form-group">
            <label>Priority</label>
            <div className="priority-selector">
              {PRIORITIES.map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`priority-btn ${priority === p ? "active" : ""}`}
                  style={{
                    borderColor: PRIORITY_COLORS[p],
                    backgroundColor: priority === p ? PRIORITY_COLORS[p] : "transparent",
                    color: priority === p ? "white" : PRIORITY_COLORS[p],
                  }}
                  onClick={() => setPriority(p)}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-save">
              {todo ? "Save Changes" : "Add Task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TodoCard({ todo, onToggle, onEdit, onDelete }) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (window.confirm("Delete this task?")) {
      setDeleting(true);
      await onDelete(todo.id);
    }
  };

  return (
    <div className={`todo-card ${todo.completed ? "completed" : ""} ${deleting ? "fading" : ""}`}>
      <div className="todo-left">
        <button
          className={`check-btn ${todo.completed ? "checked" : ""}`}
          onClick={() => onToggle(todo)}
          title={todo.completed ? "Mark incomplete" : "Mark complete"}
        >
          {todo.completed ? "✓" : ""}
        </button>
      </div>
      <div className="todo-body">
        <div className="todo-title">{todo.title}</div>
        {todo.description && (
          <div className="todo-desc">{todo.description}</div>
        )}
        <div className="todo-meta">
          <span
            className="priority-badge"
            style={{
              backgroundColor: PRIORITY_BG[todo.priority],
              color: PRIORITY_COLORS[todo.priority],
            }}
          >
            {todo.priority}
          </span>
          <span className="todo-date">
            {new Date(todo.created_at).toLocaleDateString("en-US", {
              month: "short", day: "numeric", year: "numeric",
            })}
          </span>
        </div>
      </div>
      <div className="todo-actions">
        <button className="action-btn edit-btn" onClick={() => onEdit(todo)} title="Edit">✏️</button>
        <button className="action-btn delete-btn" onClick={handleDelete} title="Delete">🗑️</button>
      </div>
    </div>
  );
}

export default function App() {
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editTodo, setEditTodo] = useState(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");

  const loadTodos = useCallback(async () => {
    try {
      setError("");
      const data = await fetchTodos();
      setTodos(data);
    } catch (err) {
      setError("⚠️ Could not connect to the server. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTodos(); }, [loadTodos]);

  const handleSave = async (data) => {
    try {
      if (editTodo) {
        const updated = await updateTodo(editTodo.id, data);
        setTodos((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      } else {
        const created = await createTodo(data);
        setTodos((prev) => [created, ...prev]);
      }
      setShowModal(false);
      setEditTodo(null);
    } catch (err) {
      alert("Failed to save task. Please try again.");
    }
  };

  const handleToggle = async (todo) => {
    try {
      const updated = await updateTodo(todo.id, { completed: !todo.completed });
      setTodos((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } catch {
      alert("Failed to update task.");
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteTodo(id);
      setTodos((prev) => prev.filter((t) => t.id !== id));
    } catch {
      alert("Failed to delete task.");
    }
  };

  const handleEdit = (todo) => {
    setEditTodo(todo);
    setShowModal(true);
  };

  const handleAddNew = () => {
    setEditTodo(null);
    setShowModal(true);
  };

  const filtered = todos
    .filter((t) => {
      if (filter === "active") return !t.completed;
      if (filter === "completed") return t.completed;
      return true;
    })
    .filter((t) =>
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.description?.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === "newest") return new Date(b.created_at) - new Date(a.created_at);
      if (sortBy === "oldest") return new Date(a.created_at) - new Date(b.created_at);
      if (sortBy === "priority") {
        const order = { high: 0, medium: 1, low: 2 };
        return order[a.priority] - order[b.priority];
      }
      return 0;
    });

  const stats = {
    total: todos.length,
    completed: todos.filter((t) => t.completed).length,
    active: todos.filter((t) => !t.completed).length,
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <span className="logo-icon">✅</span>
            <div>
              <h1>TodoApp</h1>
              <p>DSO101 Assignment — Stay organized</p>
            </div>
          </div>
          <button className="add-btn" onClick={handleAddNew}>
            <span>+</span> Add Task
          </button>
        </div>

        <div className="stats-bar">
          <div className="stat">
            <span className="stat-num">{stats.total}</span>
            <span className="stat-label">Total</span>
          </div>
          <div className="stat">
            <span className="stat-num" style={{ color: "#6366f1" }}>{stats.active}</span>
            <span className="stat-label">Active</span>
          </div>
          <div className="stat">
            <span className="stat-num" style={{ color: "#10b981" }}>{stats.completed}</span>
            <span className="stat-label">Done</span>
          </div>
          {stats.total > 0 && (
            <div className="progress-wrap">
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${(stats.completed / stats.total) * 100}%` }}
                />
              </div>
              <span>{Math.round((stats.completed / stats.total) * 100)}%</span>
            </div>
          )}
        </div>
      </header>

      <main className="main">
        <div className="controls">
          <input
            className="search-input"
            type="text"
            placeholder="🔍 Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="filter-group">
            {["all", "active", "completed"].map((f) => (
              <button
                key={f}
                className={`filter-btn ${filter === f ? "active" : ""}`}
                onClick={() => setFilter(f)}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <select
            className="sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="priority">By Priority</option>
          </select>
        </div>

        {error && <div className="error-banner">{error}</div>}

        {loading ? (
          <div className="loading">
            <div className="spinner" />
            <p>Loading tasks...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">📝</div>
            <h3>{search ? "No tasks match your search" : "No tasks yet!"}</h3>
            <p>{search ? "Try a different search term." : "Click '+ Add Task' to create your first task."}</p>
          </div>
        ) : (
          <div className="todo-list">
            {filtered.map((todo) => (
              <TodoCard
                key={todo.id}
                todo={todo}
                onToggle={handleToggle}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </main>

      {showModal && (
        <Modal
          todo={editTodo}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditTodo(null); }}
        />
      )}
    </div>
  );
}