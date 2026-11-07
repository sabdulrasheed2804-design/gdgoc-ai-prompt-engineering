export function drawCertificate(canvas, {
  recipientName = 'Cohort Member',
  trackName = 'AI & Prompt Engineering Track',
  tier = 'Completion',
  certId = 'GDGOC-AI-CERT',
  issueDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
  faculty = 'Computer Science & Engineering',
} = {}) {
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = 1920;
  const h = 1080;
  canvas.width = w;
  canvas.height = h;

  // Background
  const bgGrad = ctx.createLinearGradient(0, 0, w, h);
  bgGrad.addColorStop(0, '#0a0d14');
  bgGrad.addColorStop(0.5, '#101522');
  bgGrad.addColorStop(1, '#070a0f');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  // Outer Google 4-Color Accent Border
  ctx.lineWidth = 6;
  // Blue top
  ctx.strokeStyle = '#4285F4';
  ctx.beginPath();
  ctx.moveTo(40, 40);
  ctx.lineTo(w - 40, 40);
  ctx.stroke();
  // Red right
  ctx.strokeStyle = '#EA4335';
  ctx.beginPath();
  ctx.moveTo(w - 40, 40);
  ctx.lineTo(w - 40, h - 40);
  ctx.stroke();
  // Yellow bottom
  ctx.strokeStyle = '#FBBC05';
  ctx.beginPath();
  ctx.moveTo(w - 40, h - 40);
  ctx.lineTo(40, h - 40);
  ctx.stroke();
  // Green left
  ctx.strokeStyle = '#34A853';
  ctx.beginPath();
  ctx.moveTo(40, h - 40);
  ctx.lineTo(40, 40);
  ctx.stroke();

  // Subtle Inner Frame
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(60, 60, w - 120, h - 120);

  // Brand Logo Dots
  const centerX = w / 2;
  const dotsY = 120;
  const dotRadius = 9;
  const dotSpacing = 28;
  const colors = ['#4285F4', '#EA4335', '#FBBC05', '#34A853'];
  const startX = centerX - ((colors.length - 1) * dotSpacing) / 2;
  colors.forEach((c, idx) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(startX + idx * dotSpacing, dotsY, dotRadius, 0, Math.PI * 2);
    ctx.fill();
  });

  // Institution & Program Header
  ctx.textAlign = 'center';
  ctx.fillStyle = '#8ab4f8';
  ctx.font = '700 18px "Plus Jakarta Sans", sans-serif';
  ctx.letterSpacing = '6px';
  ctx.fillText('GOOGLE DEVELOPER GROUPS ON CAMPUS', centerX, 175);

  ctx.fillStyle = '#9aa0a6';
  ctx.font = '600 15px "Plus Jakarta Sans", sans-serif';
  ctx.letterSpacing = '3px';
  ctx.fillText('CLUSTER OF ARTIFICIAL INTELLIGENCE & PROMPT ENGINEERING', centerX, 205);

  // Certificate Title
  let titleText = 'CERTIFICATE OF COMPLETION';
  if (tier.toLowerCase() === 'distinction') titleText = 'CERTIFICATE OF DISTINCTION';
  if (tier.toLowerCase() === 'honors') titleText = 'CERTIFICATE OF HONORS';

  ctx.fillStyle = '#ffffff';
  ctx.font = '800 46px "Plus Jakarta Sans", sans-serif';
  ctx.letterSpacing = '2px';
  ctx.fillText(titleText, centerX, 280);

  // Underline glow below title
  const titleGrad = ctx.createLinearGradient(centerX - 180, 0, centerX + 180, 0);
  titleGrad.addColorStop(0, 'rgba(66, 133, 244, 0)');
  titleGrad.addColorStop(0.5, '#4285f4');
  titleGrad.addColorStop(1, 'rgba(66, 133, 244, 0)');
  ctx.fillStyle = titleGrad;
  ctx.fillRect(centerX - 180, 305, 360, 3);

  // Presentation text
  ctx.fillStyle = '#9aa0a6';
  ctx.font = '400 20px "Plus Jakarta Sans", sans-serif';
  ctx.letterSpacing = '1px';
  ctx.fillText('This certifies that', centerX, 375);

  // Recipient Name
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 60px "Plus Jakarta Sans", sans-serif';
  ctx.letterSpacing = '0px';
  ctx.fillText(recipientName, centerX, 455);

  // Description / Citation
  ctx.fillStyle = '#bdc1c6';
  ctx.font = '400 21px "Plus Jakarta Sans", sans-serif';
  ctx.letterSpacing = '0.5px';
  const line1 = `has rigorously completed the 8-week curriculum in ${trackName}, passing hands-on, server-evaluated`;
  const line2 = 'labs in structured outputs, reasoning heuristics, guardrails, retrieval-augmented generation (RAG), and autonomous agent loops.';
  ctx.fillText(line1, centerX, 525);
  ctx.fillText(line2, centerX, 560);

  // Tier Badge Box
  const badgeW = 280;
  const badgeH = 46;
  const badgeX = centerX - badgeW / 2;
  const badgeY = 620;
  ctx.fillStyle = 'rgba(66, 133, 244, 0.12)';
  ctx.strokeStyle = '#4285f4';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 23);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#8ab4f8';
  ctx.font = '700 16px "Plus Jakarta Sans", sans-serif';
  ctx.letterSpacing = '2px';
  ctx.fillText(`TIER: ${tier.toUpperCase()}`, centerX, badgeY + 29);

  // Left & Right Signature Blocks
  const sigLeftX = 360;
  const sigRightX = w - 360;
  const sigY = 820;

  // Left: Track Lead
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(sigLeftX - 140, sigY);
  ctx.lineTo(sigLeftX + 140, sigY);
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = '700 18px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('Track Lead & Architect', sigLeftX, sigY + 30);
  ctx.fillStyle = '#9aa0a6';
  ctx.font = '400 15px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('AI & Prompt Engineering Cluster', sigLeftX, sigY + 54);

  // Right: Lead Organizer
  ctx.beginPath();
  ctx.moveTo(sigRightX - 140, sigY);
  ctx.lineTo(sigRightX + 140, sigY);
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = '700 18px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('Lead Organizer', sigRightX, sigY + 30);
  ctx.fillStyle = '#9aa0a6';
  ctx.font = '400 15px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('Google Developer Groups on Campus', sigRightX, sigY + 54);

  // Verification & Metadata Bar at Bottom
  ctx.fillStyle = '#80868b';
  ctx.font = '500 14px "JetBrains Mono", monospace';
  ctx.fillText(`CREDENTIAL ID: ${certId}   ·   ISSUED: ${issueDate.toUpperCase()}`, centerX, 970);
  ctx.fillStyle = '#5f6368';
  ctx.font = '400 13px "JetBrains Mono", monospace';
  ctx.fillText('VERIFY ONLINE: gdgoc-ai.pages.dev/#cert/' + certId, centerX, 995);
}

