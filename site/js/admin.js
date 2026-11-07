import { escapeHtml, isHttpUrl } from './util.js';
import { drawSpotlightFlyer, exportCanvasToPng } from './media.js';
import { determineCertificateTier } from './certificates.js';

export function computeCohortStats(members = [], milestones = []) {
  const totalMembers = members.length;
  const levelBreakdown = {};
  const trackBreakdown = {};
  const facultyBreakdown = {};

  for (const m of members) {
    const lvl = m.level || 'Unassigned';
    levelBreakdown[lvl] = (levelBreakdown[lvl] || 0) + 1;

    const track = m.careerGoal || 'Unassigned';
    trackBreakdown[track] = (trackBreakdown[track] || 0) + 1;

    const fac = m.faculty || 'Unassigned';
    facultyBreakdown[fac] = (facultyBreakdown[fac] || 0) + 1;
  }

  const milestoneStats = {
    total: milestones.length,
    pending: milestones.filter((m) => m.status === 'pending').length,
    approved: milestones.filter((m) => m.status === 'approved').length,
    excellent: milestones.filter((m) => m.status === 'excellent').length,
    needsWork: milestones.filter((m) => m.status === 'needs_work').length,
  };

  return {
    totalMembers,
    levelBreakdown,
    trackBreakdown,
    facultyBreakdown,
    milestones: milestoneStats,
  };
}

