/* YouthSphere Member Profile Controller */

document.addEventListener('DOMContentLoaded', () => {
  // Session Check
  const currentUser = api.getCurrentUser();
  if (!api.getToken() || !currentUser) {
    window.location.href = 'login.html';
    return;
  }

  // Header & Logout Handles
  const logoutBtn = document.getElementById('logoutBtn');
  const profileAlert = document.getElementById('profileAlert');

  // Display Elements
  const profileAvatarDisplay = document.getElementById('profileAvatarDisplay');
  const avatarUploadInput = document.getElementById('avatarUploadInput');
  const changeAvatarBtn = document.getElementById('changeAvatarBtn');
  const profileFullName = document.getElementById('profileFullName');
  const profileUsernameTag = document.getElementById('profileUsernameTag');
  const profileChurchBadge = document.getElementById('profileChurchBadge');
  const profileClusterBadge = document.getElementById('profileClusterBadge');

  // Profile Edit Form Elements
  const profileDetailsForm = document.getElementById('profileDetailsForm');
  const editFirstName = document.getElementById('editFirstName');
  const editMiddleName = document.getElementById('editMiddleName');
  const editLastName = document.getElementById('editLastName');
  const editEmail = document.getElementById('editEmail');
  const editBirthday = document.getElementById('editBirthday');
  const editBio = document.getElementById('editBio');
  const saveProfileBtn = document.getElementById('saveProfileBtn');

  // Password Change Form Elements
  const passwordChangeForm = document.getElementById('passwordChangeForm');
  const currentPassword = document.getElementById('currentPassword');
  const newPassword = document.getElementById('newPassword');
  const confirmNewPassword = document.getElementById('confirmNewPassword');
  const changePasswordBtn = document.getElementById('changePasswordBtn');

  // Logout Event
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await api.logout();
      window.location.href = 'login.html';
    });
  }

  // Alert Messenger Helper
  const showAlert = (message, type = 'error') => {
    profileAlert.style.display = 'block';
    profileAlert.textContent = message;
    if (type === 'error') {
      profileAlert.style.backgroundColor = '#FDE8E8';
      profileAlert.style.color = '#9B1C1C';
      profileAlert.style.border = '1px solid #F8B4B4';
    } else {
      profileAlert.style.backgroundColor = '#DEF7EC';
      profileAlert.style.color = '#03543F';
      profileAlert.style.border = '1px solid #84E1BC';
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Populate Initial User Values
  const populateProfileData = (user) => {
    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    profileFullName.textContent = fullName || user.username;
    profileUsernameTag.textContent = `@${user.username || 'user'}`;
    
    if (user.avatarUrl) {
      profileAvatarDisplay.src = user.avatarUrl;
    }

    profileChurchBadge.textContent = user.churchName || 'ISIED Local Church';
    profileClusterBadge.textContent = user.clusterName || 'ISIED Cluster';

    editFirstName.value = user.firstName || '';
    editMiddleName.value = user.middleName || '';
    editLastName.value = user.lastName || '';
    editEmail.value = user.email || '';
    editBio.value = user.bio || '';
    
    if (user.birthday) {
      editBirthday.value = user.birthday.split('T')[0];
    }
  };

  // Fetch Latest Profile Data from Backend
  const loadLatestProfile = async () => {
    try {
      const user = await api.request('/users/me');
      populateProfileData(user);
      // Sync local storage session
      localStorage.setItem('youthsphere_user', JSON.stringify(user));
    } catch (err) {
      // Fallback to local session state if request fails
      populateProfileData(currentUser);
    }
  };

  // Profile Avatar Upload Handler
  changeAvatarBtn.addEventListener('click', () => avatarUploadInput.click());

  avatarUploadInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showAlert('Please choose a valid image file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Image = event.target.result;
      profileAvatarDisplay.src = base64Image;

      try {
        const res = await api.request('/users/profile/avatar', {
          method: 'PUT',
          body: JSON.stringify({ avatarBase64: base64Image })
        });

        const updatedUser = { ...api.getCurrentUser(), avatarUrl: base64Image };
        localStorage.setItem('youthsphere_user', JSON.stringify(updatedUser));
        showAlert('Profile photo updated successfully!', 'success');
      } catch (err) {
        showAlert(err.message || 'Failed to update photo.');
      }
    };
    reader.readAsDataURL(file);
  });

  // Handle Profile Details Form Submission
  profileDetailsForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const firstName = editFirstName.value.trim();
    const lastName = editLastName.value.trim();
    const middleName = editMiddleName.value.trim();
    const email = editEmail.value.trim();
    const bio = editBio.value.trim();

    if (!firstName || !lastName || !email) {
      showAlert('First name, last name, and email are required.');
      return;
    }

    saveProfileBtn.disabled = true;
    saveProfileBtn.textContent = 'Saving...';

    try {
      const updatedUser = await api.request('/users/profile', {
        method: 'PUT',
        body: JSON.stringify({ firstName, middleName, lastName, email, bio })
      });

      api.setSession(api.getToken(), updatedUser);
      populateProfileData(updatedUser);
      showAlert('Profile details saved successfully!', 'success');
    } catch (err) {
      showAlert(err.message || 'Could not update profile details.');
    } finally {
      saveProfileBtn.disabled = false;
      saveProfileBtn.textContent = 'Save Details';
    }
  });

  // Handle Password Change Form Submission
  passwordChangeForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const currentPass = currentPassword.value;
    const newPass = newPassword.value;
    const confirmPass = confirmNewPassword.value;

    if (!currentPass || !newPass || !confirmPass) {
      showAlert('All password fields are required.');
      return;
    }

    if (newPass !== confirmPass) {
      showAlert('New passwords do not match.');
      return;
    }

    if (newPass.length < 6) {
      showAlert('New password must be at least 6 characters long.');
      return;
    }

    changePasswordBtn.disabled = true;
    changePasswordBtn.textContent = 'Updating...';

    try {
      await api.request('/users/change-password', {
        method: 'PUT',
        body: JSON.stringify({
          currentPassword: currentPass,
          newPassword: newPass
        })
      });

      passwordChangeForm.reset();
      showAlert('Password updated successfully!', 'success');
    } catch (err) {
      showAlert(err.message || 'Failed to change password. Check your current password.');
    } finally {
      changePasswordBtn.disabled = false;
      changePasswordBtn.textContent = 'Update Password';
    }
  });

  loadLatestProfile();
});