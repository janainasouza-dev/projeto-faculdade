// Gerenciamento de Estado
let users = JSON.parse(localStorage.getItem('users')) || [];
let students = JSON.parse(localStorage.getItem('students')) || [];
let currentUser = JSON.parse(sessionStorage.getItem('currentUser')) || null;

// Elementos DOM
const loginContainer = document.getElementById('loginContainer');
const forgotContainer = document.getElementById('forgotContainer');
const registerContainer = document.getElementById('registerContainer');
const dashboardContainer = document.getElementById('dashboardContainer');
const toast = document.getElementById('toast');

// Funções de Utilidade
function showToast(message, type = 'success') {
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    setTimeout(() => {
        toast.className = 'toast';
    }, 3000);
}

function showContainer(containerId) {
    const containers = [loginContainer, forgotContainer, registerContainer, dashboardContainer];
    containers.forEach(container => {
        if (container) container.classList.remove('active');
    });
    document.getElementById(containerId).classList.add('active');
}

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function validateCPF(cpf) {
    cpf = cpf.replace(/[^\d]/g, '');
    if (cpf.length !== 11) return false;
    
    // Verifica se todos os dígitos são iguais
    if (/^(\d)\1{10}$/.test(cpf)) return false;
    
    // Validação do primeiro dígito verificador
    let sum = 0;
    for (let i = 0; i < 9; i++) {
        sum += parseInt(cpf.charAt(i)) * (10 - i);
    }
    let rev = 11 - (sum % 11);
    if (rev === 10 || rev === 11) rev = 0;
    if (rev !== parseInt(cpf.charAt(9))) return false;
    
    // Validação do segundo dígito verificador
    sum = 0;
    for (let i = 0; i < 10; i++) {
        sum += parseInt(cpf.charAt(i)) * (11 - i);
    }
    rev = 11 - (sum % 11);
    if (rev === 10 || rev === 11) rev = 0;
    if (rev !== parseInt(cpf.charAt(10))) return false;
    
    return true;
}

function formatCPF(value) {
    return value
        .replace(/\D/g, '')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})/, '$1-$2')
        .replace(/(-\d{2})\d+$/, '$1');
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
}

function getCourseName(courseId) {
    const courses = {
        'ads': 'Análise e Desenvolvimento de Sistemas',
        'cc': 'Ciência da Computação',
        'si': 'Sistemas de Informação',
        'engsoft': 'Engenharia de Software',
        'bd': 'Banco de Dados'
    };
    return courses[courseId] || courseId;
}

// Gerenciamento de Alunos
function renderStudents() {
    const tbody = document.getElementById('studentTableBody');
    const studentCount = document.getElementById('studentCount');
    
    if (!tbody) return;
    
    studentCount.textContent = students.length;
    
    if (students.length === 0) {
        tbody.innerHTML = '<tr class="empty-row"><td colspan="6">Nenhum aluno cadastrado ainda</td></tr>';
        return;
    }
    
    tbody.innerHTML = students.map((student, index) => `
        <tr>
            <td>${escapeHtml(student.name)}</td>
            <td>${escapeHtml(student.email)}</td>
            <td>${student.cpf}</td>
            <td>${formatDate(student.birthDate)}</td>
            <td>${getCourseName(student.course)}</td>
            <td><button class="delete-btn" onclick="deleteStudent(${index})">Excluir</button></td>
        </tr>
    `).join('');
}

function deleteStudent(index) {
    if (confirm('Tem certeza que deseja excluir este aluno?')) {
        students.splice(index, 1);
        localStorage.setItem('students', JSON.stringify(students));
        renderStudents();
        showToast('Aluno removido com sucesso!', 'success');
    }
}

function addStudent(studentData) {
    // Verifica se CPF já existe
    const existingStudent = students.find(s => s.cpf === studentData.cpf);
    if (existingStudent) {
        showToast('CPF já cadastrado!', 'error');
        return false;
    }
    
    // Verifica se e-mail já existe
    const existingEmail = students.find(s => s.email === studentData.email);
    if (existingEmail) {
        showToast('E-mail já cadastrado!', 'error');
        return false;
    }
    
    students.push(studentData);
    localStorage.setItem('students', JSON.stringify(students));
    renderStudents();
    return true;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Máscara do CPF
document.addEventListener('DOMContentLoaded', () => {
    const studentCPF = document.getElementById('studentCPF');
    if (studentCPF) {
        studentCPF.addEventListener('input', (e) => {
            e.target.value = formatCPF(e.target.value);
        });
    }
    
    // Verifica se usuário já está logado
    if (currentUser) {
        document.getElementById('currentUserEmail').textContent = currentUser.email;
        showContainer('dashboardContainer');
        renderStudents();
    }
});

// Tela de Login
document.getElementById('loginForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    if (!validateEmail(email)) {
        showToast('E-mail inválido!', 'error');
        return;
    }
    
    const user = users.find(u => u.email === email && u.password === password);
    
    if (user) {
        currentUser = user;
        sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
        document.getElementById('currentUserEmail').textContent = currentUser.email;
        showContainer('dashboardContainer');
        renderStudents();
        showToast('Login realizado com sucesso!', 'success');
        e.target.reset();
    } else {
        showToast('E-mail ou senha incorretos!', 'error');
    }
});

