/**
 * AI Customer Assistant — Frontend Application
 * With Customer Management & Per-Customer Memory
 */

// ===== Configuration =====
const WORKER_URL = 'https://ai-customer-assistant.pages.dev/api/chat';
const MODEL = 'MiniMax-M2.7-highspeed';
const MAX_CONVERSATION_HISTORY = 10;

// ===== State =====
let knowledgeBase = [];
let customers = [];
let currentCustomerId = null;

// ===== DOM Elements =====
const $ = (id) => document.getElementById(id);

// Customer form
const $modalCustomer = $('modal-customer');
const $modalCustomerBackdrop = $('modal-customer-backdrop');
const $modalCustomerClose = $('modal-customer-close');
const $modalCustomerTitle = $('modal-customer-title');
const $customerForm = $('customer-form');
const $customerName = $('customer-name');
const $customerLevel = $('customer-level');
const $customerCompany = $('customer-company');
const $customerWebsite = $('customer-website');
const $customerType = $('customer-type');
const $customerPlatform = $('customer-platform');
const $customerPosition = $('customer-position');
const $customerRegion = $('customer-region');
const $customerSource = $('customer-source');
const $customerOrderHistory = $('customer-order-history');
const $customerPaymentRecords = $('customer-payment-records');
const $customerCreditRating = $('customer-credit-rating');
const $customerOtherNotes = $('customer-other-notes');
const $customerProdViewCount = $('customer-prod-view-count');
const $customerValidInquiry = $('customer-valid-inquiry');
const $customerLoginDays = $('customer-login-days');
const $customerFormSubmit = $('customer-form-submit');
const $customerFormCancel = $('customer-form-cancel');

// Sidebar
const $btnAddCustomer = $('btn-add-customer');
const $customerSearch = $('customer-search');
const $customerListEl = $('customer-list');
const $customerEmptyHint = $('customer-empty-hint');
const $currentCustomerDetail = $('current-customer-detail');
const $currentCustomerName = $('current-customer-name');
const $currentCustomerLevel = $('current-customer-level');
const $currentCustomerInfo = $('current-customer-info');
const $btnEditCurrent = $('btn-edit-current');

// Message input
const $customerMessage = $('customer-message');
const $messageType = $('message-type');
const $toneSelect = $('tone-select');
const $btnGenerate = $('btn-generate');

// Output
const $outputPlaceholder = $('output-placeholder');
const $outputContent = $('output-content');
const $outputLoading = $('output-loading');
const $outputText = $('output-text');
const $btnCopy = $('btn-copy');
const $chunksUsed = $('chunks-used');

// Knowledge
const $knowledgePreview = $('knowledge-preview');
const $knowledgeChunks = $('knowledge-chunks');
const $knowledgeCount = $('knowledge-count');
const $btnKnowledge = $('btn-knowledge');
const $modalKnowledge = $('modal-knowledge');
const $modalBackdrop = $('modal-backdrop');
const $modalClose = $('modal-close');
const $knowledgeInput = $('knowledge-input');
const $knowledgeTitle = $('knowledge-title');
const $btnAddKnowledge = $('btn-add-knowledge');
const $statDocs = $('stat-docs');
const $statChunks = $('stat-chunks');
const $statWords = $('stat-words');
const $docEmpty = $('doc-empty');
const $docList = $('doc-list');

// Conversation
const $conversationArea = $('conversation-area');

// Import modal
const $modalImport = $('modal-import');
const $modalImportBackdrop = $('modal-import-backdrop');
const $modalImportClose = $('modal-import-close');
const $importImageArea = $('import-image-area');
const $importImageInput = $('import-image-input');
const $importImagePlaceholder = $('import-image-placeholder');
const $importImagePreview = $('import-image-preview');
const $btnClearImage = $('btn-clear-image');
const $btnUploadImage = $('btn-upload-image');
const $importImageResult = $('import-image-result');
const $importTextInput = $('import-text-input');
const $btnParseText = $('btn-parse-text');
const $importTextResult = $('import-text-result');
const $importSummaryInput = $('import-summary-input');
const $btnAddSummary = $('btn-add-summary');
const $btnImportHistory = $('btn-import-history');

// ===== Init =====
async function init() {
  await loadKnowledgeBase();
  loadCustomers();
  setupEventListeners();
  renderCustomerList();
  updateKnowledgeStats();
  updateKnowledgePreview();
  updateCurrentCustomerDetail();
}

