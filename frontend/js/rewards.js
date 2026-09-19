/* YouthSphere Digital Reward Card Controller */

document.addEventListener('DOMContentLoaded', () => {
  // Session Check
  const currentUser = api.getCurrentUser();
  if (!api.getToken() || !currentUser) {
    window.location.href = 'login.html';
    return;
  }

  const logoutBtn = document.getElementById('logoutBtn');
  const cardHolderName = document.getElementById('cardHolderName');
  const cardChurchName = document.getElementById('cardChurchName');
  const stampRatioCount = document.getElementById('stampRatioCount');
  const stampGrid = document.getElementById('stampGrid');
  const totalPointsDisplay = document.getElementById('totalPointsDisplay');
  const cardUidDisplay = document.getElementById('cardUidDisplay');
  const historyContainer = document.getElementById('historyContainer');

  // Modal Handles
  const showQrBtn = document.getElementById('showQrBtn');
  const qrModal = document.getElementById('qrModal');
  const closeQrBtn = document.getElementById('closeQrBtn');
  const dismissQrBtn = document.getElementById('dismissQrBtn');
  const qrImage = document.getElementById('qrImage');
  const qrMemberCode = document.getElementById('qrMemberCode');

  // Logout Handler
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      api.clearSession();
      window.location.href = 'login.html';
    });
  }

  // Populate User Header Details
  const fullName = `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim();
  cardHolderName.textContent = fullName || currentUser.username || 'District Youth';
  cardChurchName.textContent = currentUser.churchName ? `${currentUser.churchName} (${currentUser.clusterName || 'ISIED'})` : 'ISIED Youth District';
  cardUidDisplay.textContent = `YS-${String(currentUser.id || 1).padStart(4, '0')}`;

  // Fetch Reward Details & Stamp History
  const loadRewardCardData = async () => {
    try {
      const data = await api.request('/rewards/my-card');
      renderStampGrid(data.stamps_count || 0);
      renderStats(data.stamps_count || 0, data.total_points || 0);
      renderHistory(data.history || []);
    } catch (err) {
      // Fallback UI gracefully if endpoint returns initial default state
      renderStampGrid(0);
      renderStats(0, 0);
      renderHistory([]);
    }
  };

  // Render 10-Slot Stamp Grid
  const renderStampGrid = (stampCount) => {
    stampGrid.innerHTML = '';
    const activeStamps = stampCount % 10;
    const completedCycles = Math.floor(stampCount / 10);

    for (let i = 1; i <= 10; i++) {
      const slot = document.createElement('div');
      const isStamped = i <= activeStamps || (stampCount > 0 && activeStamps === 0);

      slot.style.height = '52px';
      slot.style.borderRadius = '10px';
      slot.style.display = 'flex';
      slot.style.alignItems = 'center';
      slot.style.justifyContent = 'center';
      slot.style.fontWeight = '700';
      slot.style.fontSize = '14px';
      slot.style.transition = 'all 0.2s ease';

      if (isStamped) {
        slot.style.background = '#FBBF24';
        slot.style.color = '#062D58';
        slot.style.boxShadow = '0 2px 8px rgba(251, 191, 36, 0.4)';
        slot.innerHTML = '✓';
      } else {
        slot.style.background = 'rgba(255, 255, 255, 0.12)';
        slot.style.color = 'rgba(255, 255, 255, 0.6)';
        slot.style.border = '1px dashed rgba(255, 255, 255, 0.25)';
        slot.textContent = i;
      }

      stampGrid.appendChild(slot);
    }

    stampRatioCount.textContent = `${activeStamps} / 10 Stamps ${completedCycles > 0 ? `(${completedCycles} Card${completedCycles > 1 ? 's' : ''} Completed)` : ''}`;
  };

  // Render Stat Badges
  const renderStats = (stamps, points) => {
    totalPointsDisplay.textContent = `${points} pts`;
  };

  // Render Attendance History Table/List
  const renderHistory = (historyItems) => {
    historyContainer.innerHTML = '';

    if (!historyItems || historyItems.length === 0) {
      historyContainer.innerHTML = `
        <p style="text-align: center; color: var(--text-muted); font-size: 13px; padding: 12px 0;">
          No stamps recorded yet. Attend church services or district events to earn your first stamp!
        </p>
      `;
      return;
    }

    const list = document.createElement('div');
    list.style.display = 'flex';
    list.style.flexDirection = 'column';
    list.style.gap = '10px';

    historyItems.forEach(item => {
      const dateStr = new Date(item.created_at || Date.now()).toLocaleDateString([], {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });

      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.justifyContent = 'space-between';
      row.style.alignItems = 'center';
      row.style.padding = '10px 12px';
      row.style.background = 'var(--body-bg)';
      row.style.borderRadius = '8px';
      row.style.fontSize = '13px';

      row.innerHTML = `
        <div>
          <strong style="color: var(--primary-navy); display: block;">${escapeHtml(item.event_name || 'Sunday Youth Service')}</strong>
          <span style="font-size: 11px; color: var(--text-muted);">${dateStr} • Stamped by ${escapeHtml(item.stamped_by || 'Usher')}</span>
        </div>
        <span style="font-weight: 700; color: #059669; background: #D1FAE5; padding: 4px 8px; border-radius: 6px; font-size: 12px;">+1 Stamp</span>
      `;

      list.appendChild(row);
    });

    historyContainer.appendChild(list);
  };

  // Generate QR Code Modal
  showQrBtn.addEventListener('click', () => {
    const memberCode = `YS-UID-${currentUser.id}-${currentUser.username || 'MEMBER'}`;
    qrMemberCode.textContent = memberCode;
    
    // Quick inline API QR Code Generator
    qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(memberCode)}`;
    qrModal.classList.add('active');
  });

  const closeQr = () => qrModal.classList.remove('active');
  closeQrBtn.addEventListener('click', closeQr);
  dismissQrBtn.addEventListener('click', closeQr);

  const escapeHtml = (str) => {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  loadRewardCardData();
});