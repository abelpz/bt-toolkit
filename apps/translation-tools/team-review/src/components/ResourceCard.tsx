/* eslint-disable jsx-a11y/accessible-emoji */
import React, { useCallback } from 'react';
import {
  useResourceAPI,
  Resource,
} from '../libs/linked-panels';

export const ResourceCard: React.FC<Resource> = ({ id, component }) => {
  const api = useResourceAPI(id);
  const [message, setMessage] = React.useState<string>('');

  // Direct store subscription - automatically reacts to message changes (no polling needed!)
  const receivedMessages = api.messaging.getMyMessages();

  return (
    <div className="p-4 border border-gray-200 rounded-lg shadow-sm">
      <h3 className="text-lg font-semibold mb-2">{id}</h3>
      <div className="text-sm text-gray-600 mb-4">
        {receivedMessages.length > 0 ? 'New messages:' : 'No messages yet'}
      </div>
      <div className="space-y-2">
        {receivedMessages.map((msg, index) => (
          <div key={index} className="p-2 bg-gray-50 rounded-md">
            <strong>{msg.content.originalSender}:</strong> {msg.content.text}
          </div>
        ))}
      </div>
    </div>
  );
};
