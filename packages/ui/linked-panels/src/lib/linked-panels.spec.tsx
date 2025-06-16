import { render } from '@testing-library/react';

import ReactLinkedPanels from './linked-panels';

describe('ReactLinkedPanels', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<ReactLinkedPanels />);
    expect(baseElement).toBeTruthy();
  });
});