// ===== Event Listeners =====
function setupEventListeners() {
  $btnGenerate.addEventListener('click', handleGenerate);
  $btnCopy.addEventListener('click', handleCopy);
  $btnAddCustomer.addEventListener('click', () => openCustomerModal());
  $btnEditCurrent.addEventListener('click', () => {
    if (currentCustomerId) editCustomer(currentCustomerId);
  });
  $modalCustomerBackdrop.addEventListener('click', closeCustomerModal);
  $modalCustomerClose.addEventListener('click', closeCustomerModal);
  $customerFormCancel.addEventListener('click', closeCustomerModal);
  $customerForm.addEventListener('submit', (e) => { e.preventDefault(); handleSaveCustomer(); });
  $customerSearch.addEventListener('input', handleCustomerSearch);

  $btnKnowledge.addEventListener('click', openKnowledgeModal);
  $modalBackdrop.addEventListener('click', closeKnowledgeModal);
  $modalClose.addEventListener('click', closeKnowledgeModal);
  $btnAddKnowledge.addEventListener('click', handleAddKnowledge);

  $customerMessage.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.ctrlKey) handleGenerate();
  });
  $customerMessage.addEventListener('input', updateKnowledgePreview);

  // Import modal
  $btnImportHistory.addEventListener('click', openImportModal);
  $modalImportBackdrop.addEventListener('click', closeImportModal);
  $modalImportClose.addEventListener('click', closeImportModal);

  // Import tab switching
  document.querySelectorAll('[data-import-tab]').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('[data-import-tab]').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.import-tab-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('import-tab-' + tab.dataset.importTab).classList.add('active');
    });
  });

  // Image upload
  $importImageArea.addEventListener('click', () => $importImageInput.click());
  $importImageInput.addEventListener('change', handleImageSelect);
  $btnClearImage.addEventListener('click', clearImportImage);
  $btnUploadImage.addEventListener('click', handleImageUpload);

  // Text paste
  $importTextInput.addEventListener('input', () => {
    $btnParseText.disabled = !$importTextInput.value.trim();
  });
  $btnParseText.addEventListener('click', handleTextParse);

  // Summary
  $importSummaryInput.addEventListener('input', () => {
    $btnAddSummary.disabled = !$importSummaryInput.value.trim();
  });
  $btnAddSummary.addEventListener('click', handleSummaryAdd);
}

// ===== Customer Management =====
function loadCustomers() {
  try {
    const stored = localStorage.getItem('ai-customers-v2');
    customers = stored ? JSON.parse(stored) : [];
  } catch {
    customers = [];
  }
}

function saveCustomers() {
  localStorage.setItem('ai-customers-v2', JSON.stringify(customers));
}

function getCurrentCustomer() {
  return customers.find(c => c.id === currentCustomerId) || null;
}

function openCustomerModal(editing = false) {
  $modalCustomerTitle.textContent = editing ? '编辑客户' : '添加新客户';
  $customerFormSubmit.textContent = editing ? '保存修改' : '添加客户';
  $modalCustomer.classList.remove('hidden');
}

function closeCustomerModal() {
  $modalCustomer.classList.add('hidden');
  updateCustomerForm();
}

function updateCustomerForm() {
  $customerForm.reset();
  delete $customerForm.dataset.editingId;
}

function renderCustomerList(filter = '') {
  const filtered = filter
    ? customers.filter(c =>
        c.name.toLowerCase().includes(filter.toLowerCase()) ||
        (c.company || '').toLowerCase().includes(filter.toLowerCase())
      )
    : customers;

  if (customers.length === 0) {
    $customerEmptyHint.classList.remove('hidden');
    $customerListEl.innerHTML = '';
    $customerListEl.appendChild($customerEmptyHint);
    return;
  }

  $customerEmptyHint.classList.add('hidden');

  const listHtml = filtered.length === 0
    ? '<div class="customer-empty-hint"><p>未找到匹配客户</p></div>'
    : filtered.map(c => `
      <div class="customer-item ${c.id === currentCustomerId ? 'active' : ''}" data-id="${c.id}" onclick="selectCustomer('${c.id}')">
        <div class="customer-item-top">
          <div class="customer-item-name">
            ${escapeHtml(c.name)}
            ${c.level ? `<span class="customer-level level-${c.level}">${c.level}</span>` : ''}
          </div>
        </div>
        <div class="customer-item-meta">${escapeHtml(c.company || '未知公司')} · ${escapeHtml(c.type ? getTypeLabel(c.type) : '未分类')}</div>
        <div class="customer-item-actions" onclick="event.stopPropagation()">
          <button class="btn btn-sm btn-ghost" onclick="editCustomer('${c.id}')">编辑</button>
          <button class="btn btn-sm btn-ghost" onclick="deleteCustomer('${c.id}')">删除</button>
        </div>
      </div>
    `).join('');

  $customerListEl.innerHTML = listHtml;
}

function handleCustomerSearch() {
  renderCustomerList($customerSearch.value.trim());
}

window.selectCustomer = function(id) {
  currentCustomerId = id;
  renderCustomerList($customerSearch.value.trim());
  updateCurrentCustomerDetail();
  updateConversationDisplay();
  updateKnowledgePreview();
};

window.editCustomer = function(id) {
  const c = customers.find(x => x.id === id);
  if (!c) return;
  fillCustomerForm(c);
  openCustomerModal(true);
};