function escapeCsvField(val) {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportMembersToCsv(members = []) {
  const headers = [
    'Name',
    'Email',
    'Faculty',
    'Department',
    'Level',
    'CareerTrack',
    'Experience',
    'WeeklyHours',
    'GitHub',
    'LinkedIn',
    'RegisteredDate',
  ];

  const rows = members.map((m) => [
    escapeCsvField(m.name || ''),
    escapeCsvField(m.email || ''),
    escapeCsvField(m.faculty || ''),
    escapeCsvField(m.department || ''),
    escapeCsvField(m.level || ''),
    escapeCsvField(m.careerGoal || ''),
    escapeCsvField(m.aiExperience || ''),
    escapeCsvField(m.weeklyHours || ''),
    escapeCsvField(m.githubUrl || ''),
    escapeCsvField(m.linkedinUrl || ''),
    escapeCsvField(m.registeredAt ? new Date(m.registeredAt).toISOString() : ''),
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
}

export function renderAdminDashboard(mountEl, { stats, members = [], milestones = [], certificates = [], allLabRuns = [], activeTab = 'analytics', totalLabs = 7 }) {
  const runsByMember = {};
  for (const r of allLabRuns) {
    if (!runsByMember[r.memberId]) runsByMember[r.memberId] = [];
    runsByMember[r.memberId].push(r);
  }

  const milestonesByMember = {};
  for (const m of milestones) {
    if (!milestonesByMember[m.memberId]) milestonesByMember[m.memberId] = [];
    milestonesByMember[m.memberId].push(m);
  }

  const certsByMember = {};
  for (const c of certificates) {
    if (c.recipientUid) certsByMember[c.recipientUid] = c;
  }

  mountEl.innerHTML = `
    <div class="admin-dashboard">
      <div class="admin-header">
        <div>
          <div class="site-header__title-row">
            <h2>Cluster Admin Dashboard</h2>
            <span class="badge badge--cluster">Lead / Mentor Console</span>
          </div>
          <p class="admin-header__sub">Operational cohort analytics, searchable member roster, and milestone review queue.</p>
        </div>
        <div class="admin-header__actions">
          <button class="btn btn--secondary btn--sm" data-export-csv>
            <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
            <span>Export Roster CSV</span>
          </button>
        </div>
      </div>

      <div class="admin-tabs">
        <button class="admin-tab ${activeTab === 'analytics' ? 'is-active' : ''}" data-admin-tab="analytics">Cohort Analytics</button>
        <button class="admin-tab ${activeTab === 'members' ? 'is-active' : ''}" data-admin-tab="members">Member Directory (${members.length})</button>
        <button class="admin-tab ${activeTab === 'milestones' ? 'is-active' : ''}" data-admin-tab="milestones">
          Milestone Reviews
          ${stats.milestones.pending > 0 ? `<span class="badge badge--pending">${stats.milestones.pending}</span>` : ''}
        </button>
        <button class="admin-tab ${activeTab === 'certificates' ? 'is-active' : ''}" data-admin-tab="certificates">
          Certificates & Spotlights (${certificates.length})
        </button>
      </div>

      <!-- Tab 1: Cohort Analytics -->
      <div class="admin-tab-content ${activeTab === 'analytics' ? '' : 'is-hidden'}" data-tab-content="analytics">
        <div class="stat-grid">
          <div class="stat-card">
            <div class="stat-card__icon">👥</div>
            <div class="stat-card__data">
              <span class="stat-card__value">${stats.totalMembers}</span>
              <span class="stat-card__label">Total Registered</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-card__icon">⏳</div>
            <div class="stat-card__data">
              <span class="stat-card__value">${stats.milestones.pending}</span>
              <span class="stat-card__label">Pending Reviews</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-card__icon">✅</div>
            <div class="stat-card__data">
              <span class="stat-card__value">${stats.milestones.approved + stats.milestones.excellent}</span>
              <span class="stat-card__label">Approved Milestones</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-card__icon">📦</div>
            <div class="stat-card__data">
              <span class="stat-card__value">${stats.milestones.total}</span>
              <span class="stat-card__label">Total Submissions</span>
            </div>
          </div>
        </div>

        <div class="analytics-breakdowns">
          <div class="breakdown-card">
            <h3>Academic Levels</h3>
            <div class="breakdown-list">
              ${Object.entries(stats.levelBreakdown).map(([lvl, count]) => `
                <div class="breakdown-item">
                  <span class="breakdown-label">${escapeHtml(lvl)}</span>
                  <div class="breakdown-bar-wrap">
                    <div class="breakdown-bar" style="width: ${Math.round((count / (stats.totalMembers || 1)) * 100)}%"></div>
                  </div>
                  <span class="breakdown-val">${count}</span>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="breakdown-card">
            <h3>Career Track Goals</h3>
            <div class="breakdown-list">
              ${Object.entries(stats.trackBreakdown).map(([track, count]) => `
                <div class="breakdown-item">
                  <span class="breakdown-label">${escapeHtml(track)}</span>
                  <div class="breakdown-bar-wrap">
                    <div class="breakdown-bar breakdown-bar--green" style="width: ${Math.round((count / (stats.totalMembers || 1)) * 100)}%"></div>
                  </div>
                  <span class="breakdown-val">${count}</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>

      <!-- Tab 2: Member Directory -->
      <div class="admin-tab-content ${activeTab === 'members' ? '' : 'is-hidden'}" data-tab-content="members">
        <div class="table-search-bar">
          <input type="text" placeholder="Search members by name, department, level, or track..." data-member-search class="admin-search-input" />
        </div>

        <div class="admin-table-wrap">
          <table class="admin-table" data-members-table>
            <thead>
              <tr>
                <th>Member</th>
                <th>Academic</th>
                <th>Career Track</th>
                <th>Weekly Hours</th>
                <th>Links</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              ${members.map((m) => `
                <tr data-member-row data-search-text="${escapeHtml((m.name || '') + ' ' + (m.department || '') + ' ' + (m.level || '') + ' ' + (m.careerGoal || '')).toLowerCase()}">
                  <td>
                    <strong>${escapeHtml(m.name || 'Anonymous')}</strong>
                    <div class="table-email">${escapeHtml(m.email || 'N/A')}</div>
                  </td>
                  <td>
                    <div>${escapeHtml(m.department || 'N/A')}</div>
                    <span class="badge badge--cluster">${escapeHtml(m.level || 'N/A')}</span>
                  </td>
                  <td>${escapeHtml(m.careerGoal || 'N/A')}</td>
                  <td>${escapeHtml(m.weeklyHours || 'N/A')}</td>
                  <td>
                    <div class="table-links">
                      ${isHttpUrl(m.githubUrl) ? `<a href="${escapeHtml(m.githubUrl)}" target="_blank" rel="noopener">GitHub</a>` : ''}
                      ${isHttpUrl(m.linkedinUrl) ? `<a href="${escapeHtml(m.linkedinUrl)}" target="_blank" rel="noopener">LinkedIn</a>` : ''}
                    </div>
                  </td>
                  <td>${m.registeredAt ? new Date(m.registeredAt).toLocaleDateString() : 'N/A'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Tab 3: Milestone Review Queue -->
      <div class="admin-tab-content ${activeTab === 'milestones' ? '' : 'is-hidden'}" data-tab-content="milestones">
        <div class="milestone-queue-list">
          ${milestones.length === 0 ? `
            <div class="empty-state">
              <div class="empty-state__icon">🎉</div>
              <h3>No Submissions Yet</h3>
              <p>When cohort members submit their weekly continuous assistant milestones, they will appear here for review.</p>
            </div>
          ` : milestones.map((m) => `
            <div class="review-card" data-review-card="${m.id}">
              <div class="review-card__head">
                <div>
                  <div class="review-card__badges">
                    <span class="week-pill">Week ${m.week}</span>
                    <span class="status-pill status-pill--${m.status}">${escapeHtml(m.status.toUpperCase())}</span>
                  </div>
                  <h3>${escapeHtml(m.memberName || 'Member')}</h3>
                </div>
                <span class="review-card__date">${m.submittedAt ? new Date(m.submittedAt).toLocaleString() : ''}</span>
              </div>

              <div class="review-card__body">
                <div class="review-meta-row">
                  <strong>Repository:</strong>
                  ${isHttpUrl(m.repoUrl)
                    ? `<a href="${escapeHtml(m.repoUrl)}" target="_blank" rel="noopener">${escapeHtml(m.repoUrl)}</a>`
                    : escapeHtml(m.repoUrl || '')}
                </div>
                ${m.demoUrl ? `
                  <div class="review-meta-row">
                    <strong>Demo / Video:</strong>
                    ${isHttpUrl(m.demoUrl)
                      ? `<a href="${escapeHtml(m.demoUrl)}" target="_blank" rel="noopener">${escapeHtml(m.demoUrl)}</a>`
                      : escapeHtml(m.demoUrl)}
                  </div>
                ` : ''}
                <div class="review-notes-box">
                  <strong>Member Notes:</strong>
                  <p>${escapeHtml(m.notes || 'None')}</p>
                </div>

                ${m.feedback ? `
                  <div class="mentor-feedback mentor-feedback--${m.status}">
                    <strong>Current Feedback (${escapeHtml(m.reviewerName || 'Lead')}):</strong>
                    <p>${escapeHtml(m.feedback)}</p>
                  </div>
                ` : ''}

                <form class="review-form" data-review-form data-submission-id="${m.id}">
                  <div class="form-group">
                    <label>Lead Feedback & Guidance</label>
                    <textarea name="feedback" rows="2" placeholder="Write constructive feedback for the member...">${m.feedback ? escapeHtml(m.feedback) : ''}</textarea>
                  </div>
                  <div class="review-form__buttons">
                    <button type="button" class="btn btn--sm btn--primary" data-review-action="approved" data-submission-id="${m.id}">
                      Approve Milestone
                    </button>
                    <button type="button" class="btn btn--sm btn--excellent" data-review-action="excellent" data-submission-id="${m.id}">
                      ⭐ Mark as Excellent
                    </button>
                    <button type="button" class="btn btn--sm btn--danger" data-review-action="needs_work" data-submission-id="${m.id}">
                      Request Revisions
                    </button>
                  </div>
                </form>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Tab 4: Certificates & Spotlights -->
      <div class="admin-tab-content ${activeTab === 'certificates' ? '' : 'is-hidden'}" data-tab-content="certificates">
        <!-- Spotlight Studio -->
        <div class="spotlight-studio-card">
          <div class="spotlight-studio-head">
            <div>
              <h3>Weekly Spotlight Flyer Studio</h3>
              <p class="admin-section-sub">Generate and download official social graphics honoring top cohort performers for Discord, WhatsApp, and LinkedIn.</p>
            </div>
            <div class="spotlight-controls-row">
              <select id="spotlight-week-select" class="spotlight-select">
                <option value="1" data-title="Foundations of LLMs & Prompting">Week 1: Foundations of LLMs & Prompting</option>
                <option value="2" data-title="Prompt Patterns & Structured Output">Week 2: Prompt Patterns & Structured Output</option>
                <option value="3" data-title="Reasoning Techniques (CoT, ToT)">Week 3: Reasoning Techniques (CoT, ToT)</option>
                <option value="4" data-title="Reliability, Safety & Evaluation">Week 4: Reliability, Safety & Evaluation</option>
                <option value="5" data-title="Retrieval-Augmented Generation (RAG)">Week 5: Retrieval-Augmented Generation (RAG)</option>
                <option value="6" data-title="Tool Use & Function Calling">Week 6: Tool Use & Function Calling</option>
                <option value="7" data-title="Autonomous Agents & Loops">Week 7: Autonomous Agents & Loops</option>
                <option value="8" data-title="Capstone Sprint & Demo Day">Week 8: Capstone Sprint & Demo Day</option>
              </select>
              <button class="btn btn--primary" id="btn-render-spotlight">Generate Flyer Preview</button>
              <button class="btn btn--secondary" id="btn-download-spotlight">Download PNG</button>
            </div>
          </div>
          <div class="spotlight-preview-wrap">
            <canvas id="admin-spotlight-canvas" width="1080" height="1080" class="spotlight-canvas-preview"></canvas>
          </div>
        </div>

        <!-- Certificate Issuance Registry -->
        <div class="cert-registry-card">
          <div class="cert-registry-head">
            <div>
              <h3>Certificate Issuance Registry</h3>
              <p class="admin-section-sub">Review completed learners and issue cryptographic verified certificates.</p>
            </div>
          </div>

          <div class="admin-table-wrap">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Faculty & Track</th>
                  <th>Labs Passed</th>
                  <th>Calculated Tier</th>
                  <th>Status & Credential ID</th>
                  <th>Issuance Action</th>
                </tr>
              </thead>
              <tbody>
                ${members.map((m) => {
                  const mRuns = runsByMember[m.uid] || [];
                  const distinctPassed = new Set(mRuns.filter((r) => r.passed).map((r) => r.labId)).size;
                  const mMilestones = milestonesByMember[m.uid] || [];
                  const tier = determineCertificateTier({
                    stats: { labsPassed: distinctPassed, totalLabs },
                    milestones: mMilestones,
                  });
                  const existingCert = certsByMember[m.uid];

                  return `
                    <tr>
                      <td>
                        <div class="member-cell">
                          <div class="mini-avatar">${escapeHtml((m.name || 'M').charAt(0).toUpperCase())}</div>
                          <div>
                            <span class="member-name">${escapeHtml(m.name || 'Member')}</span>
                            <span class="member-dept">${escapeHtml(m.department || '')}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span class="track-cell">${escapeHtml(m.careerGoal || 'AI Track')}</span>
                      </td>
                      <td>
                        <span class="metric-cell font-mono">${distinctPassed}/${totalLabs} Labs</span>
                      </td>
                      <td>
                        ${tier ? `<span class="badge badge--glow">${tier}</span>` : '<span class="badge badge--locked">Not Eligible</span>'}
                      </td>
                      <td>
                        ${existingCert
                          ? `<a href="#cert/${existingCert.certId}" class="cert-id-link">✓ ${existingCert.certId}</a>`
                          : '<span class="text-muted">Not Issued</span>'}
                      </td>
                      <td>
                        ${existingCert
                          ? '<span class="badge badge--verified">Issued</span>'
                          : tier
                            ? `<button class="btn btn--sm btn--primary" data-issue-cert data-uid="${m.uid}" data-tier="${tier}" data-name="${escapeHtml(m.name)}" data-track="${escapeHtml(m.careerGoal || 'AI Track')}" data-faculty="${escapeHtml(m.faculty || 'Engineering')}">Issue ${tier}</button>`
                            : `<button class="btn btn--sm btn--secondary" disabled>Requires ${totalLabs} Labs</button>`
                        }
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function wireAdminDashboard(mountEl, { onReviewMilestone, onExportCsv, onIssueCertificate, members = [], allLabRuns = [] } = {}) {
  // Tab Switching
  mountEl.querySelectorAll('[data-admin-tab]').forEach((tabBtn) => {
    tabBtn.addEventListener('click', () => {
      const target = tabBtn.dataset.adminTab;
      mountEl.querySelectorAll('[data-admin-tab]').forEach((b) => b.classList.remove('is-active'));
      mountEl.querySelectorAll('[data-tab-content]').forEach((c) => c.classList.add('is-hidden'));

      tabBtn.classList.add('is-active');
      const content = mountEl.querySelector(`[data-tab-content="${target}"]`);
      if (content) content.classList.remove('is-hidden');
    });
  });

  // Export CSV
  const exportBtn = mountEl.querySelector('[data-export-csv]');
  if (exportBtn && onExportCsv) {
    exportBtn.addEventListener('click', () => onExportCsv());
  }

  // Member Search Filter
  const searchInput = mountEl.querySelector('[data-member-search]');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase().trim();
      mountEl.querySelectorAll('[data-member-row]').forEach((row) => {
        const text = row.dataset.searchText || '';
        row.style.display = text.includes(query) ? '' : 'none';
      });
    });
  }

  // Review Actions
  mountEl.querySelectorAll('[data-review-action]').forEach((actionBtn) => {
    actionBtn.addEventListener('click', async () => {
      const submissionId = actionBtn.dataset.submissionId;
      const status = actionBtn.dataset.reviewAction;
      const form = mountEl.querySelector(`[data-review-form][data-submission-id="${submissionId}"]`);
      const feedback = form?.querySelector('textarea[name="feedback"]')?.value?.trim() || '';

      actionBtn.disabled = true;
      try {
        await onReviewMilestone({ submissionId, status, feedback });
      } catch (err) {
        console.error('Failed to submit review', err);
        actionBtn.disabled = false;
      }
    });
  });

  // Issue Certificate Action
  mountEl.querySelectorAll('[data-issue-cert]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!onIssueCertificate) return;
      const recipientUid = btn.dataset.uid;
      const tier = btn.dataset.tier;
      const recipientName = btn.dataset.name;
      const trackName = btn.dataset.track;
      const faculty = btn.dataset.faculty;

      btn.disabled = true;
      btn.textContent = 'Issuing...';
      try {
        await onIssueCertificate({ recipientUid, tier, recipientName, trackName, faculty });
      } catch (err) {
        console.error('Failed to issue certificate', err);
        btn.disabled = false;
        btn.textContent = `Issue ${tier}`;
      }
    });
  });

  // Spotlight Flyer Studio
  const spotlightCanvas = mountEl.querySelector('#admin-spotlight-canvas');
  const renderSpotlightBtn = mountEl.querySelector('#btn-render-spotlight');
  const downloadSpotlightBtn = mountEl.querySelector('#btn-download-spotlight');
  const weekSelect = mountEl.querySelector('#spotlight-week-select');

  function generateFlyer() {
    if (!spotlightCanvas) return;
    const weekNumber = Number(weekSelect?.value || 1);
    const selectedOption = weekSelect?.options[weekSelect.selectedIndex];
    const topicTitle = selectedOption?.dataset.title || `Week ${weekNumber}`;

    // Rank members for flyer
    const runsByMember = {};
    for (const r of allLabRuns) {
      if (!runsByMember[r.memberId]) runsByMember[r.memberId] = [];
      runsByMember[r.memberId].push(r);
    }

    const decorated = members.map((m) => {
      const mRuns = runsByMember[m.uid] || [];
      const distinctPassed = new Set(mRuns.filter((r) => r.passed).map((r) => r.labId)).size;
      return {
        name: m.name || 'Member',
        careerGoal: m.careerGoal || 'AI Track',
        labsPassed: distinctPassed,
        xp: distinctPassed * 10,
      };
    });

    decorated.sort((a, b) => b.xp - a.xp || b.labsPassed - a.labsPassed);
    const topLearners = decorated.slice(0, 4);

    drawSpotlightFlyer(spotlightCanvas, {
      weekNumber,
      topicTitle,
      topLearners,
    });

    if (downloadSpotlightBtn) downloadSpotlightBtn.disabled = false;
  }

  if (renderSpotlightBtn) {
    renderSpotlightBtn.addEventListener('click', generateFlyer);
    // Draw initial preview
    generateFlyer();
  }

  if (downloadSpotlightBtn && spotlightCanvas) {
    downloadSpotlightBtn.addEventListener('click', () => {
      const weekNumber = weekSelect?.value || '1';
      exportCanvasToPng(spotlightCanvas, `GDGoC-Week${weekNumber}-Spotlight.png`);
    });
  }
}

