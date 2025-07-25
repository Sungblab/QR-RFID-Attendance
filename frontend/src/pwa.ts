import { Workbox } from 'workbox-window';

declare global {
  interface Window {
    workbox: Workbox;
  }
}

// PWA 업데이트 알림 함수
const showUpdateNotification = () => {
  const notification = document.createElement('div');
  notification.innerHTML = `
    <div style="
      position: fixed; 
      top: 20px; 
      right: 20px; 
      background: #3b82f6; 
      color: white; 
      padding: 16px 20px; 
      border-radius: 8px; 
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      z-index: 10000;
      max-width: 300px;
      font-family: system-ui, -apple-system, sans-serif;
    ">
      <div style="font-weight: 600; margin-bottom: 8px;">
        📱 새 버전 사용 가능
      </div>
      <div style="font-size: 14px; margin-bottom: 12px;">
        더 나은 사용 경험을 위해 업데이트하세요.
      </div>
      <div>
        <button id="update-btn" style="
          background: white; 
          color: #3b82f6; 
          border: none; 
          padding: 8px 16px; 
          border-radius: 4px; 
          font-weight: 600;
          cursor: pointer;
          margin-right: 8px;
        ">
          업데이트
        </button>
        <button id="dismiss-btn" style="
          background: transparent; 
          color: white; 
          border: 1px solid white; 
          padding: 8px 16px; 
          border-radius: 4px;
          cursor: pointer;
        ">
          나중에
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  // 업데이트 버튼 클릭 시
  notification.querySelector('#update-btn')?.addEventListener('click', () => {
    if (window.workbox) {
      window.workbox.messageSkipWaiting();
    }
    document.body.removeChild(notification);
  });
  
  // 닫기 버튼 클릭 시
  notification.querySelector('#dismiss-btn')?.addEventListener('click', () => {
    document.body.removeChild(notification);
  });
};

// PWA 설치 프롬프트
let deferredPrompt: BeforeInstallPromptEvent | null = null;

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// 설치 프롬프트 표시 함수
export const showInstallPrompt = () => {
  if (deferredPrompt) {
    const installNotification = document.createElement('div');
    installNotification.innerHTML = `
      <div style="
        position: fixed; 
        bottom: 20px; 
        left: 50%; 
        transform: translateX(-50%);
        background: #3b82f6; 
        color: white; 
        padding: 16px 20px; 
        border-radius: 8px; 
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 10000;
        max-width: 350px;
        font-family: system-ui, -apple-system, sans-serif;
        text-align: center;
      ">
        <div style="font-weight: 600; margin-bottom: 8px;">
          홈 화면에 추가
        </div>
        <div style="font-size: 14px; margin-bottom: 12px;">
          더 빠른 접근을 위해 앱을 설치해보세요!
        </div>
        <div>
          <button id="install-btn" style="
            background: white; 
            color: #3b82f6; 
            border: none; 
            padding: 8px 16px; 
            border-radius: 4px; 
            font-weight: 600;
            cursor: pointer;
            margin-right: 8px;
          ">
            설치하기
          </button>
          <button id="cancel-install-btn" style="
            background: transparent; 
            color: white; 
            border: 1px solid white; 
            padding: 8px 16px; 
            border-radius: 4px;
            cursor: pointer;
          ">
            취소
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(installNotification);
    
    // 설치 버튼 클릭 시
    installNotification.querySelector('#install-btn')?.addEventListener('click', () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(() => {
          deferredPrompt = null;
        });
      }
      document.body.removeChild(installNotification);
    });
    
    // 취소 버튼 클릭 시
    installNotification.querySelector('#cancel-install-btn')?.addEventListener('click', () => {
      document.body.removeChild(installNotification);
    });
  }
};

// PWA 초기화
export const initPWA = () => {
  // Service Worker 등록
  if ('serviceWorker' in navigator) {
    const wb = new Workbox('/sw.js');
    window.workbox = wb;

    // 새 업데이트 감지
    wb.addEventListener('waiting', () => {
      showUpdateNotification();
    });

    // Service Worker 활성화 후 페이지 새로고침
    wb.addEventListener('controlling', () => {
      window.location.reload();
    });

    wb.register();
  }

  // 설치 프롬프트 이벤트 캐치
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    
    // 3초 후 설치 프롬프트 표시 (선택사항)
    setTimeout(() => {
      if (deferredPrompt && !window.matchMedia('(display-mode: standalone)').matches) {
        showInstallPrompt();
      }
    }, 3000);
  });

  // 앱이 이미 설치된 경우
  window.addEventListener('appinstalled', () => {
    console.log('PWA가 설치되었습니다!');
    deferredPrompt = null;
  });
};