window.deleteCustomer = function(id) {
  if (!confirm('确定删除该客户？此操作不可恢复。')) return;
  customers = customers.filter(c => c.id !== id);
  if (currentCustomerId === id) currentCustomerId = customers[0]?.id || null;
  saveCustomers();
  renderCustomerList();
  updateCurrentCustomerDetail();
  updateConversationDisplay();
  showToast('已删除客户');
};

function fillCustomerForm(c) {
  $customerName.value = c.name || '';
  $customerLevel.value = c.level || '';
  $customerCompany.value = c.company || '';
  $customerWebsite.value = c.website || '';
  $customerType.value = c.type || '';
  $customerPlatform.value = c.platform || '';
  $customerPosition.value = c.position || '';
  $customerRegion.value = c.region || '';
  $customerSource.value = c.source || '';
  $customerOrderHistory.value = c.backgroundCheck?.orderHistory || '';
  $customerPaymentRecords.value = c.backgroundCheck?.paymentRecords || '';
  $customerCreditRating.value = c.backgroundCheck?.creditRating || '';
  $customerOtherNotes.value = c.backgroundCheck?.otherNotes || '';
  $customerProdViewCount.value = c.backgroundCheck?.prodViewCount || '';
  $customerValidInquiry.value = c.backgroundCheck?.validInquiry || '';
  $customerLoginDays.value = c.backgroundCheck?.loginDays || '';
  $customerForm.dataset.editingId = c.id;
}

function handleSaveCustomer() {
  const name = $customerName.value.trim();
  if (!name) { showToast('请输入客户名称'); return; }

  const data = {
    name,
    level: $customerLevel.value,
    company: $customerCompany.value.trim(),
    website: $customerWebsite.value.trim(),
    type: $customerType.value,
    platform: $customerPlatform.value.trim(),
    position: $customerPosition.value.trim(),
    region: $customerRegion.value.trim(),
    source: $customerSource.value.trim(),
    backgroundCheck: {
      orderHistory: $customerOrderHistory.value.trim(),
      paymentRecords: $customerPaymentRecords.value.trim(),
      creditRating: $customerCreditRating.value.trim(),
      otherNotes: $customerOtherNotes.value.trim(),
      prodViewCount: $customerProdViewCount.value || '',
      validInquiry: $customerValidInquiry.value || '',
      loginDays: $customerLoginDays.value || ''
    }
  };

  const editingId = $customerForm.dataset.editingId;
  if (editingId) {
    const idx = customers.findIndex(c => c.id === editingId);
    if (idx !== -1) {
      customers[idx] = { ...customers[idx], ...data };
      showToast('客户已更新');
    }
  } else {
    const id = Date.now().toString();
    customers.push({ id, conversations: [], createdAt: new Date().toISOString(), ...data });
    currentCustomerId = id;
    showToast(`客户「${name}」已添加`);
  }

  saveCustomers();
  renderCustomerList();
  updateCurrentCustomerDetail();
  updateConversationDisplay();
  updateCustomerForm();
  closeCustomerModal();
}

function updateCurrentCustomerDetail() {
  const c = getCurrentCustomer();
  if (!c) {
    $currentCustomerDetail.classList.remove('visible');
    return;
  }

  $currentCustomerDetail.classList.add('visible');
  $currentCustomerName.textContent = c.name;

  if (c.level) {
    $currentCustomerLevel.textContent = c.level;
    $currentCustomerLevel.className = `current-customer-level customer-level level-${c.level}`;
  } else {
    $currentCustomerLevel.textContent = '未评级';
    $currentCustomerLevel.className = 'current-customer-level';
  }

  const typeLabels = { wholesaler: '批发商', factory: '工厂', trader: '贸易商', distributor: '经销商', agent: '代理商', other: '其他' };
  const ninetyDayParts = [];
  if (c.backgroundCheck?.prodViewCount) ninetyDayParts.push(`浏览${c.backgroundCheck.prodViewCount}次`);
  if (c.backgroundCheck?.validInquiry) ninetyDayParts.push(`询盘${c.backgroundCheck.validInquiry}次`);
  if (c.backgroundCheck?.loginDays) ninetyDayParts.push(`登录${c.backgroundCheck.loginDays}天`);

  const parts = [
    c.company && `公司: ${c.company}`,
    c.type && `类型: ${typeLabels[c.type] || c.type}`,
    c.region && `地区: ${c.region}`,
    c.backgroundCheck?.creditRating && `信用: ${c.backgroundCheck.creditRating}`,
    ninetyDayParts.length > 0 && `近90天: ${ninetyDayParts.join(', ')}`
  ].filter(Boolean);

  $currentCustomerInfo.textContent = parts.join(' | ') || '暂无详细信息';
}

