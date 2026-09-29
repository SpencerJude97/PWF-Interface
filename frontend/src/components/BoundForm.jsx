const BoundForm = ({ value, onChange, onSubmit, placeholder, buttonText }) => {
  const handleSubmit = (event) => {
    event.preventDefault();
    if (onSubmit) {
      onSubmit();
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={value ?? ''}
        onChange={onChange}
        placeholder={placeholder}
      />
      {buttonText && <button type="submit">{buttonText}</button>}
    </form>
  );
};

export default BoundForm;