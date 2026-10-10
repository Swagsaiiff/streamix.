import { useState } from "react";

export default function SearchBox({ onSearch, disabled }) {
  const [value, setValue] = useState("");
  return (
    <form
      className="search-box"
      onSubmit={(e) => {
        e.preventDefault();
        if (!disabled) onSearch(value);
      }}
    >
      <input
        type="search"
        placeholder="Search movies and series (min 2 chars)"
        value={value}
        minLength={2}
        onChange={(e) => setValue(e.target.value)}
        disabled={disabled}
      />
    </form>
  );
}