// ===== Conversation Display =====
function updateConversationDisplay() {
  if (!$conversationArea) return;
  const customer = getCurrentCustomer();
  if (!customer || !customer.conversations || customer.conversations.length === 0) {
    $conversationArea.innerHTML = '<div class="conv-empty">选择客户后，对话历史将显示在这里</div>';
    return;
  }
  $conversationArea.innerHTML = customer.conversations.map(conv => {
    if (conv.role === 'summary') {
      return `
      <div class="conv-item conv-summary">
        <div class="conv-role">对话摘要</div>
        <div class="conv-content">${escapeHtml(conv.content)}</div>
        <div class="conv-time">${new Date(conv.timestamp).toLocaleString('zh-CN')}</div>
      </div>`;
    }
    return `
    <div class="conv-item conv-${conv.role === 'user' ? 'user' : 'assistant'}">
      <div class="conv-role">${conv.role === 'user' ? '客户' : '员工'}</div>
      <div class="conv-content">${escapeHtml(conv.content)}</div>
      <div class="conv-time">${new Date(conv.timestamp).toLocaleString('zh-CN')}</div>
    </div>`;
  }).join('');
  $conversationArea.scrollTop = $conversationArea.scrollHeight;
}

// ===== Generate Reply =====
async function handleGenerate() {
  const message = $customerMessage.value.trim();
  if (!message) {
    showToast('请先输入客户消息');
    $customerMessage.focus();
    return;
  }

  if (!currentCustomerId) {
    showToast('请先选择客户');
    return;
  }

  $outputPlaceholder.classList.add('hidden');
  $outputContent.classList.add('hidden');
  $outputLoading.classList.remove('hidden');
  $btnGenerate.disabled = true;

  try {
    const retrievedChunks = retrieveChunks(message);
    updateKnowledgePreviewChunks(retrievedChunks);

    const reply = await generateReply({
      message,
      type: $messageType.value,
      tone: $toneSelect.value,
      chunks: retrievedChunks
    });

    // Save to customer conversation history
    const customer = getCurrentCustomer();
    if (customer) {
      if (!customer.conversations) customer.conversations = [];
      customer.conversations.push({ role: 'user', content: message, timestamp: new Date().toISOString() });
      customer.conversations.push({ role: 'assistant', content: reply, timestamp: new Date().toISOString() });
      if (customer.conversations.length > MAX_CONVERSATION_HISTORY * 2) {
        customer.conversations = customer.conversations.slice(-MAX_CONVERSATION_HISTORY * 2);
      }
      saveCustomers();
      updateConversationDisplay();
    }

    $outputLoading.classList.add('hidden');
    $outputContent.classList.remove('hidden');
    $outputText.textContent = reply;
    $chunksUsed.textContent = `${retrievedChunks.length} 个知识片段`;
    $customerMessage.value = '';

  } catch (err) {
    $outputLoading.classList.add('hidden');
    $outputPlaceholder.classList.remove('hidden');
    showToast('生成失败: ' + err.message);
    console.error(err);
  } finally {
    $btnGenerate.disabled = false;
  }
}

