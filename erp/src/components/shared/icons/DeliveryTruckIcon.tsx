interface DeliveryTruckIconProps {
  className?: string;
}

const DeliveryTruckIcon = ({ className = '' }: DeliveryTruckIconProps) => (
  <svg
    aria-hidden="true"
    className={className}
    viewBox="0 0 24 24"
    fill="currentColor"
    focusable="false"
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M3.25 4.5h9.5A2.25 2.25 0 0 1 15 6.75V8h3.2c.65 0 1.26.31 1.63.84l1.82 2.62c.23.33.35.72.35 1.12v3.17c0 .69-.56 1.25-1.25 1.25h-1.48a2.75 2.75 0 0 0-5.34 0h-3.86a2.75 2.75 0 0 0-5.34 0H3.25C2.56 17 2 16.44 2 15.75v-9A2.25 2.25 0 0 1 4.25 4.5Zm11.75 5v2.5h4.13l-1.63-2.34a.4.4 0 0 0-.33-.16H15ZM7.4 14.25a2.75 2.75 0 1 0 0 5.5 2.75 2.75 0 0 0 0-5.5Zm9.8 0a2.75 2.75 0 1 0 0 5.5 2.75 2.75 0 0 0 0-5.5Z"
    />
  </svg>
);

export default DeliveryTruckIcon;
