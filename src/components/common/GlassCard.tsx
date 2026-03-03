import React, { ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
}

const GlassCard = ({ children, className = '' }: GlassCardProps) => (
  <div className={`bg-white/30 backdrop-blur-lg rounded-xl shadow-lg border border-white/20 overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-xl ${className}`}>
    {children}
  </div>
);

export default GlassCard;
