document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('registerForm');
  if (!form) return;

  const phoneInput = document.getElementById('phone');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const passwordInfo = document.getElementById('passwordInfo');
  function updatePasswordHint() {
    if (!passwordInput || !passwordInfo) return;

    const isValidLength = passwordInput.value.length >= 6;
    passwordInfo.classList.toggle('is-valid', isValidLength);
  }
  const togglePassword = document.getElementById('togglePassword');
  const submitBtn = document.getElementById('submitBtn');

  const openBonusModal = document.getElementById('openBonusModal');
  const bonusModal = document.getElementById('bonusModal');
  const closeBonusModal = document.getElementById('closeBonusModal');
  const bonusModalOverlay = document.getElementById('bonusModalOverlay');
  const bonusCards = document.querySelectorAll('.bonus-card');

  const selectedBonusText = document.getElementById('selectedBonusText');
  const selectedBonusImage = document.getElementById('selectedBonusImage');
  const selectedBonusLabel = document.querySelector('.bonus-select__label');

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
    agreement: false
  };

  let phoneDisplay = null;

  if (phoneBox && phoneInput) {
    phoneDisplay = document.createElement('div');
    phoneDisplay.className = 'phone-box__display';
    phoneBox.insertBefore(phoneDisplay, phoneInput);
  }

  function openModal() {
    if (!bonusModal) return;
    bonusModal.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    if (!bonusModal) return;
    bonusModal.hidden = true;
    document.body.style.overflow = '';
  }

  if (openBonusModal) {
    openBonusModal.addEventListener('click', () => {
      touched.bonus = true;
      openModal();
      validateForm();
    });
  }

  if (closeBonusModal) {
    closeBonusModal.addEventListener('click', closeModal);
  }

  if (bonusModalOverlay) {
    bonusModalOverlay.addEventListener('click', closeModal);
  }

  function updateSelectedBonus(card) {
    if (!card) return;

    const bonusTitle = card.querySelector('.bonus-card__title');
    const bonusSmall = card.querySelector('.bonus-card__small');
    const bonusImg = card.querySelector('.bonus-card__icon img');

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
  }

  if (bonusCards.length) {
    bonusCards.forEach(card => {
      card.addEventListener('click', () => {
        touched.bonus = true;

        bonusCards.forEach(item => item.classList.remove('is-active'));
        card.classList.add('is-active');

        updateSelectedBonus(card);

        closeModal();
        validateForm();
      });
    });

    const activeCard = document.querySelector('.bonus-card.is-active');
    if (activeCard) {
      updateSelectedBonus(activeCard);
    }
  }

  function getPhoneDigits(value) {
    return value.replace(/\D/g, '').replace(/^54/, '').slice(0, 10);
  }

  function formatPhoneParts(digits) {

    const template = '(XXX) XXX-XXXX';

    if (digits.length === 0) {
      return {
        filled: '+54',
        rest: ` ${template}`
      };
    }

    let filled = '';
    let rest = '';
    let digitIndex = 0;
    let passedDigits = false;

    for (let i = 0; i < template.length; i++) {

      const char = template[i];

      if (char === 'X') {

        if (digitIndex < digits.length) {
          filled += digits[digitIndex];
          digitIndex++;
        } else {
          passedDigits = true;
          rest += 'X';
        }

      } else {

        if (!passedDigits) {
          filled += char;
        } else {
          rest += char;
        }

      }

    }

    return {
      filled: `+54 ${filled}`,
      rest
    };
  }


  function renderPhoneDisplay() {
    if (!phoneDisplay || !phoneInput) return;

    const digits = getPhoneDigits(phoneInput.value);
    const parts = formatPhoneParts(digits);

    phoneDisplay.innerHTML = `
      <span class="phone-box__filled">${parts.filled}</span><span class="phone-box__rest">${parts.rest}</span>
    `;
  }

  function updatePhoneInput(digits) {
    if (!phoneInput) return;

    const safeDigits = String(digits || '').replace(/\D/g, '').slice(0, 10);
    phoneInput.value = `+54${safeDigits}`;
    renderPhoneDisplay();
  }

  if (phoneInput) {
    updatePhoneInput('');

    phoneInput.addEventListener('focus', () => {
      touched.phone = true;
      renderPhoneDisplay();
    });

    phoneInput.addEventListener('click', () => {
      phoneInput.blur();
      phoneInput.focus();
    });

    phoneInput.addEventListener('blur', () => {
      validateForm();
    });

    phoneInput.addEventListener('keydown', (e) => {
      const currentDigits = getPhoneDigits(phoneInput.value);

      if (/^\d$/.test(e.key)) {
        e.preventDefault();

        if (currentDigits.length >= 10) return;

        updatePhoneInput(currentDigits + e.key);
        validateForm();
        return;
      }

      if (e.key === 'Backspace') {
        e.preventDefault();
        updatePhoneInput(currentDigits.slice(0, -1));
        validateForm();
        return;
      }

      if (e.key === 'Delete') {
        e.preventDefault();
        updatePhoneInput('');
        validateForm();
        return;
      }

      const allowedKeys = ['Tab'];
      if (allowedKeys.includes(e.key)) return;

      e.preventDefault();
    });

    phoneInput.addEventListener('input', (e) => {
      e.preventDefault();
    });

    phoneInput.addEventListener('paste', (e) => {
      e.preventDefault();

      const pasted = (e.clipboardData || window.clipboardData).getData('text');
      const currentDigits = getPhoneDigits(phoneInput.value);
      const pastedDigits = pasted.replace(/\D/g, '');
      const nextDigits = (currentDigits + pastedDigits).slice(0, 10);

      updatePhoneInput(nextDigits);
      validateForm();
    });
  }

  if (emailInput) {
    emailInput.addEventListener('focus', () => {
      touched.email = true;
    });

    emailInput.addEventListener('input', validateForm);

    emailInput.addEventListener('blur', () => {
      validateForm();
    });
  }

  if (passwordInput) {
    passwordInput.addEventListener('focus', () => {
      touched.password = true;
    });

    passwordInput.addEventListener('input', () => {
      updatePasswordHint();
      validateForm();
    });

    passwordInput.addEventListener('blur', () => {
      validateForm();
    });
  }

  if (agreementInput) {
    agreementInput.addEventListener('change', () => {
      touched.agreement = true;
      validateForm();
    });
  }

  if (togglePassword && passwordInput) {
    togglePassword.addEventListener('click', () => {
      passwordInput.type = passwordInput.type === 'password' ? 'text' : 'password';
    });
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function setErrorState(element, isError) {
    if (!element) return;
    element.classList.toggle('is-error', isError);
  }

  function validateForm(forceShowErrors = false) {
    const phoneDigits = phoneInput ? getPhoneDigits(phoneInput.value) : '';
    const emailValue = emailInput ? emailInput.value.trim() : '';
    const passwordValue = passwordInput ? passwordInput.value : '';
    const hasActiveBonus = !!document.querySelector('.bonus-card.is-active');
    const isAgreementChecked = agreementInput ? agreementInput.checked : false;

    const isPhoneValid = phoneDigits.length === 10;
    const isEmailValid = isValidEmail(emailValue);
    const isPasswordValid = passwordValue.length >= 6;

    setErrorState(
      openBonusModal,
      (forceShowErrors || touched.bonus) && !hasActiveBonus
    );

    setErrorState(
      phoneBox,
      (forceShowErrors || touched.phone) && !isPhoneValid
    );

    setErrorState(
      emailBox,
      (forceShowErrors || touched.email) && !isEmailValid
    );

    setErrorState(
      passwordBox,
      (forceShowErrors || touched.password) && !isPasswordValid
    );

    setErrorState(
      agreementField,
      (forceShowErrors || touched.agreement) && !isAgreementChecked
    );

    if (submitBtn) {
      submitBtn.disabled = !(
        hasActiveBonus &&
        isPhoneValid &&
        isEmailValid &&
        isPasswordValid &&
        isAgreementChecked
      );
    }
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    touched.bonus = true;
    touched.phone = true;
    touched.email = true;
    touched.password = true;
    touched.agreement = true;

    validateForm(true);

    if (submitBtn && submitBtn.disabled) return;

    console.log('Форма готова к отправке');
    console.log({
      bonus: selectedBonusText ? selectedBonusText.textContent.trim() : '',
      phone: phoneInput ? phoneInput.value : '',
      email: emailInput ? emailInput.value.trim() : '',
      password: passwordInput ? passwordInput.value : '',
      agreement: agreementInput ? agreementInput.checked : false
    });
  });

  updatePasswordHint();
  validateForm();
});