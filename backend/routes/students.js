const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { validateCPF } = require('../utils/helpers');

const router = express.Router();

// Listar alunos com paginação e filtros
router.get('/', authenticateToken, async (req, res) => {
  const { search, course, status, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  
  let query = `
    SELECT s.*, c.name as course_name, c.code as course_code
    FROM students s
    JOIN courses c ON s.course_id = c.id
    WHERE 1=1
  `;
  const params = [];
  let paramIndex = 1;

  if (search) {
    query += ` AND (s.name ILIKE $${paramIndex} OR s.email ILIKE $${paramIndex} OR s.cpf LIKE $${paramIndex})`;
    params.push(`%${search}%`);
    paramIndex++;
  }

  if (course) {
    query += ` AND s.course_id = $${paramIndex}`;
    params.push(course);
    paramIndex++;
  }

  if (status) {
    query += ` AND s.status = $${paramIndex}`;
    params.push(status);
    paramIndex++;
  }

  query += ` ORDER BY s.name LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  params.push(limit, offset);

  try {
    const students = await pool.query(query, params);
    const total = await pool.query('SELECT COUNT(*) as total FROM students');

    res.json({
      students: students.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(total.rows[0].total),
        pages: Math.ceil(total.rows[0].total / limit)
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao buscar alunos' });
  }
});

// Buscar aluno por ID
router.get('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT s.*, c.name as course_name, c.code as course_code
       FROM students s
       JOIN courses c ON s.course_id = c.id
       WHERE s.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Aluno não encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar aluno' });
  }
});

// Criar novo aluno
router.post('/', authenticateToken, [
  body('name').notEmpty().withMessage('Nome é obrigatório'),
  body('email').isEmail().withMessage('E-mail inválido'),
  body('cpf').notEmpty().withMessage('CPF é obrigatório'),
  body('birth_date').notEmpty().withMessage('Data de nascimento é obrigatória'),
  body('course_id').isInt().withMessage('Curso inválido')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, email, cpf, birth_date, phone, address, course_id } = req.body;

  if (!validateCPF(cpf)) {
    return res.status(400).json({ message: 'CPF inválido' });
  }

  try {
    // Verificar CPF duplicado
    const existingCPF = await pool.query(
      'SELECT * FROM students WHERE cpf = $1',
      [cpf]
    );
    if (existingCPF.rows.length > 0) {
      return res.status(400).json({ message: 'CPF já cadastrado' });
    }

    // Verificar email duplicado
    const existingEmail = await pool.query(
      'SELECT * FROM students WHERE email = $1',
      [email]
    );
    if (existingEmail.rows.length > 0) {
      return res.status(400).json({ message: 'E-mail já cadastrado' });
    }

    const result = await pool.query(
      `INSERT INTO students (name, email, cpf, birth_date, phone, address, course_id, user_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [name, email, cpf, birth_date, phone, address, course_id, req.user.id]
    );

    // Registrar matrícula
    await pool.query(
      'INSERT INTO enrollments (student_id, course_id) VALUES ($1, $2)',
      [result.rows[0].id, course_id]
    );

    // Registrar log
    await pool.query(
      'INSERT INTO logs (user_id, action, details) VALUES ($1, $2, $3)',
      [req.user.id, 'create_student', `Cadastrou aluno: ${name} (${cpf})`]
    );

    res.status(201).json({
      message: 'Aluno matriculado com sucesso',
      student: result.rows[0]
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao cadastrar aluno' });
  }
});

// Atualizar aluno
router.put('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { name, email, cpf, birth_date, phone, address, course_id, status } = req.body;

  try {
    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (name) { updates.push(`name = $${paramIndex}`); params.push(name); paramIndex++; }
    if (email) { updates.push(`email = $${paramIndex}`); params.push(email); paramIndex++; }
    if (cpf) { 
      if (!validateCPF(cpf)) return res.status(400).json({ message: 'CPF inválido' });
      updates.push(`cpf = $${paramIndex}`); 
      params.push(cpf); 
      paramIndex++;
    }
    if (birth_date) { updates.push(`birth_date = $${paramIndex}`); params.push(birth_date); paramIndex++; }
    if (phone) { updates.push(`phone = $${paramIndex}`); params.push(phone); paramIndex++; }
    if (address) { updates.push(`address = $${paramIndex}`); params.push(address); paramIndex++; }
    if (course_id) { updates.push(`course_id = $${paramIndex}`); params.push(course_id); paramIndex++; }
    if (status) { updates.push(`status = $${paramIndex}`); params.push(status); paramIndex++; }
    
    params.push(id);

    const result = await pool.query(
      `UPDATE students SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Aluno não encontrado' });
    }

    await pool.query(
      'INSERT INTO logs (user_id, action, details) VALUES ($1, $2, $3)',
      [req.user.id, 'update_student', `Atualizou aluno ID: ${id}`]
    );

    res.json({
      message: 'Aluno atualizado com sucesso',
      student: result.rows[0]
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao atualizar aluno' });
  }
});

// Excluir aluno (soft delete)
router.delete('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `UPDATE students SET status = 'inactive' WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Aluno não encontrado' });
    }

    await pool.query(
      'INSERT INTO logs (user_id, action, details) VALUES ($1, $2, $3)',
      [req.user.id, 'delete_student', `Removeu aluno ID: ${id}`]
    );

    res.json({ message: 'Aluno removido com sucesso' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao remover aluno' });
  }
});

module.exports = router;