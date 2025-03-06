import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { TonConnectButton, useTonWallet, useTonConnectUI } from "@tonconnect/ui-react";
import { TONXJsonRpcProvider } from "@tonx/core";
import { decode } from 'light-bolt11-decoder';
import crypto from 'crypto';
import { beginCell, Address, toNano, Cell } from "ton-core"; // Import Address and Cell
import { disconnect, PayButton, requestProvider } from '@getalby/bitcoin-connect-react';
import WebApp from '@twa-dev/sdk';

import { Swap as SwapData, ContractSwapData, DecodedInvoice } from '../components/Interfaces';

// Jetton quantity for conversion (1 tgBTC = 10^9 nanoTgBTC)
const JETTON_QUANTITY = 10 ** 9;

export default function PerformSwap() {
  const [swap, setSwap] = useState<SwapData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(0);
  const [lnToTgInvoice, setLnToTgInvoice] = useState<string>("");
  const [lnToTgDecodedInvoice, setLnToTgDecodedInvoice] = useState<any>(null);
  const [preimage, setPreimage] = useState<string>("");
  const [contractSwap, setContractSwap] = useState<ContractSwapData | null>(null);
  const [tgBTCBalance, setTgBTCBalance] = useState<number>(0);

  const [tonConnectUI] = useTonConnectUI();
  const [searchParams] = useSearchParams();
  const wallet = useTonWallet();

  // Memoize the client so it is created only once.
  const client = useMemo(() => new TONXJsonRpcProvider({
    network: "testnet",
    apiKey: import.meta.env.VITE_TONXAPI_KEY as string,
  }), []);

  const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS as string;

  // On mount, fetch swap parameters.
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
        setError("Error loading swaps.");
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, [searchParams]);

  // No automatic balance fetching - we'll only check balance when locking tgBTC

  // Manual refresh for balance display
  const handleRefreshBalance = async () => {
    if (!wallet?.account.address) return;

    setLoading(true);
    try {
      // First API call: get the jetton wallet address.
      const jettonWallets = await client.getTgBTCWalletAddressByOwner({
        owner_address: wallet.account.address,
      });

      // Introduce a delay (e.g., 2000 ms or 2 seconds) before the next call.
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Second API call: get the tgBTC balance.
      const tgBTCWallet = await client.getTgBTCBalance({
        address: jettonWallets.address,
      });

      console.log("LOG ------BALANCE -----------", tgBTCWallet.balance);
      const balanceNumber = Number(tgBTCWallet.balance) / JETTON_QUANTITY;
      setTgBTCBalance(balanceNumber);
      setError(null);
    } catch (err: any) {
      if (err?.response?.status === 429) {
        console.warn("Rate limited (429) on balance fetch.");
        setError("Rate limit exceeded – please try again later.");
      } else {
        console.error("Error fetching tgBTC balance:", err);
        setError("Error fetching balance.");
      }
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    if (lnToTgInvoice) {
      try {
        const decodedInvoice = decode(lnToTgInvoice);
        setLnToTgDecodedInvoice(decodedInvoice);
      } catch (err) {
        console.error(err);
      }
    }
  }, [lnToTgInvoice]);

  useEffect(() => {
    if (client && contractAddress && swap && !contractSwap && !loading) {
      if (!swap.invoice) return;
      setLoading(true);
      try {
        const decoded = decode(swap.invoice) as unknown as DecodedInvoice;
        console.log("Payment Hash: " + decoded.payment_hash);
        const hashLockBigInt = BigInt('0x' + decoded.payment_hash);
        client.runGetMethod({
          address: contractAddress,
          method: 'get_swap_by_hashlock',
          stack: [{ type: "num", value: hashLockBigInt.toString() }]
        }).then(result => {
          console.log({
            swapId: result.stack[0][1],
            amount: result.stack[3][1],
            hashLock: result.stack[4][1],
            timeLock: result.stack[5][1],
            isCompleted: result.stack[6][1]
          });
          setContractSwap({
            swapId: result.stack[0][1],
            amount: result.stack[3][1],
            hashLock: result.stack[4][1],
            timeLock: result.stack[5][1],
            isCompleted: result.stack[6][1]
          });
          setLoading(false);
        });
      } catch (err) {
        console.error(err);
      }
    }
  }, [client, contractAddress, swap, contractSwap, loading]);

  useEffect(() => {
    if (contractSwap?.timeLock) {
      const timeLockDate = new Date(Number(contractSwap.timeLock) * 1000);
      const now = new Date();
      const remainingTime = Math.max(0, timeLockDate.getTime() - now.getTime());
      setCountdown(remainingTime);
      const interval = setInterval(() => {
        setCountdown(prev => Math.max(0, prev - 1000));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [contractSwap]);

  const createSwapPayload = (initiator: Address, amount: number, hashLock: bigint, timeLock: bigint): string => {
    const OP_DEPOSIT_NOTIFICATION = 0xDEADBEEFn;
    const extraCell = beginCell()
      .storeUint(hashLock, 256)
      .storeUint(timeLock, 64)
      .endCell();
    const forwardPayload = beginCell()
      .storeUint(OP_DEPOSIT_NOTIFICATION, 32)
      .storeUint(toNano(amount / 10 ** 9), 128)
      .storeAddress(initiator)
      .storeRef(
        beginCell()
          .storeAddress(initiator)
          .endCell()
      )
      .storeRef(extraCell)
      .endCell();
    const cell = beginCell()
      .storeUint(0x0f8a7ea5, 32)
      .storeUint(0, 64)
      .storeCoins(toNano(amount / 10 ** 9))
      .storeAddress(Address.parse(contractAddress))
      .storeAddress(Address.parse(contractAddress))
      .storeBit(0)
      .storeCoins(toNano("0.02"))
      .storeBit(1)
      .storeRef(forwardPayload)
      .endCell();
    return cell.toBoc().toString("base64");
  };

  const createCompleteSwapPayload = (swapId: string, preimageBigInt: bigint): string => {
    const OP_COMPLETE_SWAP = 2271560481n;
    const cell = beginCell()
      .storeUint(OP_COMPLETE_SWAP, 32)
      .storeUint(BigInt(swapId), 256)
      .storeUint(preimageBigInt, 256)
      .endCell();
    return cell.toBoc().toString("base64");
  };

  const lockTgBTC = async () => {
    if (!lnToTgDecodedInvoice || !swap) return;
    const initiator = wallet?.account.address;
    if (!initiator) return;

    // Always get fresh balance when attempting to lock
    setLoading(true);

    try {
      // Get fresh balance right when we need it

      await new Promise(resolve => setTimeout(resolve, 2000));

      const jettonWallet = await client.getTgBTCWalletAddressByOwner({ owner_address: initiator });

      // Wait for 2 seconds before making the next API call.
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const tgBTCWallet = await client.getTgBTCBalance({ address: jettonWallet.address });

      await new Promise(resolve => setTimeout(resolve, 2000));

      const balanceNumber = Number(tgBTCWallet.balance) / JETTON_QUANTITY;
      setTgBTCBalance(balanceNumber);
      

      // Check if balance is sufficient
      if (balanceNumber < (swap.amount as number)) {
        setError(`Insufficient tgBTC balance. You have ${balanceNumber} satoshis but need ${swap.amount} satoshis.`);
        setLoading(false);
        return;
      }

      const jettonWalletAddress = jettonWallet.address;

      console.log("HashLock: " + lnToTgDecodedInvoice.payment_hash);
      const hashLockBigInt = BigInt("0x" + lnToTgDecodedInvoice.payment_hash);
      const timeLockBigInt = BigInt(Math.floor(((Date.now()) + Number(lnToTgDecodedInvoice.expiry + 300) * 1000) / 1000));

      if (Number(swap.amount) !== Number(lnToTgDecodedInvoice.sections[2].value) / 1000) {
        setError("Invoice amount doesn't match swap amount");
        setLoading(false);
        return;
      }

      const payload = createSwapPayload(
        Address.parse(initiator),
        swap.amount as number,
        hashLockBigInt,
        timeLockBigInt
      );

      const messages = [{
        address: jettonWalletAddress,
        payload: payload,
        amount: toNano('0.1').toString()
      }];

      const transaction = await tonConnectUI.sendTransaction({
        validUntil: Math.floor(Date.now() / 1000) + 60,
        messages: messages,
      });

      const transactionHash = bocToTransactionHash(transaction.boc);
      console.log("Transaction hash:", transactionHash);

      const swapLock = {
        swapId: swap?._id,
        action: "swap_locked",
        invoice: lnToTgDecodedInvoice.paymentRequest,
        transaction: transactionHash
      };

      WebApp.sendData(JSON.stringify(swapLock));
    } catch (err: any) {
      console.error("Error in lockTgBTC:", err);
      if (err?.response?.status === 429) {
        setError("Rate limit exceeded. Please try again in a moment.");
      } else {
        setError("Error processing transaction. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Extract transaction hash from base64 boc.
  const bocToTransactionHash = (base64Boc: string): string => {
    try {
      const cell: Cell = Cell.fromBoc(Buffer.from(base64Boc, 'base64'))[0];
      const hashBuffer: Buffer = cell.hash();
      return hashBuffer.toString('hex');
    } catch (error) {
      console.error("Error computing transaction hash:", error);
      throw error;
    }
  };

  const completeSwap = async (preimageInput: string) => {
    if (!contractSwap || !swap?.invoice) return;
    try {
      const preimageBigInt = BigInt('0x' + preimageInput.trim());
      let preimageHex = preimageBigInt.toString(16);
      if (preimageHex.length % 2 !== 0) preimageHex = '0' + preimageHex;
      const preimageBuffer = Buffer.from(preimageHex, 'hex');
      const hashBuffer = crypto.createHash('sha256').update(preimageBuffer).digest();
      const computedHash = hashBuffer.toString('hex');
      const swapHashLock = contractSwap.hashLock;
      let swapId;
      if (swapHashLock === '0x' + computedHash) {
        swapId = contractSwap.swapId;
      }
      if (!swapId) return;
      const decoded = decode(swap.invoice) as unknown as DecodedInvoice;
      if (Number(contractSwap.amount) !== Number(decoded.sections[2].value) / 1000) return;
      const payload = createCompleteSwapPayload(swapId.toString(), preimageBigInt);
      const messages = [{
        address: contractAddress,
        amount: toNano('0.2').toString(),
        payload: payload,
      }];
      await tonConnectUI.sendTransaction({
        validUntil: Math.floor(Date.now() / 1000) + 60,
        messages: messages
      });
      const swapFinished = {
        swapId: swap?._id,
        action: "swap_finished"
      };
      WebApp.sendData(JSON.stringify(swapFinished));
    } catch (error) {
      console.error("Error calling contract function:", error);
    }
  };

  const makeInvoice = async () => {
    try {
      const weblnProvider = await requestProvider();
      const invoice = await weblnProvider.makeInvoice({
        amount: swap?.amount,
        memo: "tgBTC swap",
        expiry: 300
      });
      setLnToTgInvoice(invoice.paymentRequest);
      const decodedInvoice = decode(invoice.paymentRequest);
      setLnToTgDecodedInvoice(decodedInvoice);
    } catch (err) {
      console.error(err);
      disconnect();
    }
  };

  return (
    <div className="container">
      <div className="header">
        <div className="version">
          <TonConnectButton />
        </div>
        <h1 className="mb-2">Perform Swap</h1>
        {wallet ? (
          <>
            {swap?.fromTON ? (
              <div className="card">
                <div className="balance-amount mb-2">tgBTC to Lightning Swap</div>
                <div className="balance-amount mb-2">Swapping {swap?.amount} satoshis</div>
                <div className="balance-amount mb-2">
                  {/* Your tgBTC Balance: {tgBTCBalance} satoshis{" "} */}
                  <button onClick={handleRefreshBalance} disabled={loading}>
                    {/* Refresh */}
                  </button>
                </div>
                {error && <div className="error-message mb-2">{error}</div>}
                <div className="input-container">
                  <button
                    onClick={makeInvoice}
                    disabled={loading}
                    className={`button ${loading ? "loading" : ""}`}
                  >
                    {loading ? "Processing..." : "Make Invoice using Bitcoin Connect"}
                  </button>
                  <p>or</p>
                  <input
                    type="text"
                    placeholder={`Paste Invoice of ${swap?.amount} satoshis`}
                    value={lnToTgInvoice}
                    onChange={(e) => setLnToTgInvoice(e.target.value)}
                    disabled={loading}
                  />
                  <button
                    onClick={lockTgBTC}
                    disabled={loading || !swap?.amount || !lnToTgDecodedInvoice}
                    className={`button ${loading ? "loading" : ""}`}
                  >
                    {loading ? "Processing..." : "Start Swap"}
                  </button>
                </div>
                {loading && (
                  <div className="transaction-container">
                    <p>Processing transaction...</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="card">
                <div className="balance-amount mb-2">Lightning to tgBTC swap</div>
                <div className="balance-amount mb-2">
                  {swap?.invoice && Number((decode(swap.invoice) as unknown as DecodedInvoice).sections[2].value) / 1000} satoshis
                </div>
                <div className="mb-2">
                  <p>Expires in: {Math.floor(countdown / 1000)} seconds</p>
                </div>
                {contractSwap ? (
                  <>
                    {countdown > 0 && (
                      <PayButton
                        invoice={swap?.invoice}
                        onPaid={(response) => {
                          setPreimage(response.preimage);
                          completeSwap(response.preimage);
                        }}
                      />
                    )}
                    {preimage && countdown > 0 && (
                      <button
                        onClick={() => {
                          if (!swap || !swap?.invoice) return;
                          const computedHash = crypto.createHash('sha256')
                            .update(Buffer.from(preimage, 'hex'))
                            .digest('hex');
                          const preimageBigInt = BigInt('0x' + preimage);
                          completeSwap(preimage);
                        }}
                        className={`button ${loading ? "loading" : ""}`}
                      >
                        {loading ? "Processing..." : "Claim"}
                      </button>
                    )}
                  </>
                ) : (
                  "No swap found, wrong parameters"
                )}
              </div>
            )}
          </>
        ) : (
          <div className="card">
            <div className="text-center">
              <div className="balance-amount mb-2">Welcome to tgBTC Transfer</div>
              <div className="status-container">
                <p>Please connect your TON wallet to view your tgBTC balance and make transfers</p>
              </div>
              <div className="step">
                <div className="step-number">1</div>
                <div>Click the Connect Wallet button above</div>
              </div>
              <div className="step">
                <div className="step-number">2</div>
                <div>Select your TON wallet</div>
              </div>
              <div className="step">
                <div className="step-number">3</div>
                <div>Start making secure transfers</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}