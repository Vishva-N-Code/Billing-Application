import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UpdatePrompt from './UpdatePrompt';

// Mock APP_VERSION
vi.mock('../version', () => ({
  APP_VERSION: '2.5.1',
}));

describe('UpdatePrompt Component', () => {
  beforeEach(() => {
    vi.stubGlobal('location', {
      reload: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render nothing initially', () => {
    const { container } = render(<UpdatePrompt />);
    expect(container.firstChild).toBeNull();
  });

  it('should render the update prompt card when the pwa-update-available event is dispatched', async () => {
    render(<UpdatePrompt />);

    // Dispatch the custom event wrapped in act
    const event = new CustomEvent('pwa-update-available', {
      detail: { updateSW: vi.fn() },
    });
    
    act(() => {
      window.dispatchEvent(event);
    });

    // Use findByText to await the asynchronous React state update and rerender
    const title = await screen.findByText('Update Available!');
    expect(title).toBeInTheDocument();
    
    expect(screen.getByText(/version 2.5.1/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /later/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /update now/i })).toBeInTheDocument();
  });

  it('should dismiss the prompt when the Later button is clicked', async () => {
    const user = userEvent.setup();
    const { container } = render(<UpdatePrompt />);

    const event = new CustomEvent('pwa-update-available', {
      detail: { updateSW: vi.fn() },
    });

    act(() => {
      window.dispatchEvent(event);
    });

    const laterButton = await screen.findByRole('button', { name: /later/i });
    await user.click(laterButton);

    // Prompt card should be removed from rendering
    expect(container.firstChild).toBeNull();
  });

  it('should trigger updateSW when the Update Now button is clicked and updateSW function is present', async () => {
    const user = userEvent.setup();
    render(<UpdatePrompt />);

    const mockUpdateSW = vi.fn().mockResolvedValue(true);
    const event = new CustomEvent('pwa-update-available', {
      detail: { updateSW: mockUpdateSW },
    });

    act(() => {
      window.dispatchEvent(event);
    });

    const updateNowButton = await screen.findByRole('button', { name: /update now/i });
    await user.click(updateNowButton);

    expect(mockUpdateSW).toHaveBeenCalledWith(true);
    expect(window.location.reload).not.toHaveBeenCalled();
  });

  it('should trigger window reload if updateSW function is not present in event details', async () => {
    const user = userEvent.setup();
    render(<UpdatePrompt />);

    // Dispatch event with no updateSW
    const event = new CustomEvent('pwa-update-available', {
      detail: { updateSW: null },
    });

    act(() => {
      window.dispatchEvent(event);
    });

    const updateNowButton = await screen.findByRole('button', { name: /update now/i });
    await user.click(updateNowButton);

    expect(window.location.reload).toHaveBeenCalledTimes(1);
  });
});
