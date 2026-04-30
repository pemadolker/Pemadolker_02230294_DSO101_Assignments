// Mock the pg module before anything else
jest.mock('pg', () => {
  const mockPool = {
    query: jest.fn(),
  };
  return { Pool: jest.fn(() => mockPool) };
});

const request = require('supertest');
const express = require('express');
const cors = require('cors');

// Get the mocked pool
const { Pool } = require('pg');
const pool = new Pool();

// Rebuild app without DB init for testing
const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running' });
});

// GET all todos
app.get('/api/todos', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM todos ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch todos' });
  }
});

// GET single todo
app.get('/api/todos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM todos WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Todo not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch todo' });
  }
});

// POST create todo
app.post('/api/todos', async (req, res) => {
  try {
    const { title, description, priority } = req.body;
    if (!title || title.trim() === '') {
      return res.status(400).json({ error: 'Title is required' });
    }
    const result = await pool.query(
      `INSERT INTO todos (title, description, priority) VALUES ($1, $2, $3) RETURNING *`,
      [title.trim(), description || '', priority || 'medium']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create todo' });
  }
});

// PUT update todo
app.put('/api/todos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, completed, priority } = req.body;
    const result = await pool.query(
      `UPDATE todos SET title = COALESCE($1, title), description = COALESCE($2, description),
       completed = COALESCE($3, completed), priority = COALESCE($4, priority),
       updated_at = CURRENT_TIMESTAMP WHERE id = $5 RETURNING *`,
      [title, description, completed, priority, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Todo not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update todo' });
  }
});

// DELETE todo
app.delete('/api/todos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM todos WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Todo not found' });
    }
    res.json({ message: 'Todo deleted successfully', todo: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete todo' });
  }
});

// ==================== TESTS ====================

describe('Health Check', () => {
  test('GET /health - should return ok status', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('GET /api/todos', () => {
  test('should return list of todos', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 1, title: 'Test Todo', completed: false, priority: 'medium' }]
    });
    const res = await request(app).get('/api/todos');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].title).toBe('Test Todo');
  });

  test('should return 500 on database error', async () => {
    pool.query.mockRejectedValueOnce(new Error('DB error'));
    const res = await request(app).get('/api/todos');
    expect(res.statusCode).toBe(500);
  });
});

describe('GET /api/todos/:id', () => {
  test('should return a single todo', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 1, title: 'Test Todo', completed: false }]
    });
    const res = await request(app).get('/api/todos/1');
    expect(res.statusCode).toBe(200);
    expect(res.body.id).toBe(1);
  });

  test('should return 404 if todo not found', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get('/api/todos/999');
    expect(res.statusCode).toBe(404);
    expect(res.body.error).toBe('Todo not found');
  });
});

describe('POST /api/todos', () => {
  test('should create a new todo', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 1, title: 'New Todo', description: '', priority: 'medium', completed: false }]
    });
    const res = await request(app).post('/api/todos').send({ title: 'New Todo' });
    expect(res.statusCode).toBe(201);
    expect(res.body.title).toBe('New Todo');
  });

  test('should return 400 if title is missing', async () => {
    const res = await request(app).post('/api/todos').send({ description: 'No title' });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Title is required');
  });

  test('should return 400 if title is empty string', async () => {
    const res = await request(app).post('/api/todos').send({ title: '   ' });
    expect(res.statusCode).toBe(400);
  });
});

describe('PUT /api/todos/:id', () => {
  test('should update an existing todo', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 1, title: 'Updated', completed: true, priority: 'high' }]
    });
    const res = await request(app).put('/api/todos/1').send({ title: 'Updated', completed: true });
    expect(res.statusCode).toBe(200);
    expect(res.body.title).toBe('Updated');
  });

  test('should return 404 if todo not found', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).put('/api/todos/999').send({ title: 'X' });
    expect(res.statusCode).toBe(404);
  });
});

describe('DELETE /api/todos/:id', () => {
  test('should delete a todo', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 1, title: 'Test Todo' }]
    });
    const res = await request(app).delete('/api/todos/1');
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Todo deleted successfully');
  });

  test('should return 404 if todo not found', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).delete('/api/todos/999');
    expect(res.statusCode).toBe(404);
  });
});
