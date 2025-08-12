# 기린월렛 WalletConnect 연동 가이드

WalletConnect v2를 사용하여 기린월렛(Girin Wallet)과 연동하는 TypeScript 기반 개발 가이드입니다.

## 📋 목차

1. [프로젝트 소개](#프로젝트-소개)
2. [요구사항](#요구사항)
3. [기본 설정](#기본-설정)
4. [핵심 개념](#핵심-개념)
5. [구현 가이드](#구현-가이드)
6. [예제 프로젝트](#예제-프로젝트)
7. [문제 해결](#문제-해결)

## 프로젝트 소개

이 가이드는 웹 애플리케이션에서 기린월렛과 WalletConnect v2를 통해 연동하여 XRPL 네트워크 기반 DeFi 서비스를 구현하는 방법을 제공합니다.

### 주요 기능

- ✅ 기린월렛 연결/해제
- ✅ XRPL 계정 정보 조회
- ✅ XRP 트랜잭션 서명 및 전송
- ✅ 모바일/데스크톱 크로스 플랫폼 지원
- ✅ 딥링크 처리
- ✅ TypeScript 완전 지원

### 지원 프레임워크

이 가이드의 개념은 다양한 프레임워크에서 활용할 수 있습니다:

- **Vue.js** (예제 포함)
- React.js
- Angular
- Vanilla JavaScript/TypeScript

## 요구사항

### 시스템 요구사항

- Node.js 20.19.0 이상
- npm 또는 yarn
- TypeScript 5.0 이상
- 모던 웹 브라우저 (Chrome, Safari, Firefox, Edge)

### 필수 라이브러리

```json
{
  "@walletconnect/modal": "^2.7.0",
  "@walletconnect/sign-client": "^2.21.8",
  "@walletconnect/utils": "^2.21.8",
  "xrpl-client": "^2.4.0"
}
```

## 기본 설정

### 1. WalletConnect 프로젝트 설정

1. [WalletConnect Cloud](https://cloud.walletconnect.com)에서 계정 생성
2. 새 프로젝트 생성 후 Project ID 복사
3. 프로젝트에서 Project ID 사용

### 2. 환경 변수 설정

```typescript
// config/walletconnect.ts
export const WALLETCONNECT_CONFIG = {
  projectId: process.env.VITE_WALLETCONNECT_PROJECT_ID || "YOUR_PROJECT_ID",
  metadata: {
    name: "Your App Name",
    description: "Your App Description",
    url: "https://yourapp.com",
    icons: ["https://yourapp.com/icon.png"],
    redirect: {
      native: "girinwallet://",
      universal: "https://girin.app",
    },
  },
};
```

## 핵심 개념

### WalletConnect 세션 관리

WalletConnect는 세션 기반으로 작동합니다:

```typescript
interface WalletConnectSession {
  topic: string;
  namespaces: Record<string, Namespace>;
  expiry: number;
  acknowledged: boolean;
}
```

### XRPL 네임스페이스

기린월렛은 XRPL 네임스페이스를 지원합니다:

```typescript
const requiredNamespaces = {
  xrpl: {
    chains: ["xrpl:0", "xrpl:1"], // mainnet, testnet
    methods: ["xrpl_signTransaction", "xrpl_submit"],
    events: ["chainChanged", "accountsChanged"],
  },
};
```

### 모바일 딥링크

모바일 환경에서 기린월렛 앱 연동:

```typescript
const deepLinkUrl = `girinwallet://wc?uri=${encodeURIComponent(uri)}`;
```

## 구현 가이드

### 1. WalletConnect 클라이언트 초기화

```typescript
import { SignClient } from "@walletconnect/sign-client";
import { WalletConnectModal } from "@walletconnect/modal";

class GirinWalletConnector {
  private signClient: SignClient | null = null;
  private modal: WalletConnectModal | null = null;
  private session: SessionTypes.Struct | null = null;

  async initialize(): Promise<void> {
    this.signClient = await SignClient.init({
      projectId: WALLETCONNECT_CONFIG.projectId,
      metadata: WALLETCONNECT_CONFIG.metadata,
    });

    this.modal = new WalletConnectModal({
      projectId: WALLETCONNECT_CONFIG.projectId,
      themeMode: "dark",
      themeVariables: {
        "--wcm-accent-color": "#34D98F",
      },
    });

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    if (!this.signClient) return;

    this.signClient.on("session_event", this.handleSessionEvent);
    this.signClient.on("session_update", this.handleSessionUpdate);
    this.signClient.on("session_delete", this.handleSessionDelete);
  }
}
```

### 2. 월렛 연결

```typescript
async connect(): Promise<SessionTypes.Struct> {
  if (!this.signClient) {
    throw new Error("SignClient not initialized");
  }

  // 네임스페이스 설정 (XRPL + EVM 지원)
  const requiredNamespaces = {
    xrpl: {
      chains: ["xrpl:0", "xrpl:1"], // mainnet, testnet
      methods: ["xrpl_signTransaction", "xrpl_submit"],
      events: ["chainChanged", "accountsChanged"],
    },
    eip155: {
      chains: ["eip155:17000"], // Holesky testnet
      methods: [
        "eth_sendTransaction",
        "personal_sign",
        "eth_signTypedData",
      ],
      events: ["accountsChanged", "chainChanged"],
    },
  };

  const { uri, approval } = await this.signClient.connect({
    requiredNamespaces,
  });

  if (uri) {
    if (this.isMobile()) {
      await this.handleMobileConnection(uri);
    } else {
      await this.modal?.openModal({ uri });
    }
  }

  const session = await approval();
  this.session = session;
  this.modal?.closeModal();

  return session;
}
```

### 3. 트랜잭션 서명

```typescript
async signXRPLTransaction(
  transaction: XRPLTransaction,
  network?: string
): Promise<SignedTransaction> {
  try {
    if (!session.value || !signClient.value) {
      throw new Error("월렛이 연결되지 않았습니다.");
    }

    // 네트워크 파라미터가 제공되면 사용, 아니면 현재 연결된 chainId 사용
    const targetChainId = network
      ? `xrpl:${network}`
      : `xrpl:${chainId.value}`;

    console.log(`🔐 트랜잭션 서명 요청: ${targetChainId}`);

    const txJson = {
      TransactionType: "Payment",
      Account: address.value,
      Destination: transaction.Destination,
      Amount: transaction.Amount,
      DestinationTag: transaction.DestinationTag,
    };

    // 메모 처리 (선택사항)
    if (transaction.Memos) {
      txJson.Memos = [
        {
          Memo: {
            MemoData: Buffer.from(transaction.Memos, "utf8").toString("hex"),
          },
        },
      ];
    }

    const result = await signClient.value.request({
      topic: session.value.topic,
      chainId: targetChainId,
      request: {
        method: "xrpl_signTransaction",
        params: {
          tx_json: txJson,
          submit: true, // 서명과 동시에 네트워크에 제출
        },
      },
    });

    console.log("트랜잭션 서명 성공:", result);
    return result;
  } catch (error) {
    console.error("트랜잭션 서명 실패:", error);
    throw new Error("트랜잭션 서명에 실패했습니다.");
  }
}
```

## 예제 프로젝트

### Vue.js + TypeScript 예제

`girin-walletconnect-vue-example/` 폴더에서 완전한 Vue.js TypeScript 구현 예제를 확인할 수 있습니다.

주요 특징:

- Vue 3 Composition API
- TypeScript 완전 지원
- 반응형 상태 관리
- 에러 처리
- 모바일 최적화

### 실행 방법

```bash
cd girin-walletconnect-vue-example
npm install
npm run dev
```

## 문제 해결

### 자주 발생하는 문제들

#### 1. TypeScript 타입 오류

**문제:** WalletConnect 타입이 인식되지 않음

**해결방법:**

```typescript
// types/walletconnect.d.ts
declare module "@walletconnect/sign-client" {
  export * from "@walletconnect/sign-client/dist/types";
}
```

#### 2. 모바일 딥링크 실패

**문제:** 기린월렛 앱이 실행되지 않음

**해결방법:**

- 기린월렛 앱 설치 확인
- URL 스킴 검증: `girinwallet://`
- 브라우저 팝업 차단 해제

#### 3. 세션 복원 실패

**문제:** 페이지 새로고침 시 연결 상태 초기화

**해결방법:**

```typescript
async restoreSession(): Promise<void> {
  if (!this.signClient) return;

  const sessions = this.signClient.session.getAll();
  if (sessions.length > 0) {
    this.session = sessions[0];
    this.updateConnectionState();
  }
}
```

#### 4. CORS 오류

**문제:** 개발 환경에서 CORS 오류 발생

**해결방법:**

```typescript
// vite.config.ts
export default defineConfig({
  server: {
    cors: true,
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
  },
});
```

### 디버깅 팁

1. **네트워크 요청 확인**

   ```typescript
   console.log("WalletConnect sessions:", signClient.session.getAll());
   ```

2. **트랜잭션 검증**

   ```typescript
   console.log("Transaction object:", JSON.stringify(transaction, null, 2));
   ```

3. **에러 로깅**
   ```typescript
   try {
     await connect();
   } catch (error) {
     console.error("Connection failed:", error);
     // 상세 에러 정보 로깅
   }
   ```

## 보안 고려사항

### 1. 프로덕션 환경 설정

- 환경 변수로 민감한 정보 관리
- HTTPS 필수 사용
- CSP (Content Security Policy) 설정

### 2. 트랜잭션 검증

```typescript
function validateTransaction(tx: XRPLTransaction): boolean {
  // 주소 형식 검증
  if (!tx.Account.startsWith("r") || tx.Account.length !== 34) {
    return false;
  }

  // 금액 검증
  const amount = parseInt(tx.Amount || "0");
  if (amount <= 0 || amount > 100_000_000_000) {
    // 100K XRP 제한
    return false;
  }

  return true;
}
```

### 3. 에러 처리

```typescript
class WalletError extends Error {
  constructor(message: string, public code: string, public details?: any) {
    super(message);
    this.name = "WalletError";
  }
}

// 사용 예시
throw new WalletError("트랜잭션 서명 실패", "SIGN_FAILED", {
  transaction,
  error: originalError,
});
```

---

**주의사항:**

- 메인넷에서 실제 자금을 사용하기 전에 반드시 테스트넷에서 충분한 테스트를 진행하세요.
- 개인키와 시드 구문을 절대로 코드에 하드코딩하지 마세요.
- 프로덕션 환경에서는 적절한 에러 처리와 보안 검증을 구현하세요.
