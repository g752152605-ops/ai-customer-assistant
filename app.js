/**
 * AI Customer Assistant — Frontend Application
 * Connects to MiniMax API for reply draft generation
 */

// ===== Configuration =====
const API_BASE = 'https://mimimax.cn';
const MODEL = 'MiniMax-M2.7-highspeed';
const API_KEY = 'sk-33309df70b18ae1ae29d5ef2807f4f82fc9f8e2a'; // MiniMax API Key

// ===== State =====
let knowledgeBase = []; // {id, title, content, chunks[]}

// ===== DOM Elements =====
const $customerMessage = document.getElementById('customer-message');
const $messageType = document.getElementById('message-type');
const $toneSelect = document.getElementById('tone-select');
const $btnGenerate = document.getElementById('btn-generate');
const $outputPlaceholder = document.getElementById('output-placeholder');
const $outputContent = document.getElementById('output-content');
const $outputLoading = document.getElementById('output-loading');
const $outputText = document.getElementById('output-text');
const $btnCopy = document.getElementById('btn-copy');
const $chunksUsed = document.getElementById('chunks-used');
const $knowledgePreview = document.getElementById('knowledge-preview');
const $knowledgeChunks = document.getElementById('knowledge-chunks');
const $knowledgeCount = document.getElementById('knowledge-count');
const $modalKnowledge = document.getElementById('modal-knowledge');
const $btnKnowledge = document.getElementById('btn-knowledge');
const $modalBackdrop = document.getElementById('modal-backdrop');
const $modalClose = document.getElementById('modal-close');
const $knowledgeInput = document.getElementById('knowledge-input');
const $knowledgeTitle = document.getElementById('knowledge-title');
const $btnAddKnowledge = document.getElementById('btn-add-knowledge');
const $statDocs = document.getElementById('stat-docs');
const $statChunks = document.getElementById('stat-chunks');
const $statWords = document.getElementById('stat-words');
const $docEmpty = document.getElementById('doc-empty');
const $docList = document.getElementById('doc-list');

// ===== Init =====
function init() {
  loadKnowledgeBase();
  setupEventListeners();
  updateKnowledgeStats();
  updateKnowledgePreview();
}

// ===== Event Listeners =====
function setupEventListeners() {
  $btnGenerate.addEventListener('click', handleGenerate);
  $btnCopy.addEventListener('click', handleCopy);
  $btnKnowledge.addEventListener('click', openKnowledgeModal);
  $modalBackdrop.addEventListener('click', closeKnowledgeModal);
  $modalClose.addEventListener('click', closeKnowledgeModal);
  $btnAddKnowledge.addEventListener('click', handleAddKnowledge);

  // Enter key on message input
  $customerMessage.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.ctrlKey) handleGenerate();
  });
}

// ===== Generate Reply =====
async function handleGenerate() {
  const message = $customerMessage.value.trim();
  if (!message) {
    showToast('请先输入客户消息');
    $customerMessage.focus();
    return;
  }

  // Show loading
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

    $outputLoading.classList.add('hidden');
    $outputContent.classList.remove('hidden');
    $outputText.textContent = reply;
    $chunksUsed.textContent = `${retrievedChunks.length} 个知识片段`;

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

  const systemPrompt = `You are an AI assistant helping enterprise employees draft professional English email replies to international customers.

## Your Role
- Generate a suggested reply DRAFT based on the customer's message and knowledge base
- The employee will review, modify, and send the reply
- You are NOT responsible for sending or approving messages

## Guidelines
1. **Tone**: ${toneLabels[tone] || 'Professional'}
2. **Language**: English (the customer's language)
3. **Length**: 50-150 words for typical replies
4. **Structure**: Greeting → Acknowledge → Address → Action/Next Steps → Closing
5. **Important**: Only use information from the provided knowledge base. Do NOT make up information.

## Knowledge Base:
${formatChunksForPrompt(chunks)}

## Output Format
Provide ONLY the suggested reply text. No explanations, no bullet points, no headers. Just the professional email reply.`;

  const userPrompt = `## Customer Message
${message}

## Message Type: ${typeLabels[type] || 'General Inquiry'}`;

  const response = await fetch(`${API_BASE}/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 600,
      temperature: 0.7,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userPrompt }
      ]
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
      // Bonus for exact phrase matches
      if (chunkLower.includes(query.toLowerCase())) score += 5;
      if (score > 0) {
        scored.push({ docId: doc.id, title: doc.title, chunk, score });
      }
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

// ===== Format Chunks for Prompt =====
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
      <strong>${c.title}</strong>
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

  if (!content) {
    showToast('请输入知识库内容');
    return;
  }

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
      // Split long paragraph by sentences
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
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ===== Start =====
init();
