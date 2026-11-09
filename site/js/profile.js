import { escapeHtml, isHttpUrl } from './util.js';

export const LEVELS = ['100L', '200L', '300L', '400L', '500L', 'Postgraduate', 'Other'];

export const AI_EXPERIENCES = [
  'Beginner (new to AI & LLMs)',
  'Casual User (ChatGPT / Claude / Gemini user)',
  'Built apps with LLM APIs',
  'Advanced (working with embeddings, RAG, agents)',
];

export const CAREER_GOALS = [
  'AI Engineer',
  'Prompt & Context Engineer',
  'AI Product Designer / PM',
  'AI / ML Researcher',
  'Other / Exploring',
];

export const WEEKLY_HOURS = [
  '3-5 hours',
  '5-10 hours',
  '10+ hours',
];

export function validateProfile(data) {
  const errors = {};

  if (!data.name || typeof data.name !== 'string' || !data.name.trim()) {
    errors.name = 'Full name is required';
  }
  if (!data.faculty || typeof data.faculty !== 'string' || !data.faculty.trim()) {
    errors.faculty = 'Faculty is required';
  }
  if (!data.department || typeof data.department !== 'string' || !data.department.trim()) {
    errors.department = 'Department is required';
  }
  if (!data.level || typeof data.level !== 'string' || !data.level.trim()) {
    errors.level = 'Academic level is required';
  }
  if (!data.careerGoal || typeof data.careerGoal !== 'string' || !data.careerGoal.trim()) {
    errors.careerGoal = 'Career goal is required';
  }
  if (!data.aiExperience || typeof data.aiExperience !== 'string' || !data.aiExperience.trim()) {
    errors.aiExperience = 'AI experience level is required';
  }
  if (!data.weeklyHours || typeof data.weeklyHours !== 'string' || !data.weeklyHours.trim()) {
    errors.weeklyHours = 'Weekly hours commitment is required';
  }
  if (!data.consent) {
    errors.consent = 'You must agree to the cohort learning commitment';
  }

  const urlPattern = /^https?:\/\/.+/i;
  if (data.githubUrl && !urlPattern.test(data.githubUrl.trim())) {
    errors.githubUrl = 'Please provide a valid URL (starting with http:// or https://)';
  }
  if (data.linkedinUrl && !urlPattern.test(data.linkedinUrl.trim())) {
    errors.linkedinUrl = 'Please provide a valid URL (starting with http:// or https://)';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function renderRegistrationForm(mountEl, initialData = {}) {
  const nameVal = initialData.name ? escapeHtml(initialData.name) : '';
  const emailVal = initialData.email ? escapeHtml(initialData.email) : '';
  const facultyVal = initialData.faculty ? escapeHtml(initialData.faculty) : '';
  const deptVal = initialData.department ? escapeHtml(initialData.department) : '';
  const githubVal = initialData.githubUrl ? escapeHtml(initialData.githubUrl) : '';
  const linkedinVal = initialData.linkedinUrl ? escapeHtml(initialData.linkedinUrl) : '';

  mountEl.innerHTML = `
    <div class="registration-container">
      <div class="registration-card">
        <div class="registration-card__head">
          <svg class="brand-logo" aria-hidden="true" viewBox="0 0 32 24" width="32" height="24" fill="none" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 3 4 12l10 9" stroke="#4285f4" />
            <path d="M18 3l10 9" stroke="#ea4335" />
            <path d="M28 12 18 21" stroke="#34a853" />
          </svg>
          <h2>Cohort Member Onboarding</h2>
          <p class="registration-card__sub">Complete your profile to unlock the 8-week roadmap, live-graded labs, and cluster portfolio.</p>
        </div>

        <form class="profile-form" data-profile-form>
          <div class="form-row">
            <div class="form-group">
              <label for="reg-name">Full Name *</label>
              <input id="reg-name" type="text" name="name" value="${nameVal}" required placeholder="e.g. Ada Lovelace" />
              <span class="form-error" data-error="name"></span>
            </div>

            <div class="form-group">
              <label for="reg-email">Email</label>
              <input id="reg-email" type="email" name="email" value="${emailVal}" disabled class="input--disabled" />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="reg-faculty">Faculty / School *</label>
              <input id="reg-faculty" type="text" name="faculty" value="${facultyVal}" required placeholder="e.g. Science / Engineering" />
              <span class="form-error" data-error="faculty"></span>
            </div>

            <div class="form-group">
              <label for="reg-dept">Department *</label>
              <input id="reg-dept" type="text" name="department" value="${deptVal}" required placeholder="e.g. Computer Science" />
              <span class="form-error" data-error="department"></span>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="reg-level">Academic Level *</label>
              <select id="reg-level" name="level" required>
                <option value="" disabled ${!initialData.level ? 'selected' : ''}>Select your level</option>
                ${LEVELS.map((lvl) => `<option value="${lvl}" ${initialData.level === lvl ? 'selected' : ''}>${lvl}</option>`).join('')}
              </select>
              <span class="form-error" data-error="level"></span>
            </div>

            <div class="form-group">
              <label for="reg-weekly">Weekly Study Commitment *</label>
              <select id="reg-weekly" name="weeklyHours" required>
                <option value="" disabled ${!initialData.weeklyHours ? 'selected' : ''}>Hours per week</option>
                ${WEEKLY_HOURS.map((hr) => `<option value="${hr}" ${initialData.weeklyHours === hr ? 'selected' : ''}>${hr}</option>`).join('')}
              </select>
              <span class="form-error" data-error="weeklyHours"></span>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="reg-experience">Current AI & LLM Experience *</label>
              <select id="reg-experience" name="aiExperience" required>
                <option value="" disabled ${!initialData.aiExperience ? 'selected' : ''}>Select experience</option>
                ${AI_EXPERIENCES.map((exp) => `<option value="${exp}" ${initialData.aiExperience === exp ? 'selected' : ''}>${exp}</option>`).join('')}
              </select>
              <span class="form-error" data-error="aiExperience"></span>
            </div>

            <div class="form-group">
              <label for="reg-goal">Primary Career Track / Goal *</label>
              <select id="reg-goal" name="careerGoal" required>
                <option value="" disabled ${!initialData.careerGoal ? 'selected' : ''}>Select track goal</option>
                ${CAREER_GOALS.map((g) => `<option value="${g}" ${initialData.careerGoal === g ? 'selected' : ''}>${g}</option>`).join('')}
              </select>
              <span class="form-error" data-error="careerGoal"></span>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="reg-github">GitHub Profile URL (optional)</label>
              <input id="reg-github" type="url" name="githubUrl" value="${githubVal}" placeholder="https://github.com/username" />
              <span class="form-error" data-error="githubUrl"></span>
            </div>

            <div class="form-group">
              <label for="reg-linkedin">LinkedIn Profile URL (optional)</label>
              <input id="reg-linkedin" type="url" name="linkedinUrl" value="${linkedinVal}" placeholder="https://linkedin.com/in/username" />
              <span class="form-error" data-error="linkedinUrl"></span>
            </div>
          </div>

          <div class="form-group form-group--checkbox">
            <label class="checkbox-label">
              <input type="checkbox" name="consent" ${initialData.consent ? 'checked' : ''} required />
              <span>I commit to active cohort participation, doing my own prompt labs honestly, and supporting my peers. *</span>
            </label>
            <span class="form-error" data-error="consent"></span>
          </div>

          <div class="form-actions">
            <button class="btn btn--primary btn--large" type="submit">Complete Registration</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

export function renderProfileView(mountEl, member) {
  const name = member.name ? escapeHtml(member.name) : 'Member';
  const email = member.email ? escapeHtml(member.email) : 'N/A';
  const faculty = member.faculty ? escapeHtml(member.faculty) : 'Not specified';
  const department = member.department ? escapeHtml(member.department) : 'Not specified';
  const level = member.level ? escapeHtml(member.level) : 'Not specified';
  const careerGoal = member.careerGoal ? escapeHtml(member.careerGoal) : 'Not specified';
  const aiExperience = member.aiExperience ? escapeHtml(member.aiExperience) : 'Not specified';
  const weeklyHours = member.weeklyHours ? escapeHtml(member.weeklyHours) : 'Not specified';
  const github = isHttpUrl(member.githubUrl) ? escapeHtml(member.githubUrl) : '';
  const linkedin = isHttpUrl(member.linkedinUrl) ? escapeHtml(member.linkedinUrl) : '';

  mountEl.innerHTML = `
    <div class="profile-view">
      <div class="profile-header-card">
        <div class="profile-avatar">
          <span>${name.charAt(0).toUpperCase()}</span>
        </div>
        <div class="profile-header-info">
          <div class="profile-header-title">
            <h2>${name}</h2>
            <span class="badge badge--cluster">Verified Member</span>
          </div>
          <p class="profile-email">${email}</p>
          <div class="profile-meta-tags">
            <span class="meta-tag">🎓 ${department} · ${level}</span>
            <span class="meta-tag">🎯 ${careerGoal}</span>
          </div>
        </div>
        <button class="btn btn--secondary btn--sm" id="edit-profile-btn">Edit Profile</button>
      </div>

      <div class="profile-details-grid">
        <div class="profile-detail-card">
          <h3>Academic Information</h3>
          <div class="detail-row">
            <span class="detail-label">Faculty</span>
            <span class="detail-value">${faculty}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Department</span>
            <span class="detail-value">${department}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Level</span>
            <span class="detail-value">${level}</span>
          </div>
        </div>

        <div class="profile-detail-card">
          <h3>Track & Goals</h3>
          <div class="detail-row">
            <span class="detail-label">Target Career Track</span>
            <span class="detail-value">${careerGoal}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">AI Experience</span>
            <span class="detail-value">${aiExperience}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Weekly Hours</span>
            <span class="detail-value">${weeklyHours}</span>
          </div>
        </div>

        <div class="profile-detail-card">
          <h3>Links & Socials</h3>
          <div class="detail-row">
            <span class="detail-label">GitHub</span>
            <span class="detail-value">${github ? `<a href="${github}" target="_blank" rel="noopener">${github}</a>` : 'Not linked'}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">LinkedIn</span>
            <span class="detail-value">${linkedin ? `<a href="${linkedin}" target="_blank" rel="noopener">${linkedin}</a>` : 'Not linked'}</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function wireProfileForm(mountEl, onSubmit) {
  const form = mountEl.querySelector('[data-profile-form]');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const data = {
      name: formData.get('name')?.toString().trim() || '',
      faculty: formData.get('faculty')?.toString().trim() || '',
      department: formData.get('department')?.toString().trim() || '',
      level: formData.get('level')?.toString().trim() || '',
      careerGoal: formData.get('careerGoal')?.toString().trim() || '',
      aiExperience: formData.get('aiExperience')?.toString().trim() || '',
      weeklyHours: formData.get('weeklyHours')?.toString().trim() || '',
      githubUrl: formData.get('githubUrl')?.toString().trim() || '',
      linkedinUrl: formData.get('linkedinUrl')?.toString().trim() || '',
      consent: form.querySelector('input[name="consent"]')?.checked || false,
    };

    // Clear previous error messages
    form.querySelectorAll('[data-error]').forEach((el) => {
      el.textContent = '';
      el.hidden = true;
    });

    const validation = validateProfile(data);
    if (!validation.valid) {
      for (const [field, message] of Object.entries(validation.errors)) {
        const errorEl = form.querySelector(`[data-error="${field}"]`);
        if (errorEl) {
          errorEl.textContent = message;
          errorEl.hidden = false;
        }
      }
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    try {
      await onSubmit(data);
    } catch (err) {
      console.error('Failed to submit profile', err);
      if (submitBtn) submitBtn.disabled = false;
    }
  });
}

