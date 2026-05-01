import { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';

export default function CustomDateInput({ value, onChange, className }) {
  const [displayValue, setDisplayValue] = useState('');

  useEffect(() => {
    if (value) {
      const parts = value.split('-');
      if (parts.length === 3) {
        setDisplayValue(`${parts[2]}:${parts[1]}:${parts[0]}`);
      } else {
        setDisplayValue(value);
      }
    } else {
      setDisplayValue('');
    }
  }, [value]);

  const handleChange = (e) => {
    const rawVal = e.target.value;
    const digits = rawVal.replace(/\D/g, '');
    let formatted = digits;
    
    if (digits.length > 4) {
      formatted = digits.substring(0, 2) + ':' + digits.substring(2, 4) + ':' + digits.substring(4, 8);
    } else if (digits.length > 2) {
      formatted = digits.substring(0, 2) + ':' + digits.substring(2);
    }
    
    setDisplayValue(formatted);

    if (digits.length === 8) {
      const d = digits.substring(0, 2);
      const m = digits.substring(2, 4);
      const y = digits.substring(4, 8);
      
      const isoDate = `${y}-${m}-${d}`;
      
      const monthNum = parseInt(m, 10);
      const dayNum = parseInt(d, 10);
      const yearNum = parseInt(y, 10);
      
      // Only emit valid dates
      if (monthNum >= 1 && monthNum <= 12 && dayNum >= 1 && dayNum <= 31 && yearNum >= 1900) {
         onChange(isoDate);
      }
    } else if (digits.length === 0) {
      onChange('');
    }
  };

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <input
        type="text"
        className={className}
        value={displayValue}
        onChange={handleChange}
        placeholder="DD:MM:YYYY"
        maxLength={10}
        style={{ paddingRight: '40px' }}
      />
      <input
        type="date"
        value={value || ''}
        onChange={(e) => {
           if (e.target.value) {
             onChange(e.target.value);
           }
        }}
        onClick={(e) => {
          // Native Safari might need active click handling
          if (e.currentTarget.showPicker) {
            try { e.currentTarget.showPicker(); } catch (err) { /* ignore */ }
          }
        }}
        style={{
          position: 'absolute',
          right: '4px',
          opacity: 0,
          width: '32px',
          height: '100%',
          cursor: 'pointer',
          zIndex: 2,
          padding: 0,
          border: 'none',
          background: 'transparent'
        }}
      />
      <Calendar 
        size={18} 
        style={{ 
          position: 'absolute', 
          right: '12px', 
          color: '#64748b', 
          pointerEvents: 'none',
          zIndex: 1
        }} 
      />
    </div>
  );
}
