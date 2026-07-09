const loginForm = document.querySelector('#loginForm');
const registerForm = document.querySelector('#registerForm');
const walletForm = document.querySelector('#walletForm');
const loginError = document.querySelector('#loginError');
const registerError = document.querySelector('#registerError');
const walletError = document.querySelector('#walletError');
const loginButton = document.querySelector('#loginButton');
const registerButton = document.querySelector('#registerButton');
const walletButton = document.querySelector('#walletButton');
const showLoginTabButton = document.querySelector('#showLoginTab');
const showRegisterTabButton = document.querySelector('#showRegisterTab');
const authModeLabel = document.querySelector('#authModeLabel');
const authTitle = document.querySelector('#authTitle');
const authSubtitle = document.querySelector('#authSubtitle');
const walletModal = document.querySelector('#walletModal');

function getAdminToken() {
  return localStorage.getItem('admin_token') || localStorage.getItem('token') || '';
}

function setStoredSession(data) {
  localStorage.setItem('admin_token', data.token);
  localStorage.setItem('token', data.token);
  localStorage.setItem('admin_user', JSON.stringify(data.admin));
}

function clearStoredSession() {
  localStorage.removeItem('admin_token');
  localStorage.removeItem('token');
  localStorage.removeItem('admin_user');
}

function showError(element, message) {
  element.textContent = message;
  element.classList.remove('hidden');
}

function clearError(element) {
  element.textContent = '';
  element.classList.add('hidden');
}

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function setAuthMode(mode) {
  const isLogin = mode === 'login';

  loginForm.classList.toggle('hidden', !isLogin);
  registerForm.classList.toggle('hidden', isLogin);
  showLoginTabButton.className = isLogin
    ? 'h-10 rounded-xl bg-gold-500 px-4 text-xs font-extrabold text-black'
    : 'h-10 rounded-xl px-4 text-xs font-extrabold text-panel-muted hover:text-gold-50';
  showRegisterTabButton.className = !isLogin
    ? 'h-10 rounded-xl bg-gold-500 px-4 text-xs font-extrabold text-black'
    : 'h-10 rounded-xl px-4 text-xs font-extrabold text-panel-muted hover:text-gold-50';
  authModeLabel.textContent = isLogin ? 'Login' : 'Novo cadastro';
  authTitle.textContent = isLogin ? 'Entrar no painel' : 'Criar conta';
  authSubtitle.textContent = isLogin
    ? 'Use o login ou email cadastrado para acessar seus dados reais.'
    : 'Crie seu acesso e ative a carteira de saque antes de vender rifas.';

  clearError(loginError);
  clearError(registerError);

  const firstField = isLogin ? loginForm.elements.login : registerForm.elements.email;
  firstField.focus();
}

function openWalletModal(admin) {
  walletForm.elements.nome.value = admin?.nome || '';
  walletForm.elements.email.value = admin?.email || '';
  walletForm.elements.whatsapp.value = admin?.whatsapp || '';
  clearError(walletError);
  walletModal.classList.remove('hidden');
  walletModal.classList.add('flex');
  walletForm.elements.nome.focus();
}

async function fetchCurrentProfile() {
  const token = getAdminToken();
  if (!token) return null;

  const response = await fetch('/api/v1/admin/perfil', {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  const payload = await response.json();

  if (!response.ok) {
    clearStoredSession();
    return null;
  }

  localStorage.setItem('admin_user', JSON.stringify(payload.data));
  return payload.data;
}

function hasActiveWallet(admin) {
  return Boolean(admin?.asaas?.conectado || admin?.mercado_pago?.conectado);
}

async function continueAfterAuth(admin) {
  if (hasActiveWallet(admin)) {
    window.location.href = '/painel';
    return;
  }

  const profile = await fetchCurrentProfile();
  openWalletModal(profile || admin);
}

async function submitLogin(event) {
  event.preventDefault();
  clearError(loginError);
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

    setStoredSession(payload.data);
    await continueAfterAuth(payload.data.admin);
  } catch (error) {
    showError(loginError, error.message);
    loginButton.disabled = false;
    loginButton.textContent = 'Entrar';
  }
}

async function submitRegister(event) {
  event.preventDefault();
  clearError(registerError);
  registerButton.disabled = true;
  registerButton.textContent = 'Criando conta...';

  const formData = new FormData(registerForm);

  try {
    const response = await fetch('/api/v1/auth/register', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: formData.get('email'),
        password: formData.get('password'),
      }),
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error?.message || 'Nao foi possivel criar a conta.');
    }

    setStoredSession(payload.data);
    await continueAfterAuth(payload.data.admin);
  } catch (error) {
    showError(registerError, error.message);
  } finally {
    registerButton.disabled = false;
    registerButton.textContent = 'Criar conta e ativar carteira';
  }
}

async function submitWallet(event) {
  event.preventDefault();
  clearError(walletError);

  const formData = new FormData(walletForm);
  const cpfCnpj = onlyDigits(formData.get('cpf_cnpj'));
  const whatsapp = onlyDigits(formData.get('whatsapp'));
  const postalCode = onlyDigits(formData.get('postal_code'));

  if (![11, 14].includes(cpfCnpj.length)) {
    showError(walletError, 'Informe um CPF ou CNPJ real, somente com numeros.');
    return;
  }

  if (whatsapp.length < 10) {
    showError(walletError, 'Informe um WhatsApp valido com DDD.');
    return;
  }

  if (postalCode.length !== 8) {
    showError(walletError, 'Informe um CEP valido com 8 numeros.');
    return;
  }

  walletButton.disabled = true;
  walletButton.textContent = 'Ativando carteira...';

  try {
    const token = getAdminToken();
    const response = await fetch('/api/v1/admin/gateways/asaas/connect', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        nome: formData.get('nome'),
        email: formData.get('email'),
        mobile_phone: whatsapp,
        whatsapp,
        cpf_cnpj: cpfCnpj,
        birth_date: formData.get('birth_date'),
        postal_code: postalCode,
        address: formData.get('address'),
        address_number: formData.get('address_number'),
        province: formData.get('province'),
        complement: formData.get('complement'),
        company_type: formData.get('company_type'),
        aceite_termos: formData.get('aceite_termos') === 'on',
      }),
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error?.message || 'Nao foi possivel ativar a carteira.');
    }

    const storedAdmin = JSON.parse(localStorage.getItem('admin_user') || '{}');
    localStorage.setItem('admin_user', JSON.stringify({
      ...storedAdmin,
      nome: formData.get('nome'),
      email: formData.get('email'),
      whatsapp,
      asaas: payload.data,
      gateway_preferido: 'asaas',
    }));

    window.location.href = '/painel';
  } catch (error) {
    showError(walletError, error.message);
    walletButton.disabled = false;
    walletButton.textContent = 'Ativar carteira e entrar';
  }
}

async function bootstrap() {
  loginForm.addEventListener('submit', submitLogin);
  registerForm.addEventListener('submit', submitRegister);
  walletForm.addEventListener('submit', submitWallet);
  showLoginTabButton.addEventListener('click', () => setAuthMode('login'));
  showRegisterTabButton.addEventListener('click', () => setAuthMode('register'));
  setAuthMode('login');

  if (!getAdminToken()) return;

  const profile = await fetchCurrentProfile();
  if (!profile) return;
  if (hasActiveWallet(profile)) {
    window.location.href = '/painel';
    return;
  }

  clearStoredSession();
  showError(loginError, 'Entre novamente ou crie uma conta nova para ativar a carteira de saque.');
}

bootstrap();

lucide.createIcons();
