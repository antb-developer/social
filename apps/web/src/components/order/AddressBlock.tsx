type Props = {
  address: Record<string, unknown> | null;
  className?: string;
};

/**
 * Renders whatever fields the seller's address form collected. Sellers can
 * customize the form's field keys, so this only formats the common default
 * shape (name/phone/address_line/city/state/pincode) nicely and otherwise
 * falls back to a generic key: value list rather than assuming field names.
 */
export function AddressBlock({ address, className = "" }: Props) {
  if (!address) return null;

  const name = typeof address.name === "string" ? address.name : undefined;
  const phone = typeof address.phone === "string" ? address.phone : undefined;
  const line = typeof address.address_line === "string" ? address.address_line : undefined;
  const city = typeof address.city === "string" ? address.city : undefined;
  const state = typeof address.state === "string" ? address.state : undefined;
  const pincode = typeof address.pincode === "string" ? address.pincode : undefined;
  const isKnownShape = Boolean(name || line || city);

  if (isKnownShape) {
    const cityState = [city, state].filter(Boolean).join(", ");
    return (
      <div className={`text-sm text-gray-700 ${className}`}>
        {(name || phone) && (
          <p className="font-medium text-gray-900">{[name, phone].filter(Boolean).join(" · ")}</p>
        )}
        <p className="mt-0.5 text-gray-600">{[line, cityState, pincode].filter(Boolean).join(", ")}</p>
      </div>
    );
  }

  return (
    <div className={`space-y-0.5 text-sm text-gray-700 ${className}`}>
      {Object.entries(address).map(([key, value]) => (
        <p key={key}>
          <span className="text-gray-400">{key.replace(/_/g, " ")}:</span> {String(value)}
        </p>
      ))}
    </div>
  );
}