// ===== Call MiniMax API =====
async function generateReply({ message, type, tone, chunks }) {
  const customer = getCurrentCustomer();

  const toneLabels = {
    professional: 'Professional and business-like',
    friendly: 'Warm and friendly',
    formal: 'Formal and polite',
    casual: 'Casual and conversational'
  };

  const typeLabels = {
    inquiry: 'Product/Service Inquiry',
    complaint: 'Customer Complaint',
    feedback: 'Customer Feedback',
    support: 'Technical Support Request',
    order: 'Order Related',
    other: 'General Inquiry'
  };

  const typeLabelMap = { wholesaler: 'Wholesaler (批发商)', factory: 'Factory (工厂)', trader: 'Trader (贸易商)', distributor: 'Distributor (经销商)', agent: 'Agent (代理商)', other: 'Other (其他)' };

  let customerContext = '';
  if (customer) {
    const ninetyDayActivity = [];
    if (customer.backgroundCheck?.prodViewCount) ninetyDayActivity.push(`产品浏览: ${customer.backgroundCheck.prodViewCount}次`);
    if (customer.backgroundCheck?.validInquiry) ninetyDayActivity.push(`有效询盘: ${customer.backgroundCheck.validInquiry}次`);
    if (customer.backgroundCheck?.loginDays) ninetyDayActivity.push(`登陆: ${customer.backgroundCheck.loginDays}天`);

    customerContext = `Customer: ${customer.name}
Company: ${customer.company || 'Unknown'}
Level: ${customer.level || 'Unrated'} ${customer.level ? getLevelStrategy(customer.level) : ''}
Type: ${typeLabelMap[customer.type] || customer.type || 'Unknown'}
Buyer Characteristic: ${customer.platform || 'Unknown'} (${customer.source || 'Unknown industry'})
Region: ${customer.region || 'Unknown'}
Position: ${customer.position || 'Unknown'}
Order History: ${customer.backgroundCheck?.orderHistory || 'No prior orders'}
Payment Records: ${customer.backgroundCheck?.paymentRecords || 'Unknown'}
Credit Rating: ${customer.backgroundCheck?.creditRating || 'Unrated'}
90-Day Activity: ${ninetyDayActivity.length > 0 ? ninetyDayActivity.join(', ') : 'No recent activity'}
Notes: ${customer.backgroundCheck?.otherNotes || 'None'}`;
  }

  let historyContext = '';
  let summaryContext = '';

  if (customer?.conversations?.length > 0) {
    // Separate summaries from regular conversation
    const summaries = customer.conversations.filter(c => c.role === 'summary');
    const regularHistory = customer.conversations.filter(c => c.role !== 'summary').slice(-6);

    if (summaries.length > 0) {
      summaryContext = `\n## Conversation Background Summary\n${summaries.map(s => s.content).join('\n\n')}`;
    }

    if (regularHistory.length > 0) {
      const history = regularHistory.map(c =>
        `${c.role === 'user' ? 'Customer' : 'Employee'}: ${c.content}`
      ).join('\n');
      historyContext = `\n## Recent Conversation History\n${history}`;
    }
  }

  // Build knowledge context
  const kbContext = chunks.length > 0
    ? `Use these product facts in your reply:\n${formatChunksForPrompt(chunks)}\n`
    : 'No product catalog available - be helpful anyway.';

  const systemPrompt = `You are a Senior Export Sales Representative with 8+ years of B2B experience in international trade. You're helping an employee reply to a customer on an instant messaging platform (like WhatsApp, WeChat, or similar chat).

${kbContext}

## OUTPUT FORMAT - TWO PARTS:

### Part 1: Reply Thoughts (for employee reference)
，分析客户意图、确定回复策略、注意事项
Format: Brief bullet points in Chinese, 3-5 points max

### Part 2: Suggested Reply
- Keep it SHORT and conversational (instant chat, not email!)
- If long, split into 2-3 short messages
- Use casual business English naturally
- Can add 1-2 relevant emoji per message
- Use common chat slang when natural:
  * ASAP, FYI, BTW, TBH, IMO, TBD, WFH
  * "Got it!" "Sounds good!" "Makes sense!"
  * "Let me check on that for you"
  * "Just wanted to follow up..."
- No markdown, no bullet points in reply

**Phrases to AVOID (sounds like AI):**
❌ "I hope this email finds you well"
❌ "Please do not hesitate to contact me"
❌ "As an AI language model"
❌ "I would like to take this opportunity to..."
❌ "Kindly advise"
❌ "We wish to inform you"

**Tone by Customer Level:**
- L4-L5 (VIP): Warm, personalized, make them feel valued
- L2-L3 (Major): Professional but friendly
- L1 (New): Build trust, be helpful, no pressure
- L0 (High Risk): Precise, clear terms, careful

**Regional style:**
- Germany: Direct, efficient, no fluff
- UK: Polite, understated
- USA: Friendly, casual, light humor OK
- Middle East: Warm, relationship-focused

Customer context:
${customerContext}
${summaryContext}
${historyContext}`;

  const userPrompt = `Customer message: "${message}"

Message type: ${typeLabels[type] || 'General Inquiry'}
Tone: ${toneLabels[tone] || 'Professional'}

Generate the reply now. Format: First show your thinking (Chinese), then the suggested reply (English chat style).`;

  const response = await fetch(WORKER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 600,
      temperature: 0.7,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `API error: ${response.status}`);
  }

  const data = await response.json();
  // Handle MiniMax API response format where content is array with type: "text" or "thinking"
  let textContent = Array.isArray(data.content)
    ? data.content.find(c => c.type === 'text')?.text || ''
    : data.content?.[0]?.text || '';

  // Clean up AI-sounding phrases
  textContent = cleanAIPhrases(textContent);

  return textContent || '生成回复为空，请稍后重试。';
}

