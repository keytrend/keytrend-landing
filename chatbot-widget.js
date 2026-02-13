/**
 * Key Trend Landing Page Chatbot Widget
 * 실제 Render 서버 API 연결 버전
 *
 * - 비로그인: 3회 무료 체험 (단어 뜻 질문, Haiku)
 * - 무료 가입: 15회/월 (단어 뜻 질문, Haiku)
 * - 유료 구독: 기본형/고급형 질문 한도 적용
 *
 * 사용법: index.html의 </body> 앞에 추가
 * <script src="chatbot-widget.js"></script>
 */

(function() {
  'use strict';

  // ========== 설정 ==========
  var CONFIG = {
    // ★ 실제 Render 서버 URL로 변경하세요
    API_URL: 'https://key-trend-chatbot.onrender.com',
    MAX_FREE_TRIES: 3,
    STORAGE_KEY: 'kt_landing_tries',
    STORAGE_DATE_KEY: 'kt_landing_date'
  };

  // ========== CSS ==========
  var style = document.createElement('style');
  style.textContent = [
    '.kt-chat-overlay{display:none;position:fixed;top:0;left:0;right:0;bottom:0;z-index:9998;background:rgba(0,0,0,.4)}',
    '.kt-chat-overlay.open{display:block}',
    '.kt-chat{display:none;position:fixed;bottom:96px;right:24px;width:380px;max-height:560px;z-index:9999;background:#111827;border:1px solid #2a3a4e;border-radius:18px;box-shadow:0 20px 60px rgba(0,0,0,.5);overflow:hidden;flex-direction:column;font-family:"Noto Sans KR","Apple SD Gothic Neo",sans-serif}',
    '.kt-chat.open{display:flex}',
    '@media(max-width:768px){.kt-chat{bottom:0;right:0;left:0;width:100%;border-radius:18px 18px 0 0;max-height:85vh}}',

    '.kt-chat-head{padding:16px 20px;background:linear-gradient(135deg,#1e293b,#0f172a);border-bottom:1px solid #2a3a4e;display:flex;justify-content:space-between;align-items:center;flex-shrink:0}',
    '.kt-chat-head-left{display:flex;align-items:center;gap:10px}',
    '.kt-chat-head-dot{width:9px;height:9px;border-radius:50%;background:#22c55e}',
    '.kt-chat-head-title{font-size:15px;font-weight:700;color:#fff}',
    '.kt-chat-head-close{background:none;border:none;color:#9ba3b5;font-size:22px;cursor:pointer;padding:4px 8px;line-height:1}',
    '.kt-chat-head-close:hover{color:#fff}',

    '.kt-chat-status{padding:8px 20px;background:rgba(59,130,246,.08);border-bottom:1px solid #2a3a4e;font-size:12px;color:#60a5fa;display:flex;justify-content:space-between;align-items:center;flex-shrink:0}',
    '.kt-chat-status .tries-left{font-weight:700}',

    '.kt-chat-body{flex:1;overflow-y:auto;padding:16px 20px;display:flex;flex-direction:column;gap:14px;min-height:200px}',
    '.kt-chat-body::-webkit-scrollbar{width:4px}',
    '.kt-chat-body::-webkit-scrollbar-track{background:transparent}',
    '.kt-chat-body::-webkit-scrollbar-thumb{background:#2a3a4e;border-radius:4px}',

    '.kt-msg{max-width:88%;padding:12px 16px;border-radius:14px;font-size:14px;line-height:1.75;word-break:keep-all}',
    '.kt-msg-bot{background:#1e293b;color:#e2e8f0;align-self:flex-start;border:1px solid #2a3a4e;border-bottom-left-radius:4px}',
    '.kt-msg-user{background:linear-gradient(135deg,#3b82f6,#6366f1);color:#fff;align-self:flex-end;border-bottom-right-radius:4px}',
    '.kt-msg-bot strong{color:#60a5fa}',
    '.kt-msg-bot em{color:#f59e0b;font-style:normal;font-weight:600}',

    '.kt-quick-actions{display:flex;flex-wrap:wrap;gap:8px;padding:0 20px 12px}',
    '.kt-quick-btn{background:rgba(59,130,246,.1);border:1px solid rgba(59,130,246,.25);color:#60a5fa;padding:8px 14px;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;transition:all .2s;font-family:inherit}',
    '.kt-quick-btn:hover{background:rgba(59,130,246,.2);border-color:#3b82f6}',

    '.kt-chat-input{padding:14px 16px;border-top:1px solid #2a3a4e;display:flex;gap:10px;align-items:center;flex-shrink:0;background:#0f172a}',
    '.kt-chat-input input{flex:1;background:#1e293b;border:1px solid #2a3a4e;border-radius:10px;padding:11px 16px;color:#fff;font-size:14px;font-family:inherit;outline:none;transition:border-color .2s}',
    '.kt-chat-input input:focus{border-color:#3b82f6}',
    '.kt-chat-input input::placeholder{color:#6b7280}',
    '.kt-chat-send{background:linear-gradient(135deg,#3b82f6,#6366f1);border:none;border-radius:10px;width:42px;height:42px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s;flex-shrink:0}',
    '.kt-chat-send:hover{transform:scale(1.05);box-shadow:0 4px 16px rgba(59,130,246,.3)}',
    '.kt-chat-send:disabled{opacity:.4;cursor:not-allowed;transform:none;box-shadow:none}',
    '.kt-chat-send svg{width:20px;height:20px;fill:white}',

    '.kt-limit-msg{text-align:center;padding:24px 20px}',
    '.kt-limit-msg p{color:#9ba3b5;font-size:14px;line-height:1.8;margin-bottom:16px}',
    '.kt-limit-msg .kt-cta-btn{display:inline-block;background:linear-gradient(135deg,#3b82f6,#6366f1);color:#fff;padding:12px 28px;border-radius:12px;font-weight:700;font-size:14px;text-decoration:none;transition:all .2s}',
    '.kt-limit-msg .kt-cta-btn:hover{transform:translateY(-1px);box-shadow:0 8px 24px rgba(59,130,246,.3)}',
    '.kt-limit-msg .kt-quiz-link{display:inline-block;margin-top:12px;color:#22c55e;font-size:13px;font-weight:600;text-decoration:none}',
    '.kt-limit-msg .kt-quiz-link:hover{text-decoration:underline}',

    '.kt-typing{display:flex;gap:5px;padding:12px 16px;align-self:flex-start}',
    '.kt-typing span{width:8px;height:8px;background:#3b82f6;border-radius:50%;animation:ktBounce .6s infinite alternate}',
    '.kt-typing span:nth-child(2){animation-delay:.15s}',
    '.kt-typing span:nth-child(3){animation-delay:.3s}',
    '@keyframes ktBounce{to{transform:translateY(-6px);opacity:.3}}'
  ].join('\n');
  document.head.appendChild(style);

  // ========== 횟수 관리 ==========
  function getTodayStr() {
    var d = new Date();
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  }

  function getTriesLeft() {
    var savedDate = localStorage.getItem(CONFIG.STORAGE_DATE_KEY);
    var today = getTodayStr();
    if (savedDate !== today) {
      localStorage.setItem(CONFIG.STORAGE_DATE_KEY, today);
      localStorage.setItem(CONFIG.STORAGE_KEY, CONFIG.MAX_FREE_TRIES.toString());
      return CONFIG.MAX_FREE_TRIES;
    }
    var stored = localStorage.getItem(CONFIG.STORAGE_KEY);
    if (stored === null) return CONFIG.MAX_FREE_TRIES;
    return parseInt(stored, 10);
  }

  function useTry() {
    var left = getTriesLeft();
    if (left > 0) {
      localStorage.setItem(CONFIG.STORAGE_KEY, (left - 1).toString());
      return true;
    }
    return false;
  }

  // ========== HTML 생성 ==========
  var overlay = document.createElement('div');
  overlay.className = 'kt-chat-overlay';
  overlay.onclick = function() { closeChat(); };
  document.body.appendChild(overlay);

  var chat = document.createElement('div');
  chat.className = 'kt-chat';
  chat.innerHTML = [
    '<div class="kt-chat-head">',
    '  <div class="kt-chat-head-left"><span class="kt-chat-head-dot"></span><span class="kt-chat-head-title">Key Trend AI 튜터</span></div>',
    '  <button class="kt-chat-head-close" onclick="window.ktChatClose()">✕</button>',
    '</div>',
    '<div class="kt-chat-status">',
    '  <span>무료 체험</span>',
    '  <span class="tries-left" id="ktTriesLeft">남은 횟수: ' + getTriesLeft() + '/' + CONFIG.MAX_FREE_TRIES + '</span>',
    '</div>',
    '<div class="kt-chat-body" id="ktChatBody"></div>',
    '<div class="kt-quick-actions" id="ktQuickActions"></div>',
    '<div class="kt-chat-input" id="ktChatInputArea">',
    '  <input type="text" id="ktInput" placeholder="영어 단어의 뜻을 물어보세요..." autocomplete="off">',
    '  <button class="kt-chat-send" id="ktSendBtn" onclick="window.ktSendMsg()">',
    '    <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>',
    '  </button>',
    '</div>'
  ].join('\n');
  document.body.appendChild(chat);

  var chatBody = document.getElementById('ktChatBody');
  var quickActions = document.getElementById('ktQuickActions');

  // ========== 메시지 표시 ==========
  function addBotMsg(html) {
    var div = document.createElement('div');
    div.className = 'kt-msg kt-msg-bot';
    div.innerHTML = html;
    chatBody.appendChild(div);
    chatBody.scrollTop = chatBody.scrollHeight;
  }

  function addUserMsg(text) {
    var div = document.createElement('div');
    div.className = 'kt-msg kt-msg-user';
    div.textContent = text;
    chatBody.appendChild(div);
    chatBody.scrollTop = chatBody.scrollHeight;
  }

  function showTyping() {
    var div = document.createElement('div');
    div.className = 'kt-typing';
    div.id = 'ktTyping';
    div.innerHTML = '<span></span><span></span><span></span>';
    chatBody.appendChild(div);
    chatBody.scrollTop = chatBody.scrollHeight;
  }

  function hideTyping() {
    var el = document.getElementById('ktTyping');
    if (el) el.remove();
  }

  function updateTriesDisplay() {
    var left = getTriesLeft();
    var el = document.getElementById('ktTriesLeft');
    if (el) el.textContent = '남은 횟수: ' + left + '/' + CONFIG.MAX_FREE_TRIES;
  }

  // ========== 환영 메시지 ==========
  function showWelcome() {
    addBotMsg(
      '안녕하세요! <strong>Key Trend AI 튜터</strong>입니다 🔑<br><br>' +
      '영어 단어의 뜻을 물어보세요!<br>' +
      '<em>' + CONFIG.MAX_FREE_TRIES + '회 무료</em>로 체험하실 수 있습니다.<br><br>' +
      '💡 <strong>수능 필수 어휘 1,862개 퀴즈</strong>는 누구나 평생 무료!'
    );

    quickActions.innerHTML = [
      '<button class="kt-quick-btn" onclick="window.ktQuickAsk(\'contend 뜻 알려줘\')">contend 뜻</button>',
      '<button class="kt-quick-btn" onclick="window.ktQuickAsk(\'susceptible 뜻 알려줘\')">susceptible 뜻</button>',
      '<button class="kt-quick-btn" onclick="window.ktQuickAsk(\'elaborate 뜻 알려줘\')">elaborate 뜻</button>'
    ].join('');
  }

  // ========== 횟수 소진 안내 ==========
  function showLimitReached() {
    var inputArea = document.getElementById('ktChatInputArea');
    inputArea.style.display = 'none';
    quickActions.innerHTML = '';

    var limitDiv = document.createElement('div');
    limitDiv.className = 'kt-limit-msg';
    limitDiv.innerHTML = [
      '<p>오늘의 무료 체험을 모두 사용했습니다.<br><br>',
      '✅ <strong>단어 퀴즈</strong>는 무제한 무료입니다!<br>',
      '퀴즈로 어휘력을 키워보세요.</p>',
      '<a href="https://keytrend.thinkific.com/users/sign_up" target="_blank" class="kt-cta-btn">무료 가입하고 매월 15회 받기</a><br>',
      '<a href="https://keytrend.thinkific.com/courses/vocab-quiz" target="_blank" class="kt-quiz-link">🎯 무료 수능 단어 퀴즈 풀기 →</a>'
    ].join('');
    chatBody.appendChild(limitDiv);
    chatBody.scrollTop = chatBody.scrollHeight;
  }

  // ========== 실제 API 호출 ==========
  function callAPI(userMessage, callback) {
    fetch(CONFIG.API_URL + '/api/guest-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: userMessage,
        type: 'word_meaning'
      })
    })
    .then(function(res) {
      if (res.status === 429) {
        // 서버에서 횟수 초과 → 프론트엔드도 0으로 맞춤
        localStorage.setItem(CONFIG.STORAGE_KEY, '0');
        callback({ limitReached: true }, null);
        return;
      }
      if (!res.ok) throw new Error('서버 응답 오류: ' + res.status);
      return res.json();
    })
    .then(function(data) {
      if (data) callback(null, data.reply || data.response || '응답을 받지 못했습니다.');
    })
    .catch(function(err) {
      callback(err, null);
    });
  }

  // ========== 메시지 전송 ==========
  window.ktSendMsg = function() {
    var input = document.getElementById('ktInput');
    var text = input.value.trim();
    if (!text) return;

    if (getTriesLeft() <= 0) {
      showLimitReached();
      return;
    }

    addUserMsg(text);
    input.value = '';
    quickActions.innerHTML = '';

    useTry();
    updateTriesDisplay();

    showTyping();
    document.getElementById('ktSendBtn').disabled = true;

    // ★ 실제 Render 서버 API 호출
    callAPI(text, function(err, reply) {
      hideTyping();
      document.getElementById('ktSendBtn').disabled = false;

      if (err) {
        // 서버에서 횟수 초과 감지
        if (err.limitReached) {
          addBotMsg(
            '무료 체험 횟수를 모두 사용했습니다!<br><br>' +
            '<strong>무료 가입</strong>하시면 매월 15회 단어 질문이 가능합니다.'
          );
          updateTriesDisplay();
          showLimitReached();
          return;
        }
        addBotMsg('죄송합니다. 일시적인 오류가 발생했습니다.<br>잠시 후 다시 시도해주세요.');
        return;
      }

      var formattedReply = reply.replace(/\n/g, '<br>');
      addBotMsg(formattedReply);

      if (getTriesLeft() <= 0) {
        setTimeout(function() {
          addBotMsg(
            '무료 체험 횟수를 모두 사용했습니다!<br><br>' +
            '<strong>무료 가입</strong>하시면 매월 15회 단어 질문이 가능합니다.'
          );
          showLimitReached();
        }, 800);
      }
    });
  };

  window.ktQuickAsk = function(text) {
    document.getElementById('ktInput').value = text;
    window.ktSendMsg();
  };

  document.getElementById('ktInput').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') window.ktSendMsg();
  });

  // ========== 열기/닫기 ==========
  function openChat() {
    chat.classList.add('open');
    overlay.classList.add('open');
    if (!chatBody.hasChildNodes()) {
      showWelcome();
    }
    setTimeout(function() {
      document.getElementById('ktInput').focus();
    }, 300);
  }

  function closeChat() {
    chat.classList.remove('open');
    overlay.classList.remove('open');
  }

  window.ktChatClose = closeChat;

  var existingBubble = document.querySelector('.chatbot-bubble');
  if (existingBubble) {
    existingBubble.onclick = function(e) {
      e.preventDefault();
      openChat();
    };
  }

})();
