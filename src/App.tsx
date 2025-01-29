import { useEffect, useState } from "react";
import "./App.css";
import { TonConnectButton, useTonWallet, useTonConnectUI } from "@tonconnect/ui-react";
import { TONXJsonRpcProvider } from "@tonx/core";
import { decode } from 'light-bolt11-decoder';

import {Button, PayButton,requestProvider, init} from '@getalby/bitcoin-connect-react';

import WebApp from '@twa-dev/sdk';

const App = () => {
  const [tonConnectUI] = useTonConnectUI();
  const wallet = useTonWallet();
  const client = new TONXJsonRpcProvider({
    network: "testnet",
    apiKey: import.meta.env.VITE_TONXAPI_KEY,
  });

  const [recipientAddress, setRecipientAddress] = useState("");
  const [amount, setAmount] = useState(0);
  const [invoice,setInvoice] = useState("lnbc1030u1p3mmh9ppp5uxuh5qtggtpflxddtfej79gsly45qehtvt3gdnvm0dx5nc9g35gsdqqcqzpgxqrpcgsp5c2yzjmvsh4t4k9eqlvyn4sy4wph3zqylma025m3tugcyu52r84nq9q8pqqqssqneemd9ra62vfw47qyqejq9n9v7lk4c4zcq3f069kkha94eglxggrjfjj20pkj0uaqdgyyz6lmw6ezskdckr0tnxc6zdzjtrf4wl9ltgp9tmk47");
  const [lnToTgInvoice,setLnToTgInvoice] = useState("");
  const [lnToTgDecodedInvoice,setLnToTgDecodedInvoice] = useState("");

  const [lnProvider, setLnProvider] = useState();

  const [transferAmount, setTransferAmount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccessful, setIsSuccessful] = useState(false);

  const JETTON_QUANTITY = 100000000;

  useEffect(() => {
    // Initialize Bitcoin Connect
    init({
      appName: "LnTgBTCSwap", // your app name
    })
    WebApp.ready();
    console.log("Telegram Web App is ready!");

    WebApp.onEvent('popup_closed', () => {
        console.log("popup_closed event triggered. WebApp.data:", WebApp.data);
        // ... (handle data from bot)
    });
  },[]);
  useEffect(() => {
    if (wallet) {
      getTgBTCAmount();
      setRecipientAddress(wallet?.account.address)
    }
  }, [wallet]);


  const sendData = async () => {
    if (WebApp.isActive) {
      console.log(WebApp)
      WebApp.sendData(JSON.stringify({
        action: "connection"
      }));
    } else {
      alert("Telegram Web App is not available.");
    }
  };
  const getTgBTCAmount = async () => {
    const jettonWallets = await client.getTgBTCWalletAddressByOwner({ owner_address: wallet?.account.address });
    const tgBTCWallet = await client.getTgBTCBalance({ address: jettonWallets.address });
    setAmount(tgBTCWallet.balance / JETTON_QUANTITY);
  };

  const onClickSend = async () => {
    setIsLoading(true);
    setIsSuccessful(false);
    try {

      const hashLock = lnToTgDecodedInvoice.payment_hash;
      const timeLock = lnToTgDecodedInvoice.expiry;
      const invoice = lnToTgDecodedInvoice.paymentRequest;
      const amount = lnToTgDecodedInvoice.amount;
      /* 
        Now invoice and tgBTC are inserted to the smart contract, the release of
        tgBTC is triggered by the user that pays the invoice after the preimage is known
      */
      const payload = await client.getTgBTCTransferPayload({
        amount: parseInt(String(transferAmount * JETTON_QUANTITY)),
        destination: recipientAddress,
        source: wallet?.account.address,
        comment: "From TONX API",
      });
      await tonConnectUI.sendTransaction({
        validUntil: Math.floor(Date.now() / 1000) + 360,
        messages: [{ ...payload }],
      });

      await waitForTransactionConfirmation();
      await getTgBTCAmount();
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsLoading(false);
    }
  };
  const makeInvoice = async () => {
      // if no WebLN provider exists, it will launch the modal
      const weblnProvider = await requestProvider();
      setLnProvider(weblnProvider);
      const invoice = await weblnProvider.makeInvoice({
        amount: transferAmount,
        memo: "tgBTC swap"
      });
      setLnToTgInvoice(invoice.paymentRequest)
      const decodedInvoice = decode(invoice.paymentRequest);
      setLnToTgDecodedInvoice(decodedInvoice);
  };
  const waitForTransactionConfirmation = async () => {
    const TIMEOUT_SECONDS = 300;
    const POLL_INTERVAL = 1000;
    const initialTransactionLT = await getTransferCount();

    for (let attempts = 0; attempts < TIMEOUT_SECONDS; attempts++) {
      try {
        const currentTransactionLT = await getTransferCount();
        if (currentTransactionLT > initialTransactionLT) {
          setIsSuccessful(true);
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
      } catch (error) {
        console.error("Transaction check failed:", error);
      }
    }
    throw new Error("Transaction confirmation timeout");
  };

  const getTransferCount = async () => {
    const transfers = await client.getTgBTCTransfers({
      address: wallet?.account.address,
      direction: "out",
    });
    if (!transfers?.[0]?.transaction_lt) {
      return 0;
    }
    return parseInt(transfers[0].transaction_lt);
  };

  return (
    <div className="container">
      <div className="header">
        <div className="version">
          <TonConnectButton />
        </div>

        <h1 className="border">LnTgBTCSwap</h1>
        <h2 className="mb-2">tgBTC to Lightning swap</h2>

        {wallet ? (
          <>
          <div className="card">
            <div className="balance-amount mb-2">tgBTC to Lightning Swap</div>

            <div className="balance-amount mb-2">tgBTC Balance: {amount}</div>

            <div className="input-container">
              <input
                type="number"
                placeholder="tgBTC Amount"
                value={transferAmount}
                onChange={(e) => setTransferAmount(Number(e.target.value))}
                disabled={isLoading}
              />
              <button
                  onClick={makeInvoice}
                  disabled={isLoading}
                  className={`button ${isLoading ? "loading" : ""}`}
                >
                 {isLoading ? "Processing..." : "Make Invoice using Bitcoin Connect"}
              </button> 
              <p>or</p>
              <input
                type="text"
                placeholder="Paste Invoice"
                value={lnToTgInvoice}
                onChange={(e) => setLnToTgInvoice(e.target.value)}
                disabled={isLoading}
              />

              <button
                  onClick={onClickSend}
                  disabled={isLoading || !transferAmount || !recipientAddress || !lnToTgDecodedInvoice}
                  className={`button ${isLoading ? "loading" : ""}`}
                >
                 {isLoading ? "Processing..." : "Place Order to Swap"}
              </button> 

              <button
                  onClick={sendData}
                  disabled={isLoading || !transferAmount || !recipientAddress}
                  className={`button ${isLoading ? "loading" : ""}`}
                >
                 {isLoading ? "Processing..." : "Send test Data"}
              </button> 
            </div>

            {isLoading && (
              <div className="transaction-container">
                <p>Processing transaction...</p>
              </div>
            )}

            {isSuccessful && (
              <div className="transaction-container">
                <p>Successful</p>
              </div>
            )}
          </div>
          <div className="card">
            <div className="balance-amount mb-2">Lightning to tgBTC swap</div>

            <label htmlFor="swap-amount" className="block text-sm font-medium text-gray-700">Select Swap</label>
            <div className="input-container">
              <select
                id="swap-amount"
                name="swap-amount"
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md transition-all duration-200 ease-in-out shadow-sm hover:shadow-md"
              >
                <option value="0.1">0.1 tgBTC</option>
                <option value="0.5">0.5 tgBTC</option>
                <option value="1">1 tgBTC</option>
                <option value="5">5 tgBTC</option>
                <option value="10">10 tgBTC</option>
              </select>
            </div>              
            <PayButton 
                invoice={invoice} 
                onPaid={(response) => {
                  /* 
                    Select the amount available in the smart contract and pays it, release payment at TON
                    after
                  */
                  alert("Paid! " + response.preimage)
                }} 
              />



          </div>
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
};

export default App;