// ===== Clean AI-sounding phrases =====
function cleanAIPhrases(text) {
  if (!text) return text;

  let cleaned = text;

  // Remove markdown headers (# Header and ## Header -> just the text)
  cleaned = cleaned.replace(/^#+\s*([^\n]+)/gm, '$1');

  // Remove table formatting | col | col | -> just text
  cleaned = cleaned.replace(/^\|.*\|$/gm, '');

  // Remove bold/italic markers
  cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '$1');
  cleaned = cleaned.replace(/\*([^*]+)\*/g, '$1');
  cleaned = cleaned.replace(/__([^_]+)__/g, '$1');

  // Remove numbered/bulleted list markers
  cleaned = cleaned.replace(/^\d+\.\s*/gm, '');
  cleaned = cleaned.replace(/^[-•*]\s*/gm, '');

  // Patterns to remove
  const removePatterns = [
    /I(?:'m| am) an AI(?: assistant)?/gi,
    /As an AI(?: language model)?/gi,
    /I(?:'m| am) an AI(?: language model)?/gi,
    /I should clarify that I'm an AI/gi,
    /I don't have access to.*(?:catalog|product database|orders)/gi,
    /Contact sales directly at \[.*?\]/gi,
    /\[.*?\]/g,
  ];

  for (const pattern of removePatterns) {
    cleaned = cleaned.replace(pattern, '');
  }

  // Fix awkward openings
  cleaned = cleaned.replace(/^Hello! Thank you for your interest\./im, 'Thank you for your interest in our glassware products.');

  // Remove multiple newlines
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  // Remove leading/trailing whitespace per line and filter empty lines
  cleaned = cleaned.split('\n').map(line => line.trim()).filter(line => line).join('\n');

  return cleaned.trim();
}

// ===== RAG =====
function retrieveChunks(query, topK = 5) {
  if (knowledgeBase.length === 0) return [];
  const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const scored = [];
  for (const doc of knowledgeBase) {
    for (const chunk of doc.chunks) {
      const chunkLower = chunk.toLowerCase();
      let score = 0;
      for (const word of queryWords) {
        if (chunkLower.includes(word)) score++;
      }
      if (chunkLower.includes(query.toLowerCase())) score += 5;
      if (score > 0) scored.push({ docId: doc.id, title: doc.title, chunk, score });
    }
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

function formatChunksForPrompt(chunks) {
  if (!chunks || chunks.length === 0) return '(No relevant knowledge base entries found)';
  return chunks.map((c, i) => `[${i + 1}] ${c.title}: ${c.chunk}`).join('\n\n');
}

function getTypeLabel(type) {
  const labels = { wholesaler: '批发商', factory: '工厂', trader: '贸易商', distributor: '经销商', agent: '代理商', other: '其他' };
  return labels[type] || type;
}

function getLevelStrategy(level) {
  const strategies = {
    'L5': '(VIP客户 - 提供最高优先级服务，个性化对待，强调长期合作关系)',
    'L4': '(重点客户 - 优先处理，个性化报价，展现合作价值)',
    'L3': '(大客户 - 标准专业服务，适当个性化)',
    'L2': '(成长型 - 重点发展关系，展示产品优势和合作前景)',
    'L1': '(新客户 - 建立信任关系，详细介绍公司实力和产品优势)',
    'L0': '(高风险 - 谨慎报价，明确付款条款，所有细节确认到位)'
  };
  return strategies[level] || '';
}

// ===== Update Knowledge Preview =====
function updateKnowledgePreview() {
  const message = $customerMessage.value.trim();
  if (!message) {
    $knowledgeChunks.innerHTML = '<p class="knowledge-empty">输入消息后自动检索相关知识库内容</p>';
    $knowledgeCount.textContent = '0 条';
    return;
  }
  const chunks = retrieveChunks(message);
  updateKnowledgePreviewChunks(chunks);
  $knowledgeCount.textContent = `${chunks.length} 条`;
}

function updateKnowledgePreviewChunks(chunks) {
  $knowledgeCount.textContent = `${chunks.length} 条`;
  if (chunks.length === 0) {
    $knowledgeChunks.innerHTML = '<p class="knowledge-empty">未找到相关知识库内容，AI 将基于通用知识生成回复</p>';
    return;
  }
  $knowledgeChunks.innerHTML = chunks.map(c => `
    <div class="chunk-item">
      <strong>${escapeHtml(c.title)}</strong>
      <p>${escapeHtml(c.chunk)}</p>
    </div>
  `).join('');
}

// ===== Copy =====
async function handleCopy() {
  const text = $outputText.textContent;
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    showToast('已复制到剪贴板');
  } catch {
    showToast('复制失败，请手动选择复制');
  }
}

// ===== Knowledge Base Management =====
async function loadKnowledgeBase() {
  try {
    const response = await fetch(`/api/kb`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await response.json();
    if (data.success && data.data) {
      knowledgeBase = data.data;
    } else {
      knowledgeBase = [];
    }
  } catch {
    knowledgeBase = [];
  }
}

function handleAddKnowledge() {
  const content = $knowledgeInput.value.trim();
  const title = $knowledgeTitle.value.trim() || `文档 ${knowledgeBase.length + 1}`;
  if (!content) { showToast('请输入知识库内容'); return; }
  const chunks = chunkText(content, 300);

  $btnAddKnowledge.disabled = true;
  $btnAddKnowledge.textContent = '添加中...';

  fetch(`/api/kb`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, content, chunks })
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        knowledgeBase.push(data.data);
        $knowledgeInput.value = '';
        $knowledgeTitle.value = '';
        updateKnowledgeStats();
        updateKnowledgePreview();
        updateDocList();
        showToast(`已添加「${title}」，生成 ${chunks.length} 个知识片段`);
      } else {
        showToast('添加失败: ' + (data.error || '未知错误'));
      }
    })
    .catch(err => {
      showToast('添加失败: ' + err.message);
    })
    .finally(() => {
      $btnAddKnowledge.disabled = false;
      $btnAddKnowledge.textContent = '添加到知识库';
    });
}

