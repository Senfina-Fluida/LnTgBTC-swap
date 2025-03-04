export interface Swap {
    _id?: string;
    id?: number;
    hash?: string;
    source?: string;
    status?: string;
    destination?: string;
    amount?: number;
    isOwner?: boolean;
    invoice?: string;
    fromTON?: boolean;
}

export interface PendingSwapsProps {
    title: string;
    swaps: Swap[];
    error: string | null;
    loading: boolean | null;
    handleSwapSelect: (swap: Swap) => void;
}

export interface ContractSwapData {
    swapId: string;
    amount: string;
    hashLock: string;
    timeLock: string;
    isCompleted: string;
}
export interface DecodedInvoice {
    payment_hash: string;
    expiry: string;
    paymentRequest: string;
    sections: InvoiceSection[]
}
interface InvoiceSection {
    name: string;
    value: string;
};