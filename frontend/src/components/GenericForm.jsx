import React, { useState } from 'react';

const GenericForm = ({ onSubmit, placeholder, buttonText, defaultVal }) => {
  const [genInput, setGenInput] = useState(defaultVal || '');

  const handleSubmit = (event) => {
    event.preventDefault();
    if (genInput) {
      onSubmit(genInput);
      setGenInput('');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={genInput}
        onChange={(e) => setGenInput(e.target.value)}
        placeholder={placeholder}
      />
      {buttonText &&
        <button type="submit">{buttonText}</button>
      }
    </form>
  );
};

export default GenericForm;