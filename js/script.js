const REGISTRATION_ERROR_MESSAGE = 'Algo salio mal.';
const PASSWORD_MIN_LENGTH = 6;
const AR_COUNTRY_CODE = '54';
const AR_LOCAL_PHONE_LENGTH = 10;
const FINGERPRINT_SCRIPT_URL = 'https://openfpcdn.io/fingerprintjs/v4';

const readEnv = (key, fallback) => {
  const value = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env[key] : undefined;
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
};

const formatApgUrl = () => {
  try {
    const currentUrl = new URL(window.location.href);
    currentUrl.hostname = currentUrl.hostname.replace(/^[^.]+/, 'apg');
    return `${currentUrl.origin}/v0/identity`;
  } catch (_error) {
    return 'https://apg.cuatrobet.com/v0/identity';
  }
};

const landingConfig = {
  apiKey: readEnv('VITE_CUATROBET_API_KEY', 'f57361d7-f180-46d8-8b71-805288f3fb2a'),
  registrationUrl: readEnv('VITE_CUATROBET_REGISTRATION_URL', `${formatApgUrl()}/registration/byform`),
  redirectDomain: readEnv('VITE_CUATROBET_REDIRECT_DOMAIN', 'https://cuatrobet.com'),
  defaultCurrency: readEnv('VITE_CUATROBET_DEFAULT_CURRENCY', 'ARS'),
  selectedLanguage: readEnv('VITE_CUATROBET_SELECTED_LANGUAGE', 'es'),
  verificationLinkVersion: readEnv('VITE_CUATROBET_VERIFICATION_LINK_VERSION', '2'),
};

let fingerprintVisitorIdPromise;

