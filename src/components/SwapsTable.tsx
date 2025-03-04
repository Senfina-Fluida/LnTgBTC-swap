import React from 'react';

import {PendingSwapsProps} from './Interfaces';

const PendingSwaps: React.FC<PendingSwapsProps> = ({ title, swaps, handleSwapSelect }) => {
  return (
    <div className="container mx-auto p-4 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-4 text-gray-800">{title}</h1>

      {swaps.length === 0 && <p className="text-gray-600">No pending swaps.</p>}

      {swaps.length > 0 && (
        <div className="overflow-x-auto"> {/* Added for horizontal scrolling if needed */}
          <table className="min-w-full bg-white border-collapse border border-gray-200">
            <thead>
              <tr className="bg-gray-50 text-gray-700">
                <th className="border border-gray-200 px-4 py-2 text-left whitespace-nowrap">Source</th>
                <th className="border border-gray-200 px-4 py-2 text-left whitespace-nowrap">Destination</th>
                <th className="border border-gray-200 px-4 py-2 text-left whitespace-nowrap">Amount</th>
                <th className="border border-gray-200 px-4 py-2 whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {swaps.map((swap) => (
                <tr
                  key={swap._id}
                  className="hover:bg-gray-50"
                >
                  <td className="border border-gray-200 px-4 py-2 text-gray-700">{swap.source}</td>
                  <td className="border border-gray-200 px-4 py-2 text-gray-700">{swap.destination}</td>
                  <td className="border border-gray-200 px-4 py-2 text-gray-700">{swap.amount}</td>
                  <td className="border border-gray-200 px-4 py-2 text-center">
                    <button
                      onClick={() => handleSwapSelect(swap)}
                      className={`${swap.isOwner ? "bg-red-500 hover:bg-red-700" : "bg-blue-500 hover:bg-blue-700"} text-white font-bold py-1 px-2 rounded whitespace-nowrap`}
                      >
                        {
                          swap.isOwner ?
                           swap.status === "pending" ? "Delete" :
                           swap.status === "locked" && "Refund" : 
                           "Select"
                        }
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default PendingSwaps;