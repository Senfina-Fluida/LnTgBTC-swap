import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { TonConnectButton, useTonWallet, useTonConnectUI } from "@tonconnect/ui-react";
import { TONXJsonRpcProvider } from "@tonx/core";
import { decode } from 'light-bolt11-decoder';

import {Button, PayButton,requestProvider, init} from '@getalby/bitcoin-connect-react';

import WebApp from '@twa-dev/sdk';

export default function PerformSwap() {

  const [swap, setSwap] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);



  const [tonConnectUI] = useTonConnectUI();
  const [searchParams] = useSearchParams();
  const wallet = useTonWallet();
  const client = new TONXJsonRpcProvider({
    network: "testnet",
    apiKey: import.meta.env.VITE_TONXAPI_KEY,
  });

  const [tgBtcBalance,setTgBtcBalance] = useState(0);
  const [lnProvider, setLnProvider] = useState();

  const [lnToTgInvoice,setLnToTgInvoice] = useState("");
  const [lnToTgDecodedInvoice,setLnToTgDecodedInvoice] = useState("");

  const [isSuccessful, setIsSuccessful] = useState(false);

  useEffect(() => {
    const params = searchParams.get('params');

    if (params) {
      try {
        const decodedParams = decodeURIComponent(params);
        const parsedSwap = JSON.parse(decodedParams);
        setSwap(parsedSwap);
      } catch (err) {
        console.error("Error parsing params:", err);
        setError("Error loading swaps.");
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(false); // No params, not an error, just no data.
    }
  }, [searchParams]);

  useEffect(() => {
    if(wallet){
      getTgBTCAmount();
    }
  },[wallet])
  const lockTgBTC = async () => {

  };
  const getTgBTCAmount = async () => {
    const jettonWallets = await client.getTgBTCWalletAddressByOwner({ owner_address: wallet?.account.address });
    const tgBTCWallet = await client.getTgBTCBalance({ address: jettonWallets.address });
    setTgBtcBalance(tgBTCWallet.balance / JETTON_QUANTITY);
  };
 const makeInvoice = async () => {
      // if no WebLN provider exists, it will launch the modal
      const weblnProvider = await requestProvider();
      setLnProvider(weblnProvider);
      const invoice = await weblnProvider.makeInvoice({
        amount: swap?.amount,
        memo: "tgBTC swap"
      });
      setLnToTgInvoice(invoice.paymentRequest)
      const decodedInvoice = decode(invoice.paymentRequest);
      setLnToTgDecodedInvoice(decodedInvoice);
  };
  return (
    <div className="container">
      <div className="header">
        <div className="version">
          <TonConnectButton />
        </div>

        <h1 className="border">LnTgBTCSwap</h1>
        <h2 className="mb-2">Perform Swap</h2>

        {
        wallet ? 
          <>
          {
            swap?.fromTON ?
            <div className="card">
              <div className="balance-amount mb-2">tgBTC to Lightning Swap</div>

              <div className="balance-amount mb-2">tgBTC Balance: {tgBtcBalance}</div>
              <div className="balance-amount mb-2">Swaping {swap?.amount} satoshis</div>

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

              {isSuccessful && (
                <div className="transaction-container">
                  <p>Successful</p>
                </div>
              )}
            </div> : 

            <div className="card">
            <div className="balance-amount mb-2">Lightning to tgBTC swap</div>
            <div className="balance-amount mb-2">{swap?.amount} satoshis</div>           
            <PayButton 
                invoice={swap?.invoice} 
                onPaid={(response) => {
                  /* 
                    Select the amount available in the smart contract and pays it, release payment at TON
                    after
                  */
                  alert("Paid! " + response.preimage)
                }} 
              />



            </div>
          }
          </>
         : 
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
        }
      </div>
    </div>
  );
}