function chunkText(text, maxChars = 300) {
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 20);
  if (paragraphs.length === 0) return [text.trim()];
  const chunks = [];
  for (const para of paragraphs) {
    if (para.length <= maxChars) {
      chunks.push(para.trim());
    } else {
      const sentences = para.match(/[^.!?。！？]+[.!?。！？]+/g) || [para];
      let current = '';
      for (const sent of sentences) {
        if ((current + sent).length <= maxChars) {
          current += sent;
        } else {
          if (current) chunks.push(current.trim());
          current = sent;
        }
      }
      if (current) chunks.push(current.trim());
    }
  }
  return chunks.filter(c => c.length > 30);
}

function updateKnowledgeStats() {
  $statDocs.textContent = knowledgeBase.length;
  $statChunks.textContent = knowledgeBase.reduce((sum, d) => sum + d.chunks.length, 0);
  $statWords.textContent = knowledgeBase.reduce((sum, d) => sum + d.content.split(/\s+/).length, 0).toLocaleString();
}

function updateDocList() {
  if (knowledgeBase.length === 0) {
    $docEmpty.classList.remove('hidden');
    $docList.classList.add('hidden');
    return;
  }
  $docEmpty.classList.add('hidden');
  $docList.classList.remove('hidden');
  $docList.innerHTML = knowledgeBase.map(doc => `
    <div class="doc-item">
      <svg class="doc-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      </svg>
      <div class="doc-info">
        <div class="doc-title">${escapeHtml(doc.title)}</div>
        <div class="doc-preview">${escapeHtml(doc.content.substring(0, 100))}...</div>
      </div>
      <button class="doc-delete" onclick="deleteDoc('${doc.id}')" title="删除">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
        </svg>
      </button>
    </div>
  `).join('');
}

