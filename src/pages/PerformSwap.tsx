import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { TonConnectButton, useTonWallet, useTonConnectUI } from "@tonconnect/ui-react";
import { TONXJsonRpcProvider } from "@tonx/core";
import { decode } from 'light-bolt11-decoder';
import crypto from 'crypto';
import { beginCell, Address, SendMode, toNano } from "ton-core"; // Import Address and Cell

import {Button, PayButton,requestProvider, init} from '@getalby/bitcoin-connect-react';

import WebApp from '@twa-dev/sdk';
const JETTON_QUANTITY = 100000000;

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
  const [preimage,setPreimage] = useState("");

  const [isSuccessful, setIsSuccessful] = useState(false);
  const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;

  useEffect(() => {
    WebApp.ready();
    
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
    if(lnToTgInvoice){
      try {
        const decodedInvoice = decode(lnToTgInvoice);
        setLnToTgDecodedInvoice(decodedInvoice);
      } catch(err){
        
      }
    };
  },[lnToTgInvoice]);
  useEffect(() => {
    if(wallet){
      getTgBTCAmount();
    }
  },[wallet]);
  
  const createSwapPayload = (initiator, amount, hashLock, timeLock) => {
    // Create a new cell
    const OP_CREATE_SWAP = 305419896n; // 0x12345678
    const cell = beginCell()
    .storeUint(OP_CREATE_SWAP, 32)
    .storeAddress(initiator)          // Explicitly store the sender’s address
    .storeCoins(BigInt(amount))             // Store coins (using TON’s special encoding)
    .storeRef(                          // Extra data stored in a referenced cell:
      beginCell()
        .storeUint(BigInt(hashLock), 256)   // 256-bit hashLock
        .storeUint(BigInt(timeLock), 64)    // 64-bit timeLock
        .endCell()
    )
    .endCell()
    // Convert the cell to a base64-encoded string
    return cell.toBoc().toString("base64");
  };
  const createCompleteSwapPayload = (swapId, preimageCell) => {
    // Create a new cell
    const OP_COMPLETE_SWAP = 2271560481n; // 0x87654321
    console.log(BigInt(swapId));
    const cell = beginCell()
      .storeUint(OP_COMPLETE_SWAP, 32)
      .storeUint(BigInt(swapId),256)
      .storeRef(preimageCell) // Store the cell as a reference
      .endCell();
  
    // Convert the cell to a base64-encoded string
    return cell.toBoc().toString("base64");
  };
  const bufferToBigInt = (buffer: Buffer): bigint => {
    let result = 0n;
    for (const byte of buffer) {
        result = (result << 8n) | BigInt(byte);
    }
    return result;
}
const computeHashLock = (preimage): bigint => {
  const cell = beginCell().storeBuffer(preimage).endCell();
  const hashBuffer = cell.hash(); // Buffer
  return bufferToBigInt(hashBuffer);
}
  const lockTgBTC = async () => {
    if(!lnToTgDecodedInvoice){
      console.log("No Invoice");
      return;
    }
    const initiator = wallet?.account.address;

    try {
      console.log("HashLock: "+lnToTgDecodedInvoice.payment_hash)
      const hashLockBigInt = BigInt("0x" + lnToTgDecodedInvoice.payment_hash);
      //const hashLockBigInt = computeHashLock(preimageBigInt)
      console.log("Hashlock BigInt: "+hashLockBigInt)
      const timeLockBigInt = BigInt(Math.floor(Date.now() / 1000)) + 3600n// BigInt(lnToTgDecodedInvoice.expiry);
      const payload = createSwapPayload(
          Address.parse(initiator),
          Number(lnToTgDecodedInvoice.sections[2].value)/1000,
          hashLockBigInt, // Use the BigInt version
          timeLockBigInt
      ); // Use the BigInt version

      const messages = [
        {
          address: contractAddress,
          payload: payload,
          amount: toNano(0.05).toString()
        },
      ];
      console.log(messages[0])
      // Send message to bot 
      const swapLock = {
        _id: swap._id,
        action: "swap_locked",
        invoice: lnToTgDecodedInvoice.paymentRequest
      };

      console.log("Swap Request:", swapLock);
      WebApp.sendData(JSON.stringify(swapLock));
      console.log(tonConnectUI.sendTransaction)
      await tonConnectUI.sendTransaction({
        validUntil: Math.floor(Date.now() / 1000) + 360,
        network: 'testnet',
        messages: messages,
        sendMode: SendMode.PAY_GAS_SEPARATELY

      });

      console.log("Contract function called successfully");


    } catch (error) {
      console.error("Error calling contract function:", error);
    }
  };
  const completeSwap = async (preimage) => {
    const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;
    try {
      const preimageBuffer = Buffer.from(preimage, 'hex');
      const preimageCell = beginCell().storeBuffer(preimageBuffer).endCell(); // Store in a cell
  
      const payload = createCompleteSwapPayload(
          6, //test
          preimageCell
      ); 
      console.log(payload)
      const messages = [
        {
          address: contractAddress,
          amount: toNano(0.05).toString(), // Gas
          payload: payload,
        },
      ];
      // Send message to bot 
      const swapFinished = {
        _id: swap._id,
        action: "swap_finished"
      };

      console.log("Swap Request:", swapFinished);

      WebApp.sendData(JSON.stringify(swapFinished));
      await tonConnectUI.sendTransaction({
        validUntil: Math.floor(Date.now() / 1000) + 360,
        messages: messages,
        sendMode: SendMode.PAY_GAS_SEPARATELY,
        network: 'testnet'
      });

      console.log("Contract function called successfully");

    } catch (error) {
      console.error("Error calling contract function:", error);
    }
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
      console.log(decodedInvoice)
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
                  const computedHash = crypto.createHash('sha256').update(Buffer.from(response.preimage, 'hex')).digest('hex');
                  const preimageBigInt = BigInt("0x" + response.preimage);

                  setPreimage(response.preimage);

                  completeSwap("0x" + response.preimage);
                }} 
              />
            {
              preimage &&
              <button
                onClick={() => {
                  /* 
                    Select the amount available in the smart contract and pays it, release payment at TON
                    after
                  */
                 console.log("Preimage: "+preimage)
                  const computedHash = crypto.createHash('sha256').update(Buffer.from(preimage, 'hex')).digest('hex');
                  console.log("Computed Hash: "+computedHash)
                  console.log("Computed BigInt: "+BigInt('0x'+computedHash))

                  const decoded = decode(swap.invoice);
                  console.log("Payment Hash: "+decoded.payment_hash);
                  const preimageBigInt = BigInt('0x'+preimage);
                  console.log("Preimage BigInt: "+preimageBigInt)
                  console.log("Buffer to BigInt: "+bufferToBigInt(Buffer.from(preimage, 'hex')))
                  console.log("Computed hashlock using function with cell: "+computeHashLock(Buffer.from(preimage, 'hex')))
                  const hashBuffer = crypto.createHash('sha256').update(Buffer.from(preimage, 'hex')).digest(); // Use Node's crypto for ton-core compatible hash
                  console.log(hashBuffer.toString('hex'))
                  
                  completeSwap('0x'+preimage);
              }}
              className={`button ${loading ? "loading" : ""}`}
                >
                {loading ? "Processing..." : "Claim"}
              </button> 
            }


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
