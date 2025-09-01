// src/ui/Input/Input.jsx
import React from 'react';

const Input = ({ label, value, onChange, type = 'text', ...props }) => {
  return (
    <div>
      {label && <label>{label}</label>}
      <input
        type={type}
        value={value}
        onChange={onChange}
        {...props}
      />
    </div>
  );
};

export default Input;
