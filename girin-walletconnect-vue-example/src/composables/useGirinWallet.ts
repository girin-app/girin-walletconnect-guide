import { ref } from "vue";
import { SignClient } from "@walletconnect/sign-client";
import { WalletConnectModal } from "@walletconnect/modal";
import type { SessionTypes } from "@walletconnect/types";

// 타입 정의
export interface XRPLTransaction {
  TransactionType: string;
  Account: string;
  Destination?: string;
  Amount?: string;
  Fee: string;
  DestinationTag?: number;
  [key: string]: any;
}

export interface SignedTransaction {
  signedTransaction: string;
  transactionHash: string;
}

export interface PaymentParams {
  destination: string;
  amount: number;
  destinationTag?: number | null;
  network?: string;
}

export interface GirinWalletConfig {
  projectId: string;
  metadata: {
    name: string;
    description: string;
    url: string;
    icons: string[];
    redirect: {
      native: string;
      universal: string;
    };
  };
  modalOptions: {
    themeMode: string;
    themeVariables: Record<string, string>;
    desktopWallets: any[];
    explorerExcludedWalletIds: string[] | "ALL";
    enableExplorer: boolean;
    mobileWallets: Array<{
      id: string;
      name: string;
      links: {
        native: string;
        universal: string;
      };
    }>;
  };
}

