const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

export const fetchTodos = async () => {
  const res = await fetch(`${API_URL}/api/todos`);
  if (!res.ok) throw new Error("Failed to fetch todos");
  return res.json();
};

export const createTodo = async (todo) => {
  const res = await fetch(`${API_URL}/api/todos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(todo),
  });
  if (!res.ok) throw new Error("Failed to create todo");
  return res.json();
};

export const updateTodo = async (id, updates) => {
  const res = await fetch(`${API_URL}/api/todos/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error("Failed to update todo");
  return res.json();
};

export const deleteTodo = async (id) => {
  const res = await fetch(`${API_URL}/api/todos/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete todo");
  return res.json();
};