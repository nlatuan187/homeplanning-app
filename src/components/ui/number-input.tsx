"use client";

import { useState, useEffect } from "react";
import { Controller, Control, FieldValues, Path, ControllerRenderProps, FieldError } from "react-hook-form";
import { Input } from "./input";

interface NumberInputProps<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  placeholder?: string;
}

// Separate component to use hooks
function ControlledNumberInput<T extends FieldValues>({
  field,
  placeholder,
  error,
}: {
  field: ControllerRenderProps<T, Path<T>>;
  placeholder?: string;
  error?: FieldError;
}) {
  // Use local state to track the input value as a string
  const [inputValue, setInputValue] = useState<string>(
    field.value === 0 ? "" : String(field.value ?? "")
  );
  
  // Update local state when field value changes externally
  useEffect(() => {
    setInputValue(field.value === 0 ? "" : String(field.value ?? ""));
  }, [field.value]);

  return (
    <Input
      type="text"
      inputMode="decimal"
      placeholder={placeholder}
      value={inputValue}
      onChange={(e) => {
        const value = e.target.value;
        
        // Allow empty value or numbers with decimal point
        if (value === "" || /^[0-9]*\.?[0-9]*$/.test(value)) {
          // Update the local state with the string value
          setInputValue(value);
          
          // Update the form state with the number value (0 if empty)
          field.onChange(value === "" ? 0 : Number(value));
        }
      }}
      onBlur={field.onBlur}
      name={field.name}
      ref={field.ref}
      aria-invalid={error ? "true" : "false"}
    />
  );
}

export function NumberInput<T extends FieldValues>({
  name,
  control,
  placeholder,
}: NumberInputProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <ControlledNumberInput
          field={field}
          placeholder={placeholder}
          error={error}
        />
      )}
    />
  );
}