// 기린월렛 연결을 위한 컴포저블
export function useGirinWallet() {
  // 반응형 상태
  const isConnected = ref<boolean>(false);
  const isLoading = ref<boolean>(false);
  const address = ref<string>("");
  const chainId = ref<string>("");
  const signClient = ref<any>(null);
  const session = ref<SessionTypes.Struct | null>(null);
  const modal = ref<WalletConnectModal | null>(null);

  // 기린월렛 설정
  const girinConfig: GirinWalletConfig = {
    projectId:
      import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || "YOUR_PROJECT_ID",
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
    modalOptions: {
      themeMode: "dark",
      themeVariables: {
        "--wcm-background-color": "#292A30CC",
        "--wcm-accent-color": "#34D98F",
        "--wcm-accent-fill-color": "#34D98F",
      },
      desktopWallets: [],
      explorerExcludedWalletIds: "ALL" as const,
      enableExplorer: false,
      mobileWallets: [
        {
          id: "girin",
          name: "Girin Wallet",
          links: {
            native: "girinwallet://",
            universal: "https://girinwallet.com",
          },
        },
      ],
    },
  };

  // WalletConnect 클라이언트 초기화
  const initializeClient = async (): Promise<void> => {
    try {
      // 환경변수 로딩 확인을 위한 디버깅 로그
      console.log("🔍 기린월렛 환경변수 확인:");
      console.log("Project ID:", girinConfig.projectId);
      console.log("App Name:", girinConfig.metadata.name);
      console.log("App URL:", girinConfig.metadata.url);

      if (!signClient.value) {
        signClient.value = await SignClient.init({
          projectId: girinConfig.projectId,
          metadata: girinConfig.metadata,
        });

        // 모달 초기화
        modal.value = new WalletConnectModal({
          projectId: girinConfig.projectId,
          themeMode: girinConfig.modalOptions.themeMode as "dark" | "light",
          themeVariables: girinConfig.modalOptions.themeVariables,
          explorerExcludedWalletIds:
            girinConfig.modalOptions.explorerExcludedWalletIds,
          enableExplorer: girinConfig.modalOptions.enableExplorer,
        });

        // 이벤트 리스너 등록
        signClient.value.on("session_event", handleSessionEvent);
        signClient.value.on("session_update", handleSessionUpdate);
        signClient.value.on("session_delete", handleSessionDelete);
      }

      // 기존 세션 복원 확인
      const sessions = signClient.value.session.getAll();
      if (sessions.length > 0) {
        session.value = sessions[0];
        updateConnectionState(session.value);
      }
    } catch (error) {
      console.error("클라이언트 초기화 실패:", error);
      throw new Error("WalletConnect 클라이언트 초기화에 실패했습니다.");
    }
  };

  // 월렛 연결
  const connect = async (): Promise<void> => {
    try {
      isLoading.value = true;

      if (!signClient.value) {
        await initializeClient();
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

      // 연결 요청
      const { uri, approval } = await signClient.value.connect({
        requiredNamespaces,
      });

      if (uri) {
        // 모바일 환경에서 기린월렛 딥링크 처리
        if (isMobile()) {
          await handleMobileConnection(uri);
        } else {
          // 데스크톱에서는 QR 코드 모달 표시
          await modal.value?.openModal({ uri });
        }
      }

      // 연결 승인 대기
      const sessionData = await approval();
      session.value = sessionData;
      updateConnectionState(sessionData);

      modal.value?.closeModal();
      console.log("월렛 연결 성공:", sessionData);
    } catch (error) {
      console.error("월렛 연결 실패:", error);
      throw new Error("월렛 연결에 실패했습니다.");
    } finally {
      isLoading.value = false;
    }
  };

  // 모바일 연결 처리
  const handleMobileConnection = async (uri: string): Promise<void> => {
    try {
      const nativeUrl = girinConfig.metadata.redirect.native;
      const universalUrl = girinConfig.metadata.redirect.universal;

      if (nativeUrl) {
        const href = `${nativeUrl}wc?uri=${encodeURIComponent(uri)}`;
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

        // 앱 실행 감지를 위한 변수
        let appOpened = false;
        const appCheckTimeout = 3000; // 3초

        // 페이지 가시성 변경 이벤트 리스너
        const handleVisibilityChange = () => {
          if (document.hidden) {
            appOpened = true;
          }
        };

        const handleBlur = () => {
          appOpened = true;
        };

        // 이벤트 리스너 등록
        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("blur", handleBlur);

        if (isIOS) {
          const newWindow = window.open(href, "_blank");
          if (newWindow) {
            newWindow.focus();
          } else {
            window.location.href = href;
          }
        } else {
          // Android: iframe을 사용한 딥링크 실행
          const iframe = document.createElement("iframe");
          iframe.style.display = "none";
          iframe.src = href;
          document.body.appendChild(iframe);
          setTimeout(() => {
            iframe.remove();
          }, 100);
        }

        // 앱 설치 여부 확인
        await new Promise((resolve) => {
          setTimeout(() => {
            document.removeEventListener(
              "visibilitychange",
              handleVisibilityChange
            );
            window.removeEventListener("blur", handleBlur);

            // 앱이 열리지 않았으면 스토어로 리다이렉션
            if (!appOpened && universalUrl) {
              window.location.href = universalUrl;
            }

            resolve(undefined);
          }, appCheckTimeout);
        });
      }
    } catch (error) {
      console.error("모바일 연결 처리 오류:", error);
    }
  };

  // 연결 상태 업데이트
  const updateConnectionState = (
    sessionData: SessionTypes.Struct | null
  ): void => {
    if (sessionData) {
      isConnected.value = true;

      // XRPL 계정 정보 추출
      const xrplAccounts = sessionData.namespaces?.xrpl?.accounts || [];
      if (xrplAccounts.length > 0) {
        address.value = xrplAccounts[0].split(":")[2];
        chainId.value = xrplAccounts[0].split(":")[1];
      }
    } else {
      isConnected.value = false;
      address.value = "";
      chainId.value = "";
    }
  };

  // 월렛 연결 해제
  const disconnect = async (): Promise<void> => {
    try {
      if (session.value && signClient.value) {
        await signClient.value.disconnect({
          topic: session.value.topic,
          reason: {
            code: 6000,
            message: "User disconnected",
          },
        });
      }

      session.value = null;
      updateConnectionState(null);
      console.log("월렛 연결 해제 완료");
    } catch (error) {
      console.error("월렛 연결 해제 실패:", error);
      throw new Error("월렛 연결 해제에 실패했습니다.");
    }
  };

  // XRPL 트랜잭션 서명
  const signXRPLTransaction = async (
    transaction: XRPLTransaction,
    network?: string
  ): Promise<SignedTransaction> => {
    try {
      if (!session.value || !signClient.value) {
        throw new Error("월렛이 연결되지 않았습니다.");
      }

      // 네트워크 파라미터가 제공되면 사용, 아니면 현재 연결된 chainId 사용
      const targetChainId = network
        ? `xrpl:${network}`
        : `xrpl:${chainId.value}`;

      console.log(`🔐 트랜잭션 서명 요청: ${targetChainId}`);

      const txJson: Partial<{
        TransactionType: string;
        Account: string;
        Destination: string;
        Amount: unknown;
        DestinationTag?: number;
        Memos?: Array<{
          Memo: {
            MemoData: string;
          };
        }>;
      }> = {
        TransactionType: "Payment",
        Account: address.value,
        Destination: transaction.Destination,
        Amount: transaction.Amount,
        DestinationTag: transaction.DestinationTag,
      };

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
            submit: true,
          },
        },
      });

      console.log("트랜잭션 서명 성공:", result);
      return result;
    } catch (error) {
      console.error("트랜잭션 서명 실패:", error);
      throw new Error("트랜잭션 서명에 실패했습니다.");
    }
  };

  // 결제 트랜잭션 생성 및 전송
  const sendPayment = async ({
    destination,
    amount,
    destinationTag = null,
    network = "1", // 기본값은 테스트넷
  }: PaymentParams): Promise<SignedTransaction> => {
    try {
      if (!isConnected.value) {
        throw new Error("월렛이 연결되지 않았습니다.");
      }

      // 선택된 네트워크 표시
      const networkName = network === "0" ? "메인넷" : "테스트넷";
      console.log(`🌐 선택된 네트워크: ${networkName} (xrpl:${network})`);

      // XRPL Payment 트랜잭션 구성
      const transaction = {
        TransactionType: "Payment",
        Account: address.value,
        Destination: destination,
        Amount: String(amount * 1000000), // XRP를 drops로 변환 (1 XRP = 1,000,000 drops)
        Fee: "12", // 기본 수수료
        ...(destinationTag && { DestinationTag: destinationTag }),
      };

      console.log("결제 트랜잭션 생성:", transaction);

      // 트랜잭션 서명 (선택된 네트워크 사용)
      const signedTransaction = await signXRPLTransaction(transaction, network);

      return signedTransaction;
    } catch (error) {
      console.error("결제 실패:", error);
      throw error;
    }
  };

  // 이벤트 핸들러들
  const handleSessionEvent = (event: any): void => {
    console.log("세션 이벤트:", event);
  };

  const handleSessionUpdate = ({
    topic,
    params,
  }: {
    topic: string;
    params: any;
  }): void => {
    console.log("세션 업데이트:", { topic, params });
    const updatedSession = signClient.value?.session.get(topic);
    if (updatedSession) {
      session.value = updatedSession;
      updateConnectionState(updatedSession);
    }
  };

  const handleSessionDelete = (): void => {
    console.log("세션 삭제됨");
    session.value = null;
    updateConnectionState(null);
  };

  // 유틸리티 함수
  const isMobile = (): boolean => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  };

  // 초기화
  initializeClient().catch(console.error);

  return {
    // 상태
    isConnected,
    isLoading,
    address,
    chainId,
    session,

    // 메소드
    connect,
    disconnect,
    signXRPLTransaction,
    sendPayment,
  };
}
