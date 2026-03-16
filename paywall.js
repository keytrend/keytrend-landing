/**
 * 파일명: paywall.js
 * 목적: 기사 페이월 (블러 처리 + 이메일 인증코드 인증)
 * 작성일: 2026-03-16
 * 
 * ★ 자동 분할 모드 ★
 * 기사 HTML에 <script src="../paywall.js"></script> 한 줄만 추가하면 됨.
 * .content 안의 두 번째 <h2>부터 자동으로 유료 영역으로 블러 처리.
 * 
 * (선택) 수동 분할도 지원:
 *   <div class="free-content">...</div>
 *   <div class="paid-content">...</div>
 *   이렇게 마크업하면 자동 분할 대신 수동 구조를 사용.
 */

(function() {
    'use strict';

    const API_BASE = 'https://english-exam-chatbot.onrender.com';
    const TOKEN_KEY = 'kt_article_token';
    const EMAIL_KEY = 'kt_article_email';

    // ===== 1. 토큰 관리 =====
    function getToken() {
        return localStorage.getItem(TOKEN_KEY);
    }
    function setToken(token, email) {
        localStorage.setItem(TOKEN_KEY, token);
        if (email) localStorage.setItem(EMAIL_KEY, email);
    }
    function clearToken() {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(EMAIL_KEY);
    }

    // ===== 2. API 호출 =====
    async function sendCode(email) {
        const resp = await fetch(`${API_BASE}/api/article-auth/send-code`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        return resp.json();
    }

    async function verifyCode(email, code) {
        const resp = await fetch(`${API_BASE}/api/article-auth/verify-code`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, code })
        });
        return resp.json();
    }

    async function validateToken(token) {
        const resp = await fetch(`${API_BASE}/api/article-auth/validate-token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token })
        });
        return resp.json();
    }

    // ===== 3. 자동 콘텐츠 분할 =====
    function autoSplitContent() {
        // 이미 수동 분할이 되어 있으면 건너뜀
        if (document.querySelector('.paid-content')) return;

        // .content 찾기
        var wrapper = document.querySelector('.content');

        // .content 없으면 .section 구조 시도
        if (!wrapper) {
            var sections = document.querySelectorAll('.section');
            if (sections.length >= 2) {
                wrapper = sections[0].parentElement;
            }
        }

        if (!wrapper) return;

        var children = Array.from(wrapper.children);
        if (children.length < 2) return;

        // 분할 지점 찾기: 첫 번째 HR.divider 위치
        var splitIndex = -1;
        for (var i = 0; i < children.length; i++) {
            if (children[i].tagName === 'HR' || children[i].classList.contains('divider')) {
                splitIndex = i;
                break;
            }
        }

        // HR.divider 없으면 두 번째 주요 블록에서 분할
        if (splitIndex === -1) {
            var blockCount = 0;
            for (var i = 0; i < children.length; i++) {
                var el = children[i];
                var isBlock = (el.tagName === 'H2') || 
                              el.classList.contains('section') ||
                              el.classList.contains('problem-section');
                if (isBlock) {
                    blockCount++;
                    if (blockCount === 2) {
                        splitIndex = i;
                        break;
                    }
                }
            }
        }

        if (splitIndex === -1 || splitIndex === 0) return;

        // free-content div 생성
        var freeDiv = document.createElement('div');
        freeDiv.className = 'free-content';

        // paid-content div 생성
        var paidDiv = document.createElement('div');
        paidDiv.className = 'paid-content';

        // 자식 요소를 분배
        children.forEach(function(child, i) {
            if (i < splitIndex) {
                freeDiv.appendChild(child);
            } else {
                paidDiv.appendChild(child);
            }
        });

        // wrapper에 삽입
        wrapper.appendChild(freeDiv);
        wrapper.appendChild(paidDiv);
    }

    // ===== 4. UI 생성 =====
    function createPaywallUI() {
        var overlay = document.createElement('div');
        overlay.id = 'paywall-overlay';
        overlay.innerHTML = '\
            <div class="pw-card">\
                <div class="pw-lock">🔒</div>\
                <h3 class="pw-title">프리미엄 콘텐츠</h3>\
                <p class="pw-desc">이 기사의 전체 내용을 보려면<br>유료 구독 회원 인증이 필요합니다.</p>\
                <div id="pw-step-email" class="pw-step">\
                    <input type="email" id="pw-email" placeholder="구독 이메일 주소 입력" autocomplete="email">\
                    <button id="pw-send-btn" onclick="window.__paywall.handleSend()">인증코드 받기</button>\
                    <div id="pw-email-msg" class="pw-msg"></div>\
                </div>\
                <div id="pw-step-code" class="pw-step" style="display:none">\
                    <p class="pw-code-info">📧 <span id="pw-sent-email"></span>으로<br>인증코드를 발송했습니다.</p>\
                    <input type="text" id="pw-code" placeholder="6자리 인증코드 입력" maxlength="6" inputmode="numeric" autocomplete="one-time-code">\
                    <button id="pw-verify-btn" onclick="window.__paywall.handleVerify()">인증하기</button>\
                    <div id="pw-code-msg" class="pw-msg"></div>\
                    <button class="pw-link-btn" onclick="window.__paywall.backToEmail()">← 다른 이메일로 시도</button>\
                </div>\
                <div class="pw-footer">\
                    <a href="https://keytrend.thinkific.com/collections" target="_blank">아직 구독 전이신가요? 구독하기 →</a>\
                </div>\
            </div>';
        return overlay;
    }

    function injectStyles() {
        var style = document.createElement('style');
        style.textContent = '\
            .paid-content.blurred {\
                filter: blur(8px);\
                user-select: none;\
                pointer-events: none;\
                position: relative;\
            }\
            .paid-content.blurred::after {\
                content: "";\
                position: absolute;\
                bottom: 0; left: 0; right: 0;\
                height: 120px;\
                background: linear-gradient(transparent, var(--dark, #0f172a));\
                pointer-events: none;\
            }\
            #paywall-overlay {\
                margin-top: -60px;\
                position: relative;\
                z-index: 50;\
                display: flex;\
                justify-content: center;\
                padding: 0 24px 40px;\
            }\
            .pw-card {\
                background: linear-gradient(135deg, #1e1b4b 0%, #1e293b 100%);\
                border: 1px solid rgba(99,102,241,.3);\
                border-radius: 20px;\
                padding: 40px 32px;\
                max-width: 420px;\
                width: 100%;\
                text-align: center;\
                box-shadow: 0 24px 60px rgba(0,0,0,.5);\
            }\
            .pw-lock { font-size: 48px; margin-bottom: 16px; }\
            .pw-title {\
                font-family: "Outfit", sans-serif;\
                font-size: 22px;\
                font-weight: 700;\
                color: #f8fafc;\
                margin-bottom: 8px;\
            }\
            .pw-desc {\
                font-size: 14px;\
                color: #94a3b8;\
                line-height: 1.8;\
                margin-bottom: 28px;\
            }\
            .pw-step input[type="email"],\
            .pw-step input[type="text"] {\
                width: 100%;\
                padding: 14px 16px;\
                border-radius: 10px;\
                border: 1px solid rgba(99,102,241,.3);\
                background: rgba(15,23,42,.8);\
                color: #f8fafc;\
                font-size: 15px;\
                font-family: inherit;\
                outline: none;\
                transition: border-color .2s;\
                margin-bottom: 12px;\
            }\
            .pw-step input:focus { border-color: #6366f1; }\
            .pw-step button {\
                width: 100%;\
                padding: 14px;\
                border-radius: 10px;\
                border: none;\
                background: linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%);\
                color: white;\
                font-size: 15px;\
                font-weight: 700;\
                cursor: pointer;\
                font-family: inherit;\
                transition: transform .2s, box-shadow .2s;\
            }\
            .pw-step button:hover {\
                transform: translateY(-1px);\
                box-shadow: 0 8px 24px rgba(99,102,241,.4);\
            }\
            .pw-step button:disabled {\
                opacity: .5;\
                cursor: not-allowed;\
                transform: none;\
                box-shadow: none;\
            }\
            .pw-msg {\
                font-size: 13px;\
                margin-top: 10px;\
                min-height: 20px;\
                line-height: 1.6;\
            }\
            .pw-msg.error { color: #f472b6; }\
            .pw-msg.success { color: #34d399; }\
            .pw-msg.info { color: #94a3b8; }\
            .pw-code-info {\
                font-size: 14px;\
                color: #818cf8;\
                line-height: 1.7;\
                margin-bottom: 20px;\
            }\
            .pw-link-btn {\
                background: none !important;\
                border: none !important;\
                color: #94a3b8 !important;\
                font-size: 13px !important;\
                cursor: pointer !important;\
                margin-top: 12px !important;\
                padding: 4px !important;\
                width: auto !important;\
            }\
            .pw-link-btn:hover {\
                color: #f8fafc !important;\
                box-shadow: none !important;\
                transform: none !important;\
            }\
            .pw-footer {\
                margin-top: 24px;\
                padding-top: 20px;\
                border-top: 1px solid rgba(51,65,85,.4);\
            }\
            .pw-footer a {\
                color: #818cf8;\
                text-decoration: none;\
                font-size: 13px;\
                font-weight: 600;\
            }\
            .pw-footer a:hover { color: #f8fafc; }\
            .paid-content.unlocked {\
                filter: none;\
                user-select: auto;\
                pointer-events: auto;\
            }';
        document.head.appendChild(style);
    }

    // ===== 5. 핵심 로직 =====
    var currentEmail = '';

    function showMsg(id, text, type) {
        var el = document.getElementById(id);
        if (el) {
            el.textContent = text;
            el.className = 'pw-msg ' + (type || '');
        }
    }

    function setLoading(btnId, loading) {
        var btn = document.getElementById(btnId);
        if (!btn) return;
        btn.disabled = loading;
        if (loading) {
            btn.dataset.originalText = btn.textContent;
            btn.textContent = '처리 중...';
        } else {
            btn.textContent = btn.dataset.originalText || btn.textContent;
        }
    }

    async function handleSend() {
        var emailInput = document.getElementById('pw-email');
        var email = emailInput.value.trim();

        if (!email || !email.includes('@')) {
            showMsg('pw-email-msg', '올바른 이메일 주소를 입력해주세요.', 'error');
            return;
        }

        setLoading('pw-send-btn', true);
        showMsg('pw-email-msg', '인증코드 발송 중...', 'info');

        try {
            var result = await sendCode(email);

            if (result.success) {
                currentEmail = email;
                document.getElementById('pw-step-email').style.display = 'none';
                document.getElementById('pw-step-code').style.display = 'block';
                document.getElementById('pw-sent-email').textContent = email;
                showMsg('pw-code-msg', '인증코드는 ' + (result.expiresInMinutes || 10) + '분간 유효합니다.', 'info');
            } else {
                if (result.error === 'not_subscribed') {
                    showMsg('pw-email-msg', result.message || '유료 구독이 필요합니다.', 'error');
                } else {
                    showMsg('pw-email-msg', result.error || '오류가 발생했습니다.', 'error');
                }
            }
        } catch (e) {
            showMsg('pw-email-msg', '서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.', 'error');
        }

        setLoading('pw-send-btn', false);
    }

    async function handleVerify() {
        var codeInput = document.getElementById('pw-code');
        var code = codeInput.value.trim();

        if (!code || code.length !== 6) {
            showMsg('pw-code-msg', '6자리 인증코드를 입력해주세요.', 'error');
            return;
        }

        setLoading('pw-verify-btn', true);
        showMsg('pw-code-msg', '인증 확인 중...', 'info');

        try {
            var result = await verifyCode(currentEmail, code);

            if (result.success && result.token) {
                setToken(result.token, currentEmail);
                unlockContent();
                showMsg('pw-code-msg', '✅ 인증 완료! 전체 기사가 공개됩니다.', 'success');
                
                setTimeout(function() {
                    var overlay = document.getElementById('paywall-overlay');
                    if (overlay) {
                        overlay.style.transition = 'opacity .5s';
                        overlay.style.opacity = '0';
                        setTimeout(function() { overlay.remove(); }, 500);
                    }
                }, 1000);
            } else {
                showMsg('pw-code-msg', result.message || '인증코드가 올바르지 않습니다.', 'error');
            }
        } catch (e) {
            showMsg('pw-code-msg', '서버 연결에 실패했습니다.', 'error');
        }

        setLoading('pw-verify-btn', false);
    }

    function backToEmail() {
        document.getElementById('pw-step-code').style.display = 'none';
        document.getElementById('pw-step-email').style.display = 'block';
        showMsg('pw-email-msg', '', '');
        showMsg('pw-code-msg', '', '');
    }

    function unlockContent() {
        var paid = document.querySelector('.paid-content');
        if (paid) {
            paid.classList.remove('blurred');
            paid.classList.add('unlocked');
        }
    }

    function lockContent() {
        var paid = document.querySelector('.paid-content');
        if (paid) {
            paid.classList.add('blurred');
            paid.classList.remove('unlocked');
        }
    }

    // ===== 6. 초기화 =====
    async function init() {
        // 자동 분할 실행 (수동 마크업 없으면 자동으로 분할)
        autoSplitContent();

        var paidContent = document.querySelector('.paid-content');
        if (!paidContent) return; // h2가 1개 이하인 짧은 글은 페이월 미적용

        injectStyles();

        // 토큰 확인
        var token = getToken();
        if (token) {
            try {
                var result = await validateToken(token);
                if (result.valid) {
                    unlockContent();
                    return;
                }
            } catch (e) {
                // 네트워크 오류 시 토큰이 있으면 일단 허용
                unlockContent();
                return;
            }
            // 토큰 무효 → 삭제
            clearToken();
        }

        // 토큰 없음 → 블러 + 오버레이
        lockContent();

        var overlay = createPaywallUI();
        paidContent.parentElement.insertBefore(overlay, paidContent.nextSibling);
    }

    // 전역 함수 노출 (onclick에서 사용)
    window.__paywall = {
        handleSend: handleSend,
        handleVerify: handleVerify,
        backToEmail: backToEmail
    };

    // DOM 로드 후 실행
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
