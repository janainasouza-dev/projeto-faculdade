const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { authenticateToken, isAdmin } = require('../middleware/auth');

const router = express.Router();

// Listar cursos
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.*, COUNT(s.id) as total_students
      FROM courses c
      LEFT JOIN students s ON c.id = s.course_id
      WHERE c.is_active = true
      GROUP BY c.id
      ORDER BY c.name
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar cursos' });
  }
});

// Criar curso (apenas admin)
router.post('/', authenticateToken, isAdmin, [
  body('code').notEmpty(),
  body('name').notEmpty(),
  body('duration_hours').isInt(),
  body('workload_hours').isInt()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { code, name, description, duration_hours, workload_hours } = req.body;

  try {
    const existing = await pool.query(
      'SELECT * FROM courses WHERE code = $1',
      [code]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'Código de curso já existe' });
    }

    const result = await pool.query(
      `INSERT INTO courses (code, name, description, duration_hours, workload_hours) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [code, name, description, duration_hours, workload_hours]
    );

    res.status(201).json({
      message: 'Curso criado com sucesso',
      course: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao criar curso' });
  }
});

module.exports = router;