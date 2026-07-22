import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CustomDateInput from './CustomDateInput';

describe('CustomDateInput Component', () => {
  it('should initialize and format the value to DD:MM:YYYY when mounted with a valid ISO value', () => {
    render(<CustomDateInput value="2026-06-29" onChange={() => {}} />);
    const textInput = screen.getByPlaceholderText('DD:MM:YYYY');
    expect(textInput.value).toBe('29:06:2026');
  });

  it('should format typed digits correctly by automatically inserting colons', async () => {
    const user = userEvent.setup();
    const onChangeMock = vi.fn();
    
    render(<CustomDateInput value="" onChange={onChangeMock} />);
    const textInput = screen.getByPlaceholderText('DD:MM:YYYY');

    // Type first two digits (day)
    await user.type(textInput, '29');
    expect(textInput.value).toBe('29');

    // Type next digit (starts month, should auto-insert colon)
    await user.type(textInput, '0');
    expect(textInput.value).toBe('29:0');

    // Type remaining digits
    await user.type(textInput, '62026');
    expect(textInput.value).toBe('29:06:2026');
  });

  it('should emit the formatted ISO date when 8 valid digits are entered', async () => {
    const user = userEvent.setup();
    const onChangeMock = vi.fn();

    render(<CustomDateInput value="" onChange={onChangeMock} />);
    const textInput = screen.getByPlaceholderText('DD:MM:YYYY');

    // Type valid date: 29-06-2026 (typed as 29062026)
    await user.type(textInput, '29062026');

    expect(onChangeMock).toHaveBeenCalledTimes(1);
    expect(onChangeMock).toHaveBeenCalledWith('2026-06-29');
  });

  it('should not emit if the entered date digits are invalid', async () => {
    const user = userEvent.setup();
    const onChangeMock = vi.fn();

    render(<CustomDateInput value="" onChange={onChangeMock} />);
    const textInput = screen.getByPlaceholderText('DD:MM:YYYY');

    // Type invalid month: 29-15-2026 (month 15 is invalid)
    await user.type(textInput, '29152026');

    expect(onChangeMock).not.toHaveBeenCalled();
  });

  it('should emit an empty string when the input is fully cleared', async () => {
    const user = userEvent.setup();
    const onChangeMock = vi.fn();

    render(<CustomDateInput value="2026-06-29" onChange={onChangeMock} />);
    const textInput = screen.getByPlaceholderText('DD:MM:YYYY');

    // Clear input
    await user.clear(textInput);

    expect(onChangeMock).toHaveBeenCalledTimes(1);
    expect(onChangeMock).toHaveBeenCalledWith('');
  });

  it('should call onChange with the selected value when the native date input is changed', async () => {
    const onChangeMock = vi.fn();
    const { container } = render(<CustomDateInput value="" onChange={onChangeMock} />);
    
    // Find the native input[type="date"]
    const dateInput = container.querySelector('input[type="date"]');
    expect(dateInput).toBeInTheDocument();

    // Trigger changes directly (simulating native date picker selection)
    await userEvent.clear(dateInput);
    await userEvent.type(dateInput, '2026-07-15');

    expect(onChangeMock).toHaveBeenCalledWith('2026-07-15');
  });
});
