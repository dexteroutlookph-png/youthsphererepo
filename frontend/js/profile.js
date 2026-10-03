/* YouthSphere Member Profile Controller */

document.addEventListener('DOMContentLoaded', () => {
  // Session Check
  const currentUser = api.getCurrentUser();
  if (!api.getToken() || !currentUser) {
    window.location.href = 'login.html';
    return;
  }
  const requestedUserId = Number(new URLSearchParams(window.location.search).get('userId'));
  const isOwnProfile = !requestedUserId || requestedUserId === Number(currentUser.id);
  const profileUserId = isOwnProfile ? Number(currentUser.id) : requestedUserId;

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
  const profileEditPanel = document.getElementById('profileEditPanel');
  const editProfileBtn = document.getElementById('editProfileBtn');
  const cancelProfileEditBtn = document.getElementById('cancelProfileEditBtn');
  const profileNameDisplay = document.getElementById('profileNameDisplay');
  const profileEmailDisplay = document.getElementById('profileEmailDisplay');
  const profileBirthdayDisplay = document.getElementById('profileBirthdayDisplay');
  const profileUsernameDisplay = document.getElementById('profileUsernameDisplay');
  const profileBioDisplay = document.getElementById('profileBioDisplay');
  const profilePostsContainer = document.getElementById('profilePosts');
  const profilePostsHeading = document.getElementById('profilePostsHeading');

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

  if (!isOwnProfile) {
    editProfileBtn.hidden = true;
    changeAvatarBtn.hidden = true;
    profileEditPanel.hidden = true;
    document.querySelector('.profile-page-heading h2').textContent = 'Member Profile';
  }

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
    const fullName = [user.firstName, user.middleName, user.lastName].filter(Boolean).join(' ');
    profileFullName.textContent = fullName || user.username;
    profileUsernameTag.textContent = `@${user.username || 'user'}`;
    profileNameDisplay.textContent = fullName || user.username || 'Not provided';
    profileEmailDisplay.textContent = user.email || 'Not provided';
    profileUsernameDisplay.textContent = user.username ? `@${user.username}` : 'Not provided';
    profileBioDisplay.textContent = user.bio || 'Add a short introduction or favorite verse to tell your community a little about you.';
    profilePostsHeading.textContent = isOwnProfile ? 'Your Posts' : `@${user.username || 'member'}'s Posts`;
    
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
      profileBirthdayDisplay.textContent = new Date(`${editBirthday.value}T00:00:00`).toLocaleDateString([], {
        year: 'numeric', month: 'long', day: 'numeric'
      });
    } else {
      editBirthday.value = '';
      profileBirthdayDisplay.textContent = 'Not provided';
    }
  };

  const escapeHtml = (value) => String(value || '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  })[character]);

  const renderProfilePost = (post) => {
    const card = document.createElement('article');
    card.className = 'post-card profile-post-card';
    const authorName = `${post.first_name || ''} ${post.last_name || ''}`.trim() || post.username || 'YouthSphere member';
    const authorId = Number(post.author_id);
    const authorLink = Number.isInteger(authorId) && authorId > 0 ? `profile.html?userId=${authorId}` : 'profile.html';
    const media = post.media_url
      ? post.media_type === 'video'
        ? `<video class="post-media-attachment" src="${escapeHtml(post.media_url)}" controls preload="metadata"></video>`
        : `<img class="post-media-attachment" src="${escapeHtml(post.media_url)}" alt="Post attachment">`
      : '';
    const ownerActions = isOwnProfile
      ? `<div class="profile-post-actions"><button type="button" class="btn btn-outline edit-profile-post" data-post-id="${Number(post.id)}">Edit</button><button type="button" class="btn btn-outline delete-profile-post" data-post-id="${Number(post.id)}">Delete</button></div>`
      : '';

    card.innerHTML = `
      <div class="post-header">
        <img class="post-avatar" src="${escapeHtml(post.author_avatar || '../logo.png')}" alt="${escapeHtml(authorName)}">
        <div class="post-author-info">
          <strong class="post-author-name">${escapeHtml(authorName)}</strong>
          <a class="post-username-link" href="${authorLink}">@${escapeHtml(post.username || 'member')}</a>
          <span class="post-meta-sub">${new Date(post.created_at || Date.now()).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })}</span>
        </div>
        ${ownerActions}
      </div>
      <p class="post-content-text">${escapeHtml(post.content)}</p>
      ${media}
      <form class="profile-post-editor" hidden>
        <label class="sr-only" for="profile-post-edit-${Number(post.id)}">Edit post text</label>
        <textarea id="profile-post-edit-${Number(post.id)}" class="form-control profile-post-edit-input" maxlength="10000" required>${escapeHtml(post.content)}</textarea>
        <div class="profile-post-editor-actions">
          <button type="submit" class="btn btn-primary save-profile-post">Save changes</button>
          <button type="button" class="btn btn-outline cancel-profile-post-edit">Cancel</button>
        </div>
      </form>
    `;

    if (isOwnProfile) {
      const editButton = card.querySelector('.edit-profile-post');
      const editor = card.querySelector('.profile-post-editor');
      const editInput = card.querySelector('.profile-post-edit-input');
      editButton.addEventListener('click', () => {
        editor.hidden = false;
        editButton.hidden = true;
        editInput.focus();
      });
      card.querySelector('.cancel-profile-post-edit').addEventListener('click', () => {
        editInput.value = post.content || '';
        editor.hidden = true;
        editButton.hidden = false;
      });
      editor.addEventListener('submit', async (event) => {
        event.preventDefault();
        const content = editInput.value.trim();
        if (!content) return;
        const saveButton = card.querySelector('.save-profile-post');
        saveButton.disabled = true;
        try {
          await api.request(`/posts/${post.id}`, { method: 'PUT', body: JSON.stringify({ content }) });
          await loadProfilePosts();
        } catch (error) {
          showAlert(error.message || 'Unable to update post.');
        } finally {
          saveButton.disabled = false;
        }
      });
      card.querySelector('.delete-profile-post').addEventListener('click', async (event) => {
        if (!window.confirm('Delete this post? This cannot be undone.')) return;
        try {
          await api.request(`/posts/${event.currentTarget.dataset.postId}`, { method: 'DELETE' });
          await loadProfilePosts();
        } catch (error) {
          showAlert(error.message || 'Unable to delete post.');
        }
      });
    }

    return card;
  };

  const loadProfilePosts = async () => {
    try {
      const posts = await api.request(`/posts/by-user/${profileUserId}`);
      profilePostsContainer.replaceChildren();
      if (!posts.length) {
        profilePostsContainer.innerHTML = '<p class="profile-posts-empty">No posts yet.</p>';
        return;
      }
      posts.forEach((post) => profilePostsContainer.appendChild(renderProfilePost(post)));
    } catch (error) {
      profilePostsContainer.innerHTML = '<p class="profile-posts-empty">Unable to load posts right now.</p>';
    }
  };

  const setProfileEditing = (isEditing) => {
    profileEditPanel.hidden = !isEditing;
    editProfileBtn.hidden = isEditing;
    if (isEditing) profileEditPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  editProfileBtn.addEventListener('click', () => setProfileEditing(true));
  cancelProfileEditBtn.addEventListener('click', () => {
    populateProfileData(api.getCurrentUser() || currentUser);
    profileAlert.style.display = 'none';
    setProfileEditing(false);
  });

  // Fetch Latest Profile Data from Backend
  const loadProfile = async () => {
    try {
      const user = isOwnProfile
        ? await api.request('/users/me')
        : await api.request(`/users/public/${profileUserId}`);
      populateProfileData(user);
      if (isOwnProfile) localStorage.setItem('youthsphere_user', JSON.stringify(user));
    } catch (err) {
      if (isOwnProfile) populateProfileData(currentUser);
      else showAlert(err.message || 'Unable to load this profile.');
    }
    await loadProfilePosts();
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
      setProfileEditing(false);
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

  loadProfile();
});