// Tela de Recuperação da Senha
document.getElementById('forgotForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('recoveryEmail').value;
    
    const user = users.find(u => u.email === email);
    
    if (user) {
        showToast(`Link de recuperação enviado para ${email}`, 'success');
        setTimeout(() => {
            showContainer('loginContainer');
        }, 2000);
    } else {
        showToast('E-mail não encontrado!', 'error');
    }
});

// Tela de Cadastro da Conta
document.getElementById('registerForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;
    
    if (!name || !email || !password) {
        showToast('Preencha todos os campos!', 'error');
        return;
    }
    
    if (!validateEmail(email)) {
        showToast('E-mail inválido!', 'error');
        return;
    }
    
    if (password.length < 6) {
        showToast('A senha deve ter no mínimo 6 caracteres!', 'error');
        return;
    }
    
    if (password !== confirmPassword) {
        showToast('As senhas não coincidem!', 'error');
        return;
    }
    
    if (users.find(u => u.email === email)) {
        showToast('E-mail já cadastrado!', 'error');
        return;
    }
    
    users.push({ name, email, password });
    localStorage.setItem('users', JSON.stringify(users));
    showToast('Conta criada com sucesso! Faça login.', 'success');
    showContainer('loginContainer');
    e.target.reset();
});

// Cadastro de Aluno
document.getElementById('studentForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const name = document.getElementById('studentName').value;
    const email = document.getElementById('studentEmail').value;
    const cpf = document.getElementById('studentCPF').value;
    const birthDate = document.getElementById('studentBirthDate').value;
    const course = document.getElementById('studentCourse').value;
    
    // Validações
    if (!name || !email || !cpf || !birthDate || !course) {
        showToast('Preencha todos os campos!', 'error');
        return;
    }
    
    if (!validateEmail(email)) {
        showToast('E-mail inválido!', 'error');
        return;
    }
    
    if (!validateCPF(cpf)) {
        showToast('CPF inválido!', 'error');
        return;
    }
    
    // Verifica idade (mínimo 16 anos)
    const birthDateObj = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birthDateObj.getFullYear();
    const monthDiff = today.getMonth() - birthDateObj.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDateObj.getDate())) {
        age--;
    }
    
    if (age < 16) {
        showToast('O aluno deve ter no mínimo 16 anos!', 'error');
        return;
    }
    
    const studentData = {
        name,
        email,
        cpf,
        birthDate,
        course,
        registrationDate: new Date().toISOString()
    };
    
    if (addStudent(studentData)) {
        showToast('Aluno matriculado com sucesso!', 'success');
        e.target.reset();
        document.getElementById('studentCPF').value = '';
    }
});

// Navegação entre telas
document.getElementById('forgotPasswordLink')?.addEventListener('click', (e) => {
    e.preventDefault();
    showContainer('forgotContainer');
});

document.getElementById('createAccountLink')?.addEventListener('click', (e) => {
    e.preventDefault();
    showContainer('registerContainer');
});

document.getElementById('backToLoginBtn')?.addEventListener('click', () => {
    showContainer('loginContainer');
});

document.getElementById('backToLoginFromRegister')?.addEventListener('click', () => {
    showContainer('loginContainer');
});

document.getElementById('logoutBtn')?.addEventListener('click', () => {
    currentUser = null;
    sessionStorage.removeItem('currentUser');
    showContainer('loginContainer');
    showToast('Logout realizado com sucesso!', 'success');
});

// Registrar função global para uso no HTML
window.deleteStudent = deleteStudent;

// Adicionar dados do exemplo 
if (users.length === 0) {
    users.push({
        name: 'Administrador',
        email: 'admin@escola.com',
        password: '123456'
    });
    localStorage.setItem('users', JSON.stringify(users));
}

// Adicionar alunos do exemplo 
if (students.length === 0) {
    const sampleStudents = [
        {
            name: 'João Silva',
            email: 'joao@email.com',
            cpf: '123.456.789-09',
            birthDate: '2000-05-15',
            course: 'ads',
            registrationDate: new Date().toISOString()
        },
        {
            name: 'Maria Santos',
            email: 'maria@email.com',
            cpf: '987.654.321-00',
            birthDate: '2001-08-22',
            course: 'cc',
            registrationDate: new Date().toISOString()
        }
    ];
    
    sampleStudents.forEach(student => {
        if (!students.find(s => s.cpf === student.cpf)) {
            students.push(student);
        }
    });
    localStorage.setItem('students', JSON.stringify(students));
}