interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className }) => (
  <div className={`
    bg-white rounded-lg shadow-lg p-4 
    flex flex-col min-h-0
    ${className}
  `}>
    {children}
  </div>
); 