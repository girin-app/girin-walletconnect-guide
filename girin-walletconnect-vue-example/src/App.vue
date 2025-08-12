<template>
  <div id="app">
    <header class="header">
      <h1>기린월렛 연동 가이드</h1>
      <p>Vue.js + WalletConnect를 사용한 기린월렛 연결 예제</p>
    </header>

    <main class="main-content">
      <!-- 연결 상태 표시 -->
      <div class="status-card">
        <h2>연결 상태</h2>
        <div class="status-info">
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
      </div>

      <!-- 월렛 연결 섹션 -->
      <div class="wallet-section">
        <h2>월렛 연결</h2>
        <div class="button-group">
          <button
            @click="handleConnect"
            :disabled="isLoading || isConnected"
            class="btn btn-primary"
          >
            {{
              isLoading
                ? "연결 중..."
                : isConnected
                ? "이미 연결됨"
                : "기린월렛 연결"
            }}
          </button>

          <button
            @click="handleDisconnect"
            :disabled="!isConnected"
            class="btn btn-secondary"
          >
            연결 해제
          </button>
        </div>

        <div v-if="!isConnected" class="info-text">
          <p>💡 모바일 기기에서는 기린월렛 앱이 자동으로 실행됩니다.</p>
          <p>💡 데스크톱에서는 QR 코드를 스캔하여 연결하세요.</p>
        </div>
      </div>

      <!-- 결제 섹션 -->
      <div class="payment-section" v-if="isConnected">
        <h2>결제 기능</h2>
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
            <select
              id="network"
              v-model="paymentForm.network"
              class="network-select"
            >
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

        <div v-if="lastTransactionResult" class="transaction-result">
          <h3>마지막 트랜잭션 결과:</h3>
          <pre>{{ JSON.stringify(lastTransactionResult, null, 2) }}</pre>
        </div>
      </div>
    </main>

    <!-- 에러 표시 -->
    <div v-if="errorMessage" class="error-banner">
      <p>❌ {{ errorMessage }}</p>
      <button @click="clearError" class="btn-close">×</button>
    </div>

    <!-- 성공 메시지 -->
    <div v-if="successMessage" class="success-banner">
      <p>✅ {{ successMessage }}</p>
      <button @click="clearSuccess" class="btn-close">×</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import {
  useGirinWallet,
  type PaymentParams,
} from "./composables/useGirinWallet";

// 기린월렛 컴포저블 사용
const {
  isConnected,
  isLoading,
  address,
  chainId,
  connect,
  disconnect,
  sendPayment,
} = useGirinWallet();

// 로컬 상태
const errorMessage = ref<string>("");
const successMessage = ref<string>("");
const isPaymentLoading = ref<boolean>(false);
const lastTransactionResult = ref<any>(null);

// 결제 폼 데이터
interface PaymentForm {
  destination: string;
  amount: string;
  destinationTag: string;
  network: string;
}

const paymentForm = ref<PaymentForm>({
  destination: "",
  amount: "",
  destinationTag: "",
  network: "1", // 기본값은 테스트넷
});

// 계산된 속성들
const isValidPaymentForm = computed((): boolean => {
  return (
    !!paymentForm.value.destination &&
    !!paymentForm.value.amount &&
    parseFloat(paymentForm.value.amount) > 0
  );
});

// 주소 포맷팅 (앞뒤 일부만 표시)
const formatAddress = (addr: string): string => {
  if (!addr) return "";
  return `${addr.slice(0, 8)}...${addr.slice(-8)}`;
};

// 월렛 연결 핸들러
const handleConnect = async (): Promise<void> => {
  try {
    clearMessages();
    await connect();
    successMessage.value = "기린월렛이 성공적으로 연결되었습니다!";
  } catch (error: any) {
    errorMessage.value = error.message || "월렛 연결에 실패했습니다.";
  }
};

// 월렛 연결 해제 핸들러
const handleDisconnect = async (): Promise<void> => {
  try {
    clearMessages();
    await disconnect();
    successMessage.value = "월렛 연결이 해제되었습니다.";
    // 폼 초기화
    paymentForm.value = {
      destination: "",
      amount: "",
      destinationTag: "",
      network: "1", // 테스트넷으로 초기화
    };
    lastTransactionResult.value = null;
  } catch (error: any) {
    errorMessage.value = error.message || "월렛 연결 해제에 실패했습니다.";
  }
};

