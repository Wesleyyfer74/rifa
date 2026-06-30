const loginForm = document.querySelector('#loginForm');
const loginError = document.querySelector('#loginError');
const loginButton = document.querySelector('#loginButton');

function getAdminToken() {
  return localStorage.getItem('admin_token') || localStorage.getItem('token') || '';
}

function showError(message) {
  loginError.textContent = message;
  loginError.classList.remove('hidden');
}

function clearError() {
  loginError.textContent = '';
  loginError.classList.add('hidden');
}

async function submitLogin(event) {
  event.preventDefault();
  clearError();
  loginButton.disabled = true;
  loginButton.textContent = 'Entrando...';

  const formData = new FormData(loginForm);

  try {
    const response = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        login: formData.get('login'),
        password: formData.get('password'),
      }),
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error?.message || 'Nao foi possivel entrar.');
    }

    localStorage.setItem('admin_token', payload.data.token);
    localStorage.setItem('admin_user', JSON.stringify(payload.data.admin));
    window.location.href = '/painel';
  } catch (error) {
    showError(error.message);
    loginButton.disabled = false;
    loginButton.textContent = 'Entrar';
  }
}

if (getAdminToken()) {
  window.location.href = '/painel';
} else {
  loginForm.addEventListener('submit', submitLogin);
  loginForm.elements.login.focus();
}

lucide.createIcons();
