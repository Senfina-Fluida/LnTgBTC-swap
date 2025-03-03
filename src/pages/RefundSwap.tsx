import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { TonConnectButton, useTonWallet, useTonConnectUI } from "@tonconnect/ui-react";
import { TONXJsonRpcProvider } from "@tonx/core";
import { toNano, beginCell } from "ton-core";
import WebApp from '@twa-dev/sdk';
import { decode } from 'light-bolt11-decoder';

interface SwapData {
  swapId: string;
  invoice: string;
}

interface ContractSwapData {
  swapId: string;
  hashLock: string;
  timeLock: string;
  isCompleted: boolean;
}


export default function RefundSwap() {
  const [swap, setSwap] = useState<SwapData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [contractSwap, setContractSwap] = useState<ContractSwapData | null>(null);

  const [tonConnectUI] = useTonConnectUI();
  const [searchParams] = useSearchParams();
  const wallet = useTonWallet();
  const client = new TONXJsonRpcProvider({
    network: "testnet",
    apiKey: import.meta.env.VITE_TONXAPI_KEY as string,
  });

  const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS as string;

  useEffect(() => {
    WebApp.ready();
    
    const params = searchParams.get('params');
    if (params) {
      try {
        const decodedParams = decodeURIComponent(params);
        const parsedSwap: SwapData = JSON.parse(decodedParams);
        setSwap(parsedSwap);
      } catch (err) {
        console.error("Error parsing params:", err);
        setError("Error loading swap data.");
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(false); // No params, not an error, just no data.
    }
  }, [searchParams]);

  useEffect(() => {
    if (client && contractAddress && swap) {
      if (!swap.invoice) return;
      try {
        const decoded = decode(swap.invoice);
        console.log("Payment Hash: " + decoded.payment_hash);
        const hashLockBigInt = BigInt('0x' + decoded.payment_hash);
        client.runGetMethod({
          address: contractAddress,
          method: 'get_swap_by_hashlock',
          stack: [{ type: "num", value: hashLockBigInt.toString() }]
        }).then(result => {
          console.log(result);
          setContractSwap({
            swapId: result.stack[0][1],
            hashLock: result.stack[4][1],
            timeLock: result.stack[5][1],
            isCompleted: result.stack[6][1]
          });
        });
      } catch (err) {
        console.error(err);
      }
    }
  }, [client, contractAddress, swap]);

  const createRefundSwapPayload = (swapId: string): string => {
    const OP_REFUND_SWAP = 2882400018n; 
    const cell = beginCell()
      .storeUint(OP_REFUND_SWAP, 32)
      .storeUint(BigInt(swapId), 256) 
      .endCell();

    return cell.toBoc().toString("base64");
  };

  const refundSwap = async (): Promise<void> => {
    if (!contractSwap || !contractSwap.swapId) {
      console.error("No swap data available.");
      return;
    }

    try {
      const payload = createRefundSwapPayload(contractSwap.swapId);
      const messages = [
        {
          address: contractAddress,
          amount: toNano('0.1').toString(), // Gas amount
          payload: payload,
        },
      ];

      await tonConnectUI.sendTransaction({
        validUntil: Math.floor(Date.now() / 1000) + 60,
        messages: messages,
      });
      console.log("Refund transaction sent successfully");

      // Notify the bot that the refund was initiated
      const refundInitiated = {
        swapId: swap?.swapId,
        action: "refund_initiated"
      };
      WebApp.sendData(JSON.stringify(refundInitiated));

    } catch (error) {
      console.error("Error calling refundSwap function:", error);
    }
  };

  return (
    <div className="container">
      <div className="header">
        <div className="version">
          <TonConnectButton />
        </div>

        <h1 className="border">Refund Swap</h1>
        <h2 className="mb-2">Refund Your Swap</h2>

        {wallet ? (
          <div className="card">
            {swap ? (
              <>
                <div className="balance-amount mb-2">Swap ID: {swap.swapId}</div>
                <div className="balance-amount mb-2">Amount: {Number(decode(swap.invoice).amount) / 1000} satoshis</div>

                <button
                  onClick={refundSwap}
                  disabled={loading}
                  className={`button ${loading ? "loading" : ""}`}
                >
                  {loading ? "Processing..." : "Refund Swap"}
                </button>
              </>
            ) : (
              <div className="balance-amount mb-2">No swap data available.</div>
            )}
          </div>
        ) : (
          <div className="card">
            <div className="text-center">
              <div className="balance-amount mb-2">Welcome to Refund Swap</div>

              <div className="status-container">
                <p>Please connect your TON wallet to refund your swap.</p>
              </div>

              <div className="step">
                <div className="step-number">1</div>
                <div>Click the Connect Wallet button above</div>
              </div>

              <div className="step">
                <div className="step-number">2</div>
                <div>Refund your swap</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}