export function drawSpotlightFlyer(canvas, {
  weekNumber = 1,
  topicTitle = 'Foundations of LLMs & Prompting',
  topLearners = [],
  cohortName = 'GDGoC 2026 Cohort',
} = {}) {
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = 1080;
  const h = 1080;
  canvas.width = w;
  canvas.height = h;

  // Background
  const bgGrad = ctx.createLinearGradient(0, 0, w, h);
  bgGrad.addColorStop(0, '#0c1017');
  bgGrad.addColorStop(0.5, '#121824');
  bgGrad.addColorStop(1, '#080b11');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  // Ambient glows
  const glow1 = ctx.createRadialGradient(200, 200, 10, 200, 200, 450);
  glow1.addColorStop(0, 'rgba(66, 133, 244, 0.15)');
  glow1.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glow1;
  ctx.fillRect(0, 0, w, h);

  const glow2 = ctx.createRadialGradient(880, 880, 10, 880, 880, 450);
  glow2.addColorStop(0, 'rgba(251, 188, 5, 0.12)');
  glow2.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glow2;
  ctx.fillRect(0, 0, w, h);

  // Border
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 2;
  ctx.strokeRect(36, 36, w - 72, h - 72);

  const centerX = w / 2;

  // Brand Header
  ctx.textAlign = 'center';
  const dotsY = 90;
  const dotSpacing = 24;
  const colors = ['#4285F4', '#EA4335', '#FBBC05', '#34A853'];
  const startX = centerX - ((colors.length - 1) * dotSpacing) / 2;
  colors.forEach((c, idx) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(startX + idx * dotSpacing, dotsY, 7, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = '#8ab4f8';
  ctx.font = '700 15px "Plus Jakarta Sans", sans-serif';
  ctx.letterSpacing = '4px';
  ctx.fillText('GOOGLE DEVELOPER GROUPS ON CAMPUS', centerX, 140);

  ctx.fillStyle = '#ffffff';
  ctx.font = '800 48px "Plus Jakarta Sans", sans-serif';
  ctx.letterSpacing = '1px';
  ctx.fillText('LEARNERS OF THE WEEK', centerX, 210);

  // Week pill
  const pillW = 340;
  const pillH = 40;
  ctx.fillStyle = 'rgba(251, 188, 5, 0.15)';
  ctx.strokeStyle = '#fbbc05';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(centerX - pillW / 2, 235, pillW, pillH, 20);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#fbbc05';
  ctx.font = '700 15px "JetBrains Mono", monospace';
  ctx.fillText(`WEEK ${weekNumber} · TOP PERFORMERS`, centerX, 260);

  // Topic text
  ctx.fillStyle = '#9aa0a6';
  ctx.font = '500 18px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(topicTitle, centerX, 315);

  // Cards for Top Learners (up to 4)
  const learnersToShow = topLearners.slice(0, 4);
  const cardStart = 355;
  const cardH = 100;
  const cardGap = 18;
  const cardW = 840;

  learnersToShow.forEach((learner, i) => {
    const cardY = cardStart + i * (cardH + cardGap);
    const cardX = centerX - cardW / 2;

    // Card background
    ctx.fillStyle = i === 0 ? 'rgba(251, 188, 5, 0.08)' : 'rgba(255, 255, 255, 0.03)';
    ctx.strokeStyle = i === 0 ? 'rgba(251, 188, 5, 0.4)' : 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, 16);
    ctx.fill();
    ctx.stroke();

    // Rank Medal / Number
    ctx.textAlign = 'left';
    ctx.fillStyle = i === 0 ? '#fbbc05' : i === 1 ? '#cbd5e1' : i === 2 ? '#fb923c' : '#9aa0a6';
    ctx.font = '800 28px "JetBrains Mono", monospace';
    const rankLabel = i === 0 ? '🥇 #1' : i === 1 ? '🥈 #2' : i === 2 ? '🥉 #3' : `   #${i + 1}`;
    ctx.fillText(rankLabel, cardX + 24, cardY + 60);

    // Member Name & Track
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 24px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(learner.name || 'Member', cardX + 160, cardY + 48);

    ctx.fillStyle = '#9aa0a6';
    ctx.font = '500 15px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(learner.careerGoal || 'AI Track Member', cardX + 160, cardY + 75);

    // XP & Labs on Right
    ctx.textAlign = 'right';
    ctx.fillStyle = '#fbbc05';
    ctx.font = '700 22px "JetBrains Mono", monospace';
    ctx.fillText(`${learner.xp || 0} XP`, cardX + cardW - 28, cardY + 48);

    ctx.fillStyle = '#8ab4f8';
    ctx.font = '500 15px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(`🧪 ${learner.labsPassed || 0} Labs`, cardX + cardW - 28, cardY + 75);
  });

  // Footer Tagline
  ctx.textAlign = 'center';
  ctx.fillStyle = '#5f6368';
  ctx.font = '600 15px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(`${cohortName} · AI & Prompt Engineering Cluster`, centerX, 990);
  ctx.fillStyle = '#3c4043';
  ctx.font = '500 13px "JetBrains Mono", monospace';
  ctx.fillText('gdgoc-ai.pages.dev', centerX, 1018);
}

export function exportCanvasToPng(canvas, filename = 'certificate.png') {
  if (!canvas || !canvas.toDataURL) return;
  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