window.deleteDoc = function(id) {
  fetch(`/api/kb?action=delete&id=${encodeURIComponent(id)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}'
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        knowledgeBase = knowledgeBase.filter(d => d.id !== id);
        updateKnowledgeStats();
        updateKnowledgePreview();
        updateDocList();
        showToast('已删除文档');
      } else {
        showToast('删除失败');
      }
    })
    .catch(() => {
      showToast('删除失败');
    });
};

function openKnowledgeModal() {
  $modalKnowledge.classList.remove('hidden');
  loadKnowledgeBase().then(updateDocList).then(updateKnowledgeStats);
}
function closeKnowledgeModal() { $modalKnowledge.classList.add('hidden'); }

// ===== Toast =====
function showToast(message) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ===== Import History =====
function openImportModal() {
  if (!currentCustomerId) {
    showToast('请先选择客户');
    return;
  }
  $modalImport.classList.remove('hidden');
  clearImportForm();
}

function closeImportModal() {
  $modalImport.classList.add('hidden');
}

function clearImportForm() {
  clearImportImage();
  $importTextInput.value = '';
  $importTextResult.classList.add('hidden');
  $importSummaryInput.value = '';
  $btnParseText.disabled = true;
  $btnAddSummary.disabled = true;
}

function clearImportImage() {
  $importImageInput.value = '';
  $importImagePreview.src = '';
  $importImagePreview.classList.add('hidden');
  $importImagePlaceholder.classList.remove('hidden');
  $btnUploadImage.disabled = true;
  $importImageResult.classList.add('hidden');
}

let selectedImageFile = null;

function handleImageSelect(e) {
  const file = e.target.files[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    showToast('请选择图片文件');
    return;
  }

  selectedImageFile = file;
  const reader = new FileReader();
  reader.onload = (e) => {
    $importImagePreview.src = e.target.result;
    $importImagePreview.classList.remove('hidden');
    $importImagePlaceholder.classList.add('hidden');
    $btnUploadImage.disabled = false;
  };
  reader.readAsDataURL(file);
}

async function handleImageUpload() {
  if (!selectedImageFile || !currentCustomerId) return;

  $btnUploadImage.disabled = true;
  $btnUploadImage.textContent = '识别中...';
  $importImageResult.classList.add('hidden');

  try {
    const base64 = await fileToBase64(selectedImageFile);
    const dataUrl = `data:${selectedImageFile.type};base64,${base64}`;

    const prompt = `请识别这张图片中的对话内容，返回JSON数组格式：[{"role":"user","content":"..."},{"role":"assistant","content":"..."}]。
- role="user" 表示客户发送的消息
- role="assistant" 表示员工/客服回复的消息
- 如果无法确定是谁说的，根据内容判断
只返回JSON数组，不要其他任何内容。如果图片中无法识别出对话，请返回：[]`;

    const response = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1000,
        temperature: 0.3,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: dataUrl } }
          ]
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    let text = Array.isArray(data.content)
      ? data.content.find(c => c.type === 'text')?.text || ''
      : data.content?.[0]?.text || '';

    // Clean up the response - extract JSON if wrapped in markdown
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      text = jsonMatch[0];
    }

    let conversations = [];
    try {
      conversations = JSON.parse(text);
    } catch {
      if (text === '[]') {
        showToast('无法从图片中识别出对话内容');
      } else {
        showToast('解析对话失败，请重试');
      }
      return;
    }

    if (!Array.isArray(conversations) || conversations.length === 0) {
      showToast('未识别到有效对话');
      return;
    }

    // Save to customer conversations
    const customer = getCurrentCustomer();
    const timestamp = new Date().toISOString();
    for (const conv of conversations) {
      if (conv.role && conv.content) {
        customer.conversations.push({
          role: conv.role === 'user' ? 'user' : 'assistant',
          content: conv.content,
          timestamp
        });
      }
    }

    // Limit history
    if (customer.conversations.length > MAX_CONVERSATION_HISTORY * 2) {
      customer.conversations = customer.conversations.slice(-MAX_CONVERSATION_HISTORY * 2);
    }

    saveCustomers();
    updateConversationDisplay();

    $importImageResult.classList.remove('hidden');
    $importImageResult.className = 'import-result success';
    $importImageResult.textContent = `成功导入 ${conversations.length} 条对话记录`;
    showToast(`成功导入 ${conversations.length} 条对话`);

  } catch (err) {
    $importImageResult.classList.remove('hidden');
    $importImageResult.className = 'import-result error';
    $importImageResult.textContent = '识别失败: ' + err.message;
    showToast('图片识别失败');
    console.error(err);
  } finally {
    $btnUploadImage.disabled = false;
    $btnUploadImage.textContent = 'AI 识别导入';
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function handleTextParse() {
  const text = $importTextInput.value.trim();
  if (!text || !currentCustomerId) return;

  $btnParseText.disabled = true;
  $btnParseText.textContent = '解析中...';
  $importTextResult.classList.add('hidden');

  try {
    const prompt = `请解析以下对话记录，返回JSON数组格式：[{"role":"user","content":"..."},{"role":"assistant","content":"..."}]。
- role="user" 表示客户发送的消息（通常是英文，除非明确说是员工回复）
- role="assistant" 表示员工/客服回复的消息
识别规则：
1. 通常客户消息会询问价格、交期、数量等产品信息
2. 员工回复通常更专业、会提供详细报价或解答
3. 如果无法确定，根据内容语气判断

只返回JSON数组，不要其他任何内容。

对话记录：
${text}`;

    const response = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 800,
        temperature: 0.3,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    let responseText = Array.isArray(data.content)
      ? data.content.find(c => c.type === 'text')?.text || ''
      : data.content?.[0]?.text || '';

    // Extract JSON
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      responseText = jsonMatch[0];
    }

    let conversations = [];
    try {
      conversations = JSON.parse(responseText);
    } catch {
      showToast('解析失败，请检查格式后重试');
      return;
    }

    if (!Array.isArray(conversations) || conversations.length === 0) {
      showToast('未识别到有效对话');
      return;
    }

    // Save to customer conversations
    const customer = getCurrentCustomer();
    const timestamp = new Date().toISOString();
    for (const conv of conversations) {
      if (conv.role && conv.content) {
        customer.conversations.push({
          role: conv.role === 'user' ? 'user' : 'assistant',
          content: conv.content,
          timestamp
        });
      }
    }

    if (customer.conversations.length > MAX_CONVERSATION_HISTORY * 2) {
      customer.conversations = customer.conversations.slice(-MAX_CONVERSATION_HISTORY * 2);
    }

    saveCustomers();
    updateConversationDisplay();

    $importTextResult.classList.remove('hidden');
    $importTextResult.className = 'import-result success';
    $importTextResult.textContent = `成功导入 ${conversations.length} 条对话记录`;
    showToast(`成功导入 ${conversations.length} 条对话`);

    // Clear textarea after success
    $importTextInput.value = '';

  } catch (err) {
    $importTextResult.classList.remove('hidden');
    $importTextResult.className = 'import-result error';
    $importTextResult.textContent = '解析失败: ' + err.message;
    showToast('解析失败');
    console.error(err);
  } finally {
    $btnParseText.disabled = false;
    $btnParseText.textContent = 'AI 解析导入';
  }
}

function handleSummaryAdd() {
  const text = $importSummaryInput.value.trim();
  if (!text || !currentCustomerId) return;

  const customer = getCurrentCustomer();
  customer.conversations.push({
    role: 'summary',
    content: text,
    timestamp: new Date().toISOString()
  });

  if (customer.conversations.length > MAX_CONVERSATION_HISTORY * 2) {
    customer.conversations = customer.conversations.slice(-MAX_CONVERSATION_HISTORY * 2);
  }

  saveCustomers();
  updateConversationDisplay();
  showToast('摘要已添加到历史记录');

  // Reset
  $importSummaryInput.value = '';
  $btnAddSummary.disabled = true;
  closeImportModal();
}

// ===== Utilities =====
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ===== Start =====
init();
