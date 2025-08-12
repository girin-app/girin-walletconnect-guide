# 기린월렛 Vue.js + TypeScript 연동 예제

Vue 3 Composition API와 TypeScript를 사용하여 기린월렛과 WalletConnect v2를 연동하는 완전한 예제 프로젝트입니다.

## 📋 목차

1. [프로젝트 개요](#프로젝트-개요)
2. [기술 스택](#기술-스택)
3. [설치 및 실행](#설치-및-실행)
4. [프로젝트 구조](#프로젝트-구조)
5. [주요 컴포넌트](#주요-컴포넌트)
6. [실행 가이드](#실행-가이드)
7. [문제 해결](#문제-해결)

## 프로젝트 개요

이 예제는 Vue.js 3에서 기린월렛과 연동하여 XRPL 기반 DeFi 기능을 구현하는 방법을 보여줍니다.

## 기술 스택

### 프론트엔드

- **Vue.js 3.5.18** - Progressive Framework
- **TypeScript 5.9.2** - Type Safety
- **Vite 7.0.6** - Build Tool
- **Vue DevTools** - Development Tools

### WalletConnect

- **@walletconnect/sign-client** - 코어 클라이언트
- **@walletconnect/modal** - UI 모달
- **@walletconnect/types** - TypeScript 타입
- **@walletconnect/utils** - 유틸리티

### XRPL

- **xrpl-client** - XRPL 네트워크 연동

## 설치 및 실행

### 1. 의존성 설치

```bash
# 프로젝트 디렉토리로 이동
cd girin-walletconnect-vue-example

# 의존성 설치
npm install
```

### 2. 환경 설정

#### 2-1. WalletConnect Project ID 생성

1. [WalletConnect Cloud](https://cloud.walletconnect.com)에서 계정 생성/로그인
2. "Create New Project" 클릭
3. 프로젝트 정보 입력:
   - **Project Name**: 앱 이름 (예: "기린월렛 연동 앱")
   - **Description**: 앱 설명
   - **Homepage URL**: 앱 웹사이트 URL
   - **App Logo**: 앱 로고 이미지
4. 생성된 **Project ID** 복사 (32자리 hex 문자열)

#### 2-2. 환경 변수 설정 (권장)

보안을 위해 환경 변수로 관리하는 것을 권장합니다:

**`.env` 파일 생성** (프로젝트 루트에 생성):

```bash
# WalletConnect 설정
VITE_WALLETCONNECT_PROJECT_ID=여기에_실제_PROJECT_ID_입력

# 앱 메타데이터
VITE_APP_NAME=기린월렛 연동 앱
VITE_APP_DESCRIPTION=XRPL DeFi 플랫폼 연동 예제
VITE_APP_URL=https://yourapp.com
VITE_APP_ICON_URL=https://yourapp.com/icon.png

# 네트워크 설정 (선택사항)
VITE_XRPL_NETWORK=testnet
VITE_XRPL_MAINNET_URL=wss://xrplcluster.com
VITE_XRPL_TESTNET_URL=wss://s.altnet.rippletest.net:51233
```

**`src/composables/useGirinWallet.ts`에서 환경 변수 사용**:

```typescript
const girinConfig: GirinWalletConfig = {
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || "YOUR_PROJECT_ID",
  metadata: {
    name: import.meta.env.VITE_APP_NAME || "기린월렛 연동 가이드",
    description:
      import.meta.env.VITE_APP_DESCRIPTION || "XRPL DeFi 플랫폼 연동 예제",
    url: import.meta.env.VITE_APP_URL || "https://example.com",
    icons: [
      import.meta.env.VITE_APP_ICON_URL || "https://example.com/icon.png",
    ],
    redirect: {
      native: "girinwallet://",
      universal: "https://girin.app",
    },
  },
  // ...
};
```

#### 2-3. 직접 코드 수정 (대안)

환경 변수를 사용하지 않는 경우, 직접 코드를 수정할 수 있습니다:

```typescript
const girinConfig: GirinWalletConfig = {
  projectId: "여기에_실제_PROJECT_ID_입력",
  metadata: {
    name: "실제_앱_이름",
    description: "실제_앱_설명",
    url: "https://실제_앱_URL.com",
    icons: ["https://실제_앱_URL.com/icon.png"],
    redirect: {
      native: "girinwallet://",
      universal: "https://girin.app",
    },
  },
  // ...
};
```

#### 2-4. 환경 변수 타입 안전성

`env.d.ts` 파일에서 환경 변수 타입이 이미 정의되어 있습니다:

```typescript
interface ImportMetaEnv {
  readonly VITE_WALLETCONNECT_PROJECT_ID: string;
  readonly VITE_APP_NAME: string;
  readonly VITE_APP_DESCRIPTION: string;
  readonly VITE_APP_URL: string;
  readonly VITE_APP_ICON_URL: string;
  readonly VITE_XRPL_NETWORK: "mainnet" | "testnet";
  readonly VITE_XRPL_MAINNET_URL: string;
  readonly VITE_XRPL_TESTNET_URL: string;
}
```

### 3. 개발 서버 실행

```bash
# 개발 서버 시작
npm run dev

# 타입 체크
npm run type-check

# 프로덕션 빌드
npm run build
```

## 프로젝트 구조

```
src/
├── App.vue                    # 메인 애플리케이션 컴포넌트
├── main.ts                    # 애플리케이션 엔트리 포인트
└── composables/
    └── useGirinWallet.ts      # 기린월렛 연동 컴포저블
```

### 파일별 역할

#### `src/App.vue`

- Vue 3 Composition API 구현
- 사용자 인터페이스 제공
- 상태 표시 및 폼 처리
- 에러/성공 메시지 관리

#### `src/composables/useGirinWallet.ts`

- WalletConnect 클라이언트 관리
- 기린월렛 연결 로직
- XRPL 트랜잭션 처리
- TypeScript 타입 정의

## 주요 컴포넌트

### 1. 연결 상태 표시

```vue
<template>
  <div class="status-card">
    <h2>연결 상태</h2>
    <div
      class="status-indicator"
      :class="{ connected: isConnected, disconnected: !isConnected }"
    >
      {{ isConnected ? "✅ 연결됨" : "❌ 연결되지 않음" }}
    </div>
    <div v-if="isConnected" class="wallet-info">
      <p><strong>주소:</strong> {{ formatAddress(address) }}</p>
      <p><strong>체인 ID:</strong> {{ chainId }}</p>
    </div>
  </div>
</template>
```

### 2. 월렛 연결 버튼

```vue
<template>
  <button
    @click="handleConnect"
    :disabled="isLoading || isConnected"
    class="btn btn-primary"
  >
    {{
      isLoading ? "연결 중..." : isConnected ? "이미 연결됨" : "기린월렛 연결"
    }}
  </button>
</template>
```

### 3. 결제 폼

```vue
<template>
  <form @submit.prevent="handlePayment" class="payment-form">
    <div class="form-group">
      <label for="destination">받는 사람 주소:</label>
      <input
        type="text"
        id="destination"
        v-model="paymentForm.destination"
        placeholder="rXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
        required
      />
    </div>

    <div class="form-group">
      <label for="amount">송금 금액 (XRP):</label>
      <input
        type="number"
        id="amount"
        v-model="paymentForm.amount"
        step="0.000001"
        min="0"
        placeholder="1.0"
        required
      />
    </div>

    <div class="form-group">
      <label for="destinationTag">목적지 태그 (선택사항):</label>
      <input
        type="number"
        id="destinationTag"
        v-model="paymentForm.destinationTag"
        placeholder="예: 12345"
      />
    </div>

    <div class="form-group">
      <label for="network">XRPL 네트워크:</label>
      <select id="network" v-model="paymentForm.network" class="network-select">
        <option value="0">메인넷 (xrpl:0)</option>
        <option value="1">테스트넷 (xrpl:1)</option>
      </select>
      <div class="network-info">
        <p v-if="paymentForm.network === '0'" class="network-warning">
          ⚠️ 메인넷: 실제 XRP가 전송됩니다!
        </p>
        <p v-else class="network-safe">
          ✅ 테스트넷: 테스트용 XRP가 전송됩니다.
        </p>
      </div>
    </div>

    <button
      type="submit"
      :disabled="isPaymentLoading || !isValidPaymentForm"
      class="btn btn-payment"
    >
      {{ isPaymentLoading ? "전송 중..." : "XRP 전송" }}
    </button>
  </form>
</template>
```

## 실행 가이드

### 1. 로컬 개발

```bash
# 개발 서버 실행
npm run dev

# 브라우저에서 http://localhost:5173 접속
```

### 2. 기린월렛 연결 테스트

**모바일 환경:**

1. "기린월렛 연결" 버튼 클릭
2. 자동으로 기린월렛 앱 실행
3. 앱에서 연결 승인

**데스크톱 환경:**

1. "기린월렛 연결" 버튼 클릭
2. QR 코드 모달 표시
3. 모바일 앱으로 QR 코드 스캔
4. 앱에서 연결 승인

### 3. 결제 기능 테스트

1. 월렛 연결 완료 후 결제 섹션 표시
2. 수신자 주소 입력 (XRPL 형식: `rXXXX...`)
3. 송금 금액 입력 (XRP 단위)
4. 목적지 태그 입력 (선택사항)
5. XRPL 네트워크 선택:
   - **메인넷 (xrpl:0)**: 실제 XRP 전송 (⚠️ 주의)
   - **테스트넷 (xrpl:1)**: 테스트용 XRP 전송 (안전)
6. "XRP 전송" 버튼 클릭
7. 기린월렛에서 트랜잭션 승인
8. 결과 확인: 트랜잭션 해시 및 서명 데이터 표시

## 문제 해결

### 환경 설정 문제

#### 1. 환경 변수를 읽을 수 없음

**문제:** `import.meta.env.VITE_WALLETCONNECT_PROJECT_ID`가 undefined

**해결방법:**

```bash
# .env 파일이 프로젝트 루트에 있는지 확인
ls -la .env

# 환경 변수 이름에 VITE_ 접두사 확인
# ❌ WALLETCONNECT_PROJECT_ID=abc123
# ✅ VITE_WALLETCONNECT_PROJECT_ID=abc123

# 개발 서버 재시작
npm run dev
```

#### 2. Project ID 인식 오류

**문제:** "Invalid project ID" 오류 발생

**해결방법:**

```typescript
// 환경 변수 값 확인
console.log("Project ID:", import.meta.env.VITE_WALLETCONNECT_PROJECT_ID);

// WalletConnect Cloud에서 올바른 Project ID 재확인
// - 32자리 hex 문자열 형태인지 확인
// - 복사 시 공백이나 특수문자 포함되지 않았는지 확인
```

#### 3. 메타데이터 오류

**문제:** "Invalid metadata" 경고 또는 연결 실패

**해결방법:**

```typescript
// URL 형식 확인
const config = {
  metadata: {
    name: "앱 이름",
    description: "앱 설명",
    url: "https://example.com", // ✅ https:// 필수
    icons: ["https://example.com/icon.png"], // ✅ https:// 필수
  },
};
```
