# MiniApp for P2P Submarine Swaps Between Lightning Network and TON

This **MiniApp** is designed to work alongside the **Telegram bot** for facilitating **peer-to-peer (P2P) submarine swaps** between the **Bitcoin Lightning Network** and **TON blockchain**. It provides a seamless and user-friendly experience for creating, selecting, and executing swaps, as well as interacting with TON wallets and Lightning nodes.

---

## **Key Features**

### **1. Swap Creation**
- Users can **create a swap** by specifying the **amount** and **destination** (Lightning or TON).
- The MiniApp sends the swap details to the bot, which stores the swap as **pending**.

### **2. Swap Listing**
- Users can **view all available swaps** (both pending and selected) in a clean, tabular format.
- The MiniApp fetches swap data from the bot and displays it for easy selection.

### **3. Swap Selection**
- Users can **select a swap** to participate in by clicking on it in the MiniApp.
- The MiniApp sends the selection details to the bot, which notifies the swap creator.

### **4. Swap Execution**
- **For tgBTC-to-Lightning Swaps**:
  - The user locks their tgBTC in the TON smart contract by providing:
    - A **hashlock** (derived from the Lightning invoice).
    - A **timelock** (set to the invoice's expiration time or expiration time plus a buffer).
  - The MiniApp validates the invoice amount and extracts the hashlock and timelock.
- **For Lightning-to-tgBTC Swaps**:
  - The user pays the Lightning invoice and reveals the **preimage** to claim the tgBTC.

### **5. Refund Mechanism**
- If the swap is not completed before the **timelock** expires, the user can refund their locked tgBTC.

---

## **How It Works**

### **1. Swap Creation**
- The user opens the MiniApp and inputs the **amount** and **destination** (Lightning or TON) to create a swap.
- The MiniApp sends the swap details to the bot, which stores the swap as **pending**.

### **2. Swap Selection**
- Another user views the list of **pending swaps** in the MiniApp.
- They select a swap, and the MiniApp sends the selection details to the bot.
- The bot notifies the swap creator that their swap has been selected.

### **3. Swap Execution**
- The swap creator locks their tgBTC in the TON smart contract via the MiniApp.
- The counterparty pays the Lightning invoice and reveals the preimage to claim the tgBTC.
- If the swap isn’t completed before the timelock expires, the creator can refund their tgBTC.

---

## **Integration with the Bot**
- The MiniApp communicates with the bot using `WebApp.sendData` to:
  - Send swap creation, selection, and deletion requests.
  - Notify the bot when a swap is locked or completed.
- The bot handles the backend logic, such as storing swap details and notifying users.

---

## Getting started

Create a `.env` file with following content: 

```
VITE_TONXAPI_KEY=TONXAPI_KEY
```

Install packages with ```pnpm install``` and then run ```pnpm dev```.

---

## **License**
This project is licensed under the [MIT License](LICENSE).
