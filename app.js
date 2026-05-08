/**
 * AI Customer Assistant — Frontend Application
 * With Customer Management & Per-Customer Memory
 */

// ===== Configuration =====
const WORKER_URL = 'https://ai-customer-assistant.g752152605.workers.dev';
const MODEL = 'MiniMax-M2.7-highspeed';
const MAX_CONVERSATION_HISTORY = 10; // Keep last N exchanges per customer

// ===== State =====
let knowledgeBase = [];
let customers = [];
let currentCustomerId = null;

// ===== DOM Elements =====
const $ = (id) => document.getElementById(id);

// Customer selector
const $customerSelect = $('customer-select');
const $btnCustomer = $('btn-customer');
const $modalCustomer = $('modal-customer');
const $modalCustomerBackdrop = $('modal-customer-backdrop');
const $modalCustomerClose = $('modal-customer-close');

// Customer form
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
const $customerFormSubmit = $('customer-form-submit');
const $customerFormCancel = $('customer-form-cancel');

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

// Customer list in modal
const $customerList = $('customer-list');
const $customerEmpty = $('customer-empty');
const $customerListContainer = $('customer-list-container');

// Conversation display
const $conversationArea = $('conversation-area');

// ===== Init =====
function init() {
  loadKnowledgeBase();
  loadCustomers();
  setupEventListeners();
  updateCustomerSelector();
  updateKnowledgeStats();
  updateKnowledgePreview();
}

// ===== Event Listeners =====
function setupEventListeners() {
  $btnGenerate.addEventListener('click', handleGenerate);
  $btnCopy.addEventListener('click', handleCopy);
  $customerSelect.addEventListener('change', handleCustomerChange);
  $btnCustomer.addEventListener('click', openCustomerModal);
  $modalCustomerBackdrop.addEventListener('click', closeCustomerModal);
  $modalCustomerClose.addEventListener('click', closeCustomerModal);
  $customerFormSubmit.addEventListener('click', handleSaveCustomer);
  $customerFormCancel.addEventListener('click', closeCustomerModal);
  $customerForm.addEventListener('submit', (e) => { e.preventDefault(); handleSaveCustomer(); });

  $btnKnowledge.addEventListener('click', openKnowledgeModal);
  $modalBackdrop.addEventListener('click', closeKnowledgeModal);
  $modalClose.addEventListener('click', closeKnowledgeModal);
  $btnAddKnowledge.addEventListener('click', handleAddKnowledge);

  $customerMessage.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.ctrlKey) handleGenerate();
  });

  $customerMessage.addEventListener('input', updateKnowledgePreview);
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

function updateCustomerSelector() {
  if (!$customerSelect) return;
  $customerSelect.innerHTML = customers.map(c =>
    `<option value="${c.id}" ${c.id === currentCustomerId ? 'selected' : ''}>${escapeHtml(c.name)} ${c.company ? `(${escapeHtml(c.company)})` : ''}</option>`
  ).join('');
  updateConversationDisplay();
  updateCustomerForm();
}

function handleCustomerChange() {
  currentCustomerId = $customerSelect.value;
  updateConversationDisplay();
  updateKnowledgePreview();
}

function openCustomerModal() { $modalCustomer.classList.remove('hidden'); renderCustomerList(); }
function closeCustomerModal() { $modalCustomer.classList.add('hidden'); }

function renderCustomerList() {
  if (customers.length === 0) {
    $customerEmpty.classList.remove('hidden');
    $customerListContainer.classList.add('hidden');
    return;
  }
  $customerEmpty.classList.add('hidden');
  $customerListContainer.classList.remove('hidden');
  $customerList.innerHTML = customers.map(c => `
    <div class="customer-item ${c.id === currentCustomerId ? 'active' : ''}" data-id="${c.id}">
      <div class="customer-item-info" onclick="selectCustomer('${c.id}')">
        <div class="customer-item-name">${escapeHtml(c.name)} ${c.level ? `<span class="customer-level level-${c.level}">${c.level}级</span>` : ''}</div>
        <div class="customer-item-meta">${escapeHtml(c.company || '未知公司')} · ${escapeHtml(c.type ? getTypeLabel(c.type) : '未分类')}</div>
        <div class="customer-item-credit ${getCreditClass(c.backgroundCheck?.creditRating)}">${escapeHtml(c.backgroundCheck?.creditRating || '未评级')}</div>
      </div>
      <div class="customer-item-actions">
        <button class="btn btn-sm btn-ghost" onclick="editCustomer('${c.id}')">编辑</button>
        <button class="btn btn-sm btn-ghost" onclick="deleteCustomer('${c.id}')">删除</button>
      </div>
    </div>
  `).join('');
}