// 결제 핸들러
const handlePayment = async (): Promise<void> => {
  try {
    clearMessages();
    isPaymentLoading.value = true;

    const paymentData: PaymentParams = {
      destination: paymentForm.value.destination,
      amount: parseFloat(paymentForm.value.amount),
      destinationTag: paymentForm.value.destinationTag
        ? parseInt(paymentForm.value.destinationTag)
        : null,
      network: paymentForm.value.network,
    };

    const result = await sendPayment(paymentData);
    lastTransactionResult.value = result;
    const networkName = paymentData.network === "0" ? "메인넷" : "테스트넷";
    successMessage.value = `결제가 성공적으로 전송되었습니다! 금액: ${paymentData.amount} XRP (${networkName})`;

    // 폼 초기화
    paymentForm.value = {
      destination: "",
      amount: "",
      destinationTag: "",
      network: "1", // 테스트넷으로 초기화
    };
  } catch (error: any) {
    errorMessage.value = error.message || "결제 전송에 실패했습니다.";
  } finally {
    isPaymentLoading.value = false;
  }
};

// 메시지 관리
const clearMessages = (): void => {
  errorMessage.value = "";
  successMessage.value = "";
};

const clearError = (): void => {
  errorMessage.value = "";
};

const clearSuccess = (): void => {
  successMessage.value = "";
};

// 컴포넌트 마운트 시 메시지 감시 시작
onMounted(() => {
  // 메시지 변화 감시는 Vue의 watch를 사용하거나 여기서 간단히 처리
});
</script>

<style scoped>
/* 전체 앱 스타일 */
#app {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
  line-height: 1.6;
}

/* 헤더 스타일 */
.header {
  text-align: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #eee;
}

.header h1 {
  color: #2c3e50;
  margin-bottom: 0.5rem;
}

.header p {
  color: #7f8c8d;
  font-size: 1.1rem;
}

/* 메인 콘텐츠 */
.main-content {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

/* 카드 스타일 */
.status-card,
.wallet-section,
.payment-section {
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.status-card h2,
.wallet-section h2,
.payment-section h2 {
  margin-top: 0;
  color: #2c3e50;
  border-bottom: 2px solid #34d98f;
  padding-bottom: 0.5rem;
}

/* 상태 표시 */
.status-info {
  margin-top: 1rem;
}

.status-indicator {
  font-size: 1.2rem;
  font-weight: bold;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  margin-bottom: 1rem;
}

.status-indicator.connected {
  background-color: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.status-indicator.disconnected {
  background-color: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

.wallet-info {
  background-color: #f8f9fa;
  padding: 1rem;
  border-radius: 6px;
  border-left: 4px solid #34d98f;
}

.wallet-info p {
  margin: 0.5rem 0;
  font-family: "Courier New", monospace;
}

/* 버튼 스타일 */
.button-group {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 500;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background-color: #34d98f;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: #2bc780;
}

.btn-secondary {
  background-color: #6c757d;
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background-color: #5a6268;
}

.btn-payment {
  background-color: #007bff;
  color: white;
  width: 100%;
}

.btn-payment:hover:not(:disabled) {
  background-color: #0056b3;
}

/* 정보 텍스트 */
.info-text {
  background-color: #e7f3ff;
  border: 1px solid #b3d7ff;
  border-radius: 6px;
  padding: 1rem;
  margin-top: 1rem;
}

.info-text p {
  margin: 0.5rem 0;
  color: #0066cc;
}

/* 폼 스타일 */
.payment-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group label {
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #2c3e50;
}

.form-group input {
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 1rem;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #34d98f;
  box-shadow: 0 0 0 2px rgba(52, 217, 143, 0.2);
}

/* 네트워크 선택 스타일 */
.network-select {
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 1rem;
  background-color: #fff;
  cursor: pointer;
}

.network-info {
  margin-top: 0.5rem;
}

.network-warning {
  color: #d63384;
  font-weight: 500;
  background-color: #f8d7da;
  border: 1px solid #f5c2c7;
  border-radius: 4px;
  padding: 0.5rem;
  margin: 0;
}

.network-safe {
  color: #198754;
  font-weight: 500;
  background-color: #d1e7dd;
  border: 1px solid #badbcc;
  border-radius: 4px;
  padding: 0.5rem;
  margin: 0;
}

/* 트랜잭션 결과 */
.transaction-result {
  margin-top: 2rem;
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  padding: 1rem;
}

.transaction-result h3 {
  margin-top: 0;
  color: #2c3e50;
}

.transaction-result pre {
  background-color: #fff;
  border: 1px solid #e9ecef;
  border-radius: 4px;
  padding: 1rem;
  overflow-x: auto;
  font-size: 0.9rem;
}

/* 메시지 배너 */
.error-banner,
.success-banner {
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 1rem 1.5rem;
  border-radius: 6px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-width: 300px;
  z-index: 1000;
}

.error-banner {
  background-color: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

.success-banner {
  background-color: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.btn-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  margin-left: 1rem;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 반응형 디자인 */
@media (max-width: 768px) {
  #app {
    padding: 1rem;
  }

  .button-group {
    flex-direction: column;
  }

  .btn {
    width: 100%;
  }

  .error-banner,
  .success-banner {
    position: relative;
    top: auto;
    right: auto;
    margin-bottom: 1rem;
  }
}
</style>