const readCookie = (name) => {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = document.cookie.match(new RegExp(`(?:^|; )${escapedName}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
};

const getPhoneLocalDigits = (phoneNumber = '') => {
  const digits = String(phoneNumber).replace(/\D/g, '');
  return digits.startsWith(AR_COUNTRY_CODE) ? digits.slice(AR_COUNTRY_CODE.length) : digits;
};

const normalizePhone = (phoneNumber = '') => {
  const localDigits = getPhoneLocalDigits(phoneNumber);
  return localDigits ? `+${AR_COUNTRY_CODE}${localDigits}` : '';
};

const getFingerprintVisitorId = async () => {
  if (!fingerprintVisitorIdPromise) {
    fingerprintVisitorIdPromise = import(/* @vite-ignore */ FINGERPRINT_SCRIPT_URL)
      .then((module) => module.default.load())
      .then((agent) => agent.get())
      .then((result) => result.visitorId)
      .catch(() => '');
  }

  return fingerprintVisitorIdPromise;
};

const isStandalonePwa = () =>
  ('standalone' in window.navigator && window.navigator.standalone) ||
  window.matchMedia('(display-mode: standalone)').matches;

const isWebView = () => {
  const rules = [
    'WebView',
    '(iPhone|iPod|iPad)(?!.*Safari)',
    'Android.*(wv|.0.0.0)',
    'Linux; U; Android',
  ];

  return new RegExp(`(${rules.join('|')})`, 'i').test(window.navigator.userAgent)
    && !window.navigator.userAgent.toLowerCase().includes('build');
};

const getXChannel = () => {
  if (isWebView()) {
    return 'MOBILE_WEB';
  }

  if (isStandalonePwa()) {
    return 'PWA';
  }

  return window.innerWidth >= 1280 ? 'DESKTOP_AIR_PM' : 'MOBILE_WEB';
};

const collectMarketingMeta = () => {
  if (window.MTFEF && typeof window.MTFEF.collectSources === 'function') {
    try {
      const sources = window.MTFEF.collectSources();
      if (sources) {
        return sources;
      }
    } catch (_error) {
      // Fall back to cookie and query extraction below.
    }
  }

  if (typeof window.collectCookies === 'function') {
    try {
      const cookies = window.collectCookies();
      if (cookies && Object.keys(cookies).length > 0) {
        return cookies;
      }
    } catch (_error) {
      // Ignore and continue to query/cookie extraction.
    }
  }

  const query = new URLSearchParams(window.location.search);
  const cookieMap = {
    adtag: readCookie('adtag'),
    btag: readCookie('pm_btag'),
    siteid: readCookie('pm_siteid'),
    qtag: readCookie('qtag'),
    adtag_t: readCookie('adtag_t'),
    btag_t: readCookie('btag_t'),
    qtag_t: readCookie('qtag_t'),
    org: readCookie('org'),
    org_t: readCookie('org_t'),
    sourceURL: readCookie('sourceUrl'),
    iohash: readCookie('iohash'),
  };

  const queryMap = [
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_term',
    'utm_content',
    'gclid',
    'fbclid',
  ].reduce((accumulator, key) => {
    const value = query.get(key);
    if (value) {
      accumulator[key] = value;
    }
    return accumulator;
  }, {});

  return Object.entries({ ...cookieMap, ...queryMap }).reduce((accumulator, [key, value]) => {
    if (typeof value === 'string' && value.trim()) {
      accumulator[key] = value;
    }
    return accumulator;
  }, {});
};

const getHostnameFromUrl = (value) => {
  try {
    return new URL(value).hostname;
  } catch {
    return '';
  }
};

const getApexCuatrobetDomain = () => {
  const { hostname } = window.location;

  if (hostname === 'cuatrobet.com' || hostname.endsWith('.cuatrobet.com')) {
    return 'cuatrobet.com';
  }

  return '';
};

const canSetCookieForDomain = (targetHostname) => {
  if (!targetHostname) {
    return false;
  }

  const currentHostname = window.location.hostname;
  return currentHostname === targetHostname || currentHostname.endsWith(`.${targetHostname}`);
};

const getCookieDomain = (targetHostname) => (canSetCookieForDomain(targetHostname) ? `; domain=${targetHostname}` : '');

const persistAuthToken = (token, redirectDomain) => {
  if (!token) {
    return;
  }

  const targetHostname = getHostnameFromUrl(redirectDomain);
  const cookieDomain = getCookieDomain(targetHostname);
  const secureSuffix = window.location.protocol === 'https:' ? '; Secure' : '';

  document.cookie = `thirdPartyAuthToken=${token}; path=/; SameSite=Lax${cookieDomain}${secureSuffix}`;
  document.cookie = `airToken=${token}; path=/; SameSite=Lax${cookieDomain}${secureSuffix}`;
};

const buildHeaders = async () => {
  const headers = new Headers({
    'Content-Type': 'application/json',
    'X-Api-Key': landingConfig.apiKey,
    'X-Channel': getXChannel(),
    'X-Response-Error': 'true',
    'X-Landing': 'true',
    'X-VerificationLinkVersion': landingConfig.verificationLinkVersion,
  });

  const visitorId = await getFingerprintVisitorId();
  if (visitorId) {
    headers.set('X-ClientId', visitorId);
  }

  return headers;
};

const parseErrorResponse = async (response) => {
  try {
    return await response.json();
  } catch {
    try {
      return await response.text();
    } catch {
      return null;
    }
  }
};

const resolveRedirectDomain = (apiResponse) => {
  const apexDomain = getApexCuatrobetDomain();
  if (apexDomain) {
    return `https://${apexDomain}`;
  }

  if (typeof apiResponse?.redirectDomain === 'string' && apiResponse.redirectDomain.trim()) {
    return apiResponse.redirectDomain;
  }

  return landingConfig.redirectDomain;
};

const buildRedirectUrl = (redirectDomain, bonusCode) => {
  const baseUrl = new URL('/deposit/', redirectDomain);
  const currentParams = new URLSearchParams(window.location.search);
  const parts = ['promo', 'landing', `bonus=${encodeURIComponent(bonusCode)}`];

  currentParams.forEach((value, key) => {
    if (key !== 'promo' && key !== 'landing' && key !== 'bonus') {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
    }
  });

  return `${baseUrl.toString()}?${parts.join('&')}`;
};

const submitRegistrationDirect = async (payload) => {
  const headers = await buildHeaders();
  let response;

  try {
    response = await fetch(landingConfig.registrationUrl, {
      method: 'POST',
      credentials: 'include',
      headers,
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error('Registration request failed', error);
    throw new Error(REGISTRATION_ERROR_MESSAGE);
  }

  if (!response.ok) {
    const errorPayload = await parseErrorResponse(response);
    console.error('Registration request failed', {
      status: response.status,
      statusText: response.statusText,
      payload: errorPayload,
    });
    throw new Error(REGISTRATION_ERROR_MESSAGE);
  }

  const data = await response.json();
  const redirectDomain = resolveRedirectDomain(data);
  persistAuthToken(data?.token, redirectDomain);

  if (window.MTFEF && typeof window.MTFEF.registerCallback === 'function') {
    try {
      window.MTFEF.registerCallback();
    } catch (error) {
      console.error('MTFEF.registerCallback failed', error);
    }
  }

  window.location.assign(buildRedirectUrl(redirectDomain, payload.nnBonus || '1'));
};

const initRegistrationForm = () => {
  const form = document.getElementById('register-form');
  if (!form || form.dataset.patricioInitialized === 'true') {
    return;
  }
  form.dataset.patricioInitialized = 'true';

  const phoneInput = document.getElementById('phone');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const passwordInfo = document.getElementById('passwordInfo');
  const togglePassword = document.getElementById('togglePassword');
  const submitBtn = document.getElementById('submitBtn');
  const serverError = document.getElementById('register-form-error');

  const openBonusModal = document.getElementById('openBonusModal');
  const bonusModal = document.getElementById('bonusModal');
  const closeBonusModal = document.getElementById('closeBonusModal');
  const bonusModalOverlay = document.getElementById('bonusModalOverlay');
  const bonusCards = Array.from(document.querySelectorAll('.bonus-card'));

  const selectedBonusText = document.getElementById('selectedBonusText');
  const selectedBonusImage = document.getElementById('selectedBonusImage');
  const selectedBonusLabel = document.querySelector('.bonus-select__label');
  const selectedBonusInput = document.getElementById('selected-bonus-input');
  const selectedBonusCode = document.getElementById('selected-bonus-code');

  const agreementInput = document.getElementById('agreement');
  const agreementField = document.getElementById('agreementField');

  const phoneBox = phoneInput ? phoneInput.closest('.phone-box') : null;
  const emailBox = emailInput ? emailInput.closest('.field-box') : null;
  const passwordBox = passwordInput ? passwordInput.closest('.field-box') : null;

  const touched = {
    bonus: false,
    phone: false,
    email: false,
    password: false,
    agreement: false,
  };

  let hasAttemptedSubmit = false;
  let phoneDisplay = null;

  const createErrorNode = (container, message) => {
    if (!container) {
      return null;
    }

    const node = document.createElement('div');
    node.className = 'form-error';
    node.textContent = message;
    container.appendChild(node);
    return node;
  };

  const bonusError = createErrorNode(openBonusModal?.parentElement, 'Selecciona un bono.');
  const phoneError = createErrorNode(phoneBox?.closest('.form-field'), 'Ingresa un numero de telefono valido.');
  const emailError = createErrorNode(emailBox?.closest('.form-field'), 'Ingresa un correo electronico valido.');
  const agreementError = createErrorNode(agreementField, 'Debes aceptar los terminos.');

  const setErrorVisibility = (errorNode, isVisible) => {
    if (!errorNode) {
      return;
    }

    errorNode.classList.toggle('is-visible', isVisible);
  };

  const setServerError = (message = '') => {
    if (!serverError) {
      return;
    }

    const hasMessage = Boolean(message.trim());
    serverError.hidden = !hasMessage;
    serverError.textContent = message;
    serverError.classList.toggle('is-visible', hasMessage);
  };

  const setSubmitting = (isSubmitting) => {
    if (!submitBtn) {
      return;
    }

    submitBtn.disabled = isSubmitting;
    submitBtn.textContent = isSubmitting ? 'Procesando...' : 'Registrarse';
  };

  const updatePasswordHint = () => {
    if (!passwordInput || !passwordInfo) {
      return;
    }

    const isValidLength = passwordInput.value.length >= PASSWORD_MIN_LENGTH;
    passwordInfo.classList.toggle('is-valid', isValidLength);
  };

  const openModal = () => {
    if (!bonusModal) {
      return;
    }

    bonusModal.hidden = false;
    document.body.style.overflow = 'hidden';
  };

  const closeModal = () => {
    if (!bonusModal) {
      return;
    }

    bonusModal.hidden = true;
    document.body.style.overflow = '';
  };

  const updateSelectedBonus = (card) => {
    if (!card) {
      return;
    }

    const bonusTitle = card.querySelector('.bonus-card__title');
    const bonusSmall = card.querySelector('.bonus-card__small');
    const bonusImg = card.querySelector('.bonus-card__icon img');
    const bonusId = card.dataset.bonusId || 'casino';
    const bonusCode = card.dataset.nnBonus || '1';

    if (selectedBonusText && bonusTitle) {
      selectedBonusText.textContent = bonusTitle.textContent.trim();
    }

    if (selectedBonusLabel && bonusSmall) {
      selectedBonusLabel.textContent = bonusSmall.textContent.trim();
    }

    if (selectedBonusImage && bonusImg) {
      selectedBonusImage.src = bonusImg.src;
      selectedBonusImage.alt = bonusImg.alt || 'Bonus';
    }

    if (selectedBonusInput) {
      selectedBonusInput.value = bonusId;
    }

    if (selectedBonusCode) {
      selectedBonusCode.value = bonusCode;
    }

    window.nnbonus = bonusCode;
    window.landing_type = 'registration_on_landing';
  };

  const getPhoneDigits = (value) => getPhoneLocalDigits(value).slice(0, AR_LOCAL_PHONE_LENGTH);

  const formatPhoneParts = (digits) => {
    const template = '(XXX) XXX-XXXX';

    if (digits.length === 0) {
      return {
        filled: '+54',
        rest: ` ${template}`,
      };
    }

    let filled = '';
    let rest = '';
    let digitIndex = 0;
    let passedDigits = false;

    for (let index = 0; index < template.length; index += 1) {
      const character = template[index];

      if (character === 'X') {
        if (digitIndex < digits.length) {
          filled += digits[digitIndex];
          digitIndex += 1;
        } else {
          passedDigits = true;
          rest += 'X';
        }
      } else if (!passedDigits) {
        filled += character;
      } else {
        rest += character;
      }
    }

    return {
      filled: `+54 ${filled}`,
      rest,
    };
  };

  const renderPhoneDisplay = () => {
    if (!phoneDisplay || !phoneInput) {
      return;
    }

    const digits = getPhoneDigits(phoneInput.value);
    const parts = formatPhoneParts(digits);
    phoneDisplay.innerHTML = `<span class="phone-box__filled">${parts.filled}</span><span class="phone-box__rest">${parts.rest}</span>`;
  };

  const updatePhoneInput = (digits) => {
    if (!phoneInput) {
      return;
    }

    const safeDigits = String(digits || '').replace(/\D/g, '').slice(0, AR_LOCAL_PHONE_LENGTH);
    phoneInput.value = `+54${safeDigits}`;
    renderPhoneDisplay();
  };

  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const getActiveBonusCard = () => document.querySelector('.bonus-card.is-active');

  const validateForm = (shouldShowErrors = false) => {
    const phoneDigits = phoneInput ? getPhoneDigits(phoneInput.value) : '';
    const emailValue = emailInput ? emailInput.value.trim() : '';
    const passwordValue = passwordInput ? passwordInput.value : '';
    const hasActiveBonus = Boolean(getActiveBonusCard());
    const isAgreementChecked = agreementInput ? agreementInput.checked : false;

    const isPhoneValid = phoneDigits.length === AR_LOCAL_PHONE_LENGTH;
    const isEmailValid = isValidEmail(emailValue);
    const isPasswordValid = passwordValue.length >= PASSWORD_MIN_LENGTH;

    openBonusModal?.classList.toggle('is-error', shouldShowErrors && !hasActiveBonus);
    phoneBox?.classList.toggle('is-error', shouldShowErrors && !isPhoneValid);
    emailBox?.classList.toggle('is-error', shouldShowErrors && !isEmailValid);
    passwordBox?.classList.toggle('is-error', shouldShowErrors && !isPasswordValid);
    passwordInfo?.classList.toggle('is-error', shouldShowErrors && !isPasswordValid);
    agreementField?.classList.toggle('is-error', shouldShowErrors && !isAgreementChecked);

    setErrorVisibility(bonusError, shouldShowErrors && !hasActiveBonus);
    setErrorVisibility(phoneError, shouldShowErrors && !isPhoneValid);
    setErrorVisibility(emailError, shouldShowErrors && !isEmailValid);
    setErrorVisibility(agreementError, shouldShowErrors && !isAgreementChecked);

    return hasActiveBonus && isPhoneValid && isEmailValid && isPasswordValid && isAgreementChecked;
  };

  const gatherSubmissionData = () => {
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    if (typeof window.getLastCookie === 'function') {
      Object.assign(data, window.getLastCookie());
    }

    data.defaultCurrency = data.defaultCurrency || landingConfig.defaultCurrency;
    data.selectedLanguage = data.selectedLanguage || landingConfig.selectedLanguage;
    data.phone = normalizePhone(data.phone);
    data.nnBonus = data.nnBonus || '1';
    data.isPlayerAgree = true;
    data.formName = 'SHORTREGISTRATIONBYPHONE';
    data.marketingMeta = collectMarketingMeta();

    delete data.agreement;
    delete data.selectedBonus;

    if (!data.email || !String(data.email).trim()) {
      delete data.email;
    }

    return data;
  };

  const submitThroughSharedFlow = (data) => {
    window.nnbonus = data.nnBonus || '1';
    window.landing_type = 'registration_on_landing';

    return new Promise((resolve, reject) => {
      window.sendApiRequest(
        data,
        (response) => {
          const tagParams = document.location.search;
          let redirectTo = response?.redirectDomain || 'https://cuatrobet.com';

          if (['localhost', '127.0.0.1', '0.0.0.0'].includes(window.location.hostname)) {
            redirectTo = 'https://cuatrobet.com';
          }

          window.location.href = `${redirectTo}/deposit/?promo&landing&bonus=${window.nnbonus}&${tagParams.slice(1)}`;
          resolve();
        },
        (response) => {
          reject(new Error(response?.message || REGISTRATION_ERROR_MESSAGE));
        },
        (response) => {
          reject(new Error(response?.message || REGISTRATION_ERROR_MESSAGE));
        },
      );
    });
  };

  if (phoneBox && phoneInput) {
    phoneDisplay = document.createElement('div');
    phoneDisplay.className = 'phone-box__display';
    phoneBox.insertBefore(phoneDisplay, phoneInput);
    updatePhoneInput('');

    phoneInput.addEventListener('focus', () => {
      touched.phone = true;
      renderPhoneDisplay();
    });

    phoneInput.addEventListener('click', () => {
      phoneInput.blur();
      phoneInput.focus();
    });

    phoneInput.addEventListener('keydown', (event) => {
      const currentDigits = getPhoneDigits(phoneInput.value);

      if (/^\d$/.test(event.key)) {
        event.preventDefault();
        if (currentDigits.length < AR_LOCAL_PHONE_LENGTH) {
          updatePhoneInput(currentDigits + event.key);
          validateForm(hasAttemptedSubmit);
        }
        return;
      }

      if (event.key === 'Backspace') {
        event.preventDefault();
        updatePhoneInput(currentDigits.slice(0, -1));
        validateForm(hasAttemptedSubmit);
        return;
      }

      if (event.key === 'Delete') {
        event.preventDefault();
        updatePhoneInput('');
        validateForm(hasAttemptedSubmit);
        return;
      }

      if (event.key !== 'Tab') {
        event.preventDefault();
      }
    });

    phoneInput.addEventListener('paste', (event) => {
      event.preventDefault();
      const pasted = (event.clipboardData || window.clipboardData).getData('text');
      const nextDigits = `${getPhoneDigits(phoneInput.value)}${String(pasted).replace(/\D/g, '')}`.slice(0, AR_LOCAL_PHONE_LENGTH);
      updatePhoneInput(nextDigits);
      validateForm(hasAttemptedSubmit);
    });
  }

  openBonusModal?.addEventListener('click', () => {
    touched.bonus = true;
    openModal();
    validateForm(hasAttemptedSubmit);
  });

  closeBonusModal?.addEventListener('click', closeModal);
  bonusModalOverlay?.addEventListener('click', closeModal);

  bonusCards.forEach((card) => {
    card.addEventListener('click', () => {
      touched.bonus = true;
      bonusCards.forEach((item) => item.classList.remove('is-active'));
      card.classList.add('is-active');
      updateSelectedBonus(card);
      closeModal();
      validateForm(hasAttemptedSubmit);
    });
  });

  const activeCard = getActiveBonusCard();
  if (activeCard) {
    updateSelectedBonus(activeCard);
  }

  emailInput?.addEventListener('input', () => {
    touched.email = true;
    setServerError('');
    validateForm(hasAttemptedSubmit);
  });

  passwordInput?.addEventListener('input', () => {
    touched.password = true;
    setServerError('');
    updatePasswordHint();
    validateForm(hasAttemptedSubmit);
  });

  agreementInput?.addEventListener('change', () => {
    touched.agreement = true;
    setServerError('');
    validateForm(hasAttemptedSubmit);
  });

  togglePassword?.addEventListener('click', () => {
    if (!passwordInput) {
      return;
    }

    passwordInput.type = passwordInput.type === 'password' ? 'text' : 'password';
  });

  form.addEventListener(
    'submit',
    async (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();

      touched.bonus = true;
      touched.phone = true;
      touched.email = true;
      touched.password = true;
      touched.agreement = true;
      hasAttemptedSubmit = true;
      setServerError('');

      if (!validateForm(true)) {
        return;
      }

      const data = gatherSubmissionData();
      setSubmitting(true);

      try {
        if (typeof window.sendApiRequest === 'function') {
          await submitThroughSharedFlow(data);
        } else {
          await submitRegistrationDirect(data);
        }
      } catch (error) {
        setServerError(error instanceof Error ? error.message : REGISTRATION_ERROR_MESSAGE);
      } finally {
        setSubmitting(false);
      }
    },
    true,
  );

  updatePasswordHint();
  validateForm(false);
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initRegistrationForm, { once: true });
} else {
  initRegistrationForm();
}