function getTypeLabel(type) {
  const labels = { wholesaler: '批发商', factory: '工厂', trader: '贸易商', distributor: '经销商', agent: '代理商', other: '其他' };
  return labels[type] || type;
}

function getCreditClass(rating) {
  if (!rating) return 'credit-none';
  const r = rating.toLowerCase();
  if (r.includes('high') || r.includes('高')) return 'credit-high';
  if (r.includes('medium') || r.includes('中')) return 'credit-medium';
  if (r.includes('low') || r.includes('低') || r.includes('risk')) return 'credit-low';
  return 'credit-none';
}

window.selectCustomer = function(id) {
  currentCustomerId = id;
  $customerSelect.value = id;
  updateConversationDisplay();
  updateCustomerForm();
  closeCustomerModal();
};

window.editCustomer = function(id) {
  const c = customers.find(x => x.id === id);
  if (!c) return;
  fillCustomerForm(c);
};

window.deleteCustomer = function(id) {
  if (!confirm('确定删除该客户？此操作不可恢复。')) return;
  customers = customers.filter(c => c.id !== id);
  if (currentCustomerId === id) currentCustomerId = customers[0]?.id || null;
  saveCustomers();
  updateCustomerSelector();
  renderCustomerList();
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
  $customerForm.dataset.editingId = c.id;
  $customerFormSubmit.textContent = '保存修改';
  $customerFormCancel.classList.remove('hidden');
}

function updateCustomerForm() {
  $customerForm.reset();
  delete $customerForm.dataset.editingId;
  $customerFormSubmit.textContent = '添加客户';
  $customerFormCancel.classList.add('hidden');
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
      otherNotes: $customerOtherNotes.value.trim()
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
  updateCustomerSelector();
  renderCustomerList();
  updateCustomerForm();
}

