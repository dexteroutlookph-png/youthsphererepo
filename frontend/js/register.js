/* YouthSphere Registration Controller */

document.addEventListener('DOMContentLoaded', () => {
  const registerForm = document.getElementById('registerForm');
  const registerAlert = document.getElementById('registerAlert');
  const birthdayInput = document.getElementById('birthday');
  const ageDisplayBadge = document.getElementById('ageDisplayBadge');
  const clusterSelect = document.getElementById('clusterSelect');
  const churchSelect = document.getElementById('churchSelect');

  const FALLBACK_CLUSTERS = [
    { id: 'Alfonso Lista Cluster', name: 'Alfonso Lista Cluster' },
    { id: 'BRASO Cluster', name: 'BRASO Cluster' },
    { id: 'Cabatuan Cluster', name: 'Cabatuan Cluster' },
    { id: 'Ramon Cluster', name: 'Ramon Cluster' },
    { id: 'San Mateo Cluster', name: 'San Mateo Cluster' },
    { id: 'VillaSS Cluster', name: 'VillaSS Cluster' }
  ];

  const FALLBACK_CHURCHES = {
    'Alfonso Lista Cluster': [
      'Alfonso Lista First UMC',
      'Bagong Sikat UMC',
      'Namillangan UMC',
      'San Quintin UMC',
      'Sta. Maria UMC',
      'Zion UMC'
    ],
    'BRASO Cluster': [
      'Burgos UMC',
      'General Aguinaldo UMC',
      'Oscariz UMC',
      'Rising Hope UMC',
      'San Marcos UMC'
    ],
    'Cabatuan Cluster': [
      'Cabatuan UMC',
      'La Paz UMC',
      'Namnama UMC',
      'Tandul UMC'
    ],
    'Ramon Cluster': [
      'Aldersgate UMC',
      'Grace UMC',
      'Ramon UMC',
      'San Sebastian UMC',
      'Wesley UMC'
    ],
    'San Mateo Cluster': [
      'Gaddanan UMC',
      'Salinungan East UMC',
      'Salinungan West UMC',
      'San Mateo UMC',
      'The Crossroad UMC',
      'Victoria MC'
    ],
    'VillaSS Cluster': [
      'Sinamar Norte UMC',
      'Sinamar Sur UMC',
      'Villa Cruz UMC',
      'Villa Fuerte UMC',
      'Villa Magat UMC'
    ]
  };
  
  // Avatar & Cropper Elements
  const choosePhotoBtn = document.getElementById('choosePhotoBtn');
  const avatarFileInput = document.getElementById('avatarFileInput');
  const avatarPreview = document.getElementById('avatarPreview');
  const cropperModal = document.getElementById('cropperModal');
  const cropCanvas = document.getElementById('cropCanvas');
  const zoomRange = document.getElementById('zoomRange');
  const closeCropperBtn = document.getElementById('closeCropperBtn');
  const cancelCropBtn = document.getElementById('cancelCropBtn');
  const applyCropBtn = document.getElementById('applyCropBtn');
  
  const ctx = cropCanvas.getContext('2d');
  let currentImage = null;
  let croppedBase64 = null;

  const populateFallbackClusters = () => {
    clusterSelect.innerHTML = '<option value="">Select Cluster</option>';
    FALLBACK_CLUSTERS.forEach((cluster) => {
      const option = document.createElement('option');
      option.value = cluster.id;
      option.textContent = cluster.name;
      clusterSelect.appendChild(option);
    });
  };

  const populateFallbackChurches = (clusterName) => {
    churchSelect.innerHTML = '<option value="">Select Local Church</option>';
    const churches = FALLBACK_CHURCHES[clusterName] || [];

    if (churches.length === 0) {
      churchSelect.disabled = true;
      churchSelect.innerHTML = '<option value="">No churches found in this cluster</option>';
      return;
    }

    churchSelect.disabled = false;
    churches.forEach((churchName) => {
      const option = document.createElement('option');
      option.value = churchName;
      option.textContent = churchName;
      churchSelect.appendChild(option);
    });
  };

  // 1. Fetch Clusters on Page Load
  const loadClusters = async () => {
    try {
      const clusters = await api.request('/clusters');
      clusterSelect.innerHTML = '<option value="">Select Cluster</option>';
      clusters.forEach(c => {
        const option = document.createElement('option');
        option.value = c.id;
        option.textContent = c.name;
        clusterSelect.appendChild(option);
      });
    } catch (err) {
      populateFallbackClusters();
    }
  };

  // 2. Fetch Local Churches dependent on Cluster Selection
  clusterSelect.addEventListener('change', async () => {
    const clusterValue = clusterSelect.value;
    churchSelect.innerHTML = '<option value="">Select Local Church</option>';

    if (!clusterValue) {
      churchSelect.disabled = true;
      return;
    }

    try {
      const clusterName = clusterSelect.options[clusterSelect.selectedIndex].text;
      const clusterId = clusterValue;
      const values = clusterValue; // keep for compatibility

      if (typeof clusterId === 'string' && clusterId.includes('Cluster')) {
        populateFallbackChurches(clusterId);
        return;
      }

      churchSelect.disabled = false;
      const churches = await api.request(`/clusters/${clusterId}/churches`);

      if (churches.length === 0) {
        churchSelect.innerHTML = '<option value="">No churches found in this cluster</option>';
        return;
      }

      churches.forEach(ch => {
        const option = document.createElement('option');
        option.value = ch.id;
        option.textContent = ch.name;
        churchSelect.appendChild(option);
      });
    } catch (err) {
      const selectedCluster = clusterSelect.options[clusterSelect.selectedIndex]?.text || clusterSelect.value;
      populateFallbackChurches(selectedCluster);
    }
  });

  // 3. Real-time Age Calculation
  birthdayInput.addEventListener('change', () => {
    const birthDateValue = birthdayInput.value;
    if (!birthDateValue) {
      ageDisplayBadge.textContent = '-- yrs old';
      return;
    }

    const today = new Date();
    const birthDate = new Date(birthDateValue);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    if (age < 0 || isNaN(age)) {
      ageDisplayBadge.textContent = 'Invalid Date';
    } else {
      ageDisplayBadge.textContent = `${age} yrs old`;
    }
  });

  // 4. Canvas Image Cropper Logic
  choosePhotoBtn.addEventListener('click', () => avatarFileInput.click());

  avatarFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showAlert('Please choose a valid image file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      currentImage = new Image();
      currentImage.onload = () => {
        zoomRange.value = 1;
        drawCanvasImage();
        cropperModal.classList.add('active');
      };
      currentImage.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });

  const drawCanvasImage = () => {
    if (!currentImage) return;
    const zoom = parseFloat(zoomRange.value);
    ctx.clearRect(0, 0, cropCanvas.width, cropCanvas.height);
    
    const size = Math.min(currentImage.width, currentImage.height);
    const sw = size / zoom;
    const sh = size / zoom;
    const sx = (currentImage.width - sw) / 2;
    const sy = (currentImage.height - sh) / 2;

    ctx.save();
    ctx.beginPath();
    ctx.arc(110, 110, 100, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(currentImage, sx, sy, sw, sh, 0, 0, 220, 220);
    ctx.restore();
  };

  zoomRange.addEventListener('input', drawCanvasImage);

  const closeCropper = () => {
    cropperModal.classList.remove('active');
    avatarFileInput.value = '';
  };

  closeCropperBtn.addEventListener('click', closeCropper);
  cancelCropBtn.addEventListener('click', closeCropper);

  applyCropBtn.addEventListener('click', () => {
    croppedBase64 = cropCanvas.toDataURL('image/jpeg', 0.85);
    avatarPreview.src = croppedBase64;
    closeCropper();
  });

  // 5. Alert Display Helpers
  const showAlert = (message, type = 'error') => {
    registerAlert.style.display = 'block';
    registerAlert.textContent = message;
    if (type === 'error') {
      registerAlert.style.backgroundColor = '#FDE8E8';
      registerAlert.style.color = '#9B1C1C';
    } else {
      registerAlert.style.backgroundColor = '#DEF7EC';
      registerAlert.style.color = '#03543F';
    }
  };

  // 6. Form Submission
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const firstName = document.getElementById('firstName').value.trim();
    const middleName = document.getElementById('middleName').value.trim();
    const lastName = document.getElementById('lastName').value.trim();
    const birthday = birthdayInput.value;
    const clusterId = clusterSelect.value;
    const localChurchId = churchSelect.value;
    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const termsAccepted = document.getElementById('termsCheck').checked;

    if (!firstName || !lastName || !birthday || !clusterId || !localChurchId || !username || !email || !password) {
      showAlert('Please fill in all required fields marked with *.');
      return;
    }

    if (password !== confirmPassword) {
      showAlert('Password confirmation does not match.');
      return;
    }

    if (password.length < 6) {
      showAlert('Password must be at least 6 characters long.');
      return;
    }

    if (!termsAccepted) {
      showAlert('You must accept the Terms of Service and Privacy Policy to proceed.');
      return;
    }

    const submitBtn = document.getElementById('registerSubmitBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Registering Account...';

    try {
      const payload = {
        firstName,
        middleName,
        lastName,
        birthday,
        clusterId: parseInt(clusterId, 10),
        localChurchId: parseInt(localChurchId, 10),
        username,
        email,
        password,
        termsAccepted,
        avatarBase64: croppedBase64 || null
      };

      const res = await api.request('/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      showAlert('Registration successful! Redirecting to login...', 'success');
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 1200);

    } catch (err) {
      showAlert(err.message || 'Registration failed. Please try again.');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Complete Registration';
    }
  });

  loadClusters();
});