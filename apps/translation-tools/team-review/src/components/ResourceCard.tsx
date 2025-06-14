/* eslint-disable jsx-a11y/accessible-emoji */
import React, { useState } from 'react';
import {
  useResourceAPI,
  Resource,
  createTextMessage,
  TextMessageTypes,
} from '../libs/linked-panels';

export const ResourceCard: React.FC<Resource> = ({ id, component,  }) => {
  const api = useResourceAPI<TextMessageTypes['text']>(id);
  const [message, setMessage] = useState<string>('');

  // Get received messages using the API
  const receivedMessages = api.messaging.getMessages();

  const handleSendMessage = () => {
    if (message.trim()) {
      const allResources = api.system.getAllResources();
      const otherResource = allResources.find(resourceId => resourceId !== id);

      const currentPanel = api.system.getMyPanel();
      const allPanels = api.system.getAllPanels();
      const otherPanel = allPanels.find(panelId => panelId !== currentPanel);

      
      if (otherResource && otherPanel) {
        // Send to first available resource
        const textMessage = createTextMessage(message, `${id}@${currentPanel}`);
        const success = api.messaging.send(otherResource, textMessage);
        if (success) {
          console.log(`📤 Sent message from ${id} to ${otherResource}`);
          setMessage('');
          api.navigation.goToResourceInPanel(otherPanel, otherResource);
        }
      }
    }
  };

  const handleSendToAll = () => {
    if (message.trim()) {
      const textMessage = createTextMessage(message, `${id}@${api.system.getMyPanel()}`);
      const sentCount = api.messaging.sendToAll(textMessage);
      console.log(`📤 Sent message to ${sentCount} resources`);
      setMessage('');
    }
  };

  return (
      
        component
  );
};