// ===== Conversation Display =====
function updateConversationDisplay() {
  if (!$conversationArea) return;
  const customer = getCurrentCustomer();
  if (!customer || !customer.conversations || customer.conversations.length === 0) {
    $conversationArea.innerHTML = '<div class="conv-empty">选择客户后，对话历史将显示在这里</div>';
    return;
  }
  $conversationArea.innerHTML = customer.conversations.map(conv => `
    <div class="conv-item conv-${conv.role}">
      <div class="conv-role">${conv.role === 'user' ? '客户' : 'AI'}</div>
      <div class="conv-content">${escapeHtml(conv.content)}</div>
      <div class="conv-time">${new Date(conv.timestamp).toLocaleString('zh-CN')}</div>
    </div>
  `).join('');
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
    if (currentCustomerId) {
      const customer = customers.find(c => c.id === currentCustomerId);
      if (customer) {
        if (!customer.conversations) customer.conversations = [];
        customer.conversations.push({ role: 'user', content: message, timestamp: new Date().toISOString() });
        customer.conversations.push({ role: 'assistant', content: reply, timestamp: new Date().toISOString() });
        // Keep only last N exchanges
        if (customer.conversations.length > MAX_CONVERSATION_HISTORY * 2) {
          customer.conversations = customer.conversations.slice(-MAX_CONVERSATION_HISTORY * 2);
        }
        saveCustomers();
        updateConversationDisplay();
      }
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

  // Build customer context
  let customerContext = '';
  if (customer) {
    const typeLabels = { wholesaler: 'Wholesaler (批发商)', factory: 'Factory (工厂)', trader: 'Trader (贸易商)', distributor: 'Distributor (经销商)', agent: 'Agent (代理商)', other: 'Other (其他)' };
    customerContext = `
## Customer Background (Due Diligence)
- Name: ${customer.name}
- Level: ${customer.level ? `Level ${customer.level}` : 'Not rated'}
- Company: ${customer.company || 'Unknown'}
- Company Website: ${customer.website || 'Not provided'}
- Type: ${typeLabels[customer.type] || customer.type || 'Unknown'}
- Buyer Platform Preference: ${customer.platform || 'Unknown'}
- Position: ${customer.position || 'Unknown'}
- Region: ${customer.region || 'Unknown'}
- Source: ${customer.source || 'Unknown'}
- Order History: ${customer.backgroundCheck?.orderHistory || 'No records'}
- Payment Records: ${customer.backgroundCheck?.paymentRecords || 'No records'}
- Credit Rating: ${customer.backgroundCheck?.creditRating || 'Not rated'}
- Other Notes: ${customer.backgroundCheck?.otherNotes || 'None'}
`;
  }

  // Build conversation history
  let historyContext = '';
  if (customer?.conversations?.length > 0) {
    const history = customer.conversations.slice(-6).map(c =>
      `${c.role === 'user' ? 'Customer' : 'Employee'}: ${c.content}`
    ).join('\n');
    historyContext = `\n## Recent Conversation History\n${history}`;
  }

  const systemPrompt = `You are an AI assistant helping enterprise employees draft professional English email replies to international customers.

## Your Role
- Generate a suggested reply DRAFT based on the customer's message and knowledge base
- The employee will review, modify, and send the reply
- You are NOT responsible for sending or approving messages
- Consider the customer's background and due diligence information when generating replies

## Guidelines
1. **Tone**: ${toneLabels[tone] || 'Professional'}
2. **Language**: English (the customer's language)
3. **Length**: 50-150 words for typical replies
4. **Structure**: Greeting → Acknowledge → Address → Action/Next Steps → Closing
5. **Important**: Only use information from the provided knowledge base. Do NOT make up information.
6. **Due Diligence**: Take the customer's background (credit rating, order history, payment records) into account when generating replies. Adjust tone accordingly.

${customerContext}
${historyContext}

## Knowledge Base:
${formatChunksForPrompt(chunks)}

## Output Format
Provide ONLY the suggested reply text. No explanations, no bullet points, no headers. Just the professional email reply.`;

  const userPrompt = `## Customer Message
${message}

## Message Type: ${typeLabels[type] || 'General Inquiry'}`;

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
  return data.content?.[0]?.text || '生成回复为空，请稍后重试。';
}

// ===== RAG: Retrieve Relevant Chunks =====
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

// ===== Update Knowledge Preview =====
function updateKnowledgePreview() {
  const message = $customerMessage.value.trim();
  if (!message) {
    $knowledgeChunks.innerHTML = '<p class="knowledge-empty">输入客户消息后，系统将自动检索相关知识库内容</p>';
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

// ===== Copy to Clipboard =====
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
function loadKnowledgeBase() {
  try {
    const stored = localStorage.getItem('ai-kb-v1');
    knowledgeBase = stored ? JSON.parse(stored) : [];
  } catch {
    knowledgeBase = [];
  }
}

function saveKnowledgeBase() {
  localStorage.setItem('ai-kb-v1', JSON.stringify(knowledgeBase));
}

function handleAddKnowledge() {
  const content = $knowledgeInput.value.trim();
  const title = $knowledgeTitle.value.trim() || `文档 ${knowledgeBase.length + 1}`;
  if (!content) { showToast('请输入知识库内容'); return; }
  const chunks = chunkText(content, 300);
  const id = Date.now().toString();
  knowledgeBase.push({ id, title, content, chunks });
  saveKnowledgeBase();
  $knowledgeInput.value = '';
  $knowledgeTitle.value = '';
  updateKnowledgeStats();
  updateKnowledgePreview();
  updateDocList();
  showToast(`已添加「${title}」，生成 ${chunks.length} 个知识片段`);
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
      <svg class="doc-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
      </svg>
      <div class="doc-info">
        <div class="doc-title">${escapeHtml(doc.title)}</div>
        <div class="doc-preview">${escapeHtml(doc.content.substring(0, 120))}...</div>
      </div>
      <button class="doc-delete" onclick="deleteDoc('${doc.id}')" title="删除">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
        </svg>
      </button>
    </div>
  `).join('');
}

window.deleteDoc = function(id) {
  knowledgeBase = knowledgeBase.filter(d => d.id !== id);
  saveKnowledgeBase();
  updateKnowledgeStats();
  updateKnowledgePreview();
  updateDocList();
  showToast('已删除文档');
};

function openKnowledgeModal() { $modalKnowledge.classList.remove('hidden'); updateDocList(); }
function closeKnowledgeModal() { $modalKnowledge.classList.add('hidden'); }

// ===== Toast Notification =====
function showToast(message) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
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
