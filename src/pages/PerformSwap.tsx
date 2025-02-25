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
    /* Create a new cell
    const OP_CREATE_SWAP = 305419896n; // 0x12345678
    const cell = beginCell()
    .storeUint(OP_CREATE_SWAP, 32)
    .storeAddress(initiator)          // Explicitly store the sender’s address
    .storeCoins(amount)             // Store coins (using TON’s special encoding)
    .storeRef(                          // Extra data stored in a referenced cell:
      beginCell()
        .storeUint(hashLock, 256)   // 256-bit hashLock
        .storeUint(timeLock, 64)    // 64-bit timeLock
        .endCell()
    )
    .endCell()
    // Convert the cell to a base64-encoded string
    return cell.toBoc().toString("base64");
    */

    // Build an extra cell for hashLock and timeLock.

    const OP_DEPOSIT_NOTIFICATION = 0xDEADBEEFn

    const extraCell = beginCell()
      .storeUint(hashLock, 256)
      .storeUint(timeLock, 64)
      .endCell();
    // Build the deposit notification payload.
    const forwardPayload = beginCell()
      .storeUint(OP_DEPOSIT_NOTIFICATION, 32)  // deposit notification op code (0xDEADBEEF)
      .storeUint(toNano(amount/10**8), 128)
      .storeAddress(initiator)
      .storeRef(
        beginCell()
          .storeAddress(initiator)
          .endCell()
      )
      // Instead of storing hashLock/timeLock inline, store a reference to the extra cell.
      .storeRef(extraCell)
      .endCell();

    // Then, create the transfer message.
    const cell = beginCell()
      .storeUint(0x0f8a7ea5, 32)           // transfer op code for jetton transfer
      .storeUint(0, 64)                    // query_id
      .storeCoins(toNano(amount/10**8))             // token amount for transfer
      .storeAddress(Address.parse(contractAddress))         // destination
      .storeAddress(Address.parse(contractAddress))         // response destination (ensure this is correct for your use case)
      .storeBit(0)                         // custom payload flag (0 = none)
      .storeCoins(toNano("0.02"))        // forward TON amount
      .storeBit(1)                         // forward payload flag (1 = referenced cell)
      .storeRef(forwardPayload)            // attach the forward payload
      .endCell();

    return cell.toBoc().toString("base64");
  };
  const createCompleteSwapPayload = (swapId, preimageBigInt) => {
    // Create a new cell
    const OP_COMPLETE_SWAP = 2271560481n; // 0x87654321
    console.log(BigInt(swapId));
    console.log(preimageBigInt)
    const cell = beginCell()
      .storeUint(OP_COMPLETE_SWAP, 32)
      .storeUint(swapId,256)
      .storeUint(preimageBigInt,256) // Store the cell as a reference
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
  function calculateHashLock(preimage: bigint): bigint {
    // Build a TON cell exactly as done on-chain:
    // Store the preimage as a 256-bit unsigned integer and then hash that cell.
    const cell = beginCell().storeUint(preimage, 256).endCell();
    const hashBuffer = cell.hash(); // This computes the TON cell's hash
    return BigInt('0x' + hashBuffer.toString('hex'));
  } 
  const lockTgBTC = async () => {
    if(!lnToTgDecodedInvoice){
      console.log("No Invoice");
      return;
    }

    const initiator = wallet?.account.address;
    const jettonMasterAddress = 'kQBWqA0Zb6TmFlMUIoDlyAscUAcMQ3-1tae2POQ4Xl4xrw_V';
    const jettonAddressResult = await client.getJettonMasters({
      address: jettonMasterAddress
    });
    console.log(jettonAddressResult)
    await new Promise(resolve => setTimeout(resolve, 1500));

    const jettonWalletResult = await client.getJettonWallets({
      owner_address: wallet?.account.address,
      jetton_address: jettonAddressResult[0].address
    });
    const jettonWalletAddress = jettonWalletResult[0].address;
    try {
      console.log("HashLock: "+lnToTgDecodedInvoice.payment_hash)
      const hashLockBigInt = BigInt("0x" + lnToTgDecodedInvoice.payment_hash);
      console.log("Hashlock BigInt: "+hashLockBigInt)
      const timeLockBigInt = BigInt(Math.floor(Date.now())) + 7200000n// BigInt(lnToTgDecodedInvoice.expiry);
      console.log(timeLockBigInt)
      const payload = createSwapPayload(
          Address.parse(initiator),
          swap?.amount,
          hashLockBigInt, // Use the BigInt version
          timeLockBigInt
      ); // Use the BigInt version
      console.log(payload)

      const messages = [
        {
          address: jettonWalletAddress,
          payload: payload,
          amount: toNano('0.1').toString(),
          sendMode:  SendMode.PAY_GAS_SEPARATELY
        },
      ];

      await tonConnectUI.sendTransaction({
        validUntil: Math.floor(Date.now() / 1000) + 60,
        messages: messages,
      });
      console.log("Contract function called successfully");

      // Send message to bot 
      const swapLock = {
        swapId: swap._id,
        action: "swap_locked",
        invoice: lnToTgDecodedInvoice.paymentRequest
      };

      console.log("Swap Request:", swapLock);
      WebApp.sendData(JSON.stringify(swapLock));

      console.log("Message sent to bot");

    } catch (error) {
      console.error("Error calling contract function:", error);
    }
  };
  const completeSwap = async (preimageInput) => {
    const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;

    try {
      // --- Preimage Handling: Accept input as either hex (with "0x") or decimal ---
      // Convert the preimage input string directly to a BigInt.
      const preimageBigInt = BigInt('0x'+preimageInput.trim());
      
      // Convert the BigInt to a hex string.
      let preimageHex = preimageBigInt.toString(16);
      // Ensure even length (each byte should be two hex characters).
      if (preimageHex.length % 2 !== 0) {
        preimageHex = '0' + preimageHex;
      }
      
      // Create a Buffer from the hex string.
      const preimageBuffer = Buffer.from(preimageHex, 'hex');
      
      // (Optional) Store in a cell if needed.
      const preimageCell = beginCell().storeBuffer(preimageBuffer).endCell();
      console.log(`Preimage Cell: ${preimageCell}`);
  
      // --- Compute the hashLock from the preimage ---
      // Using Node's crypto to create a SHA-256 hash.
      const hashBuffer = crypto.createHash('sha256').update(preimageBuffer).digest();
      const computedHash = hashBuffer.toString('hex');
      console.log("Computed Hash: " + computedHash);
  
      // --- Locate the correct swap using the computed hashLock ---
      let result = await client.runGetMethod({
        address: contractAddress,
        method: 'get_swap_counter',
        stack: []
      });
      const swapCounter = BigInt(result.stack[0][1]);
      let swapId = null;
      await new Promise(resolve => setTimeout(resolve, 1500));

      for (let i = 0n; i < swapCounter; i++) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        try {
          result = await client.runGetMethod({
            address: contractAddress,
            method: 'get_swap',
            stack: [{ type: "num", value: i.toString() }]
          });
          const swapHashLock = result.stack[3][1];
          // Compare computed hash prefixed with "0x" to the stored hashLock.
          if (swapHashLock === '0x' + computedHash) {
            console.log(result.stack);
            swapId = i;
            console.log(`SwapID found: ${i} - HashLock: ${swapHashLock}`);
            break; // Found a match—exit the loop.
          }
        } catch (err) {
          console.error(`Error fetching swap with id ${i}:`, err);
          // Continue searching in case of errors on a particular id.
        }
      }
      if (swapId === null) {
        console.error("No swap found with that invoice");
        return;
      }
      console.log(`Preimage as BigInt: ${preimageBigInt}`);
      console.log(`SwapId: ${swapId}`);
  
      // --- Create Payload and Send Transaction (unchanged) ---
      const payload = createCompleteSwapPayload(
        swapId.toString(), // test value
        preimageBigInt.toString()
      );
      const messages = [
        {
          address: contractAddress,
          amount: toNano('0.2').toString(), // Gas amount
          payload: payload,
        },
      ];
  
      // (Optional) Send message to bot.
      const swapFinished = {
        _id: swap._id,
        action: "swap_finished"
      };
      console.log("Swap Request:", swapFinished);
      WebApp.sendData(JSON.stringify(swapFinished));
  
      await tonConnectUI.sendTransaction({
        validUntil: Math.floor(Date.now() / 1000) + 60, // Valid for 60 seconds.
        messages: messages
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
                  setPreimage(response.preimage);

                  completeSwap(response.preimage);
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

                  const decoded = decode(swap.invoice);
                  console.log("Payment Hash: "+decoded.payment_hash);
                  const preimageBigInt = BigInt('0x'+preimage);
                  console.log("Preimage BigInt: "+preimageBigInt)
                  console.log("Buffer to BigInt: "+bufferToBigInt(Buffer.from(preimage, 'hex')))
                  //console.log("Computed hashlock using function with cell: "+computeHashLock(Buffer.from(preimage, 'hex')))
                  const hashBuffer = crypto.createHash('sha256').update(Buffer.from(preimage, 'hex')).digest(); // Use Node's crypto for ton-core compatible hash
                  console.log(hashBuffer.toString('hex'))
                  console.log(`Calculated hashlock ton: ${calculateHashLock(BigInt('0x' + preimage))}`)
                  completeSwap(preimage);